import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const {
    inquiryId, studyName, abbreviation, pi, studyLead,
    affiliation, affiliationOrg, irb, objectives, phlebotomy,
    metadata, sampleType, cohortSubjects, cohortTimepoints,
    servicesDetail, budgetCode, fundingName, baName, baEmail, contractingContact, estimate,
  } = await readBody(event)

  if (!inquiryId || !studyName?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Missing inquiryId or studyName' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const services = (servicesDetail as Array<{ name: string }>).map(s => s.name).join(', ')

  const { error } = await supabase
    .from('inquiries')
    .update({
      study_name: studyName.trim(),
      abbreviation: abbreviation?.trim() ?? null,
      pi,
      study_lead: studyLead ?? null,
      affiliation,
      affiliation_org: affiliationOrg,
      irb,
      objectives: objectives || null,
      phlebotomy: phlebotomy || null,
      metadata: metadata || null,
      sample_type: sampleType || null,
      cohort_subjects: cohortSubjects,
      cohort_timepoints: cohortTimepoints,
      services,
      services_detail: servicesDetail,
      estimate: estimate ?? null,
      budget_code: budgetCode || null,
      funding_name: fundingName || null,
      ba_name: baName || null,
      ba_email: baEmail || null,
      contracting_contact: contractingContact || null,
    })
    .eq('id', inquiryId)

  if (error) {
    console.error('[update-inquiry] Supabase error:', JSON.stringify(error))
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
