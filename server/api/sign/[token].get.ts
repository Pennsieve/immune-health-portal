import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const pathToken = getRouterParam(event, 'token')!
  const parts = pathToken.split('-')
  const studyId = parts.slice(0, -1).join('-')

  const supabase = serverSupabaseServiceRole(event)
  const { data, error } = await supabase
    .from('studies')
    .select('name, abbreviation, irb, pi, study_lead, affiliation, affiliation_org, cohort, budget, intake_details, agreements(*)')
    .eq('id', studyId)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Study not found' })
  }

  return data
})
