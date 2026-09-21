import { serverSupabaseServiceRole } from '#supabase/server'
import { verifySampleDetailsToken } from '~/server/utils/signing'
import { cleanSampleDetails, sampleDetailsRows, type SampleDetailsContact } from '~/utils/sampleDetailsFields'
import { DEFAULT_TIMEZONE } from '~/server/utils/constants'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)
  const { studyId, token, answers, timezone } = body

  if (!studyId || !token || typeof token !== 'string') {
    throw createError({ statusCode: 401, statusMessage: 'Missing or invalid link' })
  }

  let payload
  try {
    payload = verifySampleDetailsToken(token, config.signingSecret)
    if (payload.studyId !== studyId) throw new Error('study mismatch')
  }
  catch (err: unknown) {
    const message = (err as Error).message === 'token expired'
      ? 'This link has expired — contact your I3H representative for a new one'
      : 'This link is invalid'
    throw createError({ statusCode: 401, statusMessage: message })
  }

  const supabase = serverSupabaseServiceRole(event)
  const { data: study, error: fetchErr } = await supabase
    .from('studies')
    .select('name, pi, study_lead, activity')
    .eq('id', studyId)
    .single()

  if (fetchErr || !study) {
    throw createError({ statusCode: 404, statusMessage: 'Study not found' })
  }

  const pi = study.pi as { name?: string; email?: string }
  if ((pi.email || '').toLowerCase() !== payload.piEmail.toLowerCase()) {
    throw createError({ statusCode: 403, statusMessage: 'Token does not match this study' })
  }

  const clean = cleanSampleDetails((answers as Record<string, unknown>) || {})

  const tz = timezone || DEFAULT_TIMEZONE
  const now = new Date()
  const submittedDate = now.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })

  const activityItem = {
    dotClass: 'g',
    title: 'Sample details form submitted',
    date: submittedDate,
    ts: Date.now(),
  }
  const updatedActivity = [activityItem, ...((study.activity as unknown[]) || [])]

  const { error: updateErr } = await supabase
    .from('studies')
    .update({ sample_details: clean, activity: updatedActivity })
    .eq('id', studyId)

  if (updateErr) {
    console.error('[submit-sample-details] Supabase error:', updateErr)
    throw createError({ statusCode: 500, statusMessage: 'Failed to save your answers' })
  }

  // Notify the I3H team — a failure here must not fail the (already committed) save.
  try {
    const studyLead = study.study_lead as { name?: string; email?: string } | null
    await sendEmail({
      to: [{ email: config.adminEmail, name: 'Immune Health Admin' }],
      subject: `📋 Sample details submitted — ${study.name as string}`,
      html: buildStaffAlertEmail(study.name as string, pi.name || '', studyLead?.name, clean.operationalContacts || [], sampleDetailsRows(clean), studyId, config.siteUrl),
    })
  }
  catch (err) {
    console.error('[submit-sample-details] staff alert email failed:', err)
  }

  return { success: true, activityItem }
})

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildStaffAlertEmail(
  studyName: string,
  piName: string,
  studyLeadName: string | undefined,
  contacts: SampleDetailsContact[],
  rows: Array<{ label: string; value: string }>,
  studyId: string,
  siteUrl: string,
): string {
  const contactRows = contacts.map(c => `
    <tr>
      <td style="padding:4px 10px 4px 0;border-bottom:1px solid #eee;">${esc(c.name || '—')}</td>
      <td style="padding:4px 10px 4px 0;border-bottom:1px solid #eee;">${esc(c.role || '—')}</td>
      <td style="padding:4px 0;border-bottom:1px solid #eee;">${esc(c.email || '—')}</td>
    </tr>`).join('')
  const contactsBlock = contacts.length
    ? `
    <p style="font-size:0.86rem;margin:0 0 6px;"><strong>Operational contacts &amp; roles</strong></p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 18px;font-size:0.84rem;">
      <tr>
        <th style="text-align:left;padding:4px 10px 4px 0;color:#7f8c8d;font-size:0.72rem;text-transform:uppercase;">Name</th>
        <th style="text-align:left;padding:4px 10px 4px 0;color:#7f8c8d;font-size:0.72rem;text-transform:uppercase;">Role</th>
        <th style="text-align:left;padding:4px 0;color:#7f8c8d;font-size:0.72rem;text-transform:uppercase;">Email</th>
      </tr>
      ${contactRows}
    </table>`
    : ''

  const tableRows = rows.map(r => `
    <tr>
      <td style="padding:6px 14px 6px 0;border-bottom:1px solid #eee;font-weight:600;color:#011F5B;vertical-align:top;white-space:nowrap;">${esc(r.label)}</td>
      <td style="padding:6px 0;border-bottom:1px solid #eee;font-size:0.86rem;line-height:1.5;">${esc(r.value)}</td>
    </tr>`).join('')

  return `
<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;line-height:1.6;">
  <div style="background:#011F5B;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Sample Details Form Submitted · I3H</h1>
  </div>
  <div style="padding:30px;border:1px solid #e0e0e0;border-top:none;">
    <p><strong>${esc(piName)}</strong>${studyLeadName ? ` / ${esc(studyLeadName)}` : ''} just submitted the Sample Details Form for <strong>${esc(studyName)}</strong>.</p>
    ${contactsBlock}
    <table style="width:100%;border-collapse:collapse;margin:18px 0;">${tableRows}</table>
    <div style="text-align:center;margin:28px 0;">
      <a href="${siteUrl}/admin/studies/${studyId}"
         style="background:#011F5B;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
        Open in Admin Console →
      </a>
    </div>
  </div>
</div>`
}
