/**
 * Contentful CMS Plugin
 *
 * Provides access to Contentful client for fetching CMS content
 * like hero sections, team bios, service descriptions, etc.
 */
import { createClient, type ContentfulClientApi, type EntrySkeletonType } from 'contentful'

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
  })

  // Create preview client if preview token is available
  const previewClient = runtimeConfig.public.contentfulPreviewToken
    ? createClient({
        space: runtimeConfig.public.contentfulSpaceId,
        accessToken: runtimeConfig.public.contentfulPreviewToken,
        environment: runtimeConfig.public.contentfulEnvironment,
        host: 'preview.contentful.com',
      })
    : null

  return {
    provide: {
      contentful: client,
      contentfulPreview: previewClient,
    },
  }
})
