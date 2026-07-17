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

  const supabase = serverSupabaseServiceRole(event)
  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .select('id, status, pi, affiliation, affiliation_org, lead_details')
    .eq('id', inquiryId)
    .single()

  if (error || !inquiry) {
    throw createError({ statusCode: 404, statusMessage: 'Inquiry not found' })
  }
  if (inquiry.status !== 'Lead' && inquiry.status !== 'Intake Sent') {
    throw createError({ statusCode: 409, statusMessage: 'The intake form for this inquiry has already been submitted' })
  }

  const lead = (inquiry.pi as { name: string; email: string }) || { name: '', email: '' }
  const leadDetails = (inquiry.lead_details as Record<string, unknown>) || {}
  const AFFILIATION_TYPES: Record<string, string> = {
    Internal: 'internal',
    External: 'external',
    Industry: 'industry',
  }

  return {
    lead,
    affiliation: AFFILIATION_TYPES[inquiry.affiliation as string] || 'internal',
    organization: (inquiry.affiliation_org as string) || '',
    researchSummary: (leadDetails.researchSummary as string) || '',
  }
})
