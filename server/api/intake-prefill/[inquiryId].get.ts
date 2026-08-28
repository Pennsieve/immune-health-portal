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

  // The PI-facing full-intake page only shows Funding & Affiliation (billing)
  // fields now — everything else is captured internally by the I3H team — so
  // this only needs to return enough to pre-fill those.
  const supabase = serverSupabaseServiceRole(event)
  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .select('status, affiliation, affiliation_org, budget_code, funding_name, ba_name, ba_email, contracting_contact, intake_details')
    .eq('id', inquiryId)
    .single()

  if (error || !inquiry) {
    throw createError({ statusCode: 404, statusMessage: 'Inquiry not found' })
  }
  if (inquiry.status !== 'Lead' && inquiry.status !== 'Billing Sent') {
    throw createError({ statusCode: 409, statusMessage: 'The intake form for this inquiry has already been submitted' })
  }

  const AFFILIATION_TYPES: Record<string, string> = {
    Internal: 'internal',
    External: 'external',
    Industry: 'industry',
  }
  const intakeDetails = (inquiry.intake_details as Record<string, unknown>) || {}

  return {
    affiliation: AFFILIATION_TYPES[inquiry.affiliation as string] || 'internal',
    organization: (inquiry.affiliation_org as string) || '',
    budgetCode: (inquiry.budget_code as string) || '',
    fundingName: (inquiry.funding_name as string) || '',
    baName: (inquiry.ba_name as string) || '',
    baEmail: (inquiry.ba_email as string) || '',
    contractingContact: (inquiry.contracting_contact as string) || '',
    ilabsId: (intakeDetails.ilabsId as string) || '',
  }
})
