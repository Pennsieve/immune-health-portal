import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { studyId, timezone, name, abbreviation, pi, studyLead, affiliation, affiliationOrg, irb, stage, additionalNotes, cohort, budget, intakeDetails, keyPersonnel, changeNote } = await readBody(event)

  if (!studyId || !name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Missing studyId or name' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: study, error: fetchErr } = await supabase
    .from('studies')
    .select('activity, lifecycle')
    .eq('id', studyId)
    .single()

  if (fetchErr || !study) {
    console.error('[update-study] fetch error:', fetchErr)
    throw createError({ statusCode: 404, statusMessage: 'Study not found' })
  }

  const now = new Date()
  const tz = timezone || DEFAULT_TIMEZONE
  const dateStr = now.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })

  const newItem = {
    dotClass: '',
    title: 'Study record updated',
    date: dateStr,
    ts: Date.now(),
    ...(changeNote ? { note: changeNote } : {}),
  }

  const updatedActivity = [newItem, ...((study.activity as unknown[]) || [])]

  const dateOnly = now.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })
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
  // Normalize: if any later step is done, earlier steps must also be done
  const updatedLifecycle = base.map((step, i) => {
    if (step.status !== 'done' && base.slice(i + 1).some(s => s.status === 'done')) {
      return { ...step, status: 'done' as const, date: step.date === '—' || step.date === 'in progress' ? dateOnly : step.date }
    }
    return step
  })

  let updateErr: unknown
  try {
    const result = await supabase
      .from('studies')
      .update({
        name: name.trim(),
        abbreviation: abbreviation?.trim() ?? null,
        pi,
        study_lead: studyLead ?? null,
        affiliation,
        affiliation_org: affiliationOrg,
        irb,
        stage,
        additional_notes: additionalNotes || null,
        cohort,
        budget,
        ...(intakeDetails !== undefined ? { intake_details: intakeDetails } : {}),
        ...(keyPersonnel !== undefined ? { key_personnel: keyPersonnel } : {}),
        activity: updatedActivity,
        lifecycle: updatedLifecycle,
      })
      .eq('id', studyId)
    updateErr = result.error
  }
  catch (e) {
    console.error('[update-study] unexpected exception during update:', e)
    throw createError({ statusCode: 500, statusMessage: `Unexpected error: ${String(e)}` })
  }

  if (updateErr) {
    console.error('[update-study] Supabase error:', JSON.stringify(updateErr))
    throw createError({ statusCode: 500, statusMessage: (updateErr as { message: string }).message })
  }

  return { success: true, activityItem: newItem, lifecycle: updatedLifecycle }
})
