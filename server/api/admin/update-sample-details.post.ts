import { serverSupabaseServiceRole } from '#supabase/server'
import { cleanSampleDetails } from '~/utils/sampleDetailsFields'
import { DEFAULT_TIMEZONE } from '~/server/utils/constants'

// Lets an I3H admin correct the PI's Sample Details Form answers after
// they've submitted (e.g. a typo, or the study team gave an update over
// email/Slack instead of resubmitting the form). The admin UI keeps this
// disabled until something has actually been submitted — see the
// "Update responses" button on the Cohort & Samples tab.
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { studyId, answers, timezone } = body

  if (!studyId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing studyId' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const { data: study, error: fetchErr } = await supabase
    .from('studies')
    .select('activity')
    .eq('id', studyId)
    .single()

  if (fetchErr || !study) {
    throw createError({ statusCode: 404, statusMessage: 'Study not found' })
  }

  const clean = cleanSampleDetails((answers as Record<string, unknown>) || {})

  const tz = timezone || DEFAULT_TIMEZONE
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })

  const activityItem = {
    dotClass: 'g',
    title: 'Sample details form updated by I3H admin',
    date: dateStr,
    ts: Date.now(),
  }
  const updatedActivity = [activityItem, ...((study.activity as unknown[]) || [])]

  const { error: updateErr } = await supabase
    .from('studies')
    .update({ sample_details: clean, activity: updatedActivity })
    .eq('id', studyId)

  if (updateErr) {
    console.error('[update-sample-details] Supabase error:', updateErr)
    throw createError({ statusCode: 500, statusMessage: 'Failed to save changes' })
  }

  return { success: true, activityItem, sampleDetails: clean }
})
