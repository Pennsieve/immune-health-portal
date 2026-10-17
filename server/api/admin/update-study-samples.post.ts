import { serverSupabaseServiceRole } from '#supabase/server'
import type { CollectionGroup, CollectionVisit } from '~/types/index'
import { expectedCellCount } from '~/utils/visitFields'

export default defineEventHandler(async (event) => {
  const { studyId, sampleProgress, timezone, author } = await readBody(event)

  if (!studyId || typeof sampleProgress !== 'object' || sampleProgress === null || Array.isArray(sampleProgress)) {
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
    subjects: number; totalSamples: number; processedSamples: number
    groups?: CollectionGroup[]; visits?: CollectionVisit[]
  }
  const groups = cohort.groups ?? []
  const visits = cohort.visits ?? []

  // Clamp every cell server-side to [0, expected] rather than trusting the
  // client's own clamping, and drop any cell for a group/visit that isn't
  // part of the current cohort design (stale index, visit removed, etc.).
  const cleaned: Record<string, Record<string, number>> = {}
  let processedSamples = 0
  groups.forEach((g, i) => {
    const rowInput = (sampleProgress as Record<string, unknown>)[String(i)]
    if (!rowInput || typeof rowInput !== 'object') return
    const row: Record<string, number> = {}
    visits.forEach((v) => {
      const expected = expectedCellCount(g, v.id)
      if (expected <= 0) return
      const raw = Number((rowInput as Record<string, unknown>)[v.id])
      const clamped = Math.max(0, Math.min(Number.isFinite(raw) ? raw : 0, expected))
      if (clamped > 0) row[v.id] = clamped
      processedSamples += clamped
    })
    if (Object.keys(row).length) cleaned[String(i)] = row
  })

  const updatedCohort = { ...cohort, sampleProgress: cleaned, processedSamples }

  const now = new Date()
  const tz = timezone || DEFAULT_TIMEZONE
  const dateStr = now.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })

  const activityItem = {
    dotClass: 'g',
    title: `Processed samples updated — ${processedSamples} / ${cohort.totalSamples}`,
    date: dateStr,
    ts: Date.now(),
    ...(author ? { author } : {}),
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
