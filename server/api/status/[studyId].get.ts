import { serverSupabaseServiceRole } from '#supabase/server'
import { verifyStatusToken, createSignToken } from '~/server/utils/signing'
import { AGREEMENT_IDS } from '~/utils/agreements'

type LifecycleStep = { label: string; date: string; status: 'done' | 'active' | 'pending' }

function normalizeLifecycle(steps: LifecycleStep[]): LifecycleStep[] {
  return steps.map((step, i) => {
    const laterStepIsDone = steps.slice(i + 1).some(s => s.status === 'done')
    if (laterStepIsDone && step.status !== 'done') return { ...step, status: 'done' }
    return step
  })
}

export default defineEventHandler(async (event) => {
  const studyId = getRouterParam(event, 'studyId')!
  const token = getQuery(event).token as string | undefined
  const config = useRuntimeConfig(event)

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Missing token' })
  }

  let payload
  try {
    payload = verifyStatusToken(token, config.signingSecret)
  }
  catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired link' })
  }

  if (payload.studyId !== studyId) {
    throw createError({ statusCode: 403, statusMessage: 'Token does not match study' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const { data, error } = await supabase
    .from('studies')
    .select('name, abbreviation, irb, pi, stage, cohort, lifecycle, objectives, phlebotomy, status_token_version, agreements(*)')
    .eq('id', studyId)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Study not found' })
  }

  const pi = data.pi as { name: string; email: string }
  if (pi.email.toLowerCase() !== payload.piEmail.toLowerCase()) {
    throw createError({ statusCode: 403, statusMessage: 'Token does not match this study' })
  }

  if (payload.ver !== (data.status_token_version ?? 1)) {
    throw createError({ statusCode: 401, statusMessage: 'This link has been revoked. Please contact your I3H contact for a new link.' })
  }

  const origin = config.siteUrl

  const agreements = ((data.agreements as Array<Record<string, unknown>>) || [])
    .filter(agr => AGREEMENT_IDS.includes(agr.id as typeof AGREEMENT_IDS[number]))
    .map(agr => ({
    id: agr.id,
    name: agr.name,
    status: agr.status,
    signedBy: agr.signed_by,
    signedDate: agr.signed_date,
    signUrl: agr.status === 'Pending'
      ? `${origin}/admin/sign/${studyId}-${agr.id}?token=${createSignToken(studyId, agr.id as string, pi.email, config.signingSecret)}`
      : null,
  }))

  return {
    name: data.name,
    abbreviation: data.abbreviation,
    irb: data.irb,
    piName: pi.name,
    stage: data.stage,
    cohort: data.cohort,
    lifecycle: normalizeLifecycle((data.lifecycle as LifecycleStep[]) || []),
    objectives: data.objectives,
    phlebotomy: data.phlebotomy,
    agreements,
  }
})
