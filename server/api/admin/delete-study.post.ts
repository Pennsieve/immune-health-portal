import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { studyId } = await readBody(event)

  if (!studyId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing studyId' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const { error } = await supabase
    .from('studies')
    .delete()
    .eq('id', studyId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
