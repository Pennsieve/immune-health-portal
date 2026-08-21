import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  mapInquiry,
  mapStudy,
  mapAgreement,
  normalizeLifecycle,
  useAdminStore,
  type Study,
  type Inquiry,
} from './admin'

// mapInquiry translates a raw Supabase `inquiries` row into the view-model the
// admin console renders. These tests pin the defaults/guards that keep lead
// rows (which lack study-shaped fields) from crashing the list/detail pages.

describe('mapInquiry', () => {
  it('maps a full-intake row through snake_case → camelCase', () => {
    const row = {
      id: 'inq-1',
      study_name: 'Immune Aging',
      abbreviation: 'IMA',
      submitted_date: '2026-07-01',
      created_at: '2026-07-01T12:00:00Z',
      objectives: 'Study immune aging',
      pi: { name: 'Dr. Lee', email: 'lee@example.com' },
      affiliation: 'Internal',
      affiliation_org: 'Penn',
      status: 'New',
      intake_details: { irbStatus: 'approved' },
      lead_details: { role: 'PI' },
      intake_sent_date: '2026-06-20',
    }
    const inq = mapInquiry(row)
    expect(inq.id).toBe('inq-1')
    expect(inq.studyName).toBe('Immune Aging')
    expect(inq.affiliationOrg).toBe('Penn')
    expect(inq.status).toBe('New')
    expect(inq.intakeDetails).toEqual({ irbStatus: 'approved' })
    expect(inq.leadDetails).toEqual({ role: 'PI' })
    expect(inq.intakeSentDate).toBe('2026-06-20')
  })

  it('defaults an empty study name for a lead row (no study_name yet)', () => {
    const inq = mapInquiry({ id: 'lead-1', status: 'Lead', pi: { name: 'Dr. Kim', email: 'k@x.com' } })
    expect(inq.studyName).toBe('')
    expect(inq.status).toBe('Lead')
  })

  it('provides safe defaults for absent collection/array/number fields', () => {
    const inq = mapInquiry({ id: 'lead-2', status: 'Lead' })
    expect(inq.irb).toBe('')
    expect(inq.services).toBe('')
    expect(inq.cohortSubjects).toBe(0)
    expect(inq.servicesDetail).toEqual([])
    expect(inq.intakeDetails).toEqual({})
    expect(inq.leadDetails).toEqual({})
    expect(inq.collectionGroups).toEqual([])
    expect(inq.collectionVisits).toEqual([])
    expect(inq.notes).toEqual([])
    expect(inq.activity).toEqual([])
    expect(inq.feasibility).toEqual([])
  })

  it('maps sample_schedule into collectionGroups', () => {
    const groups = [{ name: 'Baseline', description: 'Untreated controls', subjects: 10, samples: { v1: 10 } }]
    const inq = mapInquiry({ id: 'inq-3', status: 'New', sample_schedule: groups })
    expect(inq.collectionGroups).toEqual(groups)
  })

  it('maps collection_visits into collectionVisits', () => {
    const visits = [{ id: 'v1', label: 'V1', description: 'Before treatment' }]
    const inq = mapInquiry({ id: 'inq-4', status: 'New', collection_visits: visits })
    expect(inq.collectionVisits).toEqual(visits)
  })

  it('maps the lead go/no-go fields (lead_decision, hold_until)', () => {
    const inq = mapInquiry({ id: 'lead-3', status: 'On Hold', lead_decision: 'hold', hold_until: '2026-09-15' })
    expect(inq.status).toBe('On Hold')
    expect(inq.leadDecision).toBe('hold')
    expect(inq.holdUntil).toBe('2026-09-15')
  })

  it('leaves the go/no-go fields undefined when absent', () => {
    const inq = mapInquiry({ id: 'lead-4', status: 'Lead' })
    expect(inq.leadDecision).toBeUndefined()
    expect(inq.holdUntil).toBeUndefined()
  })
})

describe('normalizeLifecycle', () => {
  it('back-fills an incomplete step to done when a later step is done', () => {
    const steps: Study['lifecycle'] = [
      { label: 'A', date: 'Jan 1', status: 'done' },
      { label: 'B', date: 'in progress', status: 'active' },
      { label: 'C', date: 'Jan 5', status: 'done' },
      { label: 'D', date: '—', status: 'pending' },
    ]
    const out = normalizeLifecycle(steps)
    // B is before a done step → promoted to done, and its placeholder date
    // inherits the next done step's date (C's "Jan 5").
    expect(out[1]).toEqual({ label: 'B', date: 'Jan 5', status: 'done' })
    // D has no later done step → left untouched.
    expect(out[3]).toEqual({ label: 'D', date: '—', status: 'pending' })
  })

  it('keeps a real (non-placeholder) date when promoting to done', () => {
    const steps: Study['lifecycle'] = [
      { label: 'A', date: 'Feb 2', status: 'active' },
      { label: 'B', date: 'Feb 9', status: 'done' },
    ]
    const out = normalizeLifecycle(steps)
    expect(out[0]).toEqual({ label: 'A', date: 'Feb 2', status: 'done' })
  })

  it('is a no-op when steps are already in order', () => {
    const steps: Study['lifecycle'] = [
      { label: 'A', date: 'Jan 1', status: 'done' },
      { label: 'B', date: 'in progress', status: 'active' },
      { label: 'C', date: '—', status: 'pending' },
    ]
    expect(normalizeLifecycle(steps)).toEqual(steps)
  })
})

describe('mapAgreement', () => {
  it('maps a raw agreement row', () => {
    const agr = mapAgreement({
      id: 'ua',
      name: 'User Agreement',
      description: 'desc',
      status: 'Signed',
      signed_by: 'Dr. Lee',
      signed_date: 'Jul 2, 2026',
      signed_email: 'lee@example.com',
      sent_date: 'Jul 1, 2026',
      reminder_date: 'Jul 8, 2026',
    })
    expect(agr).toEqual({
      id: 'ua',
      name: 'User Agreement',
      description: 'desc',
      status: 'Signed',
      signedBy: 'Dr. Lee',
      signedDate: 'Jul 2, 2026',
      signedEmail: 'lee@example.com',
      sentDate: 'Jul 1, 2026',
      reminderDate: 'Jul 8, 2026',
    })
  })
})

describe('mapStudy', () => {
  const baseRow = {
    id: 'ima-abcd',
    name: 'Immune Aging',
    abbreviation: 'IMA',
    pi: { name: 'Dr. Lee', email: 'lee@example.com' },
    affiliation: 'Internal',
    affiliation_org: 'Penn',
    irb: 'IRB-1',
    stage: 'Processing',
    is_locked: false,
    cohort: { subjects: 10, totalSamples: 30, processedSamples: 0, sampleType: 'Fresh blood' },
    budget: { committed: 4600, invoiced: 0, remaining: 4600, pctInvoiced: 0, lines: [] },
    updated_at: '2026-07-10T00:00:00Z',
  }

  it('maps core fields and applies lifecycle normalization', () => {
    const study = mapStudy(
      {
        ...baseRow,
        lifecycle: [
          { label: 'Approved', date: 'in progress', status: 'active' },
          { label: 'Activated', date: 'Jul 5', status: 'done' },
        ],
      },
      [],
    )
    expect(study.id).toBe('ima-abcd')
    expect(study.name).toBe('Immune Aging')
    expect(study.stage).toBe('Processing')
    // normalizeLifecycle promoted the earlier step to done with the inherited date
    expect(study.lifecycle[0]).toEqual({ label: 'Approved', date: 'Jul 5', status: 'done' })
  })

  it('defaults statusTokenVersion to 1 and integrations to {} when absent', () => {
    const study = mapStudy(baseRow, [])
    expect(study.statusTokenVersion).toBe(1)
    expect(study.integrations).toEqual({})
    expect(study.intakeDetails).toEqual({})
    expect(study.activity).toEqual([])
    expect(study.lifecycle).toEqual([])
  })

  it('carries the provided agreements through', () => {
    const agreements = [mapAgreement({ id: 'ua', name: 'User Agreement', status: 'Pending' })]
    const study = mapStudy(baseRow, agreements)
    expect(study.agreements).toBe(agreements)
  })
})

describe('store getters', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('newInquiriesCount counts New and Lead statuses only', () => {
    const store = useAdminStore()
    store.inquiries = [
      { status: 'New' },
      { status: 'Lead' },
      { status: 'Intake Sent' },
      { status: 'Approved' },
      { status: 'Declined' },
    ] as Inquiry[]
    expect(store.newInquiriesCount).toBe(2)
  })

  it('signedInAgreementsCount counts only signed agreements for a study', () => {
    const store = useAdminStore()
    store.studies = [
      {
        id: 's1',
        agreements: [{ status: 'Signed' }, { status: 'Pending' }, { status: 'Signed' }],
      },
    ] as Study[]
    expect(store.signedInAgreementsCount('s1')).toBe(2)
    expect(store.signedInAgreementsCount('missing')).toBe(0)
  })

  it('studiesByStage filters by stage', () => {
    const store = useAdminStore()
    store.studies = [
      { id: 's1', stage: 'Processing' },
      { id: 's2', stage: 'Complete' },
      { id: 's3', stage: 'Processing' },
    ] as Study[]
    expect(store.studiesByStage('Processing').map(s => s.id)).toEqual(['s1', 's3'])
    expect(store.studiesByStage('Awaiting Signature')).toEqual([])
  })
})
