import { serverSupabaseServiceRole } from '#supabase/server'
import { verifySampleDetailsToken } from '~/server/utils/signing'

export default defineEventHandler(async (event) => {
  const studyId = getRouterParam(event, 'studyId')!
  const token = getQuery(event).token as string | undefined
  const config = useRuntimeConfig(event)

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Missing token' })
  }

  let payload
  try {
    payload = verifySampleDetailsToken(token, config.signingSecret)
  }
  catch (err: unknown) {
    const message = (err as Error).message === 'token expired'
      ? 'This link has expired — contact your I3H representative for a new one'
      : 'This link is invalid'
    throw createError({ statusCode: 401, statusMessage: message })
  }

  if (payload.studyId !== studyId) {
    throw createError({ statusCode: 403, statusMessage: 'Token does not match study' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const { data, error } = await supabase
    .from('studies')
    .select('name, abbreviation, pi, sample_details')
    .eq('id', studyId)
    .single()

  if (error || !data) {
    if (error) console.error('[sample-details] Supabase error:', error)
    throw createError({ statusCode: 404, statusMessage: 'Study not found' })
  }

  const pi = data.pi as { name: string; email: string }
  if (pi.email.toLowerCase() !== payload.piEmail.toLowerCase()) {
    throw createError({ statusCode: 403, statusMessage: 'Token does not match this study' })
  }

  return {
    studyName: data.name,
    abbreviation: data.abbreviation,
    piName: pi.name,
    answers: (data.sample_details as Record<string, string>) || {},
  }
})
