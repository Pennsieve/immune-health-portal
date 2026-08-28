import { serverSupabaseServiceRole } from '#supabase/server'
import { createIntakeToken } from '~/server/utils/signing'

// Email the billing form link to a lead. Only valid while the inquiry is
// still in the lead phase ('Lead' or 'Billing Sent' — re-sending generates a
// fresh 30-day token).
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
  if (inquiry.status !== 'Lead' && inquiry.status !== 'Billing Sent') {
    throw createError({ statusCode: 409, statusMessage: 'This inquiry has already submitted the billing form' })
  }

  // The introductory-meeting checklist must be complete before the form goes out
  const checklist = (inquiry.feasibility as Array<{ label: string; checked: boolean }>) || []
  if (!checklist.length || !checklist.every(item => item.checked)) {
    throw createError({ statusCode: 409, statusMessage: 'Complete the lead checklist before sending the billing form' })
  }

  // A fresh lead must be explicitly cleared to proceed (vs. paused/undecided).
  // Re-sends (status 'Billing Sent') are already past this gate.
  if (inquiry.status === 'Lead' && inquiry.lead_decision !== 'proceed') {
    throw createError({ statusCode: 409, statusMessage: 'Select "Proceed to next step" before sending the billing form' })
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
    <h1 style="color:#fff;margin:0;font-size:22px;">Billing Form · I3H</h1>
  </div>
  <div style="padding:30px;border:1px solid #e0e0e0;border-top:none;">
    <p>Dear ${lead.name},</p>
    <p>Thank you for speaking with the Institute for Immunology &amp; Immune Health team. We're excited about the possibility of working together on your study.</p>
    <p>The rest of your study intake was captured by our team during your intake conversation. The next step is our <strong>billing form</strong> — it collects your funding and affiliation details so we can prepare your agreement package. You may want your account/budget code or grants office contact information handy.</p>
    <div style="margin:28px 0;text-align:center;">
      <a href="${intakeUrl}"
         style="background:#011F5B;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:0.92rem;">
        Complete the Billing Form →
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
    subject: 'Next step: your I3H billing form',
    html,
  })

  const resent = inquiry.status === 'Billing Sent'
  const activityItem = {
    dotClass: '',
    title: resent ? 'Billing form re-sent to lead' : 'Billing form sent to lead',
    date: `${sentDate} · ${lead.email}`,
    ts: Date.now(),
  }
  const updatedActivity = [activityItem, ...((inquiry.activity as unknown[]) || [])]

  const { error: updateErr } = await supabase
    .from('inquiries')
    .update({ status: 'Billing Sent', intake_sent_date: sentDate, activity: updatedActivity })
    .eq('id', inquiryId)

  if (updateErr) {
    throw createError({ statusCode: 500, statusMessage: 'Email sent but failed to update inquiry status' })
  }

  return { success: true, sentDate, activityItem }
})
