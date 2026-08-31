// ============================================================
// Study detail change detection
//
// After a study is created (and its agreement package emailed to the PI),
// an admin can still edit the study record. When they do, the PI is
// notified with the specific list of what changed — this module turns a
// before/after pair of study values into that human-readable list.
//
// Consumed by server/api/admin/update-study.post.ts. Field labels mirror
// the PI-facing status page (pages/status/[studyId].vue) and the intake
// schema (utils/intakeFields.ts) so nothing drifts.
// ============================================================
import { INTAKE_FIELDS, intakeDisplayValue } from '~/utils/intakeFields'

export interface StudyPerson {
  name?: string
  email?: string
}

// A normalized (camelCase) snapshot of the PI-facing study values. The DB
// row is snake_case and the edit payload is camelCase — the caller maps
// both into this shape before diffing.
export interface StudyDetailSnapshot {
  name?: string | null
  abbreviation?: string | null
  pi?: StudyPerson | null
  studyLead?: StudyPerson | null
  affiliation?: string | null
  affiliationOrg?: string | null
  irb?: string | null
  additionalNotes?: string | null
  cohort?: {
    subjects?: number | null
    totalSamples?: number | null
    groups?: unknown
    visits?: unknown
  } | null
  budget?: {
    accountCode?: string | null
    fundingName?: string | null
    baName?: string | null
    baEmail?: string | null
    contractingContact?: string | null
    lines?: unknown
  } | null
  // Pass `undefined` (not `{}`) to skip intake-detail diffing entirely —
  // used when the edit payload didn't include intake details at all.
  intakeDetails?: Record<string, unknown>
  // Pass `undefined` to skip key-personnel diffing.
  keyPersonnel?: unknown
}

export interface StudyChange {
  label: string
  // Present for value changes ("Immune Aging" → "Immune Ageing"); both
  // omitted for structural changes (a table was edited) — rendered as
  // "<label> updated".
  from?: string
  to?: string
}

// A few intake keys carried from the billing form aren't in INTAKE_FIELDS
// but still show on the status page.
const EXTRA_INTAKE_LABELS: Record<string, string> = {
  ilabsId: 'iLab Service Request ID',
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === ''
    || (Array.isArray(v) && v.length === 0)
}

// Loose equality: empty variants (undefined / null / "" / []) all match,
// objects/arrays compare structurally, scalars compare trimmed.
function sameValue(a: unknown, b: unknown): boolean {
  if (isEmpty(a) && isEmpty(b)) return true
  if (isEmpty(a) !== isEmpty(b)) return false
  if (typeof a === 'object' || typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  return String(a).trim() === String(b).trim()
}

function personText(p: StudyPerson | null | undefined): string {
  if (!p) return ''
  const name = (p.name || '').trim()
  const email = (p.email || '').trim()
  if (name && email) return `${name} · ${email}`
  return name || email
}

function humanizeKey(key: string): string {
  const spaced = key
    .replace(/([A-Z]+)/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function leftoverText(v: unknown): string {
  if (isEmpty(v)) return '—'
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

type LooseCohort = NonNullable<StudyDetailSnapshot['cohort']>
type LooseVisit = { id?: string; label?: string; description?: string }
type LooseGroup = { name?: string; description?: string; subjects?: unknown; samples?: Record<string, unknown> }

// A shape-independent fingerprint of the cohort sample matrix. Stored rows,
// seed data, and freshly normalized rows differ in key order, number vs
// string counts, and absent optional keys — none of which is a real change —
// so compare on a canonical projection rather than raw JSON.
function canonicalMatrix(cohort: LooseCohort): string {
  const visits: LooseVisit[] = Array.isArray(cohort.visits) ? cohort.visits as LooseVisit[] : []
  const visitIds = visits.map(v => v?.id ?? '')
  const groups: LooseGroup[] = Array.isArray(cohort.groups) ? cohort.groups as LooseGroup[] : []
  return JSON.stringify({
    visits: visits.map(v => ({
      id: v?.id ?? '',
      label: (v?.label ?? '').trim(),
      description: (v?.description ?? '').trim(),
    })),
    groups: groups.map(g => ({
      name: (g?.name ?? '').trim(),
      description: (g?.description ?? '').trim(),
      subjects: Number(g?.subjects) || 0,
      // positional, keyed to the visit order above — tolerates missing keys
      samples: visitIds.map(id => Number(g?.samples?.[id]) || 0),
    })),
  })
}

// Same idea for budget service lines: order-independent, numeric-normalized.
function canonicalLines(lines: unknown): string {
  const arr = Array.isArray(lines) ? lines as Array<Record<string, unknown>> : []
  return JSON.stringify(
    arr
      .map(l => ({
        service: String(l?.service ?? '').trim(),
        rate: Number(l?.rate) || 0,
        planned: Number(l?.planned) || 0,
      }))
      .sort((a, b) => a.service.localeCompare(b.service)),
  )
}

/**
 * Compare two study snapshots and return the PI-facing changes, ordered for
 * display. An empty array means nothing the PI cares about changed.
 */
export function diffStudyDetails(before: StudyDetailSnapshot, after: StudyDetailSnapshot): StudyChange[] {
  const changes: StudyChange[] = []
  const scalar = (label: string, a: unknown, b: unknown) => {
    if (!sameValue(a, b)) {
      changes.push({ label, from: String(a ?? '').trim() || '—', to: String(b ?? '').trim() || '—' })
    }
  }

  scalar('Study name', before.name, after.name)
  scalar('Project Acronym / ID', before.abbreviation, after.abbreviation)

  if (!sameValue(personText(before.pi), personText(after.pi))) {
    changes.push({ label: 'Principal Investigator', from: personText(before.pi) || '—', to: personText(after.pi) || '—' })
  }
  if (!sameValue(personText(before.studyLead), personText(after.studyLead))) {
    changes.push({ label: 'Study lead', from: personText(before.studyLead) || '—', to: personText(after.studyLead) || '—' })
  }
  if (after.keyPersonnel !== undefined && !sameValue(before.keyPersonnel, after.keyPersonnel)) {
    changes.push({ label: 'Key personnel' })
  }

  scalar('Affiliation', before.affiliation, after.affiliation)
  scalar('Affiliation organization', before.affiliationOrg, after.affiliationOrg)
  scalar('IRB protocol', before.irb, after.irb)

  // ── Expanded intake answers ──
  if (after.intakeDetails !== undefined) {
    const b = before.intakeDetails ?? {}
    const a = after.intakeDetails
    const handled = new Set<string>()
    for (const field of INTAKE_FIELDS) {
      const keys = [field.key, field.detailKey, field.otherKey].filter(Boolean) as string[]
      keys.forEach(k => handled.add(k))
      const changed = keys.some(k => !sameValue(b[k], a[k]))
      if (changed) {
        changes.push({
          label: field.label,
          from: intakeDisplayValue(field.key, b) || '—',
          to: intakeDisplayValue(field.key, a) || '—',
        })
      }
    }
    // Keys carried on intake_details that aren't part of the schema.
    for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
      if (handled.has(key) || sameValue(b[key], a[key])) continue
      changes.push({
        label: EXTRA_INTAKE_LABELS[key] ?? humanizeKey(key),
        from: leftoverText(b[key]),
        to: leftoverText(a[key]),
      })
    }
  }

  // ── Cohort ──
  const bc = before.cohort ?? {}
  const ac = after.cohort ?? {}
  scalar('Cohort subjects', bc.subjects, ac.subjects)
  scalar('Total samples', bc.totalSamples, ac.totalSamples)
  if (canonicalMatrix(bc) !== canonicalMatrix(ac)) {
    changes.push({ label: 'Cohort sample matrix' })
  }

  // ── Budget / funding ──
  const bb = before.budget ?? {}
  const ab = after.budget ?? {}
  scalar('Budget account number', bb.accountCode, ab.accountCode)
  scalar('Funding source (CAMS)', bb.fundingName, ab.fundingName)
  scalar('Business Administrator name', bb.baName, ab.baName)
  scalar('Business Administrator email', bb.baEmail, ab.baEmail)
  scalar('Contracting / Grants Office contact', bb.contractingContact, ab.contractingContact)
  if (canonicalLines(bb.lines) !== canonicalLines(ab.lines)) {
    changes.push({ label: 'Services & pricing' })
  }

  scalar('Additional notes', before.additionalNotes, after.additionalNotes)

  return changes
}
