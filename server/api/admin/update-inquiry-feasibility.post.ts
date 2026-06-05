import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { inquiryId, feasibility } = await readBody(event)

  if (!inquiryId || !Array.isArray(feasibility)) {
    throw createError({ statusCode: 400, statusMessage: 'Missing inquiryId or feasibility' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const { error } = await supabase
    .from('inquiries')
    .update({ feasibility })
    .eq('id', inquiryId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
