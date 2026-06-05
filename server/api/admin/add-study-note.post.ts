import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { studyId, text, author } = await readBody(event)

  if (!studyId || !text?.trim() || !author) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
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
    + ' · internal note'

  const newItem = {
    dotClass: 'm',
    title: author,
    date: dateStr,
    note: text.trim(),
    ts: Date.now(),
  }

  const updatedActivity = [newItem, ...((study.activity as unknown[]) || [])]

  const { error } = await supabase
    .from('studies')
    .update({ activity: updatedActivity })
    .eq('id', studyId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true, activityItem: newItem }
})
