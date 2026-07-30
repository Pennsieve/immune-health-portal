import { describe, it, expect } from 'vitest'
import handler from './[token].get'

// The sign GET loads the study behind a signing link. The study id is embedded
// in the path token as `<studyId>-<agreementId>`, so the handler reconstructs
// studyId by dropping the last hyphen-segment — which must survive study ids
// that themselves contain hyphens. Tests pin that parsing and the 404 path.

function makeDb(data: Record<string, unknown> | null) {
  const filters: Array<unknown> = []
  function from() {
    const api = {
      select: () => api,
      eq: (_col: string, val: unknown) => {
        filters.push(val)
        return api
      },
      single: async () => ({ data, error: data ? null : { message: 'not found' } }),
    }
    return api
  }
  return { client: { from }, filters }
}

function run(pathToken: string, data: Record<string, unknown> | null) {
  const db = makeDb(data)
  return { db, result: handler({ __params: { token: pathToken }, __supabase: db.client }) }
}

describe('sign — studyId parsing', () => {
  it('drops the agreement-id suffix, preserving a hyphenated study id', async () => {
    const { db, result } = run('ima-abcd-ua', { name: 'Immune Aging' })
    const data = await result
    expect(db.filters[0]).toBe('ima-abcd') // not 'ima' or 'ima-abcd-ua'
    expect(data).toEqual({ name: 'Immune Aging' })
  })

  it('handles a study id with multiple hyphens', async () => {
    const { db, result } = run('my-cool-study-2f9a-lv', { name: 'X' })
    await result
    expect(db.filters[0]).toBe('my-cool-study-2f9a')
  })

  it('returns 404 when the study does not exist', async () => {
    const { result } = run('ima-abcd-ua', null)
    await expect(result).rejects.toMatchObject({ statusCode: 404 })
  })
})
