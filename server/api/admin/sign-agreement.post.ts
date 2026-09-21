import { serverSupabaseServiceRole } from '#supabase/server'
import { verifySignToken, createSampleDetailsToken } from '~/server/utils/signing'
import { AGREEMENT_IDS, AGREEMENT_COUNT } from '~/utils/agreements'
import { DEFAULT_TIMEZONE } from '~/server/utils/constants'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { studyId, agreementId, signerName, signerEmail, token, timezone } = body

  if (!studyId || !agreementId || !signerName || !signerEmail) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
  }
  if (!AGREEMENT_IDS.includes(agreementId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid agreement ID' })
  }

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Missing signing token — use the secure link from your email' })
  }
  try {
    const payload = verifySignToken(token, config.signingSecret)
    if (payload.studyId !== studyId || payload.agreementId !== agreementId) {
      throw new Error('token mismatch')
    }
  }
  catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired signing link — please request a new one' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Verify agreement exists and is still pending
  const { data: existing, error: fetchErr } = await supabase
    .from('agreements')
    .select('status')
    .eq('study_id', studyId)
    .eq('id', agreementId)
    .single()

  if (fetchErr || !existing) {
    throw createError({ statusCode: 404, statusMessage: 'Agreement not found' })
  }
  if (existing.status === 'Signed') {
    throw createError({ statusCode: 409, statusMessage: 'Agreement already signed' })
  }

  const now = new Date()
  const tz = timezone || DEFAULT_TIMEZONE
  const signedDate = now.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })
    + ' at ' + now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })

  const { error: updateErr } = await supabase
    .from('agreements')
    .update({ status: 'Signed', signed_by: signerName, signed_date: signedDate, signed_email: signerEmail })
    .eq('study_id', studyId)
    .eq('id', agreementId)

  if (updateErr) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to update agreement' })
  }

  // Check whether all 4 agreements for this study are now signed
  const { data: allAgreements } = await supabase
    .from('agreements')
    .select('status')
    .eq('study_id', studyId)

  const allSigned = allAgreements?.length === AGREEMENT_COUNT && allAgreements.every(a => a.status === 'Signed')

  if (allSigned) {
    const { data: study } = await supabase
      .from('studies')
      .select('lifecycle, activity, pi, study_lead')
      .eq('id', studyId)
      .single()

    if (study) {
      const lifecycle = (study.lifecycle as Array<{ label: string; date: string; status: string }>).map((step) => {
        if (step.label === 'Activated') return { ...step, date: signedDate, status: 'done' }
        if (step.label === 'Processing') return { ...step, date: 'in progress', status: 'active' }
        return step
      })

      const activationItem = {
        dotClass: 'g',
        title: 'All agreements signed — study activated',
        date: signedDate,
        ts: Date.now(),
      }
      const updatedActivity = [activationItem, ...((study.activity as unknown[]) || [])]

      await supabase
        .from('studies')
        .update({ is_locked: false, stage: 'Processing', lifecycle, activity: updatedActivity })
        .eq('id', studyId)

      // Site initiation: email the PI/lead a link to the Sample Details Form
      // now that the study is fully activated. A failure here must not fail
      // the (already committed) activation.
      try {
        const pi = study.pi as { name?: string; email?: string } | null
        if (pi?.email) {
          const studyLead = study.study_lead as { name?: string; email?: string } | null
          const sdToken = createSampleDetailsToken(studyId, pi.email, config.signingSecret)
          const sampleDetailsUrl = `${config.siteUrl}/sample-details/${studyId}?token=${sdToken}`

          await sendEmail({
            to: piRecipients({ email: pi.email, name: pi.name || 'Principal Investigator' }, studyLead),
            subject: 'Your study is activated — next steps for site initiation',
            html: buildSiteInitiationEmail(pi.name || '', studyLead?.name, sampleDetailsUrl),
          })

          const { error: sdErr } = await supabase
            .from('studies')
            .update({ sample_details_sent_date: signedDate })
            .eq('id', studyId)
          if (sdErr) console.error('[sign-agreement] failed to record sample_details_sent_date:', sdErr)
        }
      }
      catch (err) {
        console.error('[sign-agreement] site-initiation email failed:', err)
      }
    }
  }

  return { success: true, signedDate, allSigned: !!allSigned }
})

// The informational items below are the parts of the original site-initiation
// checklist that are really just I3H telling the study team what to do, not
// questions with a study-specific answer — so they go here as plain copy
// rather than as fields on the Sample Details Form. Wording and any linked
// documentation are still TBD with the client (Ken) — placeholders until then.
function buildSiteInitiationEmail(piName: string, studyLeadName: string | undefined, formUrl: string): string {
  return `
<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;line-height:1.6;">
  <div style="background:#011F5B;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Study Activated · I3H</h1>
  </div>
  <div style="padding:30px;border:1px solid #e0e0e0;border-top:none;">
    <p>Dear ${piName},</p>
    <p>Congratulations — your study is now <strong>activated</strong>. To get sample processing underway smoothly, we ask your team to complete a short Sample Details Form covering site logistics and contacts.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${formUrl}"
         style="background:#011F5B;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
        Complete the Sample Details Form →
      </a>
    </div>
    <p style="font-size:0.82rem;color:#888;">If the button doesn't work, copy this link into your browser:<br>
      <a href="${formUrl}" style="color:#011F5B;word-break:break-all;">${formUrl}</a>
    </p>
    <p style="margin-top:1.6rem;"><strong>Before your team gets started, please make sure they're aware of the following:</strong></p>
    <ul style="font-size:0.88rem;line-height:1.7;padding-left:1.1rem;margin:0.8rem 0 0;">
      <li>How and when to communicate with I3H staff about visit/sample status, and when to enter visits in LabVantage.</li>
      <li>I3H's sample dropoff requirements: samples must be in a biohazard bag, clearly labeled with participant ID (no PHI), visit name, and visit date. The REDCap dropoff form must be completed, including sample collection (draw) time. Dropoffs after 3pm may incur a fee and must be communicated to I3H staff in advance.</li>
      <li>LabVantage access and training — entering subjects (including EMPI), enrolling participants, creating visits and samples, printing labels, and updating visit status for cancellations or reschedules.</li>
      <li>REDCap accounts — I3H uses REDCap to document sample dropoff and processing. Without an account, staff can use the QR code at dropoff to access the Sample Dropoff Form as a survey instead.</li>
      <li>Immune Health clinical staff and the sample manager will need access to your study's metadata (REDCap or other database).</li>
    </ul>
    <p style="margin-top:1.2rem;">Best regards,<br>The I3H Operations Team</p>
  </div>
  <div style="text-align:center;padding:20px;font-size:12px;color:#aaa;">
    <p>You're receiving this because you're listed as the PI${studyLeadName ? ' or study lead' : ''} for this study.</p>
    <p>&copy; ${new Date().getFullYear()} Penn Institute for Immunology &amp; Immune Health</p>
  </div>
</div>`
}
