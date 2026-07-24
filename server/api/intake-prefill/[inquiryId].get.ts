import { serverSupabaseServiceRole } from '#supabase/server'
import { verifyIntakeToken } from '~/server/utils/signing'

// Public, token-gated prefill data for the full intake form. The token is
// minted by /api/admin/send-intake-link and carried in the emailed URL.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const inquiryId = getRouterParam(event, 'inquiryId')
  const { token } = getQuery(event)

  if (!inquiryId || !token || typeof token !== 'string') {
    throw createError({ statusCode: 401, statusMessage: 'Missing or invalid link' })
  }

  let payload
  try {
    payload = verifyIntakeToken(token, config.signingSecret)
  }
  catch (err: unknown) {
    const message = (err as Error).message === 'token expired'
      ? 'This intake link has expired'
      : 'This intake link is invalid'
    throw createError({ statusCode: 401, statusMessage: message })
  }

  if (payload.inquiryId !== inquiryId) {
    throw createError({ statusCode: 401, statusMessage: 'This intake link is invalid' })
  }

  // Return everything the admin may have captured with the PI during the
  // introductory meeting, so the emailed full intake form opens pre-filled.
  const supabase = serverSupabaseServiceRole(event)
  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .select('id, status, study_name, abbreviation, objectives, pi, study_lead, affiliation, affiliation_org, irb, sample_type, phlebotomy, metadata, budget_code, funding_name, ba_name, ba_email, contracting_contact, services_detail, intake_details, sample_schedule, lead_details')
    .eq('id', inquiryId)
    .single()

  if (error || !inquiry) {
    throw createError({ statusCode: 404, statusMessage: 'Inquiry not found' })
  }
  if (inquiry.status !== 'Lead' && inquiry.status !== 'Intake Sent') {
    throw createError({ statusCode: 409, statusMessage: 'The intake form for this inquiry has already been submitted' })
  }

  const leadDetails = (inquiry.lead_details as Record<string, unknown>) || {}
  const AFFILIATION_TYPES: Record<string, string> = {
    Internal: 'internal',
    External: 'external',
    Industry: 'industry',
  }

  return {
    // Contact: `pi` holds the lead contact until enriched; `study_lead` is set
    // only once the admin fills it in during the meeting.
    pi: (inquiry.pi as { name: string; email: string }) || { name: '', email: '' },
    studyLead: (inquiry.study_lead as { name: string; email: string } | null) || null,
    studyName: (inquiry.study_name as string) || '',
    abbreviation: (inquiry.abbreviation as string) || '',
    objectives: (inquiry.objectives as string) || '',
    affiliation: AFFILIATION_TYPES[inquiry.affiliation as string] || 'internal',
    organization: (inquiry.affiliation_org as string) || '',
    irb: (inquiry.irb as string) || '',
    sampleType: (inquiry.sample_type as string) || '',
    phlebotomy: (inquiry.phlebotomy as string) || '',
    metadata: (inquiry.metadata as string) || '',
    budgetCode: (inquiry.budget_code as string) || '',
    fundingName: (inquiry.funding_name as string) || '',
    baName: (inquiry.ba_name as string) || '',
    baEmail: (inquiry.ba_email as string) || '',
    contractingContact: (inquiry.contracting_contact as string) || '',
    servicesDetail: (inquiry.services_detail as Array<{ name: string; qty: number }>) || [],
    intakeDetails: (inquiry.intake_details as Record<string, unknown>) || {},
    collectionGroups: (inquiry.sample_schedule as Array<{ name: string; subjects: number; samples: Record<string, number> }>) || [],
    researchSummary: (leadDetails.researchSummary as string) || '',
  }
})
