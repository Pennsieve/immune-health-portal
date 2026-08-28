// ============================================================
// Intake questionnaire — single source of truth
//
// Every "expanded" intake field is defined here once and consumed by:
//   - the public intake form           (pages/intake.vue)
//   - the edit-inquiry modal           (pages/admin/inquiries/[id].vue)
//   - the edit-study modal             (pages/admin/studies/[id].vue)
//   - the admin detail read-out        (inquiry + study pages)
//   - the confirmation emails          (server/api/submit-intake.post.ts)
//
// Values are stored RAW (the option `value`, or free text). Display labels
// are resolved through this schema via `intakeDisplayValue()`, so no surface
// keeps its own copy of the labels/options and they can never drift.
// ============================================================

export type IntakeFieldType =
  | 'text'
  | 'textarea'
  | 'number' // non-negative integer, no suffix
  | 'months' // numeric with a "months" suffix
  | 'month' // YYYY-MM picker
  | 'select'
  | 'yesno'
  | 'multiselect' // checkbox chips

export interface IntakeOption {
  value: string
  label: string
}

export interface IntakeField {
  key: string
  label: string
  section: string
  type: IntakeFieldType
  hint?: string
  placeholder?: string
  options?: IntakeOption[]
  // multiselect: selecting this option reveals a free-text companion field
  otherValue?: string
  otherKey?: string
  otherPlaceholder?: string
  // select/yesno: this value (or any of these values) reveals a free-text companion field
  detailKey?: string
  detailShowIf?: string | string[]
  detailLabel?: string
  detailPlaceholder?: string
  // cross-field visibility, driven by a top-level form value (e.g. sampleType,
  // affiliation) supplied via the `context` prop. Bypassed by `showAll`
  // (admin modals), since staff should see every field regardless of context.
  showIfKey?: string
  showIfEquals?: string
  // sibling-field visibility, driven by another INTAKE_FIELDS answer in the
  // same model (e.g. a tube count only applies if that tube type was
  // selected). Always enforced — never bypassed by `showAll` — since the
  // field is genuinely inapplicable otherwise. `requiresValue` must appear in
  // the array stored at model[requiresKey].
  requiresKey?: string
  requiresValue?: string
  // Render the input at half width (e.g. short values like a status or a
  // single volume figure don't need the full row).
  halfWidth?: boolean
}

const YES_NO: IntakeOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

export const INTAKE_SECTIONS = ['Regulatory', 'Scope', 'Samples'] as const

export const INTAKE_FIELDS: IntakeField[] = [
  // ── Study design ── (section retained only as metadata; no longer rendered
  // as its own admin group — collectionSites is shown as a standalone field)
  {
    key: 'studySynopsis', label: 'Study synopsis', section: 'Study design', type: 'textarea',
    placeholder: 'A brief description of the study',
  },
  {
    key: 'collectionSites', label: 'Collection Site(s)', section: 'Study design', type: 'multiselect',
    hint: 'Where will samples be collected?',
    options: ['HUP', 'PAH', 'Presby', 'Radnor', 'CHOP', 'Remote / off-site'].map(v => ({ value: v, label: v })),
    otherValue: 'Remote / off-site', otherKey: 'collectionSiteOther', otherPlaceholder: 'Where?',
  },

  // ── Regulatory ──
  {
    key: 'irbStatus', label: 'IRB Status', section: 'Regulatory', type: 'select', halfWidth: true,
    options: [
      { value: 'approved', label: 'Approved' },
      { value: 'pending', label: 'Submitted / pending' },
      { value: 'not-submitted', label: 'Not yet submitted' },
    ],
    detailKey: 'irbTimeline', detailShowIf: ['pending', 'not-submitted'],
    detailLabel: 'Expected IRB timeline', detailPlaceholder: 'Expected timeline for approval / submission',
  },
  {
    key: 'bloodVolumePerVisit', label: 'Target Blood Volume per Visit', section: 'Regulatory', type: 'text', halfWidth: true,
    hint: 'Total volume to be drawn from the subject at each visit',
    placeholder: 'e.g. 20 mL',
  },
  {
    key: 'bloodVolumeConfirmed', label: 'Blood Volume Within IRB Limits', section: 'Regulatory', type: 'yesno',
    hint: "Confirmed blood draw volume falls within the limits outlined in the IRB protocol",
    options: YES_NO,
  },

  // ── Scope ──
  {
    key: 'enrollmentPeriod', label: 'Enrollment Period', section: 'Scope', type: 'months',
    hint: 'Over what timeframe?', placeholder: 'e.g. 18',
  },
  {
    key: 'firstSampleDate', label: 'First Samples Expected', section: 'Scope', type: 'month', halfWidth: true,
  },
  {
    key: 'sampleArrivalCadence', label: 'Anticipated Cadence of Sample Arrival', section: 'Scope', type: 'text',
    placeholder: 'e.g. estimated 10 subjects per week for 8 weeks',
  },

  // ── Samples ──
  {
    key: 'sampleType', label: 'Sample type', section: 'Samples', type: 'select', halfWidth: true,
    options: [
      { value: 'fresh-blood', label: 'Fresh whole blood' },
      { value: 'stored-pbmc', label: 'Stored PBMCs (cryopreserved)' },
      { value: 'tissue', label: 'Tissue' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'tubeTypes', label: 'Collection Tube Type(s)', section: 'Samples', type: 'multiselect',
    hint: 'CBC with differential provided with PBMC processing services requires a small EDTA collection tube. CyTOF requires heparin collection tubes. Minimum 4 mL sodium heparin tube if only requesting CyTOF services; otherwise, 300 microliters of whole blood can be taken for CyTOF prior to processing heparin PBMCs.',
    options: ['EDTA', 'Sodium heparin', 'Serum (SST)', 'Streck', 'Other'].map(v => ({ value: v, label: v })),
    otherValue: 'Other', otherKey: 'tubeTypeOther', otherPlaceholder: 'Specify tube type',
    showIfKey: 'sampleType', showIfEquals: 'fresh-blood',
  },
  {
    key: 'tubeCountEdta3ml', label: '3 mL EDTA Tubes Needed', section: 'Samples', type: 'number',
    placeholder: 'e.g. 2', showIfKey: 'sampleType', showIfEquals: 'fresh-blood',
    requiresKey: 'tubeTypes', requiresValue: 'EDTA',
  },
  {
    key: 'tubeCountEdta10ml', label: '10 mL EDTA Tubes Needed', section: 'Samples', type: 'number',
    placeholder: 'e.g. 1', showIfKey: 'sampleType', showIfEquals: 'fresh-blood',
    requiresKey: 'tubeTypes', requiresValue: 'EDTA',
  },
  {
    key: 'tubeCountHeparin10ml', label: '10 mL Sodium Heparin Tubes Needed', section: 'Samples', type: 'number',
    placeholder: 'e.g. 1', showIfKey: 'sampleType', showIfEquals: 'fresh-blood',
    requiresKey: 'tubeTypes', requiresValue: 'Sodium heparin',
  },
  {
    key: 'tubeCountHeparin6ml', label: '6 mL Sodium Heparin Tubes Needed', section: 'Samples', type: 'number',
    placeholder: 'e.g. 1', showIfKey: 'sampleType', showIfEquals: 'fresh-blood',
    requiresKey: 'tubeTypes', requiresValue: 'Sodium heparin',
  },
  {
    key: 'tubeCountSerum6ml', label: '6 mL Serum (SST) Tubes Needed', section: 'Samples', type: 'number',
    placeholder: 'e.g. 1', showIfKey: 'sampleType', showIfEquals: 'fresh-blood',
    requiresKey: 'tubeTypes', requiresValue: 'Serum (SST)',
  },
  {
    key: 'tubeCountStreck10ml', label: '10 mL Streck Tubes Needed', section: 'Samples', type: 'number',
    placeholder: 'e.g. 1', showIfKey: 'sampleType', showIfEquals: 'fresh-blood',
    requiresKey: 'tubeTypes', requiresValue: 'Streck',
  },

  // ── Data & compliance ── (section retained only as metadata; ilabsId is
  // edited exclusively via the PI-facing billing form, never rendered here —
  // kept in the schema so cleanIntakeDetails() doesn't drop it on admin saves)
  {
    key: 'ilabsId', label: 'iLab Service Request ID', section: 'Data & compliance', type: 'text',
    hint: 'If you already have an iLab request open',
    placeholder: 'e.g. IL-123456',
    showIfKey: 'affiliation', showIfEquals: 'internal',
  },
]

// All keys that live inside intake_details (field values + their companions)
export const INTAKE_DETAIL_KEYS: string[] = INTAKE_FIELDS.flatMap(f =>
  [f.key, f.otherKey, f.detailKey].filter((k): k is string => !!k),
)

const FIELD_BY_KEY = new Map(INTAKE_FIELDS.map(f => [f.key, f]))

// Whether a field's conditional detail companion applies for the given value.
// `detailShowIf` may be a single value, a list of values, or '__always__'.
export function detailApplies(showIf: string | string[] | undefined, value: unknown): boolean {
  if (showIf === undefined) return false
  if (showIf === '__always__') return true
  return Array.isArray(showIf) ? showIf.includes(value as string) : value === showIf
}

// Option values for a field (e.g. the checkbox list a form section renders).
export function fieldOptionValues(key: string): string[] {
  return (FIELD_BY_KEY.get(key)?.options ?? []).map(o => o.value)
}
// Option label for a single raw value (e.g. for seg-toggle button text).
export function fieldOptionLabel(key: string, value: string): string {
  return FIELD_BY_KEY.get(key)?.options?.find(o => o.value === value)?.label ?? value
}

// "month" fields are stored as "YYYY-MM" (native <input type="month"> format)
// but should always be displayed as "Month YYYY" — e.g. on the user agreement.
function formatMonthYear(raw: string): string {
  const [year, month] = raw.split('-').map(Number)
  if (!year || !month) return raw
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Resolve a stored raw value to its human label (arrays joined, options mapped).
// Companion "other"/detail text is appended where present.
export function intakeDisplayValue(key: string, details: Record<string, unknown> | undefined): string {
  const field = FIELD_BY_KEY.get(key)
  const raw = details?.[key]
  const rawEmpty = raw === undefined || raw === null || raw === ''
    || (Array.isArray(raw) && raw.length === 0)
  // A conditional companion (e.g. irbTimeline) can carry text even when
  // the parent field has no selection, so factor it in before bailing out.
  const detailText = field?.detailKey ? String(details?.[field.detailKey] ?? '') : ''
  if (rawEmpty && !detailText) return ''
  if (!field) return Array.isArray(raw) ? raw.join(', ') : String(raw)

  let label = ''
  if (field.type === 'multiselect') {
    const arr = Array.isArray(raw) ? raw : []
    const otherText = field.otherKey ? String(details?.[field.otherKey] ?? '') : ''
    label = arr
      .map((v) => {
        const opt = field.options?.find(o => o.value === v)
        const l = opt?.label ?? String(v)
        return (field.otherValue && v === field.otherValue && otherText) ? `${l} (${otherText})` : l
      })
      .join(', ')
  }
  else if (!rawEmpty) {
    const opt = field.options?.find(o => o.value === raw)
    label = opt?.label ?? String(raw)
    if (field.type === 'months') label = `${raw} months`
    if (field.type === 'month') label = formatMonthYear(String(raw))
  }
  // Append the conditional companion text (works for every field type now).
  if (detailText) label = `${label}${label ? ' — ' : ''}${detailText}`
  return label
}

// Rows (label + value) for read-only display, skipping empties.
export function intakeDetailRows(details: Record<string, unknown> | undefined): Array<{ label: string; value: string }> {
  return INTAKE_FIELDS
    .map(f => ({ label: f.label, value: intakeDisplayValue(f.key, details) }))
    .filter(r => r.value !== '')
}

// Build a clean intake_details object from a raw source (form values or an edited
// copy): drops empties and only keeps companion fields when they apply. Shared by
// submit-intake and both edit modals so storage is identical everywhere.
export function cleanIntakeDetails(src: Record<string, unknown>): Record<string, unknown> {
  const keep = (v: unknown) =>
    v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
  const requiresApplies = (field: IntakeField) => {
    if (!field.requiresKey || !field.requiresValue) return true
    const v = src[field.requiresKey]
    return Array.isArray(v) && v.includes(field.requiresValue)
  }
  const out: Record<string, unknown> = {}
  for (const field of INTAKE_FIELDS) {
    if (requiresApplies(field) && keep(src[field.key])) out[field.key] = src[field.key]
    if (field.otherKey && field.otherValue
      && Array.isArray(src[field.key]) && (src[field.key] as string[]).includes(field.otherValue)
      && keep(src[field.otherKey])) {
      out[field.otherKey] = src[field.otherKey]
    }
    if (field.detailKey
      && detailApplies(field.detailShowIf, src[field.key])
      && keep(src[field.detailKey])) {
      out[field.detailKey] = src[field.detailKey]
    }
  }
  return out
}
