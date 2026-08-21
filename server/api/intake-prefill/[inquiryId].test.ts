import { describe, it, expect } from 'vitest'
import { createIntakeToken } from '~/server/utils/signing'
import handler from './[inquiryId].get'

// Public, token-gated prefill for the full intake form. Verifies the intake
// token (signature, expiry, matching inquiryId), requires the inquiry still be
// in the lead phase, then returns the fields captured so far, pre-mapped for the
// form. Tests exercise that gating + mapping against a fake Supabase client.

const SECRET = 'test-secret'
const INQUIRY_ID = 'inq-1'

function makeDb(inquiry: Record<string, unknown> | null) {
  function from() {
    const api = {
      select: () => api,
      eq: () => api,
      single: async () => ({ data: inquiry, error: inquiry ? null : { message: 'not found' } }),
    }
    return api
  }
  return { client: { from } }
}

function inquiry(overrides: Record<string, unknown> = {}) {
  return {
    id: INQUIRY_ID,
    status: 'Intake Sent',
    affiliation: 'Internal',
    affiliation_org: 'Penn',
    budget_code: '400-1234-5-678901-2345-6789-0123',
    funding_name: 'R01 Immune Aging',
    ba_name: 'Jane BA',
    ba_email: 'ba@pennmedicine.upenn.edu',
    contracting_contact: null,
    intake_details: { ilabsId: 'IL-123456' },
    ...overrides,
  }
}

const validToken = () => createIntakeToken(INQUIRY_ID, 'lee@example.com', SECRET)

function run(data: Record<string, unknown> | null, token: string | undefined, inquiryId = INQUIRY_ID) {
  const db = makeDb(data)
  return handler({ __params: { inquiryId }, __query: token === undefined ? {} : { token }, __supabase: db.client })
}

describe('intake-prefill — successful read', () => {
  it('returns billing-only prefill data with affiliation mapped', async () => {
    const res = await run(inquiry(), validToken()) as {
      affiliation: string
      organization: string
      budgetCode: string
      fundingName: string
      baName: string
      baEmail: string
      ilabsId: string
    }
    expect(res.affiliation).toBe('internal') // 'Internal' → 'internal'
    expect(res.organization).toBe('Penn')
    expect(res.budgetCode).toBe('400-1234-5-678901-2345-6789-0123')
    expect(res.fundingName).toBe('R01 Immune Aging')
    expect(res.baName).toBe('Jane BA')
    expect(res.baEmail).toBe('ba@pennmedicine.upenn.edu')
    expect(res.ilabsId).toBe('IL-123456')
  })

  it('applies safe defaults when optional fields are absent', async () => {
    const res = await run(
      inquiry({ affiliation: null, budget_code: null, intake_details: null }),
      validToken(),
    ) as { affiliation: string; budgetCode: string; ilabsId: string }
    expect(res.affiliation).toBe('internal') // unmapped falls back to internal
    expect(res.budgetCode).toBe('')
    expect(res.ilabsId).toBe('')
  })
})

describe('intake-prefill — gating', () => {
  it('rejects a missing token with 401', async () => {
    await expect(run(inquiry(), undefined)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects an expired token with a 401 that mentions expiry', async () => {
    const expired = createIntakeToken(INQUIRY_ID, 'lee@example.com', SECRET, -1)
    await expect(run(inquiry(), expired)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: expect.stringContaining('expired'),
    })
  })

  it('rejects a tampered token with 401', async () => {
    await expect(run(inquiry(), validToken().slice(0, -2) + 'zz')).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects a token minted for a different inquiry with 401', async () => {
    await expect(run(inquiry(), createIntakeToken('other', 'lee@example.com', SECRET)))
      .rejects.toMatchObject({ statusCode: 401 })
  })

  it('returns 404 when the inquiry does not exist', async () => {
    await expect(run(null, validToken())).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects an inquiry that already submitted its full intake (New) with 409', async () => {
    await expect(run(inquiry({ status: 'New' }), validToken())).rejects.toMatchObject({ statusCode: 409 })
  })
})
