import { serverSupabaseServiceRole } from '#supabase/server'
import { createStatusToken } from '~/server/utils/signing'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { studyId } = await readBody(event)

  if (!studyId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing studyId' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: study, error: fetchErr } = await supabase
    .from('studies')
    .select('name, pi, status_token_version')
    .eq('id', studyId)
    .single()

  if (fetchErr || !study) {
    console.error('[regenerate-status-link] fetch error:', fetchErr)
    throw createError({ statusCode: 404, statusMessage: fetchErr?.message ?? 'Study not found' })
  }

  const newVersion = ((study.status_token_version as number) ?? 1) + 1

  const { error: updateErr } = await supabase
    .from('studies')
    .update({ status_token_version: newVersion })
    .eq('id', studyId)

  if (updateErr) {
    console.error('[regenerate-status-link] update error:', updateErr)
    throw createError({ statusCode: 500, statusMessage: updateErr.message })
  }

  const pi = study.pi as { name: string; email: string }
  const token = createStatusToken(studyId, pi.email, newVersion, config.signingSecret)
  const origin = config.siteUrl
  const statusUrl = `${origin}/status/${studyId}?token=${token}`

  await $fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.mailersendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      from: { email: config.mailersendFromEmail, name: config.mailersendFromName },
      to: [{ email: pi.email, name: pi.name }],
      subject: `Your updated study status link — ${study.name as string}`,
      html: buildEmail(pi.name, study.name as string, statusUrl),
    },
  })

  return { statusUrl }
})

function buildEmail(piName: string, studyName: string, statusUrl: string): string {
  return `
<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;line-height:1.6;">
  <div style="background:#011F5B;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Study Status Link · I3H</h1>
  </div>
  <div style="padding:30px;border:1px solid #e0e0e0;border-top:none;">
    <p>Dear ${piName},</p>
    <p>Your study status link for <strong>${studyName}</strong> has been updated. Use the button below to view your study's current stage, agreement status, and sample processing progress.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${statusUrl}"
         style="background:#1a7a4c;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
        View Study Status →
      </a>
    </div>
    <p style="font-size:0.82rem;color:#888;">If the button doesn't work, copy this link into your browser:<br>
      <a href="${statusUrl}" style="color:#011F5B;word-break:break-all;">${statusUrl}</a>
    </p>
    <p>Best regards,<br>The I3H Operations Team</p>
  </div>
  <div style="text-align:center;padding:20px;font-size:12px;color:#aaa;">
    <p>Any previous status links for this study are no longer valid.</p>
    <p>&copy; ${new Date().getFullYear()} Penn Institute for Immunology &amp; Immune Health</p>
  </div>
</div>`
}
