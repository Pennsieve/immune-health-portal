import { describe, it, expect } from 'vitest'
import {
  createSignToken,
  verifySignToken,
  createIntakeToken,
  verifyIntakeToken,
  createStatusToken,
  verifyStatusToken,
} from './signing'

const SECRET = 'test-signing-secret'
const OTHER_SECRET = 'a-different-secret'

// Flips the last character of a token part so the signature no longer matches.
function tamperBody(token: string): string {
  const [header, body, sig] = token.split('.')
  const flipped = body.slice(0, -1) + (body.endsWith('A') ? 'B' : 'A')
  return `${header}.${flipped}.${sig}`
}

describe('sign token (agreement signing, 48h default)', () => {
  it('round-trips the payload', () => {
    const token = createSignToken('study-1', 'agr-1', 'pi@example.com', SECRET)
    const payload = verifySignToken(token, SECRET)
    expect(payload.studyId).toBe('study-1')
    expect(payload.agreementId).toBe('agr-1')
    expect(payload.piEmail).toBe('pi@example.com')
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('rejects a token signed with a different secret', () => {
    const token = createSignToken('study-1', 'agr-1', 'pi@example.com', SECRET)
    expect(() => verifySignToken(token, OTHER_SECRET)).toThrow('invalid signature')
  })

  it('rejects a tampered payload', () => {
    const token = createSignToken('study-1', 'agr-1', 'pi@example.com', SECRET)
    expect(() => verifySignToken(tamperBody(token), SECRET)).toThrow('invalid signature')
  })

  it('rejects a malformed token', () => {
    expect(() => verifySignToken('not.a.valid.token', SECRET)).toThrow('malformed token')
    expect(() => verifySignToken('onlyonepart', SECRET)).toThrow('malformed token')
  })

  it('rejects an expired token', () => {
    // Negative TTL puts exp in the past.
    const token = createSignToken('study-1', 'agr-1', 'pi@example.com', SECRET, -1)
    expect(() => verifySignToken(token, SECRET)).toThrow('token expired')
  })
})

describe('intake token (full-intake link, 30-day default)', () => {
  it('round-trips the payload', () => {
    const token = createIntakeToken('inq-1', 'lead@example.com', SECRET)
    const payload = verifyIntakeToken(token, SECRET)
    expect(payload.inquiryId).toBe('inq-1')
    expect(payload.email).toBe('lead@example.com')
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('defaults to roughly a 30-day expiry', () => {
    const before = Math.floor(Date.now() / 1000)
    const token = createIntakeToken('inq-1', 'lead@example.com', SECRET)
    const { exp } = verifyIntakeToken(token, SECRET)
    const thirtyDays = 2592000
    // Allow a small window for execution time.
    expect(exp).toBeGreaterThanOrEqual(before + thirtyDays - 5)
    expect(exp).toBeLessThanOrEqual(before + thirtyDays + 5)
  })

  it('rejects a token signed with a different secret', () => {
    const token = createIntakeToken('inq-1', 'lead@example.com', SECRET)
    expect(() => verifyIntakeToken(token, OTHER_SECRET)).toThrow('invalid signature')
  })

  it('rejects a tampered payload', () => {
    const token = createIntakeToken('inq-1', 'lead@example.com', SECRET)
    expect(() => verifyIntakeToken(tamperBody(token), SECRET)).toThrow('invalid signature')
  })

  it('rejects a malformed token', () => {
    expect(() => verifyIntakeToken('onlyonepart', SECRET)).toThrow('malformed token')
  })

  it('rejects an expired token', () => {
    const token = createIntakeToken('inq-1', 'lead@example.com', SECRET, -1)
    expect(() => verifyIntakeToken(token, SECRET)).toThrow('token expired')
  })

  it('does not verify an intake token as a sign token (different shape, same secret)', () => {
    // Both use the same HMAC scheme, so the signature is valid — this documents
    // that verify does NOT enforce token "kind", only signature + expiry.
    const token = createIntakeToken('inq-1', 'lead@example.com', SECRET)
    const asSign = verifySignToken(token, SECRET)
    expect(asSign.studyId).toBeUndefined()
    expect(asSign.agreementId).toBeUndefined()
  })
})

describe('status token (PI status page, no expiry)', () => {
  it('round-trips the payload', () => {
    const token = createStatusToken('study-1', 'pi@example.com', 3, SECRET)
    const payload = verifyStatusToken(token, SECRET)
    expect(payload.studyId).toBe('study-1')
    expect(payload.piEmail).toBe('pi@example.com')
    expect(payload.ver).toBe(3)
  })

  it('rejects a token signed with a different secret', () => {
    const token = createStatusToken('study-1', 'pi@example.com', 1, SECRET)
    expect(() => verifyStatusToken(token, OTHER_SECRET)).toThrow('invalid signature')
  })

  it('rejects a tampered payload', () => {
    const token = createStatusToken('study-1', 'pi@example.com', 1, SECRET)
    expect(() => verifyStatusToken(tamperBody(token), SECRET)).toThrow('invalid signature')
  })

  it('rejects a malformed token', () => {
    expect(() => verifyStatusToken('two.parts', SECRET)).toThrow('malformed token')
  })

  it('carries no expiry, so an old token stays valid (revocation is via ver bump)', () => {
    const token = createStatusToken('study-1', 'pi@example.com', 1, SECRET)
    // No exp field means verify never throws "token expired".
    expect(() => verifyStatusToken(token, SECRET)).not.toThrow()
  })
})
