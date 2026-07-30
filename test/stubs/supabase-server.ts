// Test stub for Nuxt's `#supabase/server` virtual module. Server handlers call
// serverSupabaseServiceRole(event) to get a client; under test we hand it back
// whatever fake client the test attached to the event as `__supabase`, so each
// test controls its own DB responses with zero network access.
export function serverSupabaseServiceRole(event: { __supabase?: unknown }): unknown {
  return event.__supabase
}
