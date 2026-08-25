import { describe, it, expect, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import handler from './send-intake-link.post'

// send-intake-link emails the tokenized full-intake link to a lead. It is only
// valid while the inquiry is still in the lead phase ('Lead' or 'Intake Sent')
// AND the intro-meeting checklist is complete. These tests pin that gating and
// the status transition, against a fake Supabase client (no network/email).

const sendEmailMock = (globalThis as unknown as { sendEmail: Mock }).sendEmail

function makeDb(inquiry: Record<string, unknown> | null) {
  const updates: Array<Record<string, unknown>> = []
  function from(table: string) {
    const api = {
      select: () => api,
      eq: () => api,
      single: async () => ({
        data: table === 'inquiries' ? inquiry : null,
        error: table === 'inquiries' && !inquiry ? { message: 'not found' } : null,
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
  return {
    id: 'inq-1',
    status: 'Lead',
    lead_decision: 'proceed',
    pi: { name: 'Dr. Lee', email: 'lee@example.com' },
    feasibility: [
      { label: 'Schedule introductory meeting', checked: true },
      { label: 'Introductory meeting complete', checked: true },
    ],
    activity: [],
    ...overrides,
  }
}

function run(inq: Record<string, unknown> | null, body: Record<string, unknown> = { inquiryId: 'inq-1' }) {
  const db = makeDb(inq)
  return { db, result: handler({ __body: body, __supabase: db.client }) }
}

beforeEach(() => {
  sendEmailMock.mockClear()
})

describe('send-intake-link — happy path & status transition', () => {
  it('sends the link from Lead status and flips to Intake Sent', async () => {
    const { db, result } = run(inquiry())
    const res = await result as { success: boolean; sentDate: string; activityItem: { title: string } }
    expect(res.success).toBe(true)
    expect(res.sentDate).toBeTruthy()
    expect(res.activityItem.title).toBe('Billing form sent to lead')
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(db.updates[0].status).toBe('Intake Sent')
    expect(db.updates[0].intake_sent_date).toBe(res.sentDate)
  })

  it('labels the activity as a re-send when already Intake Sent', async () => {
    const { result } = run(inquiry({ status: 'Intake Sent' }))
    const res = await result as { activityItem: { title: string } }
    expect(res.activityItem.title).toBe('Billing form re-sent to lead')
  })
})

describe('send-intake-link — gating', () => {
  it('rejects a missing inquiryId with 400', async () => {
    const { result } = run(inquiry(), {})
    await expect(result).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns 404 when the inquiry does not exist', async () => {
    const { result } = run(null)
    await expect(result).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects an inquiry that already submitted the billing form (New) with 409', async () => {
    const { result } = run(inquiry({ status: 'New' }))
    await expect(result).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects an approved inquiry with 409', async () => {
    const { result } = run(inquiry({ status: 'Approved' }))
    await expect(result).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects when the lead checklist is incomplete with 409', async () => {
    const { result } = run(inquiry({
      feasibility: [
        { label: 'Schedule introductory meeting', checked: true },
        { label: 'Introductory meeting complete', checked: false },
      ],
    }))
    await expect(result).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects when the checklist is empty with 409', async () => {
    const { result } = run(inquiry({ feasibility: [] }))
    await expect(result).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects a Lead not yet cleared to proceed with 409', async () => {
    const { result } = run(inquiry({ lead_decision: null }))
    await expect(result).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects a paused (On Hold) lead with 409', async () => {
    const { result } = run(inquiry({ status: 'On Hold', lead_decision: 'hold' }))
    await expect(result).rejects.toMatchObject({ statusCode: 409 })
  })

  it('allows a re-send (Intake Sent) even without an explicit proceed flag', async () => {
    const { result } = run(inquiry({ status: 'Intake Sent', lead_decision: null }))
    const res = await result as { success: boolean }
    expect(res.success).toBe(true)
  })

  it('rejects when the inquiry has no contact email with 400', async () => {
    const { result } = run(inquiry({ pi: { name: 'Dr. Lee' } }))
    await expect(result).rejects.toMatchObject({ statusCode: 400 })
  })

  it('does not email or update when gating fails', async () => {
    const { db, result } = run(inquiry({ status: 'New' }))
    await expect(result).rejects.toThrow()
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(db.updates).toHaveLength(0)
  })
})
