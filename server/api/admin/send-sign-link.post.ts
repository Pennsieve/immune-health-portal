import { serverSupabaseServiceRole } from '#supabase/server'
import { createSignToken } from '~/server/utils/signing'
import { AGREEMENT_IDS, AGREEMENT_NAMES } from '~/utils/agreements'
import { DEFAULT_TIMEZONE } from '~/server/utils/constants'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { studyId, agreementId, timezone } = body

  if (!studyId || !agreementId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing studyId or agreementId' })
  }
  if (!AGREEMENT_IDS.includes(agreementId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid agreement ID' })
  }
  if (!config.signingSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Signing secret not configured' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: study, error } = await supabase
    .from('studies')
    .select('name, abbreviation, pi')
    .eq('id', studyId)
    .single()

  if (error || !study) {
    throw createError({ statusCode: 404, statusMessage: 'Study not found' })
  }

  const pi = study.pi as { name: string; email: string }
  const token = createSignToken(studyId, agreementId, pi.email, config.signingSecret)
  const origin = config.siteUrl
  const signUrl = `${origin}/admin/sign/${studyId}-${agreementId}?token=${token}`
  const agreementName = AGREEMENT_NAMES[agreementId] ?? 'Agreement'

  await $fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.mailersendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      from: { email: config.mailersendFromEmail, name: config.mailersendFromName },
      to: [{ email: pi.email, name: pi.name }],
      subject: `Action required: Please sign the ${study.name} ${agreementName}`,
      html: buildEmail(pi.name, study.name, study.abbreviation as string, agreementName, signUrl),
    },
  })

  const tz = timezone || DEFAULT_TIMEZONE
  const sentDate = new Date().toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })
  await supabase
    .from('agreements')
    .update({ sent_date: sentDate })
    .eq('study_id', studyId)
    .eq('id', agreementId)

  return { success: true, sentDate }
})

function buildEmail(piName: string, studyName: string, abbr: string, agreementName: string, signUrl: string): string {
  return `
<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;line-height:1.6;">
  <div style="background:#011F5B;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Signature Requested · I3H</h1>
  </div>
  <div style="padding:30px;border:1px solid #e0e0e0;border-top:none;">
    <p>Dear ${piName},</p>
    <p>The Institute for Immunology &amp; Immune Health requires your signature on the
    <strong>${agreementName}</strong> for study <strong>${studyName} (${abbr.toUpperCase()})</strong>.</p>
    <p>Please review and sign the document using the button below. This link expires in <strong>48 hours</strong>.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${signUrl}"
         style="background:#011F5B;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
        Review &amp; Sign Document →
      </a>
    </div>
    <p style="font-size:0.82rem;color:#888;">If the button doesn't work, copy this link into your browser:<br>
      <a href="${signUrl}" style="color:#011F5B;word-break:break-all;">${signUrl}</a>
    </p>
    <p>Best regards,<br>The I3H Operations Team</p>
  </div>
  <div style="text-align:center;padding:20px;font-size:12px;color:#aaa;">
    <p>This link is unique to you and expires in 48 hours. Do not forward it.</p>
    <p>&copy; ${new Date().getFullYear()} Penn Institute for Immunology &amp; Immune Health</p>
  </div>
</div>`
}
