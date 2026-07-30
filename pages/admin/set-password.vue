<script setup lang="ts">
/**
 * Set / reset password (admin)
 *
 * Landing page for Supabase invite and password-recovery email links, which
 * arrive as ?token_hash=&type=. The one-time token is redeemed via verifyOtp()
 * — but only when the user clicks "continue", never automatically on load.
 *
 * Why the click gate: these tokens are single-use, and corporate mail security
 * (e.g. Microsoft Defender Safe Links) "detonates" links in a sandbox that
 * executes page JavaScript. Redeeming on mount lets that scan consume the token
 * before the real recipient clicks, leaving them a bogus "expired link" (and a
 * confirmed account they can't finish setting up). Scanners render pages but
 * don't press buttons, so gating verifyOtp() behind an explicit click keeps the
 * token intact until a real human acts. Once redeemed, a session exists and the
 * user sets a password via updateUser().
 */
definePageMeta({ layout: false })

const supabase = useSupabaseClient()

type View = 'checking' | 'confirm' | 'ready' | 'error' | 'done'
const view = ref<View>('checking')
const linkError = ref('')

// Redemption inputs captured on load but only used on click (see verifyLink).
type OtpType = 'invite' | 'recovery' | 'signup' | 'email'
const pendingTokenHash = ref('')
const pendingType = ref<OtpType | null>(null)
const pendingCode = ref('')
const isVerifying = ref(false)
const isRecovery = computed(() => pendingType.value === 'recovery')

const password = ref('')
const confirmPassword = ref('')
const formError = ref('')
const isSaving = ref(false)

onMounted(async () => {
  // A failed link (e.g. expired invite) carries the reason in the hash/query
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const errDesc = hash.get('error_description') || query.get('error_description')
  if (errDesc) {
    linkError.value = errDesc.replace(/\+/g, ' ')
    view.value = 'error'
    return
  }

  // token_hash links (invite / recovery): stash the token and wait for a click.
  // We deliberately do NOT call verifyOtp() here — see the header comment.
  const tokenHash = query.get('token_hash') || hash.get('token_hash')
  const otpType = (query.get('type') || hash.get('type')) as OtpType | null
  if (tokenHash && otpType) {
    pendingTokenHash.value = tokenHash
    pendingType.value = otpType
    view.value = 'confirm'
    return
  }

  // PKCE links deliver a ?code= to exchange — also gated behind the click.
  const code = query.get('code')
  if (code) {
    pendingCode.value = code
    view.value = 'confirm'
    return
  }

  // Implicit links deliver tokens in the hash, which the client consumes
  // automatically on load; if that produced a session, go straight in.
  if (await hasSession()) {
    view.value = 'ready'
    return
  }
  // The client may still be parsing the hash on first paint — retry briefly.
  await new Promise(r => setTimeout(r, 500))
  if (await hasSession()) {
    view.value = 'ready'
  }
  else {
    linkError.value = 'This link is invalid or has expired.'
    view.value = 'error'
  }
})

// Redeems the one-time link. Triggered only by a real user click so an
// automated email scan can't consume the token first.
async function verifyLink() {
  isVerifying.value = true
  view.value = 'checking'
  try {
    if (pendingTokenHash.value && pendingType.value) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: pendingTokenHash.value,
        type: pendingType.value,
      })
      if (error) {
        linkError.value = error.message
        view.value = 'error'
        return
      }
    }
    else if (pendingCode.value) {
      try { await supabase.auth.exchangeCodeForSession(pendingCode.value) }
      catch { /* fall through to the session check below */ }
    }

    if (await hasSession()) {
      view.value = 'ready'
    }
    else {
      linkError.value = 'This link is invalid or has expired.'
      view.value = 'error'
    }
  }
  finally {
    isVerifying.value = false
  }
}

async function hasSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

async function savePassword() {
  formError.value = ''
  if (password.value.length < 8) {
    formError.value = 'Password must be at least 8 characters.'
    return
  }
  if (password.value !== confirmPassword.value) {
    formError.value = 'Passwords do not match.'
    return
  }
  isSaving.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: password.value })
    if (error) {
      formError.value = error.message
      return
    }
    view.value = 'done'
    setTimeout(() => { window.location.href = '/admin' }, 1400)
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="sp-shell">
    <div class="sp-card">
      <div class="sp-brand">
        <div class="mark">I3H</div>
        <span>Immune Health</span>
      </div>

      <!-- Verifying the link -->
      <template v-if="view === 'checking'">
        <h2>Verifying your link…</h2>
        <p class="sp-lead">One moment while we confirm your invitation.</p>
      </template>

      <!-- Confirm: the token is redeemed only on this click, so an automated
           email scan (e.g. Safe Links) can't consume it before the recipient. -->
      <template v-else-if="view === 'confirm'">
        <span class="form-overline">Admin Console</span>
        <h2>{{ isRecovery ? 'Reset your password' : 'Set up your account' }}</h2>
        <p class="sp-lead">
          {{ isRecovery
            ? 'Confirm below to continue resetting your I3H staff password.'
            : 'Welcome to the I3H admin console. Confirm below to finish setting up your staff account.' }}
        </p>
        <button class="btn btn-primary" :disabled="isVerifying" @click="verifyLink">
          {{ isVerifying ? 'Verifying…' : (isRecovery ? 'Continue' : 'Set up your account') }}
        </button>
      </template>

      <!-- Invalid / expired link -->
      <template v-else-if="view === 'error'">
        <span class="form-overline">Admin Console</span>
        <h2>This link isn't available</h2>
        <p class="sp-lead">{{ linkError }}</p>
        <p class="sp-lead">Invitation and reset links can only be used once and expire quickly. Ask your administrator to send a new invite, or request a new reset link from the sign-in page.</p>
        <NuxtLink to="/admin/login" class="btn btn-primary">Back to sign in</NuxtLink>
      </template>

      <!-- Success -->
      <template v-else-if="view === 'done'">
        <span class="form-overline">Admin Console</span>
        <h2>Password set ✓</h2>
        <p class="sp-lead">You're all set — taking you to the console…</p>
      </template>

      <!-- Set-password form -->
      <template v-else>
        <span class="form-overline">Admin Console</span>
        <h2>Set your password</h2>
        <p class="sp-lead">Choose a password to finish setting up your I3H staff account.</p>

        <form @submit.prevent="savePassword">
          <div class="form-field">
            <label class="lbl">New password</label>
            <input v-model="password" type="password" placeholder="At least 8 characters" autocomplete="new-password">
          </div>
          <div class="form-field">
            <label class="lbl">Confirm password</label>
            <input v-model="confirmPassword" type="password" placeholder="Re-enter password" autocomplete="new-password">
          </div>

          <div v-if="formError" class="login-error">{{ formError }}</div>

          <button class="btn btn-primary" type="submit" :disabled="isSaving">
            {{ isSaving ? 'Saving…' : 'Set password & sign in' }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sp-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(175deg, #0a0f1a 0%, #011F5B 55%, #1a5276 100%);
}

.sp-card {
  width: 100%;
  max-width: 420px;
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: 0 12px 48px rgba(10, 15, 26, 0.35);
  padding: 2.5rem;

  h2 {
    font-family: 'DM Serif Display', serif;
    font-size: 1.6rem;
    font-weight: 400;
    margin-bottom: 0.5rem;
  }
}

.sp-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1.8rem;
  font-family: 'DM Serif Display', serif;

  .mark {
    width: 30px;
    height: 30px;
    background: var(--penn-blue);
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 0.72rem;
    font-family: 'JetBrains Mono', monospace;
  }
}

.form-overline {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 600;
  color: var(--teal);
}

.sp-lead {
  font-size: 0.88rem;
  color: var(--muted);
  font-weight: 300;
  line-height: 1.6;
  margin: 0.4rem 0 1.2rem;
}

.form-field {
  margin-bottom: 1rem;

  .lbl {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 0.35rem;
  }

  input {
    width: 100%;
    padding: 0.65rem 0.8rem;
    border: 1.5px solid var(--line);
    border-radius: 4px;
    font-family: inherit;
    font-size: 0.9rem;
    background: var(--card);
    color: var(--ink);

    &:focus {
      outline: none;
      border-color: var(--penn-blue);
    }
  }
}

.login-error {
  background: rgba(192, 57, 43, 0.08);
  color: var(--warm);
  font-size: 0.82rem;
  padding: 0.6rem 0.8rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.btn-primary {
  width: 100%;
  margin-top: 0.4rem;
}
</style>
