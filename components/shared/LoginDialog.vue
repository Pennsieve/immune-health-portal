<script setup lang="ts">
/**
 * Login Dialog Component
 *
 * Modal for Pennsieve authentication with email/password login,
 * ORCID federated login, two-factor authentication, and password reset.
 */
import { signIn, signInWithRedirect, confirmSignIn, resetPassword, confirmResetPassword } from 'aws-amplify/auth'
import { useAuthStore } from '~/stores/auth'
import { useLoginModal } from '~/composables/useLoginModal'

const emit = defineEmits<{
  close: []
}>()

const authStore = useAuthStore()
const { loginModalMessage, loginRedirectUrl } = useLoginModal()

// Form state
type LoginState = 'login' | 'twoFactor' | 'forgotPassword' | 'resetPassword'
const currentState = ref<LoginState>('login')
const isLoading = ref(false)
const errorMessage = ref('')

// Login form
const email = ref('')
const password = ref('')

// Two-factor form
const mfaCode = ref('')

// Reset password form
const resetCode = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'Please enter your email and password'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const { nextStep } = await signIn({
      username: email.value,
      password: password.value,
    })

    if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
      currentState.value = 'twoFactor'
    }
    else if (nextStep.signInStep === 'DONE') {
      await handleLoginSuccess()
    }
  }
  catch (error) {
    console.error('Login error:', error)
    errorMessage.value = error instanceof Error ? error.message : 'Login failed'
  }
  finally {
    isLoading.value = false
  }
}

const handleMfaSubmit = async () => {
  if (!mfaCode.value) {
    errorMessage.value = 'Please enter your verification code'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const { nextStep } = await confirmSignIn({
      challengeResponse: mfaCode.value,
    })

    if (nextStep.signInStep === 'DONE') {
      await handleLoginSuccess()
    }
  }
  catch (error) {
    console.error('MFA error:', error)
    errorMessage.value = error instanceof Error ? error.message : 'Verification failed'
  }
  finally {
    isLoading.value = false
  }
}

const handleOrcidLogin = async () => {
  try {
    await signInWithRedirect({
      provider: { custom: 'ORCID' },
    })
  }
  catch (error) {
    console.error('ORCID login error:', error)
    errorMessage.value = error instanceof Error ? error.message : 'ORCID login failed'
  }
}

const handleForgotPassword = async () => {
  if (!email.value) {
    errorMessage.value = 'Please enter your email address'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    await resetPassword({ username: email.value })
    currentState.value = 'resetPassword'
  }
  catch (error) {
    console.error('Reset password error:', error)
    errorMessage.value = error instanceof Error ? error.message : 'Failed to send reset code'
  }
  finally {
    isLoading.value = false
  }
}

const handleResetPassword = async () => {
  if (!resetCode.value || !newPassword.value) {
    errorMessage.value = 'Please fill in all fields'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    await confirmResetPassword({
      username: email.value,
      confirmationCode: resetCode.value,
      newPassword: newPassword.value,
    })
    currentState.value = 'login'
    password.value = ''
    errorMessage.value = ''
  }
  catch (error) {
    console.error('Confirm reset error:', error)
    errorMessage.value = error instanceof Error ? error.message : 'Failed to reset password'
  }
  finally {
    isLoading.value = false
  }
}

const handleLoginSuccess = async () => {
  const { useGetProfile } = await import('~/composables/useGetProfile')
  await useGetProfile()

  if (loginRedirectUrl.value) {
    navigateTo(loginRedirectUrl.value)
  }

  emit('close')
}

const handleClose = () => {
  emit('close')
}

const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}
</script>

<template>
  <div class="modal-backdrop" @click="handleBackdropClick">
    <div class="modal-content">
      <button class="modal-close" @click="handleClose">
        &times;
      </button>

      <!-- Login State -->
      <template v-if="currentState === 'login'">
        <div class="modal-header">
          <h2>Sign in to Pennsieve</h2>
          <p v-if="loginModalMessage">
            {{ loginModalMessage }}
          </p>
        </div>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
            >
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
            >
          </div>

          <p v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </p>

          <button type="submit" class="btn btn-primary btn-full" :disabled="isLoading">
            {{ isLoading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <div class="divider">
          <span>or</span>
        </div>

        <button class="btn btn-secondary btn-full" @click="handleOrcidLogin">
          Sign in with ORCID
        </button>

        <button class="forgot-link" @click="currentState = 'forgotPassword'">
          Forgot your password?
        </button>
      </template>

      <!-- Two-Factor State -->
      <template v-else-if="currentState === 'twoFactor'">
        <div class="modal-header">
          <h2>Two-Factor Authentication</h2>
          <p>Enter the verification code from your authenticator app</p>
        </div>

        <form class="login-form" @submit.prevent="handleMfaSubmit">
          <div class="form-group">
            <label for="mfaCode">Verification Code</label>
            <input
              id="mfaCode"
              v-model="mfaCode"
              type="text"
              placeholder="000000"
              autocomplete="one-time-code"
              maxlength="6"
            >
          </div>

          <p v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </p>

          <button type="submit" class="btn btn-primary btn-full" :disabled="isLoading">
            {{ isLoading ? 'Verifying...' : 'Verify' }}
          </button>
        </form>

        <button class="forgot-link" @click="currentState = 'login'">
          Back to login
        </button>
      </template>

      <!-- Forgot Password State -->
      <template v-else-if="currentState === 'forgotPassword'">
        <div class="modal-header">
          <h2>Reset Password</h2>
          <p>Enter your email to receive a reset code</p>
        </div>

        <form class="login-form" @submit.prevent="handleForgotPassword">
          <div class="form-group">
            <label for="resetEmail">Email</label>
            <input
              id="resetEmail"
              v-model="email"
              type="email"
              placeholder="you@example.com"
            >
          </div>

          <p v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </p>

          <button type="submit" class="btn btn-primary btn-full" :disabled="isLoading">
            {{ isLoading ? 'Sending...' : 'Send Reset Code' }}
          </button>
        </form>

        <button class="forgot-link" @click="currentState = 'login'">
          Back to login
        </button>
      </template>

      <!-- Reset Password State -->
      <template v-else-if="currentState === 'resetPassword'">
        <div class="modal-header">
          <h2>Create New Password</h2>
          <p>Enter the code sent to your email</p>
        </div>

        <form class="login-form" @submit.prevent="handleResetPassword">
          <div class="form-group">
            <label for="resetCode">Reset Code</label>
            <input
              id="resetCode"
              v-model="resetCode"
              type="text"
              placeholder="Enter code"
            >
          </div>

          <div class="form-group">
            <label for="newPassword">New Password</label>
            <input
              id="newPassword"
              v-model="newPassword"
              type="password"
              placeholder="••••••••"
            >
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              placeholder="••••••••"
            >
          </div>

          <p v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </p>

          <button type="submit" class="btn btn-primary btn-full" :disabled="isLoading">
            {{ isLoading ? 'Resetting...' : 'Reset Password' }}
          </button>
        </form>

        <button class="forgot-link" @click="currentState = 'login'">
          Back to login
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 15, 26, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.modal-content {
  background: var(--card);
  border-radius: var(--radius);
  padding: 2.5rem;
  width: 100%;
  max-width: 400px;
  position: relative;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--ink);
  }
}

.modal-header {
  text-align: center;
  margin-bottom: 1.5rem;

  h2 {
    font-family: 'DM Serif Display', serif;
    font-size: 1.5rem;
    font-weight: 400;
    margin-bottom: 0.5rem;
  }

  p {
    color: var(--muted);
    font-size: 0.9rem;
    font-weight: 300;
  }
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.btn-full {
  width: 100%;
}

.error-message {
  color: var(--warm);
  font-size: 0.85rem;
  text-align: center;
  margin: 0;
}

.divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
  color: var(--muted);
  font-size: 0.85rem;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--line);
  }
}

.forgot-link {
  display: block;
  text-align: center;
  margin-top: 1rem;
  color: var(--accent);
  font-size: 0.85rem;
  cursor: pointer;
  background: none;
  border: none;
  font-family: inherit;

  &:hover {
    text-decoration: underline;
  }
}
</style>
