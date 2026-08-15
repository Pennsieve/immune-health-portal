export const AGREEMENTS = [
  { id: 'ua', name: 'User Agreement', description: 'Master scope of work and pricing acknowledgment between PI and I3H' },
] as const

// Contentful entry id (i3hAgreementForm content type) holding the User Agreement's editorial text
export const USER_AGREEMENT_CONTENTFUL_ENTRY_ID = '74dPbp3z43xbT5K5fRo2Ty'

export type AgreementId = typeof AGREEMENTS[number]['id']

export const AGREEMENT_IDS: AgreementId[] = AGREEMENTS.map(a => a.id)
export const AGREEMENT_COUNT = AGREEMENTS.length
export const AGREEMENT_NAMES: Record<AgreementId, string> = Object.fromEntries(
  AGREEMENTS.map(a => [a.id, a.name])
) as Record<AgreementId, string>
