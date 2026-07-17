import { serverSupabaseServiceRole } from '#supabase/server'
import { createIntakeToken } from '~/server/utils/signing'

// Email the full study-intake form link to a lead. Only valid while the
// inquiry is still in the lead phase ('Lead' or 'Intake Sent' — re-sending
// generates a fresh 30-day token).
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { inquiryId, timezone } = await readBody(event)

  if (!inquiryId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing inquiryId' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: inquiry, error: fetchErr } = await supabase
    .from('inquiries')
    .select('*')
    .eq('id', inquiryId)
    .single()

  if (fetchErr || !inquiry) {
    throw createError({ statusCode: 404, statusMessage: 'Inquiry not found' })
  }
  if (inquiry.status !== 'Lead' && inquiry.status !== 'Intake Sent') {
    throw createError({ statusCode: 409, statusMessage: 'This inquiry has already submitted the full intake form' })
  }

  // The introductory-meeting checklist must be complete before the form goes out
  const checklist = (inquiry.feasibility as Array<{ label: string; checked: boolean }>) || []
  if (!checklist.length || !checklist.every(item => item.checked)) {
    throw createError({ statusCode: 409, statusMessage: 'Complete the lead checklist before sending the intake form' })
  }

  const lead = inquiry.pi as { name: string; email: string }
  if (!lead?.email) {
    throw createError({ statusCode: 400, statusMessage: 'Inquiry has no contact email' })
  }

  const tz = timezone || DEFAULT_TIMEZONE
  const sentDate = new Date().toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })

  const token = createIntakeToken(inquiryId as string, lead.email, config.signingSecret)
  const intakeUrl = `${config.siteUrl}/full-intake/${inquiryId}?token=${token}`

  const html = `
<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;line-height:1.6;">
  <div style="background:#011F5B;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Study Intake Form · I3H</h1>
  </div>
  <div style="padding:30px;border:1px solid #e0e0e0;border-top:none;">
    <p>Dear ${lead.name},</p>
    <p>Thank you for speaking with the Institute for Immunology &amp; Immune Health team. We're excited about the possibility of working together on your study.</p>
    <p>The next step is our <strong>full study intake form</strong>. It collects the study design, sample, and logistics details our team needs to review feasibility and prepare an estimate. It takes a bit of time — you may want your IRB details, cohort numbers, and funding information handy.</p>
    <div style="margin:28px 0;text-align:center;">
      <a href="${intakeUrl}"
         style="background:#011F5B;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:0.92rem;">
        Complete the Study Intake Form →
      </a>
    </div>
    <p style="font-size:0.82rem;color:#888;">This link is unique to you and expires in <strong>30 days</strong>. If it expires before you finish, just reply to this email and we'll send a new one.</p>
    <p>Best regards,<br>The I3H Operations Team</p>
  </div>
  <div style="text-align:center;padding:20px;font-size:12px;color:#aaa;">
    <p>This link is unique to you. Please do not forward this email.</p>
    <p>&copy; ${new Date().getFullYear()} Penn Institute for Immunology &amp; Immune Health</p>
  </div>
</div>`

  await sendEmail({
    to: [{ email: lead.email, name: lead.name }],
    subject: 'Next step: your I3H study intake form',
    html,
  })

  const { error: updateErr } = await supabase
    .from('inquiries')
    .update({ status: 'Intake Sent', intake_sent_date: sentDate })
    .eq('id', inquiryId)

  if (updateErr) {
    throw createError({ statusCode: 500, statusMessage: 'Email sent but failed to update inquiry status' })
  }

  return { success: true, sentDate }
})
