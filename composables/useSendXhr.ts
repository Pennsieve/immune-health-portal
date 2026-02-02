/**
 * Composable for making HTTP requests
 *
 * Generic fetch wrapper with JSON handling and error management.
 * Used for all API calls to Pennsieve and other services.
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
}

export async function useSendXhr<T>(url: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', headers = {}, body } = opts

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body)
  }

  const response = await fetch(url, fetchOptions)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`)
  }

  // Handle empty responses
  const text = await response.text()
  if (!text) {
    return {} as T
  }

  return JSON.parse(text) as T
}

/**
 * Make an authenticated request with Bearer token
 */
export async function useSendAuthXhr<T>(
  url: string,
  token: string,
  opts: RequestOptions = {},
): Promise<T> {
  return useSendXhr<T>(url, {
    ...opts,
    headers: {
      ...opts.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}

export default useSendXhr
