// ============================================================
// Lead questionnaire — single source of truth
//
// The simple public lead form (pages/intake.vue) asks these
// questions before I3H has spoken with the lead. Answers are
// stored raw in inquiries.lead_details and displayed in the
// admin console via leadDetailRows(). Mirrors the pattern of
// utils/intakeFields.ts in miniature.
// ============================================================

export type LeadFieldType = 'text' | 'textarea' | 'select'

export interface LeadField {
  key: string
  label: string
  type: LeadFieldType
  hint?: string
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  // select: choosing this value reveals a free-text companion field
  otherValue?: string
  otherKey?: string
  otherPlaceholder?: string
}

export const REFERRAL_SOURCE_OPTIONS = [
  { value: 'colleague', label: 'Colleague referral' },
  { value: 'conference', label: 'Conference / event' },
  { value: 'publication', label: 'Publication' },
  { value: 'web-search', label: 'Web search' },
  { value: 'other', label: 'Other' },
]

export const LEAD_FIELDS: LeadField[] = [
  {
    key: 'role', label: 'Role', type: 'text',
    placeholder: 'e.g. Principal Investigator, Study Coordinator, Industry Scientist',
  },
  {
    key: 'referralSource', label: 'How did you hear about us?', type: 'select',
    options: REFERRAL_SOURCE_OPTIONS,
    otherValue: 'other', otherKey: 'referralSourceOther', otherPlaceholder: 'How did you find us?',
  },
  {
    key: 'callPurpose', label: 'What would you like to discuss?', type: 'text',
    placeholder: 'e.g. New study inquiry, pricing questions, learning about your services',
  },
  {
    key: 'researchSummary', label: 'Tell us some about your research, idea, or any questions', type: 'textarea',
    placeholder: 'A few sentences about your research, the idea you’re exploring, or anything you’d like to ask',
  },
]

// All keys that live inside lead_details (field values + their companions)
export const LEAD_DETAIL_KEYS: string[] = LEAD_FIELDS.flatMap(f =>
  [f.key, f.otherKey].filter((k): k is string => !!k),
)

// Resolve a stored raw value to its human label (options mapped, "other" text appended)
export function leadDisplayValue(key: string, details: Record<string, unknown> | undefined): string {
  const field = LEAD_FIELDS.find(f => f.key === key)
  const raw = details?.[key]
  if (raw === undefined || raw === null || raw === '') return ''
  if (!field) return String(raw)
  const opt = field.options?.find(o => o.value === raw)
  let label = opt?.label ?? String(raw)
  if (field.otherValue && raw === field.otherValue && field.otherKey) {
    const otherText = String(details?.[field.otherKey] ?? '')
    if (otherText) label = `${label} (${otherText})`
  }
  return label
}

// Rows (label + value) for read-only admin display, skipping empties.
export function leadDetailRows(details: Record<string, unknown> | undefined): Array<{ label: string; value: string }> {
  return LEAD_FIELDS
    .map(f => ({ label: f.label, value: leadDisplayValue(f.key, details) }))
    .filter(r => r.value !== '')
}

// Build a clean lead_details object from the raw form: drops empties and only
// keeps the "other" companion when it applies.
export function cleanLeadDetails(src: Record<string, unknown>): Record<string, unknown> {
  const keep = (v: unknown) => v !== undefined && v !== null && v !== ''
  const out: Record<string, unknown> = {}
  for (const field of LEAD_FIELDS) {
    if (keep(src[field.key])) out[field.key] = src[field.key]
    if (field.otherKey && field.otherValue
      && src[field.key] === field.otherValue
      && keep(src[field.otherKey])) {
      out[field.otherKey] = src[field.otherKey]
    }
  }
  return out
}
