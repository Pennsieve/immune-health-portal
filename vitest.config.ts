import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Resolve the Nuxt-style `~`/`@` root alias so unit tests can import modules
// that reference it (e.g. stores/admin.ts → ~/utils/agreements).
const root = fileURLToPath(new URL('.', import.meta.url))
const supabaseServerStub = fileURLToPath(new URL('./test/stubs/supabase-server.ts', import.meta.url))

// Unit tests run in a plain Node environment against pure logic (no Nuxt
// runtime, no server, no network). Keep them hermetic: nothing here should
// reach Supabase, MailerSend, Contentful, or any external service.
export default defineConfig({
  resolve: {
    alias: {
      '~': root,
      '@': root,
      // Server handlers import the real Supabase client from this virtual
      // module; under test we resolve it to a fake (see the stub file).
      '#supabase/server': supabaseServerStub,
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', '.nuxt/**', '.output/**'],
    // Provides the Nitro auto-imported globals (defineEventHandler, readBody,
    // sendEmail, …) that server handlers reference. Harmless for pure tests.
    setupFiles: ['./test/setup-server-globals.ts'],
  },
})
