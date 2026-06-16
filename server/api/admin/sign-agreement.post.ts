import { serverSupabaseServiceRole } from '#supabase/server'
import { verifySignToken } from '~/server/utils/signing'
import { AGREEMENT_IDS, AGREEMENT_COUNT } from '~/utils/agreements'
import { DEFAULT_TIMEZONE } from '~/server/utils/constants'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { studyId, agreementId, signerName, signerEmail, token, timezone } = body

  if (!studyId || !agreementId || !signerName || !signerEmail) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
  }
  if (!AGREEMENT_IDS.includes(agreementId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid agreement ID' })
  }

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Missing signing token — use the secure link from your email' })
  }
  try {
    const payload = verifySignToken(token, config.signingSecret)
    if (payload.studyId !== studyId || payload.agreementId !== agreementId) {
      throw new Error('token mismatch')
    }
  }
  catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired signing link — please request a new one' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Verify agreement exists and is still pending
  const { data: existing, error: fetchErr } = await supabase
    .from('agreements')
    .select('status')
    .eq('study_id', studyId)
    .eq('id', agreementId)
    .single()

  if (fetchErr || !existing) {
    throw createError({ statusCode: 404, statusMessage: 'Agreement not found' })
  }
  if (existing.status === 'Signed') {
    throw createError({ statusCode: 409, statusMessage: 'Agreement already signed' })
  }

  const now = new Date()
  const tz = timezone || DEFAULT_TIMEZONE
  const signedDate = now.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })
    + ' at ' + now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })

  const { error: updateErr } = await supabase
    .from('agreements')
    .update({ status: 'Signed', signed_by: signerName, signed_date: signedDate, signed_email: signerEmail })
    .eq('study_id', studyId)
    .eq('id', agreementId)

  if (updateErr) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to update agreement' })
  }

  // Check whether all 4 agreements for this study are now signed
  const { data: allAgreements } = await supabase
    .from('agreements')
    .select('status')
    .eq('study_id', studyId)

  const allSigned = allAgreements?.length === AGREEMENT_COUNT && allAgreements.every(a => a.status === 'Signed')

  if (allSigned) {
    const { data: study } = await supabase
      .from('studies')
      .select('lifecycle, activity')
      .eq('id', studyId)
      .single()

    if (study) {
      const lifecycle = (study.lifecycle as Array<{ label: string; date: string; status: string }>).map((step) => {
        if (step.label === 'Activated') return { ...step, date: signedDate, status: 'done' }
        if (step.label === 'Processing') return { ...step, date: 'in progress', status: 'active' }
        return step
      })

      const activationItem = {
        dotClass: 'g',
        title: 'All agreements signed — study activated',
        date: signedDate,
        ts: Date.now(),
      }
      const updatedActivity = [activationItem, ...((study.activity as unknown[]) || [])]

      await supabase
        .from('studies')
        .update({ is_locked: false, stage: 'Processing', lifecycle, activity: updatedActivity })
        .eq('id', studyId)
    }
  }

  return { success: true, signedDate, allSigned: !!allSigned }
})
