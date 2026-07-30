import { vi } from 'vitest'
import { ONBOARDING_CHECKLIST } from '../server/utils/onboarding'

// Nuxt/Nitro auto-import a handful of helpers into server handlers (they appear
// as bare globals in the source, not explicit imports). To unit-test a handler
// in a plain Node environment we provide minimal stand-ins here. This file runs
// as a Vitest setup file before any test module is imported, so the globals
// exist by the time a handler module evaluates `defineEventHandler(...)`.
//
// These are inert defaults — no network, no real email, no real Supabase. The
// Supabase client itself comes from test/stubs/supabase-server.ts, and each
// test supplies its own fake via the event object.

type Handler = (event: unknown) => unknown
const g = globalThis as unknown as Record<string, unknown>

// defineEventHandler is called at module load → make it the identity function so
// a handler's default export is the raw async function we can invoke directly.
g.defineEventHandler = (fn: Handler) => fn

// readBody(event) → the body the test attached as event.__body.
g.readBody = async (event: { __body?: unknown }) => event.__body

// getRouterParam(event, name) → the route param the test attached as event.__params.
g.getRouterParam = (event: { __params?: Record<string, string> }, name: string) => event.__params?.[name]

// getQuery(event) → the query object the test attached as event.__query.
g.getQuery = (event: { __query?: Record<string, unknown> }) => event.__query ?? {}

// createError({ statusCode, statusMessage }) → a throwable Error carrying both
// the code and message (mirrors h3's H3Error, which exposes statusMessage).
g.createError = (opts: { statusCode?: number; statusMessage?: string }) => {
  const err = new Error(opts.statusMessage ?? 'error') as Error & { statusCode?: number; statusMessage?: string }
  err.statusCode = opts.statusCode
  err.statusMessage = opts.statusMessage
  return err
}

// Fixed runtime config for deterministic URLs/token signing in assertions.
// emailsDisabled short-circuits handlers' MailerSend key check; sendEmail is
// mocked below regardless, so no mail is ever sent.
g.useRuntimeConfig = () => ({
  siteUrl: 'https://test.i3h',
  signingSecret: 'test-secret',
  emailsDisabled: true,
  mailersendApiKey: 'test-key',
  adminEmail: 'admin@test.i3h',
  public: { appDomain: 'test.i3h' },
})

// sendEmail is a spy so tests can assert it was invoked without sending mail.
g.sendEmail = vi.fn(async () => ({}))

// DEFAULT_TIMEZONE is auto-imported from server/utils/constants.ts.
g.DEFAULT_TIMEZONE = 'America/New_York'

// ONBOARDING_CHECKLIST is auto-imported from server/utils/onboarding.ts.
g.ONBOARDING_CHECKLIST = ONBOARDING_CHECKLIST
