/**
 * Contentful CMS Plugin
 *
 * Provides access to Contentful client for fetching CMS content
 * like hero sections, team bios, service descriptions, etc.
 */
import { type ContentfulClientApi, type EntrySkeletonType } from 'contentful'
import { createClient } from 'contentful'
export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig()

  // Check if Contentful is configured
  if (!runtimeConfig.public.contentfulSpaceId || !runtimeConfig.public.contentfulAccessToken) {
    console.warn('Contentful not configured - using static content')
    return {
      provide: {
        contentful: null,
      },
    }
  }

  // Create the Contentful client
  const client: ContentfulClientApi<EntrySkeletonType> = createClient({
    space: runtimeConfig.public.contentfulSpaceId,
    accessToken: runtimeConfig.public.contentfulAccessToken,
    environment: runtimeConfig.public.contentfulEnvironment,
    host: runtimeConfig.public.contentfulHost
  })

  return {
    provide: {
      contentful: client
    },
  }
})
