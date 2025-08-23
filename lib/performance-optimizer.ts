/**
 * Performance Optimization Utilities
 * Improves app loading speed and runtime performance
 */

// Cache management for API responses
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,    // 5 minutes
  MEDIUM: 15 * 60 * 1000,  // 15 minutes
  LONG: 60 * 60 * 1000     // 1 hour
}

/**
 * API Response Cache
 */
export class APICache {
  /**
   * Get cached response
   */
  static get(key: string): any | null {
    const cached = apiCache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }
    return null
  }

  /**
   * Set cached response
   */
  static set(key: string, data: any, ttl: number = CACHE_TTL.MEDIUM): void {
    apiCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Clear cache
   */
  static clear(pattern?: string): void {
    if (pattern) {
      for (const [key] of apiCache) {
        if (key.includes(pattern)) {
          apiCache.delete(key)
        }
      }
    } else {
      apiCache.clear()
    }
  }

  /**
   * Get cache stats
   */
  static getStats() {
    return {
      size: apiCache.size,
      keys: Array.from(apiCache.keys())
    }
  }
}

/**
 * Image Optimization Utilities
 */
export class ImageOptimizer {
  /**
   * Preload critical images
   */
  static preloadImages(urls: string[]): void {
    urls.forEach(url => {
      const img = new Image()
      img.src = url
    })
  }

  /**
   * Lazy load images with intersection observer
   */
  static setupLazyLoading(): void {
    if (typeof window === 'undefined') return

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          img.src = img.dataset.src || ''
          img.classList.remove('lazy')
          imageObserver.unobserve(img)
        }
      })
    })

    // Observe all lazy images
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img)
    })
  }
}

/**
 * Database Query Optimization
 */
export class QueryOptimizer {
  /**
   * Debounce database queries
   */
  private static queryTimers = new Map<string, NodeJS.Timeout>()

  static debounceQuery(key: string, queryFn: () => void, delay: number = 300): void {
    if (this.queryTimers.has(key)) {
      clearTimeout(this.queryTimers.get(key)!)
    }

    this.queryTimers.set(key, setTimeout(() => {
      queryFn()
      this.queryTimers.delete(key)
    }, delay))
  }

  /**
   * Batch multiple queries
   */
  private static queryQueue: Array<() => Promise<any>> = []
  private static processingQueue = false

  static addToBatch(queryFn: () => Promise<any>): void {
    this.queryQueue.push(queryFn)
    this.processBatch()
  }

  private static async processBatch(): Promise<void> {
    if (this.processingQueue || this.queryQueue.length === 0) return

    this.processingQueue = true
    const batch = this.queryQueue.splice(0, 10) // Process max 10 at a time

    try {
      await Promise.all(batch.map(query => query()))
    } catch (error) {
      console.error('Batch query error:', error)
    } finally {
      this.processingQueue = false
      if (this.queryQueue.length > 0) {
        this.processBatch()
      }
    }
  }
}

/**
 * Component Performance Optimization
 */
export class ComponentOptimizer {
  /**
   * Memoize expensive computations
   */
  static memoCache = new Map<string, { value: any; timestamp: number }>()

  static memoize<T>(key: string, computeFn: () => T, ttl: number = CACHE_TTL.SHORT): T {
    const cached = this.memoCache.get(key)
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value
    }

    const value = computeFn()
    this.memoCache.set(key, { value, timestamp: Date.now() })
    return value
  }

  /**
   * Virtual scrolling for large lists
   */
  static createVirtualScroller<T>(
    items: T[],
    itemHeight: number,
    containerHeight: number,
    renderItem: (item: T, index: number) => React.ReactNode
  ) {
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const startIndex = Math.floor(window.scrollY / itemHeight)
    const endIndex = Math.min(startIndex + visibleCount, items.length)

    return {
      visibleItems: items.slice(startIndex, endIndex),
      startIndex,
      endIndex,
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    }
  }
}

/**
 * Network Performance Optimization
 */
export class NetworkOptimizer {
  /**
   * Prefetch critical resources
   */
  static prefetchResources(urls: string[]): void {
    urls.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = url
      document.head.appendChild(link)
    })
  }

  /**
   * Preconnect to external domains
   */
  static preconnect(domains: string[]): void {
    domains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = domain
      document.head.appendChild(link)
    })
  }

  /**
   * Optimize API calls with request deduplication
   */
  private static pendingRequests = new Map<string, Promise<any>>()

  static deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!
    }

    const request = requestFn()
    this.pendingRequests.set(key, request)

    request.finally(() => {
      this.pendingRequests.delete(key)
    })

    return request
  }
}

/**
 * Memory Management
 */
export class MemoryManager {
  /**
   * Clean up unused resources
   */
  static cleanup(): void {
    // Clear old cache entries
    const now = Date.now()
    for (const [key, value] of apiCache) {
      if (now - value.timestamp > value.ttl) {
        apiCache.delete(key)
      }
    }

    // Clear old memo cache
    for (const [key, value] of ComponentOptimizer.memoCache) {
      if (now - value.timestamp > CACHE_TTL.SHORT) {
        ComponentOptimizer.memoCache.delete(key)
      }
    }

    // Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc()
    }
  }

  /**
   * Monitor memory usage
   */
  static getMemoryInfo() {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576 * 100) / 100 + ' MB',
        total: Math.round(memory.totalJSHeapSize / 1048576 * 100) / 100 + ' MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1048576 * 100) / 100 + ' MB'
      }
    }
    return { error: 'Memory API not available' }
  }
}

/**
 * Performance Monitoring
 */
export class PerformanceMonitor {
  private static metrics = {
    pageLoads: 0,
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    slowOperations: new Map<string, number>()
  }

  /**
   * Track page load performance
   */
  static trackPageLoad(): void {
    this.metrics.pageLoads++
    
    if (typeof window !== 'undefined' && performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart
        if (loadTime > 3000) { // 3 seconds
          this.metrics.slowOperations.set('pageLoad', loadTime)
        }
      }
    }
  }

  /**
   * Track API call performance
   */
  static trackAPICall(endpoint: string, duration: number): void {
    this.metrics.apiCalls++
    
    if (duration > 1000) { // 1 second
      this.metrics.slowOperations.set(`api:${endpoint}`, duration)
    }
  }

  /**
   * Track cache performance
   */
  static trackCacheHit(): void {
    this.metrics.cacheHits++
  }

  static trackCacheMiss(): void {
    this.metrics.cacheMisses++
  }

  /**
   * Get performance report
   */
  static getReport() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.apiCalls > 0 
        ? (this.metrics.cacheHits / this.metrics.apiCalls * 100).toFixed(2) + '%'
        : '0%',
      slowOperationsCount: this.metrics.slowOperations.size
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    MemoryManager.cleanup()
  }, 5 * 60 * 1000)
}
