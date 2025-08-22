import { APICache, NetworkOptimizer, PerformanceMonitor } from './performance-optimizer'

/**
 * Optimized API utilities with caching and performance monitoring
 */

/**
 * Cached API request with automatic deduplication
 */
export async function cachedRequest<T>(
  url: string,
  options: RequestInit = {},
  cacheKey?: string,
  ttl: number = 15 * 60 * 1000 // 15 minutes default
): Promise<T> {
  const startTime = Date.now()
  const key = cacheKey || `${url}:${JSON.stringify(options)}`
  
  // Check cache first
  const cached = APICache.get(key)
  if (cached) {
    PerformanceMonitor.trackCacheHit()
    return cached
  }

  PerformanceMonitor.trackCacheMiss()

  try {
    // Use request deduplication to prevent duplicate requests
    const response = await NetworkOptimizer.deduplicateRequest(key, () => 
      fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    // Cache the successful response
    APICache.set(key, data, ttl)
    
    // Track performance
    const duration = Date.now() - startTime
    PerformanceMonitor.trackAPICall(url, duration)
    
    return data
  } catch (error) {
    console.error(`API request failed for ${url}:`, error)
    throw error
  }
}

/**
 * Optimized GET request with caching
 */
export async function cachedGet<T>(
  url: string,
  cacheKey?: string,
  ttl?: number
): Promise<T> {
  return cachedRequest<T>(url, { method: 'GET' }, cacheKey, ttl)
}

/**
 * Optimized POST request with cache invalidation
 */
export async function cachedPost<T>(
  url: string,
  data: any,
  cacheKey?: string
): Promise<T> {
  const response = await cachedRequest<T>(url, {
    method: 'POST',
    body: JSON.stringify(data),
  }, cacheKey, 0) // No caching for POST requests
  
  // Invalidate related cache entries
  if (cacheKey) {
    APICache.clear(cacheKey)
  }
  
  return response
}

/**
 * Batch multiple API requests for better performance
 */
export async function batchRequests<T>(
  requests: Array<{ url: string; options?: RequestInit; cacheKey?: string }>
): Promise<T[]> {
  const startTime = Date.now()
  
  try {
    // Execute all requests in parallel
    const responses = await Promise.all(
      requests.map(req => 
        cachedRequest<T>(req.url, req.options, req.cacheKey)
      )
    )
    
    // Track batch performance
    const duration = Date.now() - startTime
    PerformanceMonitor.trackAPICall(`batch:${requests.length}`, duration)
    
    return responses
  } catch (error) {
    console.error('Batch request failed:', error)
    throw error
  }
}

/**
 * Prefetch critical API endpoints
 */
export function prefetchAPIEndpoints(endpoints: string[]): void {
  endpoints.forEach(endpoint => {
    // Prefetch in the background
    cachedGet(endpoint, endpoint, 60 * 60 * 1000) // 1 hour cache
      .catch(() => {
        // Silently fail prefetch requests
      })
  })
}

/**
 * Optimized response utilities
 */
export const successResponse = (data: any, message: string = 'Success', status: number = 200) => {
  return new Response(JSON.stringify({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300', // 5 minutes cache
    },
  })
}

export const errorResponse = (message: string, status: number = 500, details?: any) => {
  return new Response(JSON.stringify({
    success: false,
    error: message,
    details,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

export const validationErrorResponse = (message: string, errors: Record<string, string[]> | string[], status: number = 400) => {
  return new Response(JSON.stringify({
    success: false,
    error: message,
    errors,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

/**
 * Performance monitoring utilities
 */
export const getPerformanceReport = () => PerformanceMonitor.getReport()
export const getCacheStats = () => APICache.getStats()
export const clearCache = (pattern?: string) => APICache.clear(pattern)
