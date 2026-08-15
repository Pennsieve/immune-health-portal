import { describe, it, expect } from 'vitest'
import { createStatusToken } from '~/server/utils/signing'
import handler from './[studyId].get'

// The public study-status page is token-gated. This handler verifies the status
// token (signature, matching studyId + PI email, and current version), then
// returns a PI-safe view with internal billing stripped. Tests exercise that
// auth chain and the shaping against a fake Supabase client (no network).

const SECRET = 'test-secret'
const STUDY_ID = 'ima-abcd'

function makeDb(data: Record<string, unknown> | null) {
  function from() {
    const api = {
      select: () => api,
      eq: () => api,
      single: async () => ({ data, error: data ? null : { message: 'not found' } }),
    }
    return api
  }
  return { client: { from } }
}

function study(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Immune Aging',
    abbreviation: 'IMA',
    irb: 'IRB-1',
    pi: { name: 'Dr. Lee', email: 'Lee@Example.com' },
    study_lead: null,
    affiliation: 'Internal',
    affiliation_org: 'Penn',
    stage: 'Processing',
    cohort: { subjects: 10 },
    budget: {
      committed: 4600,
      invoiced: 1000,
      accountCode: 'ACCT-1',
      baName: 'Business Admin',
      lines: [{ service: 'CyTOF', rate: 1200, planned: 3, completed: 1, committed: 3600, invoiced: 1200 }],
    },
    lifecycle: [
      { label: 'A', date: 'Jan 1', status: 'active' },
      { label: 'B', date: 'Jan 5', status: 'done' },
    ],
    objectives: 'obj',
    additional_notes: null,
    phlebotomy: null,
    metadata_desc: null,
    intake_details: {},
    status_token_version: 1,
    agreements: [
      { id: 'ua', name: 'User Agreement', status: 'Pending', signed_by: null, signed_date: null },
      { id: 'lv', name: 'LabVantage', status: 'Signed', signed_by: 'Dr. Lee', signed_date: 'Jul 2' },
      { id: 'zz', name: 'Bogus (not a real agreement id)', status: 'Pending' },
    ],
    ...overrides,
  }
}

function run(data: Record<string, unknown> | null, token: string | undefined, studyId = STUDY_ID) {
  const db = makeDb(data)
  return handler({ __params: { studyId }, __query: token === undefined ? {} : { token }, __supabase: db.client })
}

// piEmail differs in case from the stored PI email on purpose (case-insensitive match).
const validToken = () => createStatusToken(STUDY_ID, 'lee@example.com', 1, SECRET)

describe('status — successful read', () => {
  it('returns a PI-safe view with internal billing stripped', async () => {
    const res = await run(study(), validToken()) as {
      name: string
      piEmail: string
      budget: { committed: number; invoiced: number; accountCode?: string; lines: Array<Record<string, unknown>> }
    }
    expect(res.name).toBe('Immune Aging')
    expect(res.piEmail).toBe('Lee@Example.com')
    expect(res.budget.committed).toBe(4600)
    expect(res.budget.invoiced).toBe(1000)
    // internal-only fields must not leak to the PI
    expect(res.budget.accountCode).toBeUndefined()
    expect(res.budget).not.toHaveProperty('baName')
    // per-line billing figures are stripped to service/rate/planned/completed
    expect(res.budget.lines[0]).toEqual({ service: 'CyTOF', rate: 1200, planned: 3, completed: 1 })
  })

  it('includes sign URLs for pending agreements only, and filters ids no longer in AGREEMENT_IDS', async () => {
    const res = await run(study(), validToken()) as {
      agreements: Array<{ id: string; status: string; signUrl: string | null }>
    }
    // 'lv' and 'zz' are both filtered out — only 'ua' remains a recognized agreement id
    expect(res.agreements).toHaveLength(1)
    const ua = res.agreements.find(a => a.id === 'ua')!
    expect(ua.signUrl).toContain(`/admin/sign/${STUDY_ID}-ua`)
  })

  it('normalizes lifecycle (promotes an earlier step to done, keeping its date)', async () => {
    const res = await run(study(), validToken()) as {
      lifecycle: Array<{ label: string; date: string; status: string }>
    }
    expect(res.lifecycle[0]).toEqual({ label: 'A', date: 'Jan 1', status: 'done' })
  })
})

describe('status — auth failures', () => {
  it('rejects a missing token with 401', async () => {
    await expect(run(study(), undefined)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects a tampered token with 401', async () => {
    await expect(run(study(), validToken().slice(0, -2) + 'zz')).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects when the token studyId does not match the route with 403', async () => {
    const otherToken = createStatusToken('other-study', 'lee@example.com', 1, SECRET)
    await expect(run(study(), otherToken)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('returns 404 when the study does not exist', async () => {
    await expect(run(null, validToken())).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects when the token PI email does not match the study with 403', async () => {
    const wrongEmail = createStatusToken(STUDY_ID, 'someone-else@example.com', 1, SECRET)
    await expect(run(study(), wrongEmail)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects a revoked (stale version) token with 401', async () => {
    // Token minted at v1, but the study has been bumped to v2 (link regenerated).
    await expect(run(study({ status_token_version: 2 }), validToken()))
      .rejects.toMatchObject({ statusCode: 401 })
  })
})
