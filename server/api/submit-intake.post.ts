import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { cleanIntakeDetails } from '~/utils/intakeFields'
import { verifyIntakeToken } from '~/server/utils/signing'

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

  if (!config.emailsDisabled && !config.mailersendApiKey) {
    console.error('MAILERSEND_API_KEY is not configured')
    throw createError({ statusCode: 500, statusMessage: 'Email service configuration error' })
  }

  const { form, estimatedTotal, totalSamples, servicesText, servicesDetail, timezone, inquiryId, token } = body
  const tz = timezone || DEFAULT_TIMEZONE

  // The full intake is token-gated: the link is emailed by I3H staff after
  // the introductory conversation (see /api/admin/send-intake-link).
  if (!inquiryId || !token || typeof token !== 'string') {
    throw createError({ statusCode: 401, statusMessage: 'Missing or invalid intake link' })
  }
  try {
    const payload = verifyIntakeToken(token, config.signingSecret)
    if (payload.inquiryId !== inquiryId) throw new Error('inquiry mismatch')
  }
  catch (err: unknown) {
    const message = (err as Error).message === 'token expired'
      ? 'This intake link has expired — contact the I3H team for a new one'
      : 'This intake link is invalid'
    throw createError({ statusCode: 401, statusMessage: message })
  }

  // Cohort scope is derived from the sample matrix (subjects + cohort count),
  // consistent with the study/inquiry displays. "timepoints" is no longer shown.
  const cohortGroups: Array<{ subjects?: number }> = Array.isArray(form.collectionGroups) ? form.collectionGroups : []
  const cohortCount = cohortGroups.length
  const matrixSubjects = cohortGroups.reduce((s, g) => s + (Number(g.subjects) || 0), 0)
  const scopeSubjects = matrixSubjects || form.subjectCount || 0
  const cohortLabel = `${cohortCount} ${cohortCount === 1 ? 'cohort' : 'cohorts'}`

  // Validate all email addresses before touching the DB
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(form.piEmail)) {
    throw createError({ statusCode: 400, statusMessage: 'PI email address is invalid' })
  }
  if (form.leadEmail && !emailRegex.test(form.leadEmail)) {
    throw createError({ statusCode: 400, statusMessage: 'Lead email address is invalid' })
  }
  if (form.baEmail && !emailRegex.test(form.baEmail)) {
    throw createError({ statusCode: 400, statusMessage: 'Business Administrator email address is invalid' })
  }
  if (form.externalContact && !emailRegex.test(form.externalContact)) {
    throw createError({ statusCode: 400, statusMessage: 'Contracting / Grants Office email address is invalid' })
  }

  if (!form || !form.piEmail) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required form data',
    })
  }

  // 1. Send confirmation email to user (PI and Project Lead)
  const confirmationHtml = `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2d3640;line-height:1.75;font-size:0.92rem;font-weight:300;">
      <div style="padding:1.6rem 1.6rem 2rem;">

        <div style="padding-bottom:1.2rem;border-bottom:1px solid #e8e4dc;margin-bottom:1.4rem;">
          <div style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background:#011f5b;color:#fff;font-family:'Courier New',Courier,monospace;font-size:9px;font-weight:700;border-radius:3px;letter-spacing:0.03em;vertical-align:middle;">I3H</div>
          <span style="display:inline-block;vertical-align:middle;margin-left:8px;font-weight:600;color:#011f5b;font-size:1rem;"><font color="#011f5b">Immune Health</font></span>
        </div>

        <h3 style="margin:0 0 0.8rem;font-size:1.1rem;font-weight:600;color:#011f5b;"><font color="#011f5b">Thanks, ${form.principalInvestigator} — we've received your inquiry.</font></h3>

        <p style="margin:0 0 0.6rem;">Your study request for <strong>${form.projectName}</strong> has been submitted to the Institute for Immunology &amp; Immune Health. A member of our team will review feasibility and reach out within <strong>3 business days</strong> with next steps.</p>

        <div style="background:#faf8f4;border-radius:4px;padding:0.9rem 1.1rem;margin:1rem 0;">
          <table style="width:100%;border-collapse:collapse;font-size:0.84rem;">
            <tr><td style="padding:3px 0;color:#7f8c8d;width:160px;">Study</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${form.projectName}${form.acronym ? ` (${form.acronym})` : ''}</td></tr>
            <tr><td style="padding:3px 0;color:#7f8c8d;">Principal Investigator</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${form.principalInvestigator}</td></tr>
            <tr><td style="padding:3px 0;color:#7f8c8d;">Cohort scope</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${scopeSubjects} subjects · ${cohortLabel} · ${totalSamples} samples</td></tr>
            <tr><td style="padding:3px 0;color:#7f8c8d;">Services requested</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${servicesText}</td></tr>
            ${estimatedTotal ? `<tr><td style="padding:3px 0;color:#7f8c8d;">Estimated total</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">$${estimatedTotal.toLocaleString()}</td></tr>` : ''}
          </table>
        </div>

        ${form.notes ? `
        <p style="font-size:0.86rem;margin:0.8rem 0 0"><strong>Additional notes you provided:</strong></p>
        <p style="font-size:0.85rem;font-style:italic;color:#555;margin-bottom:1rem">"${form.notes}"</p>
        ` : ''}

        <p style="margin:1rem 0 0.3rem;"><strong>What happens next:</strong></p>
        <p style="margin:0 0 1rem;font-size:0.88rem;">
          1. I3H staff review feasibility and capacity.<br>
          2. If approved, you'll receive an agreement package (User Agreement, LabVantage form, Pennsieve agreement).<br>
          3. Once countersigned, your study is activated and we begin scheduling.
        </p>

        <p style="font-size:0.85rem;color:#7f8c8d;margin-top:1.4rem;font-weight:300;">
          Questions in the meantime? Reach out to the I3H team at
          <a href="mailto:${config.adminEmail}" style="color:#011f5b;text-decoration:none;"><span style="color:#011f5b;text-decoration:underline;">${config.adminEmail}</span></a>.
        </p>

        <div style="font-size:0.7rem;color:#7f8c8d;margin-top:1.6rem;padding-top:1rem;border-top:1px solid #e8e4dc;">
          Institute for Immunology &amp; Immune Health · Perelman School of Medicine, University of Pennsylvania · 421 Curie Boulevard, Philadelphia, PA 19104.
          This message contains research operations information and is intended for the named recipient.
        </div>
      </div>
    </div>
  `

  // 1. Save to Supabase first — if this fails the whole request fails before emails are sent
  const supabase = serverSupabaseServiceRole(event)

  // The lead row must exist and still be awaiting its full intake
  const { data: existing, error: fetchErr } = await supabase
    .from('inquiries')
    .select('id, status, submitted_date, feasibility, activity')
    .eq('id', inquiryId)
    .single()

  if (fetchErr || !existing) {
    throw createError({ statusCode: 404, statusMessage: 'Inquiry not found' })
  }
  if (existing.status !== 'Lead' && existing.status !== 'Intake Sent') {
    throw createError({ statusCode: 409, statusMessage: 'The intake form for this inquiry has already been submitted' })
  }

  const submittedDate = new Date().toLocaleDateString('en-US', { timeZone: tz, month: 'long', day: 'numeric', year: 'numeric' })
  const affiliationOrg = form.affiliation === 'internal'
    ? 'University of Pennsylvania'
    : (form.externalInstitution || '')

  // Structured intake answers are stored RAW (schema resolves labels for display).
  // Empty / not-applicable values are dropped by the shared cleaner.
  const intakeDetails = cleanIntakeDetails(form as Record<string, unknown>)

  // Cohort sample matrix — one row per group, tubes/subject at each fixed timepoint
  const TIMEPOINT_KEYS = ['base', 'w24', 'w52', 'w104']
  const sampleSchedule = Array.isArray(form.collectionGroups)
    ? form.collectionGroups.map((g: { name?: string; subjects?: number; samples?: Record<string, number> }) => ({
        name: g.name || '',
        subjects: Number(g.subjects) || 0,
        samples: Object.fromEntries(
          TIMEPOINT_KEYS.map(k => [k, Number(g.samples?.[k]) || 0]),
        ),
      }))
    : []

  // Upgrade the lead row in place — the full intake fills in the study fields
  const { error: dbError } = await supabase.from('inquiries').update({
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
    budget_code: form.affiliation === 'internal' ? (form.budgetCode || null) : null,
    funding_name: form.affiliation === 'internal' ? (form.fundingName || null) : null,
    ba_name: form.affiliation === 'internal' ? (form.baName || null) : null,
    ba_email: form.affiliation === 'internal' ? (form.baEmail || null) : null,
    contracting_contact: form.affiliation !== 'internal' ? (form.externalContact || null) : null,
    irb: form.irbStatus === 'approved' ? (form.irbNumber || null) : null,
    cohort_subjects: form.subjectCount,
    services: servicesText,
    services_detail: servicesDetail || [],
    estimate: estimatedTotal || null,
    sample_type: SAMPLE_TYPE_LABELS[form.sampleType] || form.sampleType || null,
    phlebotomy: PHLEBOTOMY_LABELS[form.phlebotomyNeeds] || form.phlebotomyNeeds || null,
    metadata: METADATA_LABELS[form.metadataPlan] || form.metadataPlan || null,
    intake_details: intakeDetails,
    sample_schedule: sampleSchedule,
    additional_notes: form.notes || null,
    // The lead-phase meeting checklist is replaced by the full onboarding
    // feasibility checklist now that the intake form is in
    feasibility: ONBOARDING_CHECKLIST.map((label, i) => ({ label, checked: i === 0 })),
    // Log the submission in the inquiry's activity history
    activity: [
      { dotClass: 'g', title: 'Full intake form submitted', date: `${submittedDate} · by ${form.principalInvestigator}`, ts: Date.now() },
      ...((existing.activity as unknown[]) || []),
    ],
  }).eq('id', inquiryId)

  if (dbError) {
    console.error('Supabase insert error:', dbError)
    throw createError({ statusCode: 500, statusMessage: `Failed to save inquiry: ${dbError.message}` })
  }

  // 2. Send emails
  try {
    const recipients = [
      { email: form.piEmail, name: form.principalInvestigator },
    ]
    if (form.leadEmail && form.leadEmail !== form.piEmail) {
      recipients.push({ email: form.leadEmail, name: form.projectLead })
    }

    await sendEmail({
      to: recipients,
      subject: `We've received your I3H study inquiry — ${form.projectName}`,
      html: confirmationHtml,
    })

    const submittedAt = new Date().toLocaleString('en-US', { timeZone: tz, month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

    const staffHtml = `
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2d3640;line-height:1.75;font-size:0.92rem;font-weight:300;">
        <div style="padding:1.6rem 1.6rem 2rem;">

          <div style="padding-bottom:1.2rem;border-bottom:1px solid #e8e4dc;margin-bottom:1.4rem;">
            <div style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background:#011f5b;color:#fff;font-family:'Courier New',Courier,monospace;font-size:9px;font-weight:700;border-radius:3px;letter-spacing:0.03em;vertical-align:middle;">I3H</div>
            <span style="display:inline-block;vertical-align:middle;margin-left:8px;font-weight:600;color:#011f5b;font-size:1rem;">Admin Console</span>
          </div>

          <h3 style="margin:0 0 0.8rem;font-size:1.1rem;font-weight:600;color:#011f5b;">New study inquiry submitted</h3>

          <p style="font-size:0.86rem;margin:0 0 0.6rem;"><strong>${form.projectName}</strong> was just submitted by <strong>${form.principalInvestigator}</strong> (${AFFILIATION_LABELS[form.affiliation] || form.affiliation}). Quick summary below — full intake is available in the console.</p>

          <div style="background:#faf8f4;border-radius:4px;padding:0.9rem 1.1rem;margin:1rem 0;">
            <table style="width:100%;border-collapse:collapse;font-size:0.84rem;">
              <tr><td style="padding:3px 0;color:#7f8c8d;width:140px;">Submitted</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${submittedAt}</td></tr>
              <tr><td style="padding:3px 0;color:#7f8c8d;">PI</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${form.principalInvestigator} · ${form.piEmail}</td></tr>
              ${form.projectLead ? `<tr><td style="padding:3px 0;color:#7f8c8d;">Study lead</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${form.projectLead} · ${form.leadEmail}</td></tr>` : ''}
              <tr><td style="padding:3px 0;color:#7f8c8d;">Affiliation</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${AFFILIATION_LABELS[form.affiliation] || form.affiliation}${form.externalInstitution ? ` · ${form.externalInstitution}` : ''}</td></tr>
              ${form.irbNumber ? `<tr><td style="padding:3px 0;color:#7f8c8d;">IRB</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${form.irbNumber}</td></tr>` : ''}
              <tr><td style="padding:3px 0;color:#7f8c8d;">Scope</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${scopeSubjects} subjects · ${cohortLabel} · ${totalSamples} samples · ${SAMPLE_TYPE_LABELS[form.sampleType] || form.sampleType || '—'}</td></tr>
              ${intakeDetails.firstSampleDate || intakeDetails.sampleArrival ? `<tr><td style="padding:3px 0;color:#7f8c8d;">Collection</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${[intakeDetails.firstSampleDate ? `first samples ${intakeDetails.firstSampleDate}` : '', intakeDetails.sampleArrival, Array.isArray(intakeDetails.collectionSites) ? (intakeDetails.collectionSites as string[]).join(', ') : ''].filter(Boolean).join(' · ')}</td></tr>` : ''}
              <tr><td style="padding:3px 0;color:#7f8c8d;">Services</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${servicesText}</td></tr>
              ${estimatedTotal ? `<tr><td style="padding:3px 0;color:#7f8c8d;">Est. revenue</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">$${estimatedTotal.toLocaleString()}</td></tr>` : ''}
            </table>
          </div>

          ${form.objectives ? `
          <p style="font-size:0.86rem;margin:0.8rem 0 0"><strong>Objectives (PI's words):</strong></p>
          <p style="font-size:0.85rem;font-style:italic;color:#555;margin-bottom:1rem">"${form.objectives}"</p>
          ` : ''}

          ${form.notes ? `
          <p style="font-size:0.86rem;margin:0.8rem 0 0"><strong>Additional notes from PI:</strong></p>
          <p style="font-size:0.85rem;font-style:italic;color:#555;margin-bottom:1rem">"${form.notes}"</p>
          ` : ''}

          <a href="${config.public.appDomain ? `https://${config.public.appDomain}` : 'http://localhost:3000'}/admin/inquiries/${inquiryId}" style="display:inline-block;background:#011f5b;color:#fff;padding:0.7rem 1.3rem;border-radius:4px;text-decoration:none;font-weight:600;font-size:0.88rem;margin:0.6rem 0;">Open in Admin Console →</a>

          <p style="font-size:0.8rem;color:#7f8c8d;margin-top:1.4rem;font-weight:300;">
            This is an automated alert from the Immune Health platform. Inquiry status, notes, and the full intake form are available in the console.
          </p>

          <div style="font-size:0.7rem;color:#7f8c8d;margin-top:1.6rem;padding-top:1rem;border-top:1px solid #e8e4dc;">
            Sent automatically by the I3H platform via MailerSend. To adjust who receives intake alerts, update the admin notification list in Settings.
          </div>
        </div>
      </div>
    `

    await sendEmail({
      to: [{ email: config.adminEmail, name: 'Immune Health Admin' }],
      subject: `🆕 New inquiry — ${form.projectName} · ${form.principalInvestigator} · ${AFFILIATION_LABELS[form.affiliation] || form.affiliation}`,
      html: staffHtml,
    })
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string; errors?: Record<string, string[]> }; message?: string }
    console.error('Error sending email via MailerSend:', err.data || err.message)

    // Roll back to the lead state so the form can be resubmitted
    await supabase.from('inquiries')
      .update({ status: existing.status, submitted_date: existing.submitted_date, feasibility: existing.feasibility, activity: existing.activity })
      .eq('id', inquiryId)

    // Surface the first specific MailerSend validation error if available
    const firstMailerError = err.data?.errors
      ? Object.values(err.data.errors)[0]?.[0]
      : null
    throw createError({
      statusCode: 500,
      statusMessage: firstMailerError || err.data?.message || 'Failed to send confirmation emails',
    })
  }

  return { success: true }
})
