// ============================================================
// Sample Details Form — single source of truth
//
// Captured once per study, after the agreement package is fully countersigned
// (see the `allSigned` branch of server/api/admin/sign-agreement.post.ts,
// which emails the link below). The PI/study lead fills it out via a
// token-gated link (pages/sample-details/[studyId].vue); answers are stored
// as one jsonb blob (studies.sample_details) and surfaced read-only on the
// Cohort & Samples tab (pages/admin/studies/[id].vue).
//
// The original site-initiation checklist had ~12 questions; the ones that
// are really just I3H informing the study team of a procedure (LabVantage
// access, REDCap dropoff requirements, etc.) are sent as plain informational
// copy in the activation email instead of being asked here — only the
// questions with a genuinely useful, study-specific answer are below.
//
// `operationalContacts` is stored in the exact same shape as the study's
// existing `key_personnel` column (Array<{ name, email, role }>, see
// stores/admin.ts) rather than free text, in case it's later folded into
// that same list — no reshaping would be needed if that happens.
// ============================================================

export type SampleDetailsFieldType = 'text' | 'textarea' | 'select' | 'contacts'

export interface SampleDetailsOption {
  value: string
  label: string
}

export interface SampleDetailsContact {
  name: string
  email: string
  role: string
}

export interface SampleDetailsField {
  key: string
  label: string
  question: string
  type: SampleDetailsFieldType
  placeholder?: string
  hint?: string
  options?: SampleDetailsOption[]
}

export interface SampleDetailsAnswers {
  operationalContacts?: SampleDetailsContact[]
  drawLocation?: string
  sampleTransport?: string
  labelPrinting?: string
  logisticalConsiderations?: string
  communicationChannel?: string
  metadataAccess?: string
}

export const SAMPLE_DETAILS_FIELDS: SampleDetailsField[] = [
  {
    key: 'operationalContacts',
    label: 'Operational contacts & roles',
    question: 'Who are the operational contacts for this study, and what are their roles?',
    type: 'contacts',
    hint: 'This may be the same people already on file as key personnel — please reconfirm for site initiation.',
  },
  {
    key: 'drawLocation',
    label: 'Sample draw location',
    question: 'Where will samples be drawn?',
    type: 'text',
  },
  {
    key: 'sampleTransport',
    label: 'Sample transport',
    question: 'Who will transport samples to Immune Health?',
    type: 'text',
  },
  {
    key: 'labelPrinting',
    label: 'Label printing',
    question: 'Who will print sample labels?',
    type: 'text',
  },
  {
    key: 'logisticalConsiderations',
    label: 'Logistical considerations',
    question: 'Are there any logistical considerations, such as transfer to additional labs?',
    type: 'textarea',
    placeholder: 'e.g. samples split across sites, cold-chain requirements, third-party labs',
  },
  {
    key: 'communicationChannel',
    label: 'Communication channel',
    question: 'Will study staff use Slack or email to communicate with I3H about visits?',
    type: 'select',
    options: [
      { value: 'slack', label: 'Slack' },
      { value: 'email', label: 'Email' },
      { value: 'both', label: 'Both' },
    ],
  },
  {
    key: 'metadataAccess',
    label: 'Study metadata access',
    question: 'How will Immune Health access study metadata?',
    type: 'textarea',
    placeholder: 'e.g. REDCap project name, or another database and how to reach it',
  },
]

// Every field except the contacts table — used wherever a flat string answer
// is expected (the scalar form inputs, the read-only row list, the email).
export const SAMPLE_DETAILS_SCALAR_FIELDS = SAMPLE_DETAILS_FIELDS.filter(f => f.type !== 'contacts')

const FIELD_BY_KEY = new Map(SAMPLE_DETAILS_FIELDS.map(f => [f.key, f]))

function optionLabel(key: string, value: string): string {
  return FIELD_BY_KEY.get(key)?.options?.find(o => o.value === value)?.label ?? value
}

// Trim/filter a contacts array exactly like the key-personnel editor does
// (utils shared with stores/admin.ts's key_personnel handling would be nicer,
// but that normalizer lives inline in the edit-study modal today).
export function normalizeContacts(contacts: SampleDetailsContact[]): SampleDetailsContact[] {
  return (contacts || [])
    .map(c => ({ name: (c.name || '').trim(), email: (c.email || '').trim(), role: (c.role || '').trim() }))
    .filter(c => c.name || c.email || c.role)
}

// Accepts either the typed answers object or a raw jsonb blob — the stored
// column and the DB rows it's read back from aren't always statically typed
// the same way (see server/api/sample-details/[studyId].get.ts).
type SampleDetailsSource = SampleDetailsAnswers | Record<string, unknown> | undefined

export function sampleDetailsDisplayValue(key: string, details: SampleDetailsSource): string {
  const field = FIELD_BY_KEY.get(key)
  const raw = (details as Record<string, unknown> | undefined)?.[key]
  if (raw === undefined || raw === null || raw === '') return ''
  if (field?.type === 'select') return optionLabel(key, String(raw))
  return String(raw)
}

// Rows (label + value) for read-only display of the scalar fields only —
// operationalContacts renders as its own table (see the Name/Role/Email
// markup on the Cohort & Samples tab), not as a flat string.
export function sampleDetailsRows(details: SampleDetailsSource): Array<{ label: string; value: string }> {
  return SAMPLE_DETAILS_SCALAR_FIELDS
    .map(f => ({ label: f.label, value: sampleDetailsDisplayValue(f.key, details) }))
    .filter(r => r.value !== '')
}

export function sampleDetailsContacts(details: SampleDetailsSource): SampleDetailsContact[] {
  return normalizeContacts(((details as Record<string, unknown> | undefined)?.operationalContacts as SampleDetailsContact[]) || [])
}

// Build a clean sample_details object from raw form values — drops empties.
export function cleanSampleDetails(src: Record<string, unknown>): SampleDetailsAnswers {
  const out: SampleDetailsAnswers = {}
  for (const field of SAMPLE_DETAILS_SCALAR_FIELDS) {
    const v = src[field.key]
    if (typeof v === 'string' && v.trim() !== '') (out as Record<string, string>)[field.key] = v.trim()
  }
  const contacts = normalizeContacts((src.operationalContacts as SampleDetailsContact[]) || [])
  if (contacts.length) out.operationalContacts = contacts
  return out
}
