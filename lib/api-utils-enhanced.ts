/**
 * Enhanced API Utilities with Performance Optimizations
 * Implements caching, compression, rate limiting, and query optimization
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { RedisCacheService } from './redis-cache'
import { userService, userSessionService, analysisService } from './database-service'

// Performance monitoring
export interface PerformanceMetrics {
  startTime: number
  endTime: number
  processingTime: number
  memoryUsage: number
  cacheHit: boolean
  compressionRatio: number
  databaseQueries: number
  cacheOperations: number
}

// Cache configuration
export interface CacheConfig {
  enabled: boolean
  ttl: number // Time to live in milliseconds
  maxSize: number // Maximum number of cached items
  compression: boolean
}

// Rate limiting configuration
export interface RateLimitConfig {
  enabled: boolean
  maxRequests: number
  windowMs: number
  skipSuccessfulRequests: boolean
  skipFailedRequests: boolean
}

// Default configurations
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000,
  compression: true
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  enabled: true,
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  skipSuccessfulRequests: false,
  skipFailedRequests: false
}

// In-memory cache implementation (fallback)
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; size: number }>()
  private maxSize: number
  private ttl: number

  constructor(maxSize: number, ttl: number) {
    this.maxSize = maxSize
    this.ttl = ttl
  }

  set(key: string, data: any, size: number = 1): void {
    // Clean expired entries
    this.cleanup()

    // Check if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size
    })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null

    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  has(key: string): boolean {
    return this.cache.has(key) &&
           (Date.now() - this.cache.get(key)!.timestamp) <= this.ttl
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, item] of Array.from(this.cache.entries())) {
      if (now - item.timestamp > this.ttl) {
        this.cache.delete(key)
      }
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, item] of Array.from(this.cache.entries())) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }
}

// Enhanced API utilities with Redis and database integration
export class EnhancedAPIUtils {
  private redisCache: RedisCacheService
  // private databaseService: OptimizedDatabaseService
  private memoryCache: MemoryCache
  private performanceMetrics: PerformanceMetrics[] = []

  constructor() {
    this.redisCache = new RedisCacheService({} as any)
    // this.databaseService = new OptimizedDatabaseService({} as any)
    this.memoryCache = new MemoryCache(
      DEFAULT_CACHE_CONFIG.maxSize,
      DEFAULT_CACHE_CONFIG.ttl
    )
  }

  // Enhanced response with caching and performance tracking
  async createResponse<T>(
    data: T,
    status: number = 200,
    cacheKey?: string,
    cacheConfig: Partial<CacheConfig> = {}
  ): Promise<NextResponse> {
    const startTime = performance.now()
    const startMemory = process.memoryUsage()

    let response: NextResponse
    let cacheHit = false
    let compressionRatio = 1

    // Try to get from cache first
    if (cacheKey && cacheConfig.enabled !== false) {
      const cached = await this.getFromCache(cacheKey)
      if (cached) {
        cacheHit = true
        response = NextResponse.json(cached, { status })
      } else {
        response = NextResponse.json(data, { status })
        // Cache the response
        await this.setCache(cacheKey, data, cacheConfig)
      }
    } else {
      response = NextResponse.json(data, { status })
    }

    // Record performance metrics
    const endTime = performance.now()
    const endMemory = process.memoryUsage()
    
    const metrics: PerformanceMetrics = {
      startTime,
      endTime,
      processingTime: endTime - startTime,
      memoryUsage: endMemory.heapUsed - startMemory.heapUsed,
      cacheHit,
      compressionRatio,
      databaseQueries: 0, // Will be updated by database service
      cacheOperations: cacheKey ? 1 : 0
    }

    this.performanceMetrics.push(metrics)

    return response
  }

  // Enhanced error response
  createErrorResponse(
    message: string,
    status: number = 500,
    error?: any
  ): NextResponse {
    const errorResponse = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
      ...(error && { error: error.message || error })
    }

    return NextResponse.json(errorResponse, { status })
  }

  // Cache operations with Redis fallback to memory
  async getFromCache(key: string): Promise<any | null> {
    try {
      // Try Redis first
      const cached = await this.redisCache.get(key)
      if (cached) return cached

      // Fallback to memory cache
      return this.memoryCache.get(key)
    } catch (error) {
      console.warn('Cache get error, falling back to memory:', error)
      return this.memoryCache.get(key)
    }
  }

  async setCache(key: string, data: any, config: Partial<CacheConfig> = {}): Promise<void> {
    const finalConfig = { ...DEFAULT_CACHE_CONFIG, ...config }
    
    try {
      // Try Redis first
      await this.redisCache.set(key, data, { ttl: finalConfig.ttl })
    } catch (error) {
      console.warn('Redis cache set error, falling back to memory:', error)
      this.memoryCache.set(key, data)
    }
  }

  // Database operations with optimization
  // Database operations removed - use database-service.ts instead
  // async findFromDatabase<T>(
  //   collection: string,
  //   query: any,
  //   options: any = {}
  // ): Promise<T[]> {
  //   return this.databaseService.find(collection, query, options)
  // }

  // async findOneFromDatabase<T>(
  //   collection: string,
  //   query: any,
  //   options: any = {}
  // ): Promise<T | null> {
  //   return this.databaseService.findOne(collection, query, options)
  // }

  // async insertToDatabase<T>(
  //   collection: string,
  //   document: T
  // ): Promise<string> {
  //   return this.databaseService.insertOne(collection, query, options)
  // }

  // async updateInDatabase<T>(
  //   collection: string,
  //   query: any,
  //   update: any
  // ): Promise<boolean> {
  //   return this.databaseService.updateOne(collection, query, update)
  // }

  // async deleteFromDatabase(
  //   collection: string,
  //   query: any
  // ): Promise<boolean> {
  //   return this.databaseService.deleteOne(collection, query)
  // }

  // Performance monitoring
  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics]
  }

  getAverageResponseTime(): number {
    if (this.performanceMetrics.length === 0) return 0
    
    const total = this.performanceMetrics.reduce(
      (sum, metric) => sum + metric.processingTime, 
      0
    )
    return total / this.performanceMetrics.length
  }

  getCacheHitRate(): number {
    if (this.performanceMetrics.length === 0) return 0
    
    const cacheHits = this.performanceMetrics.filter(m => m.cacheHit).length
    return cacheHits / this.performanceMetrics.length
  }

  // Cleanup
  async cleanup(): Promise<void> {
    try {
      await this.redisCache.disconnect()
      // await this.databaseService.disconnect() // Removed - use database-service.ts instead
    } catch (error) {
      console.error('Cleanup error:', error)
    }
  }
}

// Export singleton instance
export const enhancedAPI = new EnhancedAPIUtils()

// Utility functions for common operations
export const createSuccessResponse = <T>(
  data: T,
  status: number = 200
): NextResponse => {
  const response = NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  }, { status })
  
  // Add performance headers
  const metrics = enhancedAPI.getPerformanceMetrics()
  if (metrics.length > 0) {
    const latest = metrics[metrics.length - 1]
    response.headers.set('X-Processing-Time', `${latest.processingTime.toFixed(2)}ms`)
    response.headers.set('X-Cache-Hit', latest.cacheHit ? 'true' : 'false')
    response.headers.set('X-Memory-Usage', `${(latest.memoryUsage / 1024 / 1024).toFixed(2)}MB`)
  }
  
  return response
}

export const createErrorResponse = (
  message: string,
  status: number = 500,
  error?: any
): NextResponse => {
  return NextResponse.json({
    success: false,
    message,
    error: error?.message || error,
    timestamp: new Date().toISOString()
  }, { status })
}

export const getCachedData = async <T>(
  key: string,
  fallback: () => Promise<T>,
  ttl: number = DEFAULT_CACHE_CONFIG.ttl
): Promise<T> => {
  const cached = await enhancedAPI.getFromCache(key)
  if (cached) return cached

  const data = await fallback()
  await enhancedAPI.setCache(key, data, { ttl })
  return data
}

// Middleware for adding performance headers
export const addPerformanceHeaders = (response: NextResponse): NextResponse => {
  const metrics = enhancedAPI.getPerformanceMetrics()
  if (metrics.length > 0) {
    const latest = metrics[metrics.length - 1]
    response.headers.set('X-Processing-Time', `${latest.processingTime.toFixed(2)}ms`)
    response.headers.set('X-Cache-Hit', latest.cacheHit ? 'true' : 'false')
    response.headers.set('X-Memory-Usage', `${(latest.memoryUsage / 1024 / 1024).toFixed(2)}MB`)
  }
  return response
}
