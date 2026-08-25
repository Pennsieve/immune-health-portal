import { serverSupabaseServiceRole } from '#supabase/server'

const VALID_STAGES = ['Processing', 'Complete']

export default defineEventHandler(async (event) => {
  const { studyId, stage, timezone } = await readBody(event)

  if (!studyId || !VALID_STAGES.includes(stage)) {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid fields' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: study, error: fetchErr } = await supabase
    .from('studies')
    .select('lifecycle, activity')
    .eq('id', studyId)
    .single()

  if (fetchErr || !study) {
    throw createError({ statusCode: 404, statusMessage: 'Study not found' })
  }

  const now = new Date()
  const tz = timezone || DEFAULT_TIMEZONE
  const dateOnly = now.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })
  const dateStr = dateOnly + ' · ' + now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })

  type LifecycleStep = { label: string; date: string; status: 'done' | 'active' | 'pending' }
  const base = ((study.lifecycle as LifecycleStep[]) || []).map((step) => {
    if (step.label === 'Processing') {
      if (stage === 'Complete') return { ...step, status: 'done' as const, date: (step.date === '—' || step.date === 'in progress') ? dateOnly : step.date }
      if (stage === 'Processing') return { ...step, status: 'active' as const, date: 'in progress' }
    }
    if (step.label === 'Complete') {
      if (stage === 'Complete') return { ...step, status: 'done' as const, date: dateOnly }
      if (stage === 'Processing') return { ...step, status: 'pending' as const, date: '—' }
    }
    return step
  })
  const updatedLifecycle = base.map((step, i) => {
    if (step.status !== 'done' && base.slice(i + 1).some(s => s.status === 'done')) {
      return { ...step, status: 'done' as const, date: step.date === '—' || step.date === 'in progress' ? dateOnly : step.date }
    }
    return step
  })

  const activityItem = {
    dotClass: 'g',
    title: stage === 'Complete' ? 'Study marked Complete' : 'Study reopened — back to Processing',
    date: dateStr,
    ts: Date.now(),
  }
  const updatedActivity = [activityItem, ...((study.activity as unknown[]) || [])]

  const { error: updateErr } = await supabase
    .from('studies')
    .update({ stage, lifecycle: updatedLifecycle, activity: updatedActivity })
    .eq('id', studyId)

  if (updateErr) {
    throw createError({ statusCode: 500, statusMessage: updateErr.message })
  }

  return { success: true, stage, lifecycle: updatedLifecycle, activityItem }
})
