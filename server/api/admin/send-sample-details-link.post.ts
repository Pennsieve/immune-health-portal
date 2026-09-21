import { serverSupabaseServiceRole } from '#supabase/server'
import { createSampleDetailsToken } from '~/server/utils/signing'
import { DEFAULT_TIMEZONE } from '~/server/utils/constants'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { studyId, timezone } = body

  if (!studyId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing studyId' })
  }
  if (!config.signingSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Signing secret not configured' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const { data: study, error } = await supabase
    .from('studies')
    .select('name, pi, study_lead')
    .eq('id', studyId)
    .single()

  if (error || !study) {
    throw createError({ statusCode: 404, statusMessage: 'Study not found' })
  }

  const pi = study.pi as { name?: string; email?: string } | null
  if (!pi?.email) {
    throw createError({ statusCode: 400, statusMessage: 'This study has no PI email on file' })
  }
  const studyLead = study.study_lead as { name?: string; email?: string } | null

  const token = createSampleDetailsToken(studyId, pi.email, config.signingSecret)
  const formUrl = `${config.siteUrl}/sample-details/${studyId}?token=${token}`

  await sendEmail({
    to: piRecipients({ email: pi.email, name: pi.name || 'Principal Investigator' }, studyLead),
    subject: `Reminder: complete the Sample Details Form — ${study.name as string}`,
    html: buildReminderEmail(pi.name || '', study.name as string, formUrl),
  })

  const tz = timezone || DEFAULT_TIMEZONE
  const sentDate = new Date().toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })
  const { error: updateErr } = await supabase
    .from('studies')
    .update({ sample_details_sent_date: sentDate })
    .eq('id', studyId)

  if (updateErr) {
    console.error('[send-sample-details-link] Supabase error:', updateErr)
    throw createError({ statusCode: 500, statusMessage: 'Link emailed, but failed to record the sent date' })
  }

  return { success: true, sentDate }
})

function buildReminderEmail(piName: string, studyName: string, formUrl: string): string {
  return `
<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;line-height:1.6;">
  <div style="background:#011F5B;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Sample Details Form · I3H</h1>
  </div>
  <div style="padding:30px;border:1px solid #e0e0e0;border-top:none;">
    <p>Dear ${piName},</p>
    <p>Just a reminder to complete the Sample Details Form for <strong>${studyName}</strong> so the I3H team can finish coordinating site initiation.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${formUrl}"
         style="background:#011F5B;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
        Complete the Sample Details Form →
      </a>
    </div>
    <p style="font-size:0.82rem;color:#888;">If the button doesn't work, copy this link into your browser:<br>
      <a href="${formUrl}" style="color:#011F5B;word-break:break-all;">${formUrl}</a>
    </p>
    <p>Best regards,<br>The I3H Operations Team</p>
  </div>
</div>`
}
