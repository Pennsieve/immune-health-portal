<script setup lang="ts">
definePageMeta({ layout: false })

const { user, signIn, sendPasswordReset } = useAuth()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const resetMessage = ref('')

onMounted(() => {
  if (user.value) navigateTo('/admin')
})

async function handleForgotPassword() {
  errorMessage.value = ''
  resetMessage.value = ''
  if (!email.value) {
    errorMessage.value = 'Enter your work email above, then click “Forgot password?”.'
    return
  }
  const { error } = await sendPasswordReset(email.value)
  if (error) {
    errorMessage.value = error.message
    return
  }
  resetMessage.value = 'Check your email for a link to reset your password.'
}

async function handleSignIn() {
  errorMessage.value = ''
  isLoading.value = true
  try {
    const { error } = await signIn(email.value, password.value)
    if (error) {
      errorMessage.value = error.message.replace('email or phone', 'email')
    }
    else {
      window.location.href = '/admin'
    }
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-shell">
    <!-- Left: brand panel -->
    <aside class="login-aside">
      <div class="aside-brand">
        <div class="mark">I3H</div>
        <span>Immune Health</span>
      </div>

      <div>
        <h1>The coordination layer for <em>standardized immune profiling.</em></h1>
        <p class="blurb">
          Manage study intake, agreements, sample processing, and cohort progress in one
          place — the operations hub for the Institute for Immunology &amp; Immune Health.
        </p>
      </div>

      <div class="aside-foot">
        Penn Medicine · Institute for Immunology &amp; Immune Health<br>
        Internal staff access only. PI communications happen via email.
      </div>
    </aside>

    <!-- Right: form -->
    <div class="login-form-wrap">
      <form class="login-form" @submit.prevent="handleSignIn">
        <span class="form-overline">Admin Console</span>
        <h2>Sign in</h2>
        <p class="lead">Restricted to authorized I3H staff. Contact your administrator to request access.</p>

        <div class="form-field">
          <label class="lbl">Work email</label>
          <input v-model="email" type="email" placeholder="name@pennmedicine.upenn.edu" autocomplete="email">
        </div>

        <div class="form-field">
          <label class="lbl">Password</label>
          <input v-model="password" type="password" placeholder="••••••••" autocomplete="current-password">
        </div>

        <div class="form-helper">
          <label><input type="checkbox" checked> Keep me signed in</label>
          <a href="#" @click.prevent="handleForgotPassword">Forgot password?</a>
        </div>

        <div v-if="errorMessage" class="login-error">{{ errorMessage }}</div>
        <div v-if="resetMessage" class="login-notice">{{ resetMessage }}</div>

        <button class="btn btn-primary" type="submit" :disabled="isLoading">
          {{ isLoading ? 'Signing in…' : 'Sign in to Admin Console' }}
        </button>

        <div class="security-note">
          <strong style="color:var(--accent); font-weight:600;">Secure session.</strong>
          This system contains protected research data. All activity is logged.
          Sessions expire after 60 minutes of inactivity.
        </div>
      </form>
    </div>
  </div>
</template>
