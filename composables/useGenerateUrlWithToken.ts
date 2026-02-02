/**
 * Composable for generating URLs with authentication token
 *
 * Appends the api_key query parameter to URLs for authenticated requests.
 * Only adds token if user is signed in and URL is a Pennsieve API endpoint.
 */
import { useAuthStore } from '~/stores/auth'
import { useGetToken } from '~/composables/useGetToken'

export async function useGenerateUrlWithToken(url: string): Promise<string> {
  const runtimeConfig = useRuntimeConfig()
  const authStore = useAuthStore()

  // Only add token if user is signed in and URL is a Pennsieve endpoint
  const pennsieveHosts = [
    runtimeConfig.public.pennsieveApiHost,
    runtimeConfig.public.pennsieveDiscoverApiHost,
  ]

  const isPennsieveUrl = pennsieveHosts.some(host => url.includes(host))

  if (authStore.isSignedIn && isPennsieveUrl) {
    const token = await useGetToken()
    if (token) {
      const separator = url.includes('?') ? '&' : '?'
      return `${url}${separator}api_key=${token}`
    }
  }

  return url
}

export default useGenerateUrlWithToken
