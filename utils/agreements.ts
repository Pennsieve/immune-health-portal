export const AGREEMENTS = [
  { id: 'ua',  name: 'User Agreement',                  description: 'Master scope of work between PI and I3H' },
  { id: 'rs',  name: 'Rate Schedule',                   description: 'Itemized pricing and billing terms' },
  { id: 'lv',  name: 'LabVantage Sample Intake Form',   description: 'Sample ID assignment authorization' },
  { id: 'psa', name: 'Pennsieve Data Sharing Agreement', description: 'Data hosting + access controls on Pennsieve workspace' },
] as const

export type AgreementId = typeof AGREEMENTS[number]['id']

export const AGREEMENT_IDS: AgreementId[] = AGREEMENTS.map(a => a.id)
export const AGREEMENT_COUNT = AGREEMENTS.length
export const AGREEMENT_NAMES: Record<AgreementId, string> = Object.fromEntries(
  AGREEMENTS.map(a => [a.id, a.name])
) as Record<AgreementId, string>
