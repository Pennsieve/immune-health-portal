import { describe, it, expect, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { verifyStatusToken } from '~/server/utils/signing'
import handler from './update-study.post'

// update-study saves an admin's edits to a study record. Because the study's
// agreement package was already emailed to the PI when the study was created,
// any later change is something the PI must be told about: the handler diffs
// the old row against the new values and, if anything PI-facing changed,
// emails the PI (and study lead) the specific list with a status-page link.
// These tests pin that notification — what triggers it, who gets it, that the
// link carries the study's current (un-bumped) status token version — and that
// an email failure never fails the already-committed update.

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

function studyRow(overrides: Record<string, unknown> = {}) {
  return {
    activity: [],
    lifecycle: [],
    name: 'Immune Aging',
    abbreviation: 'IMA',
    pi: { name: 'Dr. Lee', email: 'lee@example.com' },
    study_lead: null,
    affiliation: 'Internal',
    affiliation_org: 'University of Pennsylvania',
    irb: '2026-001',
    additional_notes: null,
    cohort: { subjects: 15, totalSamples: 45, groups: [], visits: [] },
    budget: { accountCode: '400-1', fundingName: 'R01', baName: null, baEmail: null, contractingContact: null, lines: [] },
    intake_details: {},
    key_personnel: [],
    status_token_version: 3,
    ...overrides,
  }
}

// A full edit payload that, by default, is identical to studyRow() — each test
// overrides just the field(s) it means to change.
function body(overrides: Record<string, unknown> = {}) {
  return {
    studyId: 'ima-abcd',
    timezone: 'America/New_York',
    name: 'Immune Aging',
    abbreviation: 'IMA',
    pi: { name: 'Dr. Lee', email: 'lee@example.com' },
    studyLead: undefined,
    affiliation: 'Internal',
    affiliationOrg: 'University of Pennsylvania',
    irb: '2026-001',
    stage: 'Awaiting Signature',
    additionalNotes: undefined,
    cohort: { subjects: 15, totalSamples: 45, groups: [], visits: [] },
    budget: { accountCode: '400-1', fundingName: 'R01', baName: null, baEmail: null, contractingContact: null, lines: [] },
    ...overrides,
  }
}

function run(study: Record<string, unknown> | null, b: Record<string, unknown> = body()) {
  const db = makeDb(study)
  return { db, result: handler({ __body: b, __supabase: db.client }) }
}

beforeEach(() => {
  sendEmailMock.mockClear()
  sendEmailMock.mockResolvedValue({})
})

describe('update-study — PI change notification', () => {
  it('emails the PI the list of changed fields with a status link', async () => {
    const { result } = run(studyRow(), body({ name: 'Immune Ageing', irb: '2026-002' }))
    const res = await result as { success: boolean; notified: boolean }
    expect(res.success).toBe(true)
    expect(res.notified).toBe(true)

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const msg = sendEmailMock.mock.calls[0][0] as { to: Array<{ email: string }>; subject: string; html: string }
    expect(msg.to).toEqual([{ email: 'lee@example.com', name: 'Dr. Lee' }])
    expect(msg.subject).toContain('Immune Ageing')
    // Names the specific fields and their before → after values
    expect(msg.html).toContain('Study name')
    expect(msg.html).toContain('Immune Aging')
    expect(msg.html).toContain('Immune Ageing')
    expect(msg.html).toContain('IRB protocol')
    expect(msg.html).toContain('2026-002')

    // Link carries the study's CURRENT status token version (not regenerated)
    const url = msg.html.match(/href="(https:\/\/test\.i3h\/status\/[^"]+)"/)![1]
    expect(url).toContain('/status/ima-abcd?token=')
    const token = new URL(url).searchParams.get('token')!
    const payload = verifyStatusToken(token, SECRET)
    expect(payload).toMatchObject({ studyId: 'ima-abcd', piEmail: 'lee@example.com', ver: 3 })
  })

  it('does not email when no PI-facing value changed', async () => {
    const { result } = run(studyRow(), body({ stage: 'Processing' }))
    const res = await result as { notified: boolean }
    expect(res.notified).toBe(false)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('detects an expanded intake-detail change', async () => {
    const { result } = run(
      studyRow({ intake_details: { studySynopsis: 'Original synopsis' } }),
      body({ intakeDetails: { studySynopsis: 'Revised synopsis' } }),
    )
    await result
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const html = (sendEmailMock.mock.calls[0][0] as { html: string }).html
    expect(html).toContain('Study synopsis')
    expect(html).toContain('Revised synopsis')
  })

  it('flags a structural change (cohort matrix) without a from/to', async () => {
    const { result } = run(
      studyRow(),
      body({ cohort: { subjects: 15, totalSamples: 45, groups: [{ name: 'A', subjects: 15, samples: {} }], visits: [] } }),
    )
    await result
    const html = (sendEmailMock.mock.calls[0][0] as { html: string }).html
    expect(html).toContain('Cohort sample matrix')
    expect(html).toContain('updated')
  })

  it('also emails the study lead when one is set', async () => {
    const { result } = run(
      studyRow(),
      body({ irb: '2026-999', studyLead: { name: 'Sam Lead', email: 'sam@example.com' } }),
    )
    await result
    const to = (sendEmailMock.mock.calls[0][0] as { to: Array<{ email: string }> }).to
    expect(to.map(r => r.email)).toEqual(['lee@example.com', 'sam@example.com'])
  })

  it('does not fail the update when the notification email throws', async () => {
    sendEmailMock.mockRejectedValueOnce(new Error('MailerSend down'))
    const { result } = run(studyRow(), body({ name: 'Renamed Study' }))
    const res = await result as { success: boolean; notified: boolean }
    expect(res.success).toBe(true)
    expect(res.notified).toBe(false)
  })
})

describe('update-study — gating', () => {
  it('rejects a missing studyId with 400', async () => {
    const { result } = run(studyRow(), body({ studyId: undefined }))
    await expect(result).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects a missing name with 400', async () => {
    const { result } = run(studyRow(), body({ name: '  ' }))
    await expect(result).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns 404 when the study does not exist', async () => {
    const { result } = run(null)
    await expect(result).rejects.toMatchObject({ statusCode: 404 })
  })
})
