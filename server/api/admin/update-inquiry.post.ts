import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const {
    inquiryId, studyName, abbreviation, pi, studyLead,
    affiliation, affiliationOrg, irb, objectives, phlebotomy,
    metadata, sampleType, cohortSubjects,
    servicesDetail, budgetCode, fundingName, baName, baEmail, contractingContact, estimate,
    intakeDetails, collectionGroups, collectionVisits, keyPersonnel, changeNote, author, timezone,
  } = await readBody(event)

  if (!inquiryId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing inquiryId' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // A processed inquiry (approved or declined) is terminal and can no longer be edited.
  const { data: existing, error: fetchErr } = await supabase
    .from('inquiries')
    .select('status, activity')
    .eq('id', inquiryId)
    .single()
  if (fetchErr || !existing) {
    throw createError({ statusCode: 404, statusMessage: 'Inquiry not found' })
  }
  const currentStatus = (existing as Record<string, unknown>).status
  if (currentStatus === 'Approved' || currentStatus === 'Declined') {
    throw createError({ statusCode: 409, statusMessage: 'This inquiry has already been processed and can no longer be edited' })
  }

  // Record the edit in the inquiry's activity log so admins can see what changed
  const tz = timezone || DEFAULT_TIMEZONE
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })
  const activityItem = {
    dotClass: '',
    title: 'Inquiry details edited',
    date: dateStr,
    ts: Date.now(),
    ...(author ? { author } : {}),
    ...(changeNote ? { note: changeNote } : {}),
  }
  const updatedActivity = [activityItem, ...(((existing as Record<string, unknown>).activity as unknown[]) || [])]

  const services = (servicesDetail as Array<{ name: string }>).map(s => s.name).join(', ')

  const updateData: Record<string, unknown> = {
    study_name: studyName?.trim() || null,
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
    services,
    services_detail: servicesDetail,
    estimate: estimate ?? null,
    budget_code: budgetCode || null,
    funding_name: fundingName || null,
    ba_name: baName || null,
    ba_email: baEmail || null,
    contracting_contact: contractingContact || null,
  }
  // Expanded intake answers + cohort matrix (only overwrite when provided)
  if (intakeDetails !== undefined) updateData.intake_details = intakeDetails ?? {}
  if (collectionGroups !== undefined) updateData.sample_schedule = collectionGroups ?? []
  if (collectionVisits !== undefined) updateData.collection_visits = collectionVisits ?? []
  if (keyPersonnel !== undefined) updateData.key_personnel = keyPersonnel ?? []
  updateData.activity = updatedActivity

  const { error } = await supabase
    .from('inquiries')
    .update(updateData)
    .eq('id', inquiryId)

  if (error) {
    console.error('[update-inquiry] Supabase error:', JSON.stringify(error))
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true, activityItem }
})
