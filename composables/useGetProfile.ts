/**
 * Composable for fetching the authenticated user's profile
 *
 * Retrieves user profile and workspaces from Pennsieve API.
 * Updates the main store with the fetched data.
 */
import { useAuthStore } from '~/stores/auth'
import { useGetToken } from '~/composables/useGetToken'
import { useSendXhr } from '~/composables/useSendXhr'
import type { User, Organization } from '~/types'

export async function useGetProfile(): Promise<{ user: User; workspaces: Organization[] } | null> {
  const runtimeConfig = useRuntimeConfig()
  const authStore = useAuthStore()

  authStore.setAuthLoading(true)
  authStore.setAuthError(null)

  try {
    const token = await useGetToken()

    if (!token) {
      authStore.clearState()
      return null
    }

    // Fetch user profile
    const userUrl = `${runtimeConfig.public.pennsieveApiHost}/user?api_key=${token}`
    const user = await useSendXhr<User>(userUrl)

    // Fetch user's organizations/workspaces
    const orgsUrl = `${runtimeConfig.public.pennsieveApiHost}/organizations?api_key=${token}`
    const orgsResponse = await useSendXhr<{ organizations: Organization[] }>(orgsUrl)

    // Update store
    authStore.updateProfile(user)
    authStore.updateWorkspaces(orgsResponse.organizations || [])
    authStore.setAuthToken(token)

    return {
      user,
      workspaces: orgsResponse.organizations || [],
    }
  }
  catch (error) {
    console.error('Error fetching profile:', error)
    authStore.setAuthError(error instanceof Error ? error.message : 'Failed to fetch profile')
    authStore.clearState()
    return null
  }
  finally {
    authStore.setAuthLoading(false)
  }
}

export default useGetProfile
