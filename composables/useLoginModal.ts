/**
 * Composable for managing login modal state
 *
 * Provides reactive state and methods for showing/hiding the login dialog.
 */
const isLoginModalOpen = ref(false)
const loginModalMessage = ref('')
const loginRedirectUrl = ref('')

export function useLoginModal() {
  const openLoginModal = (message = '', redirectUrl = '') => {
    loginModalMessage.value = message
    loginRedirectUrl.value = redirectUrl
    isLoginModalOpen.value = true
  }

  const closeLoginModal = () => {
    isLoginModalOpen.value = false
    loginModalMessage.value = ''
    loginRedirectUrl.value = ''
  }

  return {
    isLoginModalOpen: readonly(isLoginModalOpen),
    loginModalMessage: readonly(loginModalMessage),
    loginRedirectUrl: readonly(loginRedirectUrl),
    openLoginModal,
    closeLoginModal,
  }
}

export default useLoginModal
