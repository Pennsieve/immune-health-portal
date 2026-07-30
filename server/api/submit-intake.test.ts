import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { createIntakeToken } from '~/server/utils/signing'

// submit-intake imports defineEventHandler/readBody/createError directly from
// h3 (not as Nitro auto-imports), and the real readBody expects a true H3 event.
// Mock h3 so the handler's default export is the raw function and readBody
// returns the body we attach to the event. Must be declared before importing
// the handler (vi.mock is hoisted).
vi.mock('h3', () => ({
  defineEventHandler: (fn: unknown) => fn,
  readBody: async (event: { __body?: unknown }) => event.__body,
  createError: (opts: { statusCode?: number; statusMessage?: string }) => {
    const err = new Error(opts.statusMessage ?? 'error') as Error & { statusCode?: number; statusMessage?: string }
    err.statusCode = opts.statusCode
    err.statusMessage = opts.statusMessage
    return err
  },
}))

const { default: handler } = await import('./submit-intake.post')

// submit-intake is token-gated: the link is emailed after the intro call. It
// verifies the token, requires the inquiry still be in the lead phase, then
// upgrades the lead row to a full 'New' intake. These tests pin that gating and
// the email-failure rollback, against a fake Supabase client (no network/email).

const SECRET = 'test-secret'
const sendEmailMock = (globalThis as unknown as { sendEmail: Mock }).sendEmail

function validToken(inquiryId = 'inq-1', email = 'lead@example.com') {
  return createIntakeToken(inquiryId, email, SECRET)
}

function makeDb(existing: Record<string, unknown> | null) {
  const updates: Array<Record<string, unknown>> = []
  function from(table: string) {
    const api = {
      select: () => api,
      eq: () => api,
      single: async () => ({
        data: table === 'inquiries' ? existing : null,
        error: table === 'inquiries' && !existing ? { message: 'not found' } : null,
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

function baseForm(overrides: Record<string, unknown> = {}) {
  return {
    projectName: 'Immune Aging',
    acronym: 'IMA',
    principalInvestigator: 'Dr. Lee',
    piEmail: 'lee@example.com',
    affiliation: 'internal',
    subjectCount: 15,
    collectionGroups: [],
    objectives: 'Study immune aging',
    irbStatus: 'approved',
    irbNumber: 'IRB-1',
    sampleType: 'fresh-blood',
    phlebotomyNeeds: 'ih-campus',
    metadataPlan: 'redcap',
    ...overrides,
  }
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    form: baseForm(),
    token: validToken(),
    inquiryId: 'inq-1',
    servicesText: 'CyTOF',
    servicesDetail: [],
    totalSamples: 10,
    estimatedTotal: 1000,
    timezone: 'America/New_York',
    ...overrides,
  }
}

function leadRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inq-1',
    status: 'Lead',
    submitted_date: 'Jul 1, 2026',
    feasibility: [{ label: 'x', checked: true }],
    activity: [],
    ...overrides,
  }
}

function run(existing: Record<string, unknown> | null, b: Record<string, unknown> = body()) {
  const db = makeDb(existing)
  return { db, result: handler({ __body: b, __supabase: db.client }) }
}

beforeEach(() => {
  sendEmailMock.mockClear()
  sendEmailMock.mockResolvedValue({})
})

describe('submit-intake — happy path', () => {
  it('upgrades a lead row to a New full intake and emails PI + staff', async () => {
    const { db, result } = run(leadRow(), body())
    const res = await result as { success: boolean }
    expect(res.success).toBe(true)
    expect(db.updates[0].status).toBe('New')
    expect(db.updates[0].study_name).toBe('Immune Aging')
    // one confirmation email + one staff alert
    expect(sendEmailMock).toHaveBeenCalledTimes(2)
  })

  it('also accepts an Intake Sent inquiry', async () => {
    const { db, result } = run(leadRow({ status: 'Intake Sent' }), body())
    await result
    expect(db.updates[0].status).toBe('New')
  })
})

describe('submit-intake — token gating', () => {
  it('rejects a missing token with 401', async () => {
    const { result } = run(leadRow(), body({ token: undefined }))
    await expect(result).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects a missing inquiryId with 401', async () => {
    const { result } = run(leadRow(), body({ inquiryId: undefined }))
    await expect(result).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects a token minted for a different inquiry with 401', async () => {
    const { result } = run(leadRow(), body({ token: validToken('other-inquiry') }))
    await expect(result).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects an expired token with a 401 that mentions expiry', async () => {
    const expired = createIntakeToken('inq-1', 'lead@example.com', SECRET, -1)
    const { result } = run(leadRow(), body({ token: expired }))
    await expect(result).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: expect.stringContaining('expired'),
    })
  })

  it('rejects a tampered token with 401', async () => {
    const tampered = validToken().slice(0, -2) + 'zz'
    const { result } = run(leadRow(), body({ token: tampered }))
    await expect(result).rejects.toMatchObject({ statusCode: 401 })
  })

  it('does not touch the database when the token is invalid', async () => {
    const { db, result } = run(leadRow(), body({ token: 'garbage' }))
    await expect(result).rejects.toThrow()
    expect(db.updates).toHaveLength(0)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})

describe('submit-intake — validation & status gating', () => {
  it('rejects an invalid PI email with 400', async () => {
    const { result } = run(leadRow(), body({ form: baseForm({ piEmail: 'not-an-email' }) }))
    await expect(result).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns 404 when the inquiry does not exist', async () => {
    const { result } = run(null, body())
    await expect(result).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects an inquiry that already submitted its intake (New) with 409', async () => {
    const { result } = run(leadRow({ status: 'New' }), body())
    await expect(result).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects an approved inquiry with 409', async () => {
    const { result } = run(leadRow({ status: 'Approved' }), body())
    await expect(result).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('submit-intake — email failure rollback', () => {
  it('rolls the inquiry back to its prior status and throws 500', async () => {
    sendEmailMock.mockRejectedValueOnce(new Error('MailerSend down'))
    const { db, result } = run(leadRow({ status: 'Lead' }), body())
    await expect(result).rejects.toMatchObject({ statusCode: 500 })
    // First update writes 'New'; the rollback restores the prior 'Lead' status.
    expect(db.updates).toHaveLength(2)
    expect(db.updates[0].status).toBe('New')
    expect(db.updates[1].status).toBe('Lead')
  })
})
