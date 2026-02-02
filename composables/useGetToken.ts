/**
 * Composable for retrieving the current user's auth token
 *
 * Fetches the access token from AWS Amplify/Cognito session.
 * Used for authenticating API requests to Pennsieve.
 */
import { fetchAuthSession, signOut } from 'aws-amplify/auth'

export async function useGetToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession()
    const token = session?.tokens?.accessToken?.toString()
    return token || null
  }
  catch (error) {
    console.error('Error fetching auth token:', error)
    return null
  }
}

export async function useSignOut(): Promise<void> {
  try {
    await signOut()
  }
  catch (error) {
    console.error('Error signing out:', error)
  }
}

export default useGetToken
