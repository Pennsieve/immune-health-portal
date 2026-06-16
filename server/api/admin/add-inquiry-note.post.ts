import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { inquiryId, text, author, timezone } = await readBody(event)

  if (!inquiryId || !text?.trim() || !author) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: inquiry, error: fetchErr } = await supabase
    .from('inquiries')
    .select('notes')
    .eq('id', inquiryId)
    .single()

  if (fetchErr) {
    throw createError({ statusCode: 404, statusMessage: 'Inquiry not found' })
  }

  const tz = timezone || DEFAULT_TIMEZONE
  const date = new Date().toLocaleDateString('en-US', { timeZone: tz, month: 'long', day: 'numeric', year: 'numeric' })

  const newNote = { author, date, text: text.trim() }
  const updatedNotes = [newNote, ...((inquiry.notes as unknown[]) || [])]

  const { error } = await supabase
    .from('inquiries')
    .update({ notes: updatedNotes })
    .eq('id', inquiryId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true, note: newNote }
})
