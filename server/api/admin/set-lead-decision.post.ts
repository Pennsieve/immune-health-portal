import { serverSupabaseServiceRole } from '#supabase/server'

// Record the intro-meeting go/no-go for a lead.
//   'proceed' → the lead advances toward the full intake (status returns to
//               'Lead'); the "Send full intake form" button unlocks once the
//               checklist is complete.
//   'hold'    → the investigator needs time (funding, IRB, …); the lead is
//               parked as 'On Hold' with a follow-up date and drops out of the
//               active queue until an admin resumes it (picks 'proceed').
// Only meaningful in the lead phase — allowed from 'Lead' or 'On Hold'.
export default defineEventHandler(async (event) => {
  const { inquiryId, decision, holdUntil, timezone } = await readBody(event)

  if (!inquiryId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing inquiryId' })
  }
  if (decision !== 'proceed' && decision !== 'hold') {
    throw createError({ statusCode: 400, statusMessage: 'decision must be "proceed" or "hold"' })
  }
  if (decision === 'hold' && !/^\d{4}-\d{2}-\d{2}$/.test(holdUntil || '')) {
    throw createError({ statusCode: 400, statusMessage: 'A follow-up date (YYYY-MM-DD) is required to pause a lead' })
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
  if (inquiry.status !== 'Lead' && inquiry.status !== 'On Hold') {
    throw createError({ statusCode: 409, statusMessage: 'This inquiry is past the lead stage' })
  }

  const tz = timezone || DEFAULT_TIMEZONE
  const now = Date.now()

  let status: string
  let activityItem: { dotClass: string; title: string; date: string; ts: number }

  if (decision === 'proceed') {
    status = 'Lead'
    const resumed = inquiry.status === 'On Hold'
    activityItem = {
      dotClass: '',
      title: resumed ? 'Lead resumed — cleared to proceed to full intake' : 'Cleared to proceed to full intake',
      date: new Date(now).toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' }),
      ts: now,
    }
  }
  else {
    status = 'On Hold'
    // Parse the date at local midnight so it doesn't slip a day across zones.
    const followUp = new Date(`${holdUntil}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    activityItem = {
      dotClass: 'warn',
      title: `Lead paused — follow up ${followUp}`,
      date: new Date(now).toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' }),
      ts: now,
    }
  }

  const updatedActivity = [activityItem, ...((inquiry.activity as unknown[]) || [])]

  const { error: updateErr } = await supabase
    .from('inquiries')
    .update({
      status,
      lead_decision: decision,
      hold_until: decision === 'hold' ? holdUntil : null,
      activity: updatedActivity,
    })
    .eq('id', inquiryId)

  if (updateErr) {
    throw createError({ statusCode: 500, statusMessage: updateErr.message })
  }

  return { success: true, status, holdUntil: decision === 'hold' ? holdUntil : null, activityItem }
})
