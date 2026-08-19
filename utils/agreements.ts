export const AGREEMENTS = [
  { id: 'ua', name: 'User Agreement', description: 'Master scope of work and pricing acknowledgment between PI and I3H' },
] as const

export type AgreementId = typeof AGREEMENTS[number]['id']

export const AGREEMENT_IDS: AgreementId[] = AGREEMENTS.map(a => a.id)
export const AGREEMENT_COUNT = AGREEMENTS.length
export const AGREEMENT_NAMES: Record<AgreementId, string> = Object.fromEntries(
  AGREEMENTS.map(a => [a.id, a.name])
) as Record<AgreementId, string>
