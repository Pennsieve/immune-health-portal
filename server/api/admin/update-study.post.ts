import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { studyId, name } = await readBody(event)

  if (!studyId || !name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Missing studyId or name' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: study, error: fetchErr } = await supabase
    .from('studies')
    .select('activity')
    .eq('id', studyId)
    .single()

  if (fetchErr) {
    throw createError({ statusCode: 404, statusMessage: 'Study not found' })
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const newItem = {
    dotClass: '',
    title: `Study name updated to "${name.trim()}"`,
    date: dateStr,
    ts: Date.now(),
  }

  const updatedActivity = [newItem, ...((study.activity as unknown[]) || [])]

  const { error: updateErr } = await supabase
    .from('studies')
    .update({ name: name.trim(), activity: updatedActivity })
    .eq('id', studyId)

  if (updateErr) {
    throw createError({ statusCode: 500, statusMessage: updateErr.message })
  }

  return { success: true, activityItem: newItem }
})
