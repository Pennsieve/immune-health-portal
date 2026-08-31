import { describe, it, expect } from 'vitest'
import { diffStudyDetails, type StudyDetailSnapshot } from './studyChanges'

// diffStudyDetails turns a before/after pair of study values into the
// PI-facing list of what changed (consumed by update-study.post.ts). It must
// ignore no-op edits (whitespace, empty ⇄ null), report scalar changes with
// from/to, and report structural edits (matrix, service lines, personnel)
// with just a label.

const base: StudyDetailSnapshot = {
  name: 'Immune Aging',
  abbreviation: 'IMA',
  pi: { name: 'Dr. Lee', email: 'lee@example.com' },
  studyLead: null,
  affiliation: 'Internal',
  affiliationOrg: 'University of Pennsylvania',
  irb: '2026-001',
  additionalNotes: null,
  cohort: { subjects: 15, totalSamples: 45, groups: [], visits: [] },
  budget: { accountCode: '400-1', fundingName: 'R01', baName: null, baEmail: null, contractingContact: null, lines: [] },
  intakeDetails: {},
  keyPersonnel: [],
}

const clone = (o: StudyDetailSnapshot): StudyDetailSnapshot => JSON.parse(JSON.stringify(o))

describe('diffStudyDetails', () => {
  it('returns nothing when values are identical', () => {
    expect(diffStudyDetails(base, clone(base))).toEqual([])
  })

  it('ignores empty ⇄ null ⇄ whitespace-only no-ops', () => {
    const after = clone(base)
    after.additionalNotes = ''
    after.irb = '2026-001  '
    after.pi = { name: 'Dr. Lee', email: 'lee@example.com' }
    expect(diffStudyDetails(base, after)).toEqual([])
  })

  it('reports a scalar change with from and to', () => {
    const after = clone(base)
    after.name = 'Immune Ageing'
    expect(diffStudyDetails(base, after)).toEqual([
      { label: 'Study name', from: 'Immune Aging', to: 'Immune Ageing' },
    ])
  })

  it('reports a PI change as a combined name · email value', () => {
    const after = clone(base)
    after.pi = { name: 'Dr. Lee', email: 'lee@med.example.com' }
    const changes = diffStudyDetails(base, after)
    expect(changes).toEqual([
      { label: 'Principal Investigator', from: 'Dr. Lee · lee@example.com', to: 'Dr. Lee · lee@med.example.com' },
    ])
  })

  it('reports structural changes (matrix, service lines, personnel) with only a label', () => {
    const after = clone(base)
    after.cohort = { subjects: 15, totalSamples: 45, groups: [{ name: 'A' }], visits: [] }
    after.budget = { ...base.budget!, lines: [{ service: 'CyTOF', rate: 1200, planned: 3 }] }
    after.keyPersonnel = [{ name: 'Sam', email: 's@example.com', role: 'Coordinator' }]
    const labels = diffStudyDetails(base, after).map(c => c.label)
    expect(labels).toContain('Cohort sample matrix')
    expect(labels).toContain('Services & pricing')
    expect(labels).toContain('Key personnel')
    for (const c of diffStudyDetails(base, after)) {
      if (['Cohort sample matrix', 'Services & pricing', 'Key personnel'].includes(c.label)) {
        expect(c.from).toBeUndefined()
        expect(c.to).toBeUndefined()
      }
    }
  })

  it('does not flag the cohort matrix for key-order / shape noise (stored vs normalized)', () => {
    const before = clone(base)
    // "Stored" shape: keys in a different order, string subject count, no
    // `description`, samples as a keyed map.
    before.cohort = {
      subjects: 15,
      totalSamples: 45,
      visits: [{ id: 'v1', label: 'Baseline', description: '' }],
      groups: [{ subjects: '10', name: 'Cohort A', samples: { v1: 2 } } as never],
    }
    const after = clone(base)
    // Freshly normalized shape for the same data.
    after.cohort = {
      subjects: 15,
      totalSamples: 45,
      visits: [{ id: 'v1', label: 'Baseline', description: '' }],
      groups: [{ name: 'Cohort A', description: '', subjects: 10, samples: { v1: 2 } }],
    }
    expect(diffStudyDetails(before, after)).toEqual([])
  })

  it('does not flag service lines for order / numeric-type noise', () => {
    const before = clone(base)
    before.budget = { ...base.budget!, lines: [
      { service: 'Processing', rate: '500', planned: '2' },
      { service: 'CyTOF', rate: 1200, planned: 3 },
    ] as never }
    const after = clone(base)
    after.budget = { ...base.budget!, lines: [
      { service: 'CyTOF', rate: 1200, planned: 3 },
      { service: 'Processing', rate: 500, planned: 2 },
    ] }
    expect(diffStudyDetails(before, after)).toEqual([])
  })

  it('still flags a real matrix change (a sample count moved)', () => {
    const before = clone(base)
    before.cohort = { subjects: 15, totalSamples: 45, visits: [{ id: 'v1', label: 'B', description: '' }], groups: [{ name: 'A', description: '', subjects: 10, samples: { v1: 2 } }] }
    const after = clone(base)
    after.cohort = { subjects: 15, totalSamples: 45, visits: [{ id: 'v1', label: 'B', description: '' }], groups: [{ name: 'A', description: '', subjects: 10, samples: { v1: 5 } }] }
    expect(diffStudyDetails(before, after).map(c => c.label)).toEqual(['Cohort sample matrix'])
  })

  it('resolves intake-detail labels and values through the schema', () => {
    const before = clone(base)
    before.intakeDetails = { studySynopsis: 'Original' }
    const after = clone(base)
    after.intakeDetails = { studySynopsis: 'Revised' }
    expect(diffStudyDetails(before, after)).toEqual([
      { label: 'Study synopsis', from: 'Original', to: 'Revised' },
    ])
  })

  it('skips intake diffing entirely when intakeDetails is undefined', () => {
    const before = clone(base)
    before.intakeDetails = { studySynopsis: 'Original' }
    const after = clone(base)
    after.intakeDetails = undefined
    expect(diffStudyDetails(before, after)).toEqual([])
  })

  it('labels non-schema intake keys (e.g. ilabsId)', () => {
    const before = clone(base)
    before.intakeDetails = { ilabsId: 'IL-1' }
    const after = clone(base)
    after.intakeDetails = { ilabsId: 'IL-2' }
    expect(diffStudyDetails(before, after)).toEqual([
      { label: 'iLab Service Request ID', from: 'IL-1', to: 'IL-2' },
    ])
  })
})
