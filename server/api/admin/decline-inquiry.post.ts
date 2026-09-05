import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { inquiryId } = await readBody(event)

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

  const declinedAt = new Date().toLocaleDateString('en-US', { timeZone: DEFAULT_TIMEZONE, month: 'short', day: 'numeric', year: 'numeric' })
  const activityItem = {
    dotClass: 'w',
    title: 'Inquiry declined',
    date: declinedAt,
    ts: Date.now(),
  }
  const updatedActivity = [activityItem, ...((inquiry.activity as unknown[]) || [])]

  const { error } = await supabase
    .from('inquiries')
    .update({ status: 'Declined', activity: updatedActivity })
    .eq('id', inquiryId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to update inquiry' })
  }

  // Send decline email — best-effort, does not fail the request if email fails
  try {
    const pi = inquiry.pi as { name: string; email: string }
    const studyLead = inquiry.study_lead as { name: string; email: string } | null
    // Leads declined before the full intake have no study name
    const studyName = inquiry.study_name as string | null
    const abbreviation = inquiry.abbreviation as string | null
    const subjectLine = `Update on your I3H inquiry${studyName ? ` — ${studyName}` : ''}`
    const inquiryPhrase = studyName
      ? `your inquiry for <strong>${studyName}${abbreviation ? ` (${abbreviation})` : ''}</strong>`
      : 'your inquiry'

    const declinedHtml = `
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2d3640;line-height:1.75;font-size:0.92rem;font-weight:300;">
        <div style="padding:1.6rem 1.6rem 2rem;">

          <div style="padding-bottom:1.2rem;border-bottom:1px solid #e8e4dc;margin-bottom:1.4rem;">
            <div style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background:#011f5b;color:#fff;font-family:'Courier New',Courier,monospace;font-size:9px;font-weight:700;border-radius:3px;letter-spacing:0.03em;vertical-align:middle;">I3H</div>
            <span style="display:inline-block;vertical-align:middle;margin-left:8px;font-weight:600;color:#011f5b;font-size:1rem;"><font color="#011f5b">Immune Health</font></span>
          </div>

          <h3 style="margin:0 0 0.8rem;font-size:1.1rem;font-weight:600;color:#011f5b;"><font color="#011f5b">${subjectLine}</font></h3>

          <p style="margin:0 0 0.8rem;">Dear ${pi.name},</p>

          <p style="margin:0 0 0.8rem;">Thank you for submitting ${inquiryPhrase} to the Institute for Immunology &amp; Immune Health. After careful review of feasibility and current capacity, we are unable to move forward at this time.</p>

          <p style="margin:0 0 1rem;">We understand this may be disappointing, and we appreciate the time you invested in preparing your submission. If your study requirements change, or if you would like to discuss alternative approaches, we encourage you to reach out directly.</p>

          <p style="font-size:0.85rem;color:#7f8c8d;margin-top:1.4rem;font-weight:300;">
            Questions or would like to discuss further? Contact the I3H team at
            <a href="mailto:${config.adminEmail}" style="color:#011f5b;text-decoration:none;"><span style="color:#011f5b;text-decoration:underline;">${config.adminEmail}</span></a>.
          </p>

          <div style="font-size:0.7rem;color:#7f8c8d;margin-top:1.6rem;padding-top:1rem;border-top:1px solid #e8e4dc;">
            Institute for Immunology &amp; Immune Health · Perelman School of Medicine, University of Pennsylvania · 421 Curie Boulevard, Philadelphia, PA 19104.
            This message contains research operations information and is intended for the named recipient.
          </div>
        </div>
      </div>
    `

    await sendEmail({
      to: piRecipients(pi, studyLead),
      subject: subjectLine,
      html: declinedHtml,
    })
  }
  catch (err) {
    console.error('Failed to send decline email:', err)
  }

  return { success: true }
})
