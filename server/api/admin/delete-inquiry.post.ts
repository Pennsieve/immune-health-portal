import { serverSupabaseServiceRole } from '#supabase/server'

// Only a Declined inquiry can be deleted — anything still active (Lead,
// Billing Sent, New) or already Approved (which has a real study record
// built from it) should be handled through its normal lifecycle instead.
export default defineEventHandler(async (event) => {
  const { inquiryId } = await readBody(event)

  if (!inquiryId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing inquiryId' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: inquiry, error: fetchErr } = await supabase
    .from('inquiries')
    .select('status')
    .eq('id', inquiryId)
    .single()

  if (fetchErr || !inquiry) {
    throw createError({ statusCode: 404, statusMessage: 'Inquiry not found' })
  }
  if (inquiry.status !== 'Declined') {
    throw createError({ statusCode: 409, statusMessage: 'Only a declined inquiry can be deleted' })
  }

  const { error } = await supabase
    .from('inquiries')
    .delete()
    .eq('id', inquiryId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
