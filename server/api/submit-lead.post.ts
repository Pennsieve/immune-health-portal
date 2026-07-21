import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { cleanLeadDetails, leadDetailRows } from '~/utils/leadFields'
import type { LeadFormData } from '~/types/index'

const AFFILIATION_LABELS: Record<string, string> = {
  internal: 'Internal',
  external: 'External',
  industry: 'Industry',
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Hard stop while the form is disabled (no bot protection yet) — reject
  // before any DB write or billable email is sent, even for direct API hits.
  if (!config.public.leadFormEnabled) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Our inquiry form is temporarily unavailable. Please email support@immunehealth.science.',
    })
  }

  const body = await readBody(event)

  if (!config.emailsDisabled && !config.mailersendApiKey) {
    console.error('MAILERSEND_API_KEY is not configured')
    throw createError({ statusCode: 500, statusMessage: 'Email service configuration error' })
  }

  const form = body?.form as LeadFormData | undefined
  const tz = body?.timezone || DEFAULT_TIMEZONE

  if (!form || !form.name || !form.email) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required form data' })
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(form.email)) {
    throw createError({ statusCode: 400, statusMessage: 'Email address is invalid' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const inquiryId = crypto.randomUUID()
  const submittedDate = new Date().toLocaleDateString('en-US', { timeZone: tz, month: 'long', day: 'numeric', year: 'numeric' })
  const affiliationOrg = form.affiliation === 'internal'
    ? 'University of Pennsylvania'
    : (form.organization || '')

  const leadDetails = cleanLeadDetails(form as unknown as Record<string, unknown>)

  // 1. Save to Supabase first — if this fails the whole request fails before emails are sent
  const { error: dbError } = await supabase.from('inquiries').insert({
    id: inquiryId,
    study_name: null,
    status: 'Lead',
    submitted_date: submittedDate,
    submitted_relative: 'just now',
    pi: { name: form.name, email: form.email },
    affiliation: AFFILIATION_LABELS[form.affiliation] || 'External',
    affiliation_org: affiliationOrg,
    services: '',
    services_detail: [],
    lead_details: leadDetails,
    intake_details: {},
    sample_schedule: [],
    notes: [],
    feasibility: LEAD_CHECKLIST.map(label => ({ label, checked: false })),
  })

  if (dbError) {
    console.error('Supabase insert error:', dbError)
    throw createError({ statusCode: 500, statusMessage: `Failed to save inquiry: ${dbError.message}` })
  }

  // 2. Send emails
  const confirmationHtml = `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2d3640;line-height:1.75;font-size:0.92rem;font-weight:300;">
      <div style="padding:1.6rem 1.6rem 2rem;">

        <div style="padding-bottom:1.2rem;border-bottom:1px solid #e8e4dc;margin-bottom:1.4rem;">
          <div style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background:#011f5b;color:#fff;font-family:'Courier New',Courier,monospace;font-size:9px;font-weight:700;border-radius:3px;letter-spacing:0.03em;vertical-align:middle;">I3H</div>
          <span style="display:inline-block;vertical-align:middle;margin-left:8px;font-weight:600;color:#011f5b;font-size:1rem;"><font color="#011f5b">Immune Health</font></span>
        </div>

        <h3 style="margin:0 0 0.8rem;font-size:1.1rem;font-weight:600;color:#011f5b;"><font color="#011f5b">Thanks, ${form.name} — we've received your inquiry.</font></h3>

        <p style="margin:0 0 0.6rem;">Thank you for reaching out to the Institute for Immunology &amp; Immune Health. A member of our team will review your inquiry and reach out within <strong>3 business days</strong> to schedule a conversation.</p>

        <p style="margin:1rem 0 0.3rem;"><strong>What happens next:</strong></p>
        <p style="margin:0 0 1rem;font-size:0.88rem;">
          1. An I3H team member reaches out to schedule an introductory call.<br>
          2. We discuss your research, our services, and whether we're a good fit.<br>
          3. If we move forward, we'll send you our full study intake form to begin feasibility review.
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

  try {
    await sendEmail({
      to: [{ email: form.email, name: form.name }],
      subject: `We've received your inquiry — Immune Health (I3H)`,
      html: confirmationHtml,
    })

    const submittedAt = new Date().toLocaleString('en-US', { timeZone: tz, month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    const leadRows = leadDetailRows(leadDetails)
      .map(r => `<tr><td style="padding:3px 0;color:#7f8c8d;width:170px;vertical-align:top;">${r.label}</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${r.value}</td></tr>`)
      .join('')

    const staffHtml = `
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2d3640;line-height:1.75;font-size:0.92rem;font-weight:300;">
        <div style="padding:1.6rem 1.6rem 2rem;">

          <div style="padding-bottom:1.2rem;border-bottom:1px solid #e8e4dc;margin-bottom:1.4rem;">
            <div style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background:#011f5b;color:#fff;font-family:'Courier New',Courier,monospace;font-size:9px;font-weight:700;border-radius:3px;letter-spacing:0.03em;vertical-align:middle;">I3H</div>
            <span style="display:inline-block;vertical-align:middle;margin-left:8px;font-weight:600;color:#011f5b;font-size:1rem;">Admin Console</span>
          </div>

          <h3 style="margin:0 0 0.8rem;font-size:1.1rem;font-weight:600;color:#011f5b;">New lead submitted</h3>

          <p style="font-size:0.86rem;margin:0 0 0.6rem;"><strong>${form.name}</strong> (${AFFILIATION_LABELS[form.affiliation] || form.affiliation}) just reached out via the public inquiry form. Reach out to schedule an introductory call, then send the full intake form from the console when you're ready.</p>

          <div style="background:#faf8f4;border-radius:4px;padding:0.9rem 1.1rem;margin:1rem 0;">
            <table style="width:100%;border-collapse:collapse;font-size:0.84rem;">
              <tr><td style="padding:3px 0;color:#7f8c8d;width:170px;">Submitted</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${submittedAt}</td></tr>
              <tr><td style="padding:3px 0;color:#7f8c8d;">Name</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${form.name} · ${form.email}</td></tr>
              <tr><td style="padding:3px 0;color:#7f8c8d;">Affiliation</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${AFFILIATION_LABELS[form.affiliation] || form.affiliation}${affiliationOrg && form.affiliation !== 'internal' ? ` · ${affiliationOrg}` : ''}</td></tr>
              ${leadRows}
            </table>
          </div>

          <a href="${config.public.appDomain ? `https://${config.public.appDomain}` : 'http://localhost:3000'}/admin/inquiries/${inquiryId}" style="display:inline-block;background:#011f5b;color:#fff;padding:0.7rem 1.3rem;border-radius:4px;text-decoration:none;font-weight:600;font-size:0.88rem;margin:0.6rem 0;">Open in Admin Console →</a>

          <p style="font-size:0.8rem;color:#7f8c8d;margin-top:1.4rem;font-weight:300;">
            This is an automated alert from the Immune Health platform.
          </p>

          <div style="font-size:0.7rem;color:#7f8c8d;margin-top:1.6rem;padding-top:1rem;border-top:1px solid #e8e4dc;">
            Sent automatically by the I3H platform via MailerSend. To adjust who receives intake alerts, update the admin notification list in Settings.
          </div>
        </div>
      </div>
    `

    await sendEmail({
      to: [{ email: config.adminEmail, name: 'Immune Health Admin' }],
      subject: `🆕 New lead — ${form.name} · ${AFFILIATION_LABELS[form.affiliation] || form.affiliation}`,
      html: staffHtml,
    })
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string; errors?: Record<string, string[]> }; message?: string }
    console.error('Error sending email via MailerSend:', err.data || err.message)

    // Roll back the DB insert so there's no orphan record
    await supabase.from('inquiries').delete().eq('id', inquiryId)

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
