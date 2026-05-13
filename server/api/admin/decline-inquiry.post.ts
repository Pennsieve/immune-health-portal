import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { inquiryId } = await readBody(event)

  if (!inquiryId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing inquiryId' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { error } = await supabase
    .from('inquiries')
    .update({ status: 'Declined' })
    .eq('id', inquiryId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to update inquiry' })
  }

  return { success: true }
})
