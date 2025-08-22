/**
 * Graceful Degradation and Fallback System
 * Handles service unavailability and provides fallback mechanisms
 */

import { logger, createCategoryLogger } from './logger'
import { monitoring } from './monitoring'
import { BaseError, createError } from './errors'

// Fallback configuration
export interface FallbackConfig {
  enableFallbacks: boolean
  maxRetries: number
  retryDelay: number
  circuitBreakerThreshold: number
  circuitBreakerTimeout: number
  fallbackCacheTTL: number
  enableOfflineMode: boolean
}

// Service status
export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  OFFLINE = 'offline'
}

// Circuit breaker state
export enum CircuitBreakerState {
  CLOSED = 'closed',    // Normal operation
  OPEN = 'open',        // Service blocked
  HALF_OPEN = 'half_open' // Testing if service recovered
}

// Service health information
export interface ServiceHealth {
  name: string
  status: ServiceStatus
  lastCheck: Date
  responseTime: number
  errorRate: number
  circuitBreakerState: CircuitBreakerState
  fallbackEnabled: boolean
  lastError?: string
}

// Fallback strategy
export interface FallbackStrategy {
  name: string
  priority: number
  condition: (error: BaseError | Error) => boolean
  handler: () => Promise<any>
  cacheKey?: string
  ttl?: number
}

// Default fallback configuration
const DEFAULT_CONFIG: FallbackConfig = {
  enableFallbacks: true,
  maxRetries: 3,
  retryDelay: 1000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 30000,
  fallbackCacheTTL: 300000, // 5 minutes
  enableOfflineMode: true
}

/**
 * Main Fallback Manager Class
 */
export class FallbackManager {
  private config: FallbackConfig
  private serviceHealth: Map<string, ServiceHealth> = new Map()
  private circuitBreakers: Map<string, CircuitBreaker> = new Map()
  private fallbackCache: Map<string, { data: any; timestamp: number }> = new Map()
  private fallbackStrategies: Map<string, FallbackStrategy[]> = new Map()
  private logger = createCategoryLogger('fallback')

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeFallbacks()
  }

  /**
   * Initialize fallback system
   */
  private initializeFallbacks(): void {
    this.logger.info('Fallback system initialized', { config: this.config })
  }

  /**
   * Register a fallback strategy for a service
   */
  registerFallbackStrategy(serviceName: string, strategy: FallbackStrategy): void {
    if (!this.fallbackStrategies.has(serviceName)) {
      this.fallbackStrategies.set(serviceName, [])
    }

    const strategies = this.fallbackStrategies.get(serviceName)!
    strategies.push(strategy)
    
    // Sort by priority (higher priority first)
    strategies.sort((a, b) => b.priority - a.priority)

    this.logger.info(`Registered fallback strategy for ${serviceName}`, { strategy: strategy.name })
  }

  /**
   * Execute service call with fallback support
   */
  async executeWithFallback<T>(
    serviceName: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(serviceName)) {
        throw createError.externalAPI('Service temporarily unavailable', serviceName, {
          circuitBreaker: 'open',
          ...context
        })
      }

      // Attempt the operation
      const result = await this.executeWithRetry(operation, context)
      
      // Record success
      this.recordSuccess(serviceName, Date.now() - startTime)
      
      return result

    } catch (error) {
      const duration = Date.now() - startTime
      
      // Convert error to proper type
      const typedError = error instanceof Error ? error : new Error(String(error))
      
      // Record failure
      this.recordFailure(serviceName, typedError, duration, context)
      
      // Try fallback strategies
      const fallbackResult = await this.tryFallbackStrategies(serviceName, typedError, context)
      
      if (fallbackResult !== null) {
        this.logger.info(`Fallback successful for ${serviceName}`, { 
          operation: 'fallback',
          duration,
          strategy: fallbackResult.strategy
        })
        return fallbackResult.data
      }

      // No fallback available, throw error
      throw error
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        this.logger.warn(`Operation attempt ${attempt} failed`, {
          attempt,
          maxRetries: this.config.maxRetries,
          error: lastError.message,
          ...context
        })

        // Don't retry on last attempt
        if (attempt === this.config.maxRetries) {
          break
        }

        // Wait before retry
        await this.delay(this.config.retryDelay * attempt)
      }
    }

    throw lastError || new Error('Operation failed after all retries')
  }

  /**
   * Try fallback strategies
   */
  private async tryFallbackStrategies(
    serviceName: string,
    error: BaseError | Error,
    context?: Record<string, any>
  ): Promise<{ data: any; strategy: string } | null> {
    const strategies = this.fallbackStrategies.get(serviceName) || []

    for (const strategy of strategies) {
      try {
        // Check if strategy should be used for this error
        if (strategy.condition(error)) {
          // Check cache if strategy has caching
          if (strategy.cacheKey && strategy.ttl) {
            const cached = this.getCachedFallback(strategy.cacheKey)
            if (cached) {
              this.logger.info(`Using cached fallback for ${serviceName}`, {
                strategy: strategy.name,
                cacheKey: strategy.cacheKey
              })
              return { data: cached, strategy: strategy.name }
            }
          }

          // Execute fallback handler
          const result = await strategy.handler()
          
          // Cache result if strategy has caching
          if (strategy.cacheKey && strategy.ttl) {
            this.cacheFallbackResult(strategy.cacheKey, result, strategy.ttl)
          }

          return { data: result, strategy: strategy.name }
        }
      } catch (fallbackError) {
        this.logger.warn(`Fallback strategy ${strategy.name} failed`, {
          serviceName,
          strategy: strategy.name,
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        })
      }
    }

    return null
  }

  /**
   * Record service success
   */
  private recordSuccess(serviceName: string, responseTime: number): void {
    const health = this.getOrCreateServiceHealth(serviceName)
    
    health.status = ServiceStatus.HEALTHY
    health.lastCheck = new Date()
    health.responseTime = responseTime
    health.errorRate = Math.max(0, health.errorRate - 0.1) // Gradually reduce error rate
    
    // Close circuit breaker if it was open
    const circuitBreaker = this.getOrCreateCircuitBreaker(serviceName)
    circuitBreaker.recordSuccess()

    this.serviceHealth.set(serviceName, health)
    monitoring.recordMetric('service_health', 1, { service: serviceName, status: 'healthy' })
  }

  /**
   * Record service failure
   */
  private recordFailure(
    serviceName: string,
    error: BaseError | Error,
    responseTime: number,
    context?: Record<string, any>
  ): void {
    const health = this.getOrCreateServiceHealth(serviceName)
    
    health.lastCheck = new Date()
    health.responseTime = responseTime
    health.errorRate = Math.min(1, health.errorRate + 0.2) // Increase error rate
    health.lastError = error.message
    
    // Update status based on error rate
    if (health.errorRate > 0.8) {
      health.status = ServiceStatus.UNHEALTHY
    } else if (health.errorRate > 0.3) {
      health.status = ServiceStatus.DEGRADED
    }
    
    // Update circuit breaker
    const circuitBreaker = this.getOrCreateCircuitBreaker(serviceName)
    circuitBreaker.recordFailure()

    this.serviceHealth.set(serviceName, health)
    monitoring.recordMetric('service_health', 0, { service: serviceName, status: health.status })
    
    this.logger.warn(`Service ${serviceName} failure recorded`, {
      serviceName,
      error: error.message,
      errorRate: health.errorRate,
      status: health.status,
      ...context
    })
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(serviceName: string): boolean {
    const circuitBreaker = this.getOrCreateCircuitBreaker(serviceName)
    return circuitBreaker.isOpen()
  }

  /**
   * Get or create service health record
   */
  private getOrCreateServiceHealth(serviceName: string): ServiceHealth {
    if (!this.serviceHealth.has(serviceName)) {
      const health: ServiceHealth = {
        name: serviceName,
        status: ServiceStatus.HEALTHY,
        lastCheck: new Date(),
        responseTime: 0,
        errorRate: 0,
        circuitBreakerState: CircuitBreakerState.CLOSED,
        fallbackEnabled: true
      }
      this.serviceHealth.set(serviceName, health)
    }
    return this.serviceHealth.get(serviceName)!
  }

  /**
   * Get or create circuit breaker
   */
  private getOrCreateCircuitBreaker(serviceName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      const circuitBreaker = new CircuitBreaker(
        this.config.circuitBreakerThreshold,
        this.config.circuitBreakerTimeout
      )
      this.circuitBreakers.set(serviceName, circuitBreaker)
    }
    return this.circuitBreakers.get(serviceName)!
  }

  /**
   * Get cached fallback result
   */
  private getCachedFallback(key: string): any | null {
    const cached = this.fallbackCache.get(key)
    if (!cached) return null

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.config.fallbackCacheTTL) {
      this.fallbackCache.delete(key)
      return null
    }

    return cached.data
  }

  /**
   * Cache fallback result
   */
  private cacheFallbackResult(key: string, data: any, ttl: number): void {
    this.fallbackCache.set(key, {
      data,
      timestamp: Date.now()
    })

    // Clean up expired cache entries
    this.cleanupCache()
  }

  /**
   * Clean up expired cache entries
   */
    private cleanupCache(): void {
    const now = Date.now()
    this.fallbackCache.forEach((value, key) => {       
      if (now - value.timestamp > this.config.fallbackCacheTTL) {    
        this.fallbackCache.delete(key)
      }
    })
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get service health status
   */
  getServiceHealth(serviceName: string): ServiceHealth | null {
    return this.serviceHealth.get(serviceName) || null
  }

  /**
   * Get all service health statuses
   */
  getAllServiceHealth(): ServiceHealth[] {
    return Array.from(this.serviceHealth.values())
  }

  /**
   * Force service status update
   */
  forceServiceStatus(serviceName: string, status: ServiceStatus): void {
    const health = this.getOrCreateServiceHealth(serviceName)
    health.status = status
    health.lastCheck = new Date()
    this.serviceHealth.set(serviceName, health)
    
    this.logger.info(`Forced service status update for ${serviceName}`, { status })
  }

  /**
   * Reset service health
   */
  resetServiceHealth(serviceName: string): void {
    this.serviceHealth.delete(serviceName)
    this.circuitBreakers.delete(serviceName)
    
    this.logger.info(`Reset service health for ${serviceName}`)
  }

  /**
   * Get fallback system status
   */
  getStatus(): Record<string, any> {
    return {
      enabled: this.config.enableFallbacks,
      services: this.getAllServiceHealth(),
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([name, cb]) => ({
        service: name,
        state: cb.getState(),
        failureCount: cb.getFailureCount(),
        lastFailure: cb.getLastFailure()
      })),
      cacheSize: this.fallbackCache.size,
      strategies: Array.from(this.fallbackStrategies.entries()).map(([service, strategies]) => ({
        service,
        count: strategies.length
      }))
    }
  }
}

/**
 * Circuit Breaker Implementation
 */
class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failureCount: number = 0
  private lastFailure: Date | null = null
  private nextAttempt: Date | null = null

  constructor(
    private threshold: number,
    private timeout: number
  ) {}

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.failureCount = 0
    this.state = CircuitBreakerState.CLOSED
    this.nextAttempt = null
  }

  /**
   * Record a failed operation
   */
  recordFailure(): void {
    this.failureCount++
    this.lastFailure = new Date()

    if (this.failureCount >= this.threshold) {
      this.state = CircuitBreakerState.OPEN
      this.nextAttempt = new Date(Date.now() + this.timeout)
    }
  }

  /**
   * Check if circuit breaker is open
   */
  isOpen(): boolean {
    if (this.state === CircuitBreakerState.OPEN) {
      // Check if timeout has passed
      if (this.nextAttempt && Date.now() >= this.nextAttempt.getTime()) {
        this.state = CircuitBreakerState.HALF_OPEN
        this.nextAttempt = null
      }
    }

    return this.state === CircuitBreakerState.OPEN
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount
  }

  /**
   * Get last failure time
   */
  getLastFailure(): Date | null {
    return this.lastFailure
  }
}

/**
 * Create default fallback manager instance
 */
export const fallbackManager = new FallbackManager()

/**
 * Predefined fallback strategies
 */
export const createFallbackStrategies = {
  /**
   * Cache-based fallback
   */
  cache: (cacheKey: string, ttl: number = 300000): FallbackStrategy => ({
    name: 'cache',
    priority: 1,
    condition: () => true, // Always try cache first
    handler: async () => {
      // This would be implemented with actual cache retrieval
      throw new Error('Cache fallback not implemented')
    },
    cacheKey,
    ttl
  }),

  /**
   * Offline mode fallback
   */
  offline: (): FallbackStrategy => ({
    name: 'offline',
    priority: 2,
    condition: (error) => {
      // Use offline mode for network or external service errors
      return error.message.includes('network') || 
             error.message.includes('unavailable') ||
             error.message.includes('timeout')
    },
    handler: async () => {
      // Return basic offline functionality
      return {
        mode: 'offline',
        message: 'Service is currently offline. Basic functionality available.',
        timestamp: new Date()
      }
    }
  }),

  /**
   * Mock data fallback
   */
  mockData: (mockData: any): FallbackStrategy => ({
    name: 'mock_data',
    priority: 3,
    condition: () => true, // Always available
    handler: async () => mockData
  }),

  /**
   * Retry with exponential backoff
   */
  retryWithBackoff: (maxRetries: number = 3): FallbackStrategy => ({
    name: 'retry_backoff',
    priority: 4,
    condition: (error) => {
      // Use for temporary errors
      return error.message.includes('temporary') ||
             error.message.includes('rate limit') ||
             error.message.includes('timeout')
    },
    handler: async () => {
      // This would implement exponential backoff retry logic
      throw new Error('Retry with backoff not implemented')
    }
  })
}

/**
 * Service wrapper with fallback support
 */
export function withFallback<T>(
  serviceName: string,
  operation: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  return fallbackManager.executeWithFallback(serviceName, operation, context)
}

/**
 * Decorator for adding fallback support to methods
 */
export function withFallbackSupport(serviceName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      return withFallback(serviceName, () => originalMethod.apply(this, args), {
        method: propertyKey,
        args: args.map(arg => typeof arg === 'object' ? '[Object]' : String(arg))
      })
    }

    return descriptor
  }
}
