// ============================================================
// Visit schedule / cohort sample matrix — single source of truth
//
// Centralizes what used to be five independent reimplementations of the
// same "subjects x visits collected" total-samples formula (both admin edit
// modals, the inquiries list page, the PI status page, and
// approve-inquiry.post.ts). Isomorphic (client + server), same convention as
// utils/intakeFields.ts / utils/sampleDetailsFields.ts.
// ============================================================
import type { CollectionGroup, CollectionVisit, VisitTimeUnit, VisitTiming } from '~/types/index'

export const VISIT_UNIT_OPTIONS: Array<{ value: VisitTimeUnit; label: string }> = [
  { value: 'days', label: 'Day(s)' },
  { value: 'weeks', label: 'Week(s)' },
  { value: 'months', label: 'Month(s)' },
  { value: 'years', label: 'Year(s)' },
]

export const VISIT_TIMING_OPTIONS: Array<{ value: VisitTiming; label: string }> = [
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
]

const UNIT_SINGULAR: Record<VisitTimeUnit, string> = {
  days: 'day',
  weeks: 'week',
  months: 'month',
  years: 'year',
}

export function newVisitId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Auto-numbered from position — the label is no longer user-entered for any
// visit created through the new "Defining Visits" form. `visit.label` only
// ever has a value for legacy/imported visits (see CollectionVisit).
export function visitLabel(visit: CollectionVisit, index: number): string {
  return visit.label || `Visit ${index + 1}`
}

// A, B, C, ... Z, then AA, BB, CC, ... ZZ, then AAA, BBB, ... — one extra
// repeat of the cycling letter per lap through the alphabet, not the
// spreadsheet-style AA/AB/AC sequence.
function alphaIndex(index: number): string {
  const letter = String.fromCharCode(65 + (index % 26))
  const repeat = Math.floor(index / 26) + 1
  return letter.repeat(repeat)
}

// "Cohort A" / "Cohort B" ... — auto-numbered from position, same idea as
// visitLabel. `group.name` only has a value for legacy/imported cohorts that
// already had a real name (see CollectionGroup).
export function cohortLabel(group: CollectionGroup, index: number): string {
  return group.name || `Cohort ${alphaIndex(index)}`
}

// "2 days after vaccine is given" — built from the structured fields when
// all four are present; falls back to the legacy free-text description
// otherwise (pre-redesign visits, or bulk-imported data that doesn't fit the
// structured shape).
export function visitDescription(visit: CollectionVisit): string {
  if (visit.amount && visit.unit && visit.timing && visit.event) {
    const unitWord = visit.amount === 1 ? UNIT_SINGULAR[visit.unit] : visit.unit
    return `${visit.amount} ${unitWord} ${visit.timing} ${visit.event}`
  }
  return visit.description || ''
}

export function isVisitCollected(group: CollectionGroup, visitId: string): boolean {
  return Boolean(group.samples?.[visitId])
}

export function groupSampledVisitCount(group: CollectionGroup, visits: CollectionVisit[]): number {
  return visits.reduce((n, v) => n + (isVisitCollected(group, v.id) ? 1 : 0), 0)
}

export function groupTotal(group: CollectionGroup, visits: CollectionVisit[]): number {
  return (Number(group.subjects) || 0) * groupSampledVisitCount(group, visits)
}

export function matrixGrandTotal(groups: CollectionGroup[], visits: CollectionVisit[]): number {
  return groups.reduce((sum, g) => sum + groupTotal(g, visits), 0)
}

export function matrixSubjectsTotal(groups: CollectionGroup[]): number {
  return groups.reduce((sum, g) => sum + (Number(g.subjects) || 0), 0)
}
