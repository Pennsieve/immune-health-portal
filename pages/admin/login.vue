<script setup lang="ts">
definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

onMounted(() => {
  if (user.value) navigateTo('/admin')
})

async function handleSignIn() {
  errorMessage.value = ''
  isLoading.value = true
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })
    if (error) {
      errorMessage.value = error.message
    }
    else {
      await navigateTo('/admin')
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
        <p class="lead">Restricted to authorized I3H staff. Credentials managed via Supabase Auth.</p>

        <div class="form-field">
          <label class="lbl">Work email</label>
          <input v-model="email" type="email" placeholder="name@pennmedicine.upenn.edu" autocomplete="email" @keydown.enter.prevent="handleSignIn">
        </div>

        <div class="form-field">
          <label class="lbl">Password</label>
          <input v-model="password" type="password" placeholder="••••••••" autocomplete="current-password" @keydown.enter.prevent="handleSignIn">
        </div>

        <div class="form-helper">
          <label><input type="checkbox" checked> Keep me signed in</label>
          <a href="#" @click.prevent>Forgot password?</a>
        </div>

        <div v-if="errorMessage" class="login-error">{{ errorMessage }}</div>

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
