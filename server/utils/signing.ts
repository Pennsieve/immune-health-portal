import { createHmac } from 'node:crypto'

export interface SignTokenPayload {
  studyId: string
  agreementId: string
  piEmail: string
  exp: number
}

const b64 = (s: string) => Buffer.from(s).toString('base64url')
const decode = (s: string) => Buffer.from(s, 'base64url').toString('utf8')
const HEADER = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))

export function createSignToken(
  studyId: string,
  agreementId: string,
  piEmail: string,
  secret: string,
  ttlSeconds = 172800, // 48 hours
): string {
  const payload: SignTokenPayload = {
    studyId,
    agreementId,
    piEmail,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }
  const body = b64(JSON.stringify(payload))
  const sig = createHmac('sha256', secret).update(`${HEADER}.${body}`).digest('base64url')
  return `${HEADER}.${body}.${sig}`
}

export function verifySignToken(token: string, secret: string): SignTokenPayload {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('malformed token')
  const [header, body, sig] = parts
  const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  if (sig !== expected) throw new Error('invalid signature')
  const payload = JSON.parse(decode(body)) as SignTokenPayload
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('token expired')
  return payload
}
