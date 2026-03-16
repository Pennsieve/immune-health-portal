/**
 * Contentful CMS Composable
 *
 * Provides typed helpers for fetching content from Contentful with
 * graceful fallback to hardcoded defaults when CMS is unavailable.
 */
import type { ContentfulClientApi, EntrySkeletonType, EntryCollection } from 'contentful'

interface UseContentfulReturn {
  isAvailable: boolean
  fetchEntry: <T>(contentType: string, slug?: string) => Promise<T | null>
  fetchEntries: <T>(contentType: string, options?: Record<string, unknown>) => Promise<T[]>
  fetchSingleton: <T>(contentType: string) => Promise<T | null>
}

export function useContentful(): UseContentfulReturn {
  const { $contentful } = useNuxtApp() as { $contentful: ContentfulClientApi<EntrySkeletonType> | null }

  const isAvailable = !!$contentful

  /**
   * Fetch a single entry by content type and optional slug
   */
  async function fetchEntry<T>(contentType: string, slug?: string): Promise<T | null> {
    if (!$contentful) return null

    try {
      const query: Record<string, unknown> = {
        content_type: contentType,
        limit: 1,
      }
      if (slug) {
        query['fields.slug'] = slug
      }

      const response = await $contentful.getEntries(query)
      if (response.items.length === 0) return null
      return response.items[0].fields as T
    }
    catch (error) {
      console.warn(`[Contentful] Failed to fetch ${contentType}:`, error)
      return null
    }
  }

  /**
   * Fetch multiple entries by content type, sorted by order field
   */
  async function fetchEntries<T>(contentType: string, options: Record<string, unknown> = {}): Promise<T[]> {
    if (!$contentful) return []

    try {
      const query: Record<string, unknown> = {
        content_type: contentType,
        order: 'fields.order',
        ...options,
      }

      const response = await $contentful.getEntries(query)
      return response.items.map(item => item.fields as T)
    }
    catch (error) {
      console.warn(`[Contentful] Failed to fetch ${contentType} entries:`, error)
      return []
    }
  }

  /**
   * Fetch a singleton entry (content type with only one entry)
   */
  async function fetchSingleton<T>(contentType: string): Promise<T | null> {
    return fetchEntry<T>(contentType)
  }

  return {
    isAvailable,
    fetchEntry,
    fetchEntries,
    fetchSingleton,
  }
}
