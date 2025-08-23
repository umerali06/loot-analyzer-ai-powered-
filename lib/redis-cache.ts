/**
 * Redis Caching Service
 * Provides high-performance caching with connection pooling, TTL management, and optimization features
 */

import { createClient, RedisClientType, RedisClientOptions } from 'redis'

export interface CacheConfig {
  host: string
  port: number
  password?: string
  db?: number
  maxRetriesPerRequest?: number
  retryDelayOnFailover?: number
  enableReadyCheck?: boolean
  lazyConnect?: boolean
}

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  prefix?: string // Key prefix for namespacing
  compress?: boolean // Enable compression for large values
  serialize?: boolean // Enable JSON serialization
}

export interface CacheStats {
  hits: number
  misses: number
  keys: number
  memory: number
  connected: boolean
  lastError?: string
}

export class RedisCacheService {
  private client: any = null
  private config: CacheConfig
  private stats: CacheStats
  private connectionPool: any[] = []
  private maxPoolSize = 5
  private isConnecting = false

  constructor(config: CacheConfig) {
    this.config = config
    this.stats = {
      hits: 0,
      misses: 0,
      keys: 0,
      memory: 0,
      connected: false
    }
  }

  /**
   * Initialize Redis connection with connection pooling
   */
  async connect(): Promise<void> {
    if (this.isConnecting) return
    this.isConnecting = true

    try {
      // Create main client
      this.client = createClient({
        socket: {
          host: this.config.host,
          port: this.config.port,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis max reconnection attempts reached')
              return new Error('Max reconnection attempts reached')
            }
            return Math.min(retries * 100, 3000)
          }
        },
        password: this.config.password,
        database: this.config.db || 0
      })

      // Set up event handlers
      this.client.on('error', (err: any) => {
        console.error('Redis Client Error:', err)
        this.stats.lastError = err.message
        this.stats.connected = false
      })

      this.client.on('connect', () => {
        console.log('Redis Client Connected')
        this.stats.connected = true
        this.stats.lastError = undefined
      })

      this.client.on('ready', () => {
        console.log('Redis Client Ready')
        this.stats.connected = true
      })

      this.client.on('end', () => {
        console.log('Redis Client Disconnected')
        this.stats.connected = false
      })

      // Initialize connection pool
      await this.initializeConnectionPool()

      await this.client.connect()
      console.log('Redis cache service initialized successfully')

    } catch (error) {
      console.error('Failed to initialize Redis cache service:', error)
      this.stats.lastError = error instanceof Error ? error.message : 'Unknown error'
      throw error
    } finally {
      this.isConnecting = false
    }
  }

  /**
   * Initialize connection pool for high-performance operations
   */
  private async initializeConnectionPool(): Promise<void> {
    for (let i = 0; i < this.maxPoolSize; i++) {
      try {
        const poolClient = createClient({
          socket: {
            host: this.config.host,
            port: this.config.port,
            reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
          },
          password: this.config.password,
          database: this.config.db || 0
        })

        await poolClient.connect()
        this.connectionPool.push(poolClient)
      } catch (error) {
        console.warn(`Failed to create pool connection ${i + 1}:`, error)
      }
    }
  }

  /**
   * Get a connection from the pool
   */
  private getPoolConnection(): RedisClientType | null {
    if (this.connectionPool.length === 0) return null
    return this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)]
  }

  /**
   * Set a value in cache with options
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    if (!this.client || !this.stats.connected) {
      throw new Error('Redis not connected')
    }

    try {
      const fullKey = this.buildKey(key, options.prefix)
      let processedValue = value

      // Serialize if needed
      if (options.serialize !== false) {
        processedValue = JSON.stringify(value)
      }

      // Compress if needed and value is large
      if (options.compress && processedValue.length > 1024) {
        // Simple compression for demo - in production use proper compression
        processedValue = this.compressValue(processedValue)
      }

      const ttl = options.ttl || 3600 // Default 1 hour
      await this.client.setEx(fullKey, ttl, processedValue)

      // Update stats
      this.stats.keys++
      await this.updateStats()

    } catch (error) {
      console.error('Cache set error:', error)
      throw error
    }
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.client || !this.stats.connected) {
      throw new Error('Redis not connected')
    }

    try {
      const fullKey = this.buildKey(key, options.prefix)
      const value = await this.client.get(fullKey)

      if (value === null) {
        this.stats.misses++
        return null
      }

      this.stats.hits++
      let processedValue = value

      // Decompress if needed
      if (options.compress && value.startsWith('COMPRESSED:')) {
        processedValue = this.decompressValue(value)
      }

      // Deserialize if needed
      if (options.serialize !== false) {
        try {
          return JSON.parse(processedValue)
        } catch (parseError) {
          console.warn('Failed to parse cached value:', parseError)
          return processedValue as T
        }
      }

      return processedValue as T

    } catch (error) {
      console.error('Cache get error:', error)
      this.stats.misses++
      return null
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.client || !this.stats.connected) {
      throw new Error('Redis not connected')
    }

    try {
      const fullKey = this.buildKey(key, options.prefix)
      const result = await this.client.del(fullKey)
      
      if (result > 0) {
        this.stats.keys = Math.max(0, this.stats.keys - 1)
      }

      return result > 0
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.client || !this.stats.connected) {
      return false
    }

    try {
      const fullKey = this.buildKey(key, options.prefix)
      const result = await this.client.exists(fullKey)
      return result > 0
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  }

  /**
   * Set multiple values atomically
   */
  async mset(keyValues: Record<string, any>, options: CacheOptions = {}): Promise<void> {
    if (!this.client || !this.stats.connected) {
      throw new Error('Redis not connected')
    }

    try {
      const pipeline = this.client.multi()
      const ttl = options.ttl || 3600

      for (const [key, value] of Object.entries(keyValues)) {
        const fullKey = this.buildKey(key, options.prefix)
        let processedValue = value

        if (options.serialize !== false) {
          processedValue = JSON.stringify(value)
        }

        if (options.compress && processedValue.length > 1024) {
          processedValue = this.compressValue(processedValue)
        }

        pipeline.setEx(fullKey, ttl, processedValue)
      }

      await pipeline.exec()
      this.stats.keys += Object.keys(keyValues).length
      await this.updateStats()

    } catch (error) {
      console.error('Cache mset error:', error)
      throw error
    }
  }

  /**
   * Get multiple values
   */
  async mget<T = any>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    if (!this.client || !this.stats.connected) {
      throw new Error('Redis not connected')
    }

    try {
      const fullKeys = keys.map(key => this.buildKey(key, options.prefix))
      const values = await this.client.mGet(fullKeys)

      return values.map((value: any) => {
        if (value === null) {
          this.stats.misses++
          return null
        }

        this.stats.hits++
        let processedValue = value

        if (options.compress && value.startsWith('COMPRESSED:')) {
          processedValue = this.decompressValue(value)
        }

        if (options.serialize !== false) {
          try {
            return JSON.parse(processedValue)
          } catch (parseError) {
            console.warn('Failed to parse cached value:', parseError)
            return processedValue as T
          }
        }

        return processedValue as T
      })

    } catch (error) {
      console.error('Cache mget error:', error)
      return keys.map(() => null)
    }
  }

  /**
   * Increment a counter
   */
  async increment(key: string, amount: number = 1, options: CacheOptions = {}): Promise<number> {
    if (!this.client || !this.stats.connected) {
      throw new Error('Redis not connected')
    }

    try {
      const fullKey = this.buildKey(key, options.prefix)
      const result = await this.client.incrBy(fullKey, amount)

      // Set TTL if this is a new key
      if (result === amount) {
        const ttl = options.ttl || 3600
        await this.client.expire(fullKey, ttl)
        this.stats.keys++
      }

      return result
    } catch (error) {
      console.error('Cache increment error:', error)
      throw error
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    if (!this.client || !this.stats.connected) {
      return { ...this.stats, connected: false }
    }

    try {
      // Get Redis info
      const info = await this.client.info('memory')
      const memoryMatch = info.match(/used_memory_human:(\S+)/)
      if (memoryMatch) {
        this.stats.memory = this.parseMemorySize(memoryMatch[1])
      }

      // Get key count
      const dbSize = await this.client.dbSize()
      this.stats.keys = dbSize

      return { ...this.stats }
    } catch (error) {
      console.error('Failed to get cache stats:', error)
      return { ...this.stats, lastError: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    if (!this.client || !this.stats.connected) {
      throw new Error('Redis not connected')
    }

    try {
      await this.client.flushDb()
      this.stats.keys = 0
      this.stats.hits = 0
      this.stats.misses = 0
      console.log('Cache cleared successfully')
    } catch (error) {
      console.error('Cache clear error:', error)
      throw error
    }
  }

  /**
   * Close all connections
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit()
        this.client = null
      }

      // Close pool connections
      for (const poolClient of this.connectionPool) {
        await poolClient.quit()
      }
      this.connectionPool = []

      this.stats.connected = false
      console.log('Redis cache service disconnected')
    } catch (error) {
      console.error('Error disconnecting Redis cache service:', error)
    }
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string, prefix?: string): string {
    return prefix ? `${prefix}:${key}` : key
  }

  /**
   * Simple compression for demo purposes
   */
  private compressValue(value: string): string {
    // In production, use proper compression like gzip or lz4
    return `COMPRESSED:${Buffer.from(value).toString('base64')}`
  }

  /**
   * Simple decompression for demo purposes
   */
  private decompressValue(value: string): string {
    if (!value.startsWith('COMPRESSED:')) return value
    const base64 = value.replace('COMPRESSED:', '')
    return Buffer.from(base64, 'base64').toString()
  }

  /**
   * Parse memory size string to bytes
   */
  private parseMemorySize(sizeStr: string): number {
    const units: Record<string, number> = {
      'B': 1,
      'K': 1024,
      'M': 1024 * 1024,
      'G': 1024 * 1024 * 1024
    }

    const match = sizeStr.match(/^(\d+(?:\.\d+)?)([BKMGT])$/)
    if (!match) return 0

    const [, value, unit] = match
    return parseFloat(value) * (units[unit] || 1)
  }

  /**
   * Update cache statistics
   */
  private async updateStats(): Promise<void> {
    try {
      if (this.client && this.stats.connected) {
        const dbSize = await this.client.dbSize()
        this.stats.keys = dbSize
      }
    } catch (error) {
      console.warn('Failed to update cache stats:', error)
    }
  }
}

// Export singleton instance
let cacheService: RedisCacheService | null = null

export function getCacheService(config?: CacheConfig): RedisCacheService {
  if (!cacheService) {
    if (!config) {
      throw new Error('Cache service not initialized. Call initializeCacheService first.')
    }
    cacheService = new RedisCacheService(config)
  }
  return cacheService
}

export async function initializeCacheService(config: CacheConfig): Promise<RedisCacheService> {
  if (!cacheService) {
    cacheService = new RedisCacheService(config)
    await cacheService.connect()
  }
  return cacheService
}

export async function closeCacheService(): Promise<void> {
  if (cacheService) {
    await cacheService.disconnect()
    cacheService = null
  }
}
