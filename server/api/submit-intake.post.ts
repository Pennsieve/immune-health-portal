import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { verifyIntakeToken } from '~/server/utils/signing'

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

  // The rest of the study intake is captured internally by the I3H team —
  // this endpoint only ever accepts and writes Funding & Affiliation (billing)
  // fields. Nothing else in the request body is read or trusted; everything
  // else needed for the confirmation emails is loaded from the database.
  const {
    inquiryId, token, timezone,
    affiliation, budgetCode, fundingName, baName, baEmail, ilabsId,
    externalInstitution, externalContact,
  } = body
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

  if (affiliation !== 'internal' && !(externalInstitution || '').trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Institution name is required' })
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (baEmail && !emailRegex.test(baEmail)) {
    throw createError({ statusCode: 400, statusMessage: 'Business Administrator email address is invalid' })
  }
  if (externalContact && !emailRegex.test(externalContact)) {
    throw createError({ statusCode: 400, statusMessage: 'Contracting / Grants Office email address is invalid' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // The lead row must exist and still be awaiting its billing form. Fetch the
  // whole row — everything the confirmation emails need (study name, PI,
  // scope, services) was already captured internally, so it's read from the
  // database rather than trusted from the request body.
  const { data: existing, error: fetchErr } = await supabase
    .from('inquiries')
    .select('*')
    .eq('id', inquiryId)
    .single()

  if (fetchErr || !existing) {
    throw createError({ statusCode: 404, statusMessage: 'Inquiry not found' })
  }
  if (existing.status !== 'Lead' && existing.status !== 'Billing Sent') {
    throw createError({ statusCode: 409, statusMessage: 'The billing form for this inquiry has already been submitted' })
  }

  const submittedDate = new Date().toLocaleDateString('en-US', { timeZone: tz, month: 'long', day: 'numeric', year: 'numeric' })
  const affiliationOrg = affiliation === 'internal'
    ? 'University of Pennsylvania'
    : (externalInstitution || '')

  // iLabs ID lives inside intake_details (schema-driven) — merge it in
  // instead of overwriting the rest of what the I3H team already captured.
  const intakeDetails = { ...((existing.intake_details as Record<string, unknown>) || {}) }
  if (affiliation === 'internal' && (ilabsId || '').trim()) intakeDetails.ilabsId = (ilabsId as string).trim()
  else delete intakeDetails.ilabsId

  // Everything below is sourced from the already-stored row, not the request
  // body — the PI can no longer change any of it from this form.
  const pi = (existing.pi as { name: string; email: string } | null) || { name: '', email: '' }
  const studyLead = existing.study_lead as { name: string; email: string } | null
  const studyName = (existing.study_name as string) || ''
  const abbreviation = (existing.abbreviation as string) || ''
  const notes = (existing.additional_notes as string) || ''
  const servicesText = (existing.services as string) || ''
  const estimatedTotal = (existing.estimate as number) || null
  const affiliationLabel = AFFILIATION_LABELS[affiliation] || (existing.affiliation as string) || 'External'

  const cohortGroups = (existing.sample_schedule as Array<{ subjects?: number; samples?: Record<string, number> }>) || []
  const cohortCount = cohortGroups.length
  const cohortLabel = `${cohortCount} ${cohortCount === 1 ? 'cohort' : 'cohorts'}`
  const scopeSubjects = (existing.cohort_subjects as number) || cohortGroups.reduce((s, g) => s + (Number(g.subjects) || 0), 0)
  const totalSamples = cohortGroups.reduce(
    (sum, g) => sum + (Number(g.subjects) || 0) * Object.values(g.samples || {}).reduce((a, b) => a + (Number(b) || 0), 0),
    0,
  )

  // 1. Send confirmation email to user (PI and Project Lead)
  const confirmationHtml = `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2d3640;line-height:1.75;font-size:0.92rem;font-weight:300;">
      <div style="padding:1.6rem 1.6rem 2rem;">

        <div style="padding-bottom:1.2rem;border-bottom:1px solid #e8e4dc;margin-bottom:1.4rem;">
          <div style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background:#011f5b;color:#fff;font-family:'Courier New',Courier,monospace;font-size:9px;font-weight:700;border-radius:3px;letter-spacing:0.03em;vertical-align:middle;">I3H</div>
          <span style="display:inline-block;vertical-align:middle;margin-left:8px;font-weight:600;color:#011f5b;font-size:1rem;"><font color="#011f5b">Immune Health</font></span>
        </div>

        <h3 style="margin:0 0 0.8rem;font-size:1.1rem;font-weight:600;color:#011f5b;"><font color="#011f5b">Thanks, ${pi.name} — we've received your inquiry.</font></h3>

        <p style="margin:0 0 0.6rem;">Your study request for <strong>${studyName}</strong> has been submitted to the Institute for Immunology &amp; Immune Health. A member of our team will review feasibility and reach out within <strong>3 business days</strong> with next steps.</p>

        <div style="background:#faf8f4;border-radius:4px;padding:0.9rem 1.1rem;margin:1rem 0;">
          <table style="width:100%;border-collapse:collapse;font-size:0.84rem;">
            <tr><td style="padding:3px 0;color:#7f8c8d;width:160px;">Study</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${studyName}${abbreviation ? ` (${abbreviation})` : ''}</td></tr>
            <tr><td style="padding:3px 0;color:#7f8c8d;">Principal Investigator</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${pi.name}</td></tr>
            <tr><td style="padding:3px 0;color:#7f8c8d;">Cohort scope</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${scopeSubjects} subjects · ${cohortLabel} · ${totalSamples} samples</td></tr>
            <tr><td style="padding:3px 0;color:#7f8c8d;">Services requested</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${servicesText}</td></tr>
            ${estimatedTotal ? `<tr><td style="padding:3px 0;color:#7f8c8d;">Estimated total</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">$${estimatedTotal.toLocaleString()}</td></tr>` : ''}
          </table>
        </div>

        ${notes ? `
        <p style="font-size:0.86rem;margin:0.8rem 0 0"><strong>Additional notes on file:</strong></p>
        <p style="font-size:0.85rem;font-style:italic;color:#555;margin-bottom:1rem">"${notes}"</p>
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

  // 1. Save to Supabase first — if this fails the whole request fails before emails are sent.
  // Only Funding & Affiliation columns (plus status/activity bookkeeping) are
  // written — every other inquiry field is left exactly as the I3H team set it.
  const { error: dbError } = await supabase.from('inquiries').update({
    status: 'New',
    submitted_date: submittedDate,
    submitted_relative: 'just now',
    affiliation: affiliationLabel,
    affiliation_org: affiliationOrg,
    budget_code: affiliation === 'internal' ? (budgetCode || null) : null,
    funding_name: affiliation === 'internal' ? (fundingName || null) : null,
    ba_name: affiliation === 'internal' ? (baName || null) : null,
    ba_email: affiliation === 'internal' ? (baEmail || null) : null,
    contracting_contact: affiliation !== 'internal' ? (externalContact || null) : null,
    intake_details: intakeDetails,
    // The lead-phase meeting checklist is replaced by the full onboarding
    // feasibility checklist now that the billing form is in
    feasibility: ONBOARDING_CHECKLIST.map((label, i) => ({ label, checked: i === 0 })),
    // Log the submission in the inquiry's activity history
    activity: [
      { dotClass: 'g', title: 'Billing form submitted', date: `${submittedDate} · by ${pi.name}`, ts: Date.now() },
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
      { email: pi.email, name: pi.name },
    ]
    if (studyLead?.email && studyLead.email !== pi.email) {
      recipients.push({ email: studyLead.email, name: studyLead.name })
    }

    await sendEmail({
      to: recipients,
      subject: `We've received your I3H study inquiry — ${studyName}`,
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

          <p style="font-size:0.86rem;margin:0 0 0.6rem;"><strong>${studyName}</strong> was just submitted by <strong>${pi.name}</strong> (${affiliationLabel}). Quick summary below — full study details are available in the console.</p>

          <div style="background:#faf8f4;border-radius:4px;padding:0.9rem 1.1rem;margin:1rem 0;">
            <table style="width:100%;border-collapse:collapse;font-size:0.84rem;">
              <tr><td style="padding:3px 0;color:#7f8c8d;width:140px;">Submitted</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${submittedAt}</td></tr>
              <tr><td style="padding:3px 0;color:#7f8c8d;">PI</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${pi.name} · ${pi.email}</td></tr>
              ${studyLead?.name ? `<tr><td style="padding:3px 0;color:#7f8c8d;">Study lead</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${studyLead.name} · ${studyLead.email}</td></tr>` : ''}
              <tr><td style="padding:3px 0;color:#7f8c8d;">Affiliation</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${affiliationLabel}${affiliation !== 'internal' && externalInstitution ? ` · ${externalInstitution}` : ''}</td></tr>
              <tr><td style="padding:3px 0;color:#7f8c8d;">Scope</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${scopeSubjects} subjects · ${cohortLabel} · ${totalSamples} samples</td></tr>
              <tr><td style="padding:3px 0;color:#7f8c8d;">Services</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">${servicesText}</td></tr>
              ${estimatedTotal ? `<tr><td style="padding:3px 0;color:#7f8c8d;">Est. revenue</td><td style="padding:3px 0;color:#011f5b;font-weight:500;">$${estimatedTotal.toLocaleString()}</td></tr>` : ''}
            </table>
          </div>

          ${notes ? `
          <p style="font-size:0.86rem;margin:0.8rem 0 0"><strong>Additional notes on file:</strong></p>
          <p style="font-size:0.85rem;font-style:italic;color:#555;margin-bottom:1rem">"${notes}"</p>
          ` : ''}

          <a href="${config.public.appDomain ? `https://${config.public.appDomain}` : 'http://localhost:3000'}/admin/inquiries/${inquiryId}" style="display:inline-block;background:#011f5b;color:#fff;padding:0.7rem 1.3rem;border-radius:4px;text-decoration:none;font-weight:600;font-size:0.88rem;margin:0.6rem 0;">Open in Admin Console →</a>

          <p style="font-size:0.8rem;color:#7f8c8d;margin-top:1.4rem;font-weight:300;">
            This is an automated alert from the Immune Health platform. Inquiry status, notes, and full study details are available in the console.
          </p>

          <div style="font-size:0.7rem;color:#7f8c8d;margin-top:1.6rem;padding-top:1rem;border-top:1px solid #e8e4dc;">
            Sent automatically by the I3H platform via MailerSend. To adjust who receives intake alerts, update the admin notification list in Settings.
          </div>
        </div>
      </div>
    `

    await sendEmail({
      to: [{ email: config.adminEmail, name: 'Immune Health Admin' }],
      subject: `🆕 New inquiry — ${studyName} · ${pi.name} · ${affiliationLabel}`,
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
