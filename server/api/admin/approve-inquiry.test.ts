import { describe, it, expect, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import handler from './approve-inquiry.post'

// approve-inquiry turns a reviewed inquiry into a study: it derives the budget
// (rate x qty per line, summed) and the projected sample total (cohort matrix),
// then inserts the study + agreements and emails the PI. These tests exercise
// that logic through the handler with a fake Supabase client that captures the
// insert payloads — no network, no real email (see test/setup-server-globals).

const sendEmailMock = (globalThis as unknown as { sendEmail: Mock }).sendEmail

interface StudyInsert {
  id: string
  budget: {
    committed: number
    invoiced: number
    remaining: number
    pctInvoiced: number
    lines: Array<{ service: string; rate: number; planned: number; completed: number; committed: number; invoiced: number }>
  }
  cohort: { totalSamples: number; groups: Array<{ name: string; subjects: number; samples: Record<string, number> }> }
}

// A minimal chainable stand-in for the Supabase query builder. Records the
// payloads passed to .insert()/.update() so tests can assert on them.
function makeDb(inquiry: Record<string, unknown> | null) {
  const inserts = { studies: [] as StudyInsert[], agreements: [] as unknown[][] }
  const updates: Array<{ table: string; payload: unknown }> = []

  function from(table: string) {
    const api = {
      select: () => api,
      eq: () => api,
      single: async () => ({
        data: table === 'inquiries' ? inquiry : null,
        error: table === 'inquiries' && !inquiry ? { message: 'not found' } : null,
      }),
      insert: async (payload: unknown) => {
        if (table === 'studies') inserts.studies.push(payload as StudyInsert)
        else if (table === 'agreements') inserts.agreements.push(payload as unknown[])
        return { error: null }
      },
      update: (payload: unknown) => ({
        eq: async () => {
          updates.push({ table, payload })
          return { error: null }
        },
      }),
    }
    return api
  }

  return { client: { from }, inserts, updates }
}

function baseInquiry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inq-1',
    status: 'New',
    study_name: 'Immune Aging',
    abbreviation: 'IMA',
    pi: { name: 'Dr. Lee', email: 'lee@example.com' },
    submitted_date: 'Jul 1, 2026',
    services_detail: [
      { name: 'CyTOF', qty: 3, rate: '$1,200' },
      { name: 'Processing', qty: 2, rate: 500 },
    ],
    sample_schedule: [
      { name: 'Cohort A', subjects: 10, samples: { base: 2, w24: 1 } },
      { name: 'Cohort B', subjects: 5, samples: { base: 1, w52: 1, w104: 1 } },
    ],
    cohort_subjects: 15,
    sample_type: 'Fresh blood',
    intake_details: {},
    activity: [],
    ...overrides,
  }
}

function invoke(inquiry: Record<string, unknown> | null, body: Record<string, unknown> = { inquiryId: 'inq-1' }) {
  const db = makeDb(inquiry)
  const event = { __body: body, __supabase: db.client }
  return { db, result: handler(event) }
}

beforeEach(() => {
  sendEmailMock.mockClear()
})

describe('approve-inquiry — budget math', () => {
  it('computes per-line committed as rate x qty (parsing "$1,200" strings)', async () => {
    const { db, result } = invoke(baseInquiry())
    await result
    const { lines } = db.inserts.studies[0].budget
    expect(lines[0]).toEqual({ service: 'CyTOF', rate: 1200, planned: 3, completed: 0, committed: 3600, invoiced: 0 })
    expect(lines[1]).toEqual({ service: 'Processing', rate: 500, planned: 2, completed: 0, committed: 1000, invoiced: 0 })
  })

  it('sums committed across lines and seeds remaining = committed, invoiced = 0', async () => {
    const { db, result } = invoke(baseInquiry())
    await result
    const { budget } = db.inserts.studies[0]
    expect(budget.committed).toBe(4600)
    expect(budget.remaining).toBe(4600)
    expect(budget.invoiced).toBe(0)
    expect(budget.pctInvoiced).toBe(0)
  })

  it('treats an unparseable rate as 0', async () => {
    const { db, result } = invoke(baseInquiry({
      services_detail: [{ name: 'Consult', qty: 2, rate: 'call for pricing' }],
    }))
    await result
    expect(db.inserts.studies[0].budget.lines[0].committed).toBe(0)
    expect(db.inserts.studies[0].budget.committed).toBe(0)
  })

  it('handles an empty services_detail (zero committed, no lines)', async () => {
    const { db, result } = invoke(baseInquiry({ services_detail: [] }))
    await result
    expect(db.inserts.studies[0].budget.lines).toEqual([])
    expect(db.inserts.studies[0].budget.committed).toBe(0)
  })
})

describe('approve-inquiry — sample matrix total', () => {
  it('totals subjects x sum(timepoint samples) across cohort groups', async () => {
    const { db, result } = invoke(baseInquiry())
    await result
    // Cohort A: 10 x (2+1) = 30; Cohort B: 5 x (1+1+1) = 15 → 45
    expect(db.inserts.studies[0].cohort.totalSamples).toBe(45)
  })

  it('ignores non-timepoint sample keys and defaults missing ones to 0', async () => {
    const { db, result } = invoke(baseInquiry({
      sample_schedule: [{ name: 'X', subjects: 4, samples: { base: 2, junk: 99 } }],
    }))
    await result
    // Only `base` counts (junk ignored): 4 x 2 = 8
    expect(db.inserts.studies[0].cohort.totalSamples).toBe(8)
    expect(db.inserts.studies[0].cohort.groups[0].samples).toEqual({ base: 2, w24: 0, w52: 0, w104: 0 })
  })
})

describe('approve-inquiry — side effects & status gating', () => {
  it('creates 3 agreements, emails the PI, and marks the inquiry Approved', async () => {
    const { db, result } = invoke(baseInquiry())
    const res = await result as { success: boolean; studyId: string }
    expect(res.success).toBe(true)
    expect(res.studyId).toMatch(/^ima-/)
    expect(db.inserts.agreements[0]).toHaveLength(3)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const approvedUpdate = db.updates.find(u => u.table === 'inquiries')
    expect((approvedUpdate?.payload as { status: string }).status).toBe('Approved')
  })

  it('rejects a missing inquiryId with 400', async () => {
    const { result } = invoke(baseInquiry(), {})
    await expect(result).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns 404 when the inquiry does not exist', async () => {
    const { result } = invoke(null)
    await expect(result).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects an already-approved inquiry with 409', async () => {
    const { result } = invoke(baseInquiry({ status: 'Approved' }))
    await expect(result).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects a lead (not yet a full intake) with 409', async () => {
    const { result } = invoke(baseInquiry({ status: 'Lead' }))
    await expect(result).rejects.toMatchObject({ statusCode: 409 })
  })

  it('does not create a study or send email when gating fails', async () => {
    const { db, result } = invoke(baseInquiry({ status: 'Lead' }))
    await expect(result).rejects.toThrow()
    expect(db.inserts.studies).toHaveLength(0)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
