import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { studyId, processedSamples, timezone } = await readBody(event)

  if (!studyId || typeof processedSamples !== 'number' || isNaN(processedSamples) || processedSamples < 0) {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid fields' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: study, error: fetchErr } = await supabase
    .from('studies')
    .select('cohort, activity')
    .eq('id', studyId)
    .single()

  if (fetchErr || !study) {
    throw createError({ statusCode: 404, statusMessage: 'Study not found' })
  }

  const cohort = study.cohort as {
    subjects: number; totalSamples: number
    processedSamples: number
  }

  const clamped = Math.min(processedSamples, cohort.totalSamples)
  const updatedCohort = { ...cohort, processedSamples: clamped }

  const now = new Date()
  const tz = timezone || DEFAULT_TIMEZONE
  const dateStr = now.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })

  const activityItem = {
    dotClass: 'g',
    title: `Processed samples updated — ${clamped} / ${cohort.totalSamples}`,
    date: dateStr,
    ts: Date.now(),
  }

  const updatedActivity = [activityItem, ...((study.activity as unknown[]) || [])]

  const { error: updateErr } = await supabase
    .from('studies')
    .update({ cohort: updatedCohort, activity: updatedActivity })
    .eq('id', studyId)

  if (updateErr) {
    throw createError({ statusCode: 500, statusMessage: updateErr.message })
  }

  return { success: true, cohort: updatedCohort, activityItem }
})
