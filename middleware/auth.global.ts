/**
 * Global Auth Middleware
 *
 * Runs on every route change to:
 * 1. Check and refresh auth state
 * 2. Protect private routes (dashboard, cohorts)
 * 3. Redirect unauthenticated users
 *
 * TEMPORARILY DISABLED FOR DEVELOPMENT
 */
// import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (_to) => {
  // Auth temporarily disabled
  return

  /*
  const authStore = useAuthStore()

  // Define private routes that require authentication
  const privateRoutes = [
    '/dashboard',
  ]

  // Check if current route is private
  const isPrivateRoute = privateRoutes.some(route =>
    to.path === route || to.path.startsWith(`${route}/`),
  )

  // Try to fetch profile if not already loaded
  if (!authStore.isSignedIn && !authStore.isAuthLoading) {
    try {
      const { useGetProfile } = await import('~/composables/useGetProfile')
      await useGetProfile()
    }
    catch (error) {
      console.error('Auth check failed:', error)
    }
  }

  // Redirect to home if accessing private route while not signed in
  if (isPrivateRoute && !authStore.isSignedIn) {
    return navigateTo('/', { replace: true })
  }
  */
})
