/**
 * AWS Amplify Plugin for Pennsieve Authentication
 *
 * This plugin initializes AWS Amplify with Cognito configuration
 * for authenticating with Pennsieve services.
 *
 * Based on the Pennsieve Discover app authentication patterns.
 */
import { Amplify } from 'aws-amplify'
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito'
import { CookieStorage, Hub } from 'aws-amplify/utils'

export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig()
  const router = useRouter()

  // Only initialize if we have the required Cognito config
  if (!runtimeConfig.public.userPoolId || !runtimeConfig.public.userPoolWebClientId) {
    console.warn('Pennsieve auth not configured - missing Cognito credentials')
    return
  }

  // Configure cookie storage for auth tokens
  const cookieStorage = new CookieStorage({
    domain: runtimeConfig.public.appDomain,
    path: '/',
    expires: 7, // days
    secure: runtimeConfig.public.deployEnv === 'production',
    sameSite: 'lax',
  })

  // Set token provider to use cookies
  cognitoUserPoolsTokenProvider.setKeyValueStorage(cookieStorage)

  // Build OAuth configuration
  const oauthConfig: {
    domain: string
    scopes: string[]
    redirectSignIn: string[]
    redirectSignOut: string[]
    responseType: 'token' | 'code'
    providers?: Array<{ custom: string }>
  } = {
    domain: runtimeConfig.public.oauthDomain,
    scopes: ['email', 'openid', 'profile'],
    redirectSignIn: [runtimeConfig.public.oauthRedirectSignIn],
    redirectSignOut: [runtimeConfig.public.oauthRedirectSignOut],
    responseType: 'token',
  }

  // Add ORCID as external provider if configured
  const externalProviders: {
    oidc?: Array<{
      name: string
      clientId: string
      issuerUrl: string
    }>
  } = {}

  if (runtimeConfig.public.orcidClientId) {
    externalProviders.oidc = [
      {
        name: 'ORCID',
        clientId: runtimeConfig.public.orcidClientId,
        issuerUrl: runtimeConfig.public.orcidApiHost,
      },
    ]
  }

  // Configure Amplify
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: runtimeConfig.public.userPoolId,
        userPoolClientId: runtimeConfig.public.userPoolWebClientId,
        loginWith: {
          email: true,
          oauth: oauthConfig,
          ...(Object.keys(externalProviders).length > 0 && { externalProviders }),
        },
      },
    },
  })

  // Listen for auth events
  Hub.listen('auth', async ({ payload }) => {
    const { event } = payload

    switch (event) {
      case 'signInWithRedirect':
        // User completed OAuth sign-in
        console.log('OAuth sign-in complete')
        // Profile will be fetched by the auth middleware
        router.push('/dashboard')
        break

      case 'signInWithRedirect_failure':
        console.error('OAuth sign-in failed:', payload.data)
        break

      case 'tokenRefresh':
        console.log('Token refreshed')
        break

      case 'tokenRefresh_failure':
        console.error('Token refresh failed')
        // Force logout on token refresh failure
        break

      case 'signedOut':
        console.log('User signed out')
        break
    }
  })
})
