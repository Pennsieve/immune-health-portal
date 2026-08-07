import { describe, it, expect } from 'vitest'
import handler from './set-lead-decision.post'

// set-lead-decision records the intro-meeting go/no-go for a lead: 'proceed'
// advances it toward the full intake, 'hold' parks it as 'On Hold' with a
// follow-up date. These tests pin the status transitions, the payload written,
// and the validation gating — against a fake Supabase client (no network).

function makeDb(inquiry: Record<string, unknown> | null) {
  const updates: Array<Record<string, unknown>> = []
  function from() {
    const api = {
      select: () => api,
      eq: () => api,
      single: async () => ({
        data: inquiry,
        error: inquiry ? null : { message: 'not found' },
      }),
      update: (payload: Record<string, unknown>) => ({
        eq: async () => {
          updates.push(payload)
          return { error: null }
        },
      }),
    }
    return api
  }
  return { client: { from }, updates }
}

function inquiry(overrides: Record<string, unknown> = {}) {
  return { id: 'inq-1', status: 'Lead', activity: [], ...overrides }
}

function run(inq: Record<string, unknown> | null, body: Record<string, unknown>) {
  const db = makeDb(inq)
  return { db, result: handler({ __body: body, __supabase: db.client }) }
}

describe('set-lead-decision — proceed', () => {
  it('clears a Lead to proceed and keeps it in the Lead queue', async () => {
    const { db, result } = run(inquiry(), { inquiryId: 'inq-1', decision: 'proceed' })
    const res = await result as { status: string; holdUntil: string | null; activityItem: { title: string } }
    expect(res.status).toBe('Lead')
    expect(res.holdUntil).toBeNull()
    expect(db.updates[0]).toMatchObject({ status: 'Lead', lead_decision: 'proceed', hold_until: null })
    expect(res.activityItem.title).toBe('Cleared to proceed to full intake')
  })

  it('resumes an On Hold lead and labels the activity as resumed', async () => {
    const { db, result } = run(inquiry({ status: 'On Hold' }), { inquiryId: 'inq-1', decision: 'proceed' })
    const res = await result as { status: string; activityItem: { title: string } }
    expect(res.status).toBe('Lead')
    expect(db.updates[0].hold_until).toBeNull()
    expect(res.activityItem.title).toContain('resumed')
  })
})

describe('set-lead-decision — hold', () => {
  it('parks a Lead as On Hold with the follow-up date', async () => {
    const { db, result } = run(inquiry(), { inquiryId: 'inq-1', decision: 'hold', holdUntil: '2026-09-15' })
    const res = await result as { status: string; holdUntil: string | null; activityItem: { title: string } }
    expect(res.status).toBe('On Hold')
    expect(res.holdUntil).toBe('2026-09-15')
    expect(db.updates[0]).toMatchObject({ status: 'On Hold', lead_decision: 'hold', hold_until: '2026-09-15' })
    expect(res.activityItem.title).toContain('paused')
  })
})

describe('set-lead-decision — gating', () => {
  it('rejects a missing inquiryId with 400', async () => {
    const { result } = run(inquiry(), { decision: 'proceed' })
    await expect(result).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects an unknown decision with 400', async () => {
    const { result } = run(inquiry(), { inquiryId: 'inq-1', decision: 'maybe' })
    await expect(result).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects a hold without a valid date with 400', async () => {
    const { result } = run(inquiry(), { inquiryId: 'inq-1', decision: 'hold' })
    await expect(result).rejects.toMatchObject({ statusCode: 400 })
    const bad = run(inquiry(), { inquiryId: 'inq-1', decision: 'hold', holdUntil: 'soon' })
    await expect(bad.result).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns 404 when the inquiry does not exist', async () => {
    const { result } = run(null, { inquiryId: 'inq-1', decision: 'proceed' })
    await expect(result).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects a decision on an inquiry past the lead stage with 409', async () => {
    const { result } = run(inquiry({ status: 'New' }), { inquiryId: 'inq-1', decision: 'proceed' })
    await expect(result).rejects.toMatchObject({ statusCode: 409 })
  })

  it('does not write when gating fails', async () => {
    const { db, result } = run(inquiry({ status: 'Approved' }), { inquiryId: 'inq-1', decision: 'proceed' })
    await expect(result).rejects.toThrow()
    expect(db.updates).toHaveLength(0)
  })
})
