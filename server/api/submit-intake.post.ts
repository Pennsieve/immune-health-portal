import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

const SAMPLE_TYPE_LABELS: Record<string, string> = {
  'fresh-blood': 'Fresh whole blood',
  'stored-pbmc': 'Stored PBMCs (cryopreserved)',
  'tissue': 'Tissue',
  'other': 'Other',
}
const PHLEBOTOMY_LABELS: Record<string, string> = {
  'ih-campus': 'IH phlebotomist on campus',
  'remote': 'Remote phlebotomy needed',
  'self-collect': 'Study team will collect and transfer',
  'stored': 'N/A – using stored samples',
}
const METADATA_LABELS: Record<string, string> = {
  redcap: 'REDCap',
  other: 'Other system',
  tbd: 'To be discussed',
}
const AFFILIATION_LABELS: Record<string, string> = {
  internal: 'Internal',
  external: 'External',
  industry: 'Industry',
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  if (!config.mailersendApiKey) {
    console.error('MAILERSEND_API_KEY is not configured')
    throw createError({
      statusCode: 500,
      statusMessage: 'Email service configuration error',
    })
  }

  const { form, estimatedTotal, totalSamples, servicesText, servicesDetail } = body

  if (!form || !form.piEmail) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required form data',
    })
  }

  const mailersendUrl = 'https://api.mailersend.com/v1/email'
  const commonHeaders = {
    Authorization: `Bearer ${config.mailersendApiKey}`,
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }

  // 1. Send confirmation email to user (PI and Project Lead)
  const confirmationHtml = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <div style="background-color: #011F5B; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Project Inquiry Received</h1>
      </div>
      <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
        <p>Dear ${form.principalInvestigator},</p>
        <p>Thank you for submitting your inquiry for the project: <strong>${form.projectName}</strong>.</p>
        <p>Our team at the Institute for Immunology & Immune Health (I3H) has received your request and will review it shortly. We will contact you at <strong>${form.leadEmail}</strong> if we have any questions or to discuss the next steps.</p>

        <h3 style="color: #011F5B; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 30px;">Inquiry Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 150px;">Project Name:</td>
            <td style="padding: 8px 0;">${form.projectName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">PI:</td>
            <td style="padding: 8px 0;">${form.principalInvestigator}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Total Samples:</td>
            <td style="padding: 8px 0;">${totalSamples}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Services:</td>
            <td style="padding: 8px 0;">${servicesText}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Estimated Cost:</td>
            <td style="padding: 8px 0;">$${estimatedTotal.toLocaleString()}</td>
          </tr>
        </table>

        <p style="margin-top: 30px;">Best regards,<br>The Immune Health Team</p>
      </div>
      <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
        <p>This is an automated message. Please do not reply directly to this email.</p>
        <p>&copy; ${new Date().getFullYear()} Penn Institute for Immunology & Immune Health</p>
      </div>
    </div>
  `

  // 1. Save to Supabase first — if this fails the whole request fails before emails are sent
  const supabase = serverSupabaseServiceRole(event)
  const submittedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const affiliationOrg = form.affiliation === 'internal'
    ? 'University of Pennsylvania'
    : (form.externalInstitution || '')

  const initialNotes = form.notes
    ? [{ author: form.principalInvestigator, date: submittedDate, text: form.notes }]
    : []

  const { error: dbError } = await supabase.from('inquiries').insert({
    id: crypto.randomUUID(),
    study_name: form.projectName,
    abbreviation: form.acronym || null,
    status: 'New',
    submitted_date: submittedDate,
    submitted_relative: 'just now',
    objectives: form.objectives,
    pi: { name: form.principalInvestigator, email: form.piEmail },
    study_lead: form.projectLead ? { name: form.projectLead, email: form.leadEmail } : null,
    affiliation: AFFILIATION_LABELS[form.affiliation] || 'External',
    affiliation_org: affiliationOrg,
    irb: form.irbNumber || null,
    cohort_subjects: form.subjectCount,
    cohort_timepoints: form.timepointCount,
    services: servicesText,
    services_detail: servicesDetail || [],
    estimate: estimatedTotal || null,
    sample_type: SAMPLE_TYPE_LABELS[form.sampleType] || form.sampleType || null,
    phlebotomy: PHLEBOTOMY_LABELS[form.phlebotomyNeeds] || form.phlebotomyNeeds || null,
    metadata: METADATA_LABELS[form.metadataPlan] || form.metadataPlan || null,
    notes: initialNotes,
    feasibility: [
      { label: 'IRB protocol reviewed', checked: false },
      { label: 'Sample type confirmed viable', checked: false },
      { label: 'Cohort scope reviewed', checked: false },
      { label: 'Service capacity confirmed', checked: false },
      { label: 'Budget / account code verified', checked: false },
    ],
  })

  if (dbError) {
    console.error('Supabase insert error:', dbError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to save inquiry' })
  }

  // 2. Send emails
  try {
    const recipients = [
      { email: form.piEmail, name: form.principalInvestigator },
    ]
    if (form.leadEmail && form.leadEmail !== form.piEmail) {
      recipients.push({ email: form.leadEmail, name: form.projectLead })
    }

    await $fetch(mailersendUrl, {
      method: 'POST',
      headers: commonHeaders,
      body: {
        from: { email: config.mailersendFromEmail, name: config.mailersendFromName },
        to: recipients,
        subject: `Inquiry Received: ${form.projectName}`,
        html: confirmationHtml,
      },
    })

    const submissionData = {
      form,
      totalSamples,
      estimatedTotal,
      submittedAt: new Date().toISOString(),
    }

    await $fetch(mailersendUrl, {
      method: 'POST',
      headers: commonHeaders,
      body: {
        from: { email: config.mailersendFromEmail, name: config.mailersendFromName },
        to: [{ email: config.adminEmail, name: 'Immune Health Admin' }],
        subject: `[SUBMISSION] ${form.projectName}`,
        text: JSON.stringify(submissionData, null, 2),
      },
    })
  }
  catch (error: unknown) {
    const err = error as { data?: unknown; message?: string }
    console.error('Error sending email via MailerSend:', err.data || err.message)
    throw createError({ statusCode: 500, statusMessage: 'Failed to send confirmation emails' })
  }

  return { success: true }
})
