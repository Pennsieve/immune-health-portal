import { describe, it, expect, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { verifyStatusToken } from '~/server/utils/signing'
import handler from './regenerate-status-link.post'

// regenerate-status-link bumps a study's status_token_version and emails the PI
// a fresh link. The version bump is what revokes every previously issued status
// link (see the status handler's version check). Tests pin the increment, the
// new token carrying the new version, and the 400/404 gating.

const SECRET = 'test-secret'
const sendEmailMock = (globalThis as unknown as { sendEmail: Mock }).sendEmail

function makeDb(study: Record<string, unknown> | null) {
  const updates: Array<Record<string, unknown>> = []
  function from() {
    const api = {
      select: () => api,
      eq: () => api,
      single: async () => ({ data: study, error: study ? null : { message: 'not found' } }),
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

function study(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Immune Aging',
    pi: { name: 'Dr. Lee', email: 'lee@example.com' },
    status_token_version: 1,
    ...overrides,
  }
}

function run(data: Record<string, unknown> | null, body: Record<string, unknown> = { studyId: 'ima-abcd' }) {
  const db = makeDb(data)
  return { db, result: handler({ __body: body, __supabase: db.client }) }
}

beforeEach(() => {
  sendEmailMock.mockClear()
})

describe('regenerate-status-link', () => {
  it('increments the version, emails the PI, and returns a link carrying the new version', async () => {
    const { db, result } = run(study({ status_token_version: 1 }))
    const res = await result as { statusUrl: string }
    expect(db.updates[0].status_token_version).toBe(2)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)

    const token = new URL(res.statusUrl).searchParams.get('token')!
    expect(res.statusUrl).toContain('/status/ima-abcd')
    // The freshly minted token verifies at the new version — old v1 links no longer will.
    expect(verifyStatusToken(token, SECRET).ver).toBe(2)
  })

  it('defaults an absent version to 1 before incrementing', async () => {
    const { db, result } = run(study({ status_token_version: undefined }))
    await result
    expect(db.updates[0].status_token_version).toBe(2)
  })

  it('rejects a missing studyId with 400', async () => {
    const { result } = run(study(), {})
    await expect(result).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns 404 when the study does not exist', async () => {
    const { result } = run(null)
    await expect(result).rejects.toMatchObject({ statusCode: 404 })
  })

  it('does not email when gating fails', async () => {
    const { result } = run(null)
    await expect(result).rejects.toThrow()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
