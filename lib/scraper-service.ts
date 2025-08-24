/**
 * Enhanced Scraper Service for eBay Integration
 * Provides robust scraping with exponential backoff, rate limiting, and structured logging
 * Replaces basic scraping with production-ready error handling and retry logic
 */

export interface ScrapingOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  timeout?: number
  rateLimit?: number // requests per second
  userAgent?: string
  countryCode?: string
  render?: boolean
  useProxy?: boolean
  antiDetection?: boolean
}

export interface ScrapingResult {
  success: boolean
  html: string | null
  statusCode?: number
  error?: string
  attempt: number
  duration: number
  timestamp: string
  url: string
  blocked?: boolean
  retryAfter?: number
}

export interface ScrapingMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  blockedRequests: number
  averageResponseTime: number
  lastRequestTime: string
  rateLimitRemaining: number
}

export class EnhancedScraperService {
  private apiKey: string
  private baseUrl: string = 'http://api.scraperapi.com'
  private metrics: ScrapingMetrics
  private lastRequestTime: number = 0
  private requestQueue: Array<() => Promise<void>> = []
  private isProcessingQueue: boolean = false
  private userAgentIndex: number = 0

  // Multiple user agents to avoid detection
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ]

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      blockedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: new Date().toISOString(),
      rateLimitRemaining: 10 // Default rate limit
    }
  }

  /**
   * Get next user agent in rotation
   */
  private getNextUserAgent(): string {
    const agent = this.userAgents[this.userAgentIndex]
    this.userAgentIndex = (this.userAgentIndex + 1) % this.userAgents.length
    return agent
  }

  /**
   * Scrape URL with enhanced error handling and retry logic
   */
  async scrapeUrl(url: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    const {
      maxRetries = 3,
      baseDelay = 2000, // Increased base delay for real data
      maxDelay = 30000, // Increased max delay for real data
      timeout = 20000,
      rateLimit = 1, // Reduced to 1 request per second for eBay
      userAgent,
      countryCode = 'us',
      render = false,
      useProxy = true,
      antiDetection = true
    } = options

    const startTime = Date.now()
    let lastError: string | undefined
    let blockedCount = 0

    // Apply rate limiting
    await this.waitForRateLimit(rateLimit)

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Scraping attempt ${attempt}/${maxRetries}: ${url}`)
        console.log(`⏱️ Timeout: ${timeout}ms, Attempt: ${attempt}/${maxRetries}`)
        
        const result = await this.performScrapingRequest(url, {
          timeout,
          userAgent: userAgent || this.getNextUserAgent(),
          countryCode,
          render,
          useProxy,
          antiDetection,
          attempt
        })

        if (result.success) {
          const duration = Date.now() - startTime
          this.updateMetrics(true, duration)
          
          console.log(`✅ Scraping successful on attempt ${attempt} (${duration}ms)`)
          return {
            ...result,
            attempt,
            duration,
            timestamp: new Date().toISOString()
          }
        }

        // Handle specific error types
        if (result.blocked) {
          blockedCount++
          this.metrics.blockedRequests++
          console.warn(`🚫 Request blocked on attempt ${attempt}`)
          
          if (blockedCount >= 2) {
            // If blocked multiple times, wait longer
            const waitTime = Math.min(maxDelay, baseDelay * Math.pow(2, attempt) * 2)
            console.log(`⏳ Extended wait due to blocking: ${waitTime}ms`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        }

        lastError = result.error

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.warn(`Scraping attempt ${attempt} failed:`, errorMessage)
        lastError = errorMessage
        
        // Check if it's a blocking error
        if (this.isBlockingError(errorMessage)) {
          blockedCount++
          this.metrics.blockedRequests++
          console.warn(`🚫 Detected blocking pattern: ${errorMessage}`)
        }
        
        // For timeout errors, try to recover with longer waits for real data
        if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
          console.log(`⏱️ Timeout detected, using longer wait for real data recovery`)
          if (attempt < maxRetries) {
            const longWait = Math.min(maxDelay, baseDelay * Math.pow(2, attempt) * 3) // Longer wait for timeouts
            console.log(`⏳ Long wait for real data recovery: ${longWait}ms`)
            await new Promise(resolve => setTimeout(resolve, longWait))
          }
          continue
        }
      }

      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const waitTime = this.calculateWaitTime(attempt, baseDelay, maxDelay, blockedCount)
        console.log(`⏳ Waiting ${waitTime}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    const duration = Date.now() - startTime
    this.updateMetrics(false, duration)
    
    console.error(`❌ All scraping attempts failed for ${url}`)
    return {
      success: false,
      html: null,
      error: lastError || 'All attempts failed',
      attempt: maxRetries,
      duration,
      timestamp: new Date().toISOString(),
      url,
      blocked: blockedCount > 0
    }
  }

  /**
   * Check if error indicates blocking
   */
  private isBlockingError(errorMessage: string): boolean {
    const blockingPatterns = [
      'blocked',
      'forbidden',
      'access denied',
      'rate limit',
      'too many requests',
      'error page detected',
      'captcha',
      'robot',
      'bot detection'
    ]
    
    return blockingPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern)
    )
  }

  /**
   * Calculate wait time with jitter and blocking consideration
   */
  private calculateWaitTime(attempt: number, baseDelay: number, maxDelay: number, blockedCount: number): number {
    let waitTime = Math.min(maxDelay, baseDelay * Math.pow(2, attempt))
    
    // Add jitter to prevent synchronized retries
    const jitter = Math.random() * 0.3 + 0.85 // 85-115% of base time
    
    // Increase wait time if blocked
    if (blockedCount > 0) {
      waitTime *= (1 + blockedCount * 0.5)
    }
    
    return Math.min(maxDelay, Math.floor(waitTime * jitter))
  }

  /**
   * Perform the actual scraping request
   */
  private async performScrapingRequest(url: string, options: {
    timeout: number
    userAgent: string
    countryCode: string
    render: boolean
    useProxy: boolean
    antiDetection: boolean
    attempt: number
  }): Promise<ScrapingResult> {
    const {
      timeout,
      userAgent,
      countryCode,
      render,
      useProxy,
      antiDetection,
      attempt
    } = options

    try {
      // Build ScraperAPI URL with enhanced options
      const params = new URLSearchParams({
        api_key: this.apiKey,
        url: url,
        render: render.toString(),
        country_code: countryCode,
        premium: 'true', // Use premium proxies
        session_number: attempt.toString(), // Different session per attempt
        keep_headers: 'true'
      })

      if (useProxy) {
        params.append('proxy', 'residential') // Use residential proxies
      }

      if (antiDetection) {
        params.append('js_scenario', 'ebay_anti_detection')
        params.append('custom_google', 'true')
        params.append('premium_proxy', 'true')
      }

      const scraperUrl = `${this.baseUrl}/?${params.toString()}`
      
      console.log(`🌐 Scraping with enhanced anti-detection (attempt ${attempt})`)
      
      const response = await fetch(scraperUrl, {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: AbortSignal.timeout(timeout)
      })

      if (!response.ok) {
        throw new Error(`ScraperAPI error: ${response.status} ${response.statusText}`)
      }

      const html = await response.text()
      
      // Enhanced content validation
      if (html.length < 1000) {
        throw new Error('Response too short, likely blocked or error page')
      }

      // Check for blocking indicators in HTML
      if (this.detectBlockingInHtml(html)) {
        return {
          success: false,
          html: null,
          error: 'Blocking detected in response content',
          blocked: true,
          attempt: 0,
          duration: 0,
          timestamp: new Date().toISOString(),
          url: url
        }
      }

      // Check for eBay-specific error pages
      if (this.detectEbayErrorPage(html)) {
        return {
          success: false,
          html: null,
          error: 'eBay error page detected in response',
          blocked: true,
          attempt: 0,
          duration: 0,
          timestamp: new Date().toISOString(),
          url: url
        }
      }

      return {
        success: true,
        html,
        statusCode: response.status,
        attempt: 0,
        duration: 0,
        timestamp: new Date().toISOString(),
        url: url
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Scraping request failed: ${errorMessage}`)
    }
  }

  /**
   * Detect blocking patterns in HTML content
   */
  private detectBlockingInHtml(html: string): boolean {
    const blockingPatterns = [
      'access denied',
      'blocked',
      'forbidden',
      'captcha',
      'robot check',
      'bot detection',
      'rate limit exceeded',
      'too many requests',
      'please wait',
      'verification required'
    ]
    
    return blockingPatterns.some(pattern => 
      html.toLowerCase().includes(pattern)
    )
  }

  /**
   * Detect eBay-specific error pages
   */
  private detectEbayErrorPage(html: string): boolean {
    const ebayErrorPatterns = [
      'sorry, we couldn\'t find that page',
      'this listing was ended by the seller',
      'this item is no longer available',
      'page not found',
      'error occurred',
      'temporarily unavailable',
      'maintenance mode'
    ]
    
    return ebayErrorPatterns.some(pattern => 
      html.toLowerCase().includes(pattern)
    )
  }

  /**
   * Wait for rate limiting
   */
  private async waitForRateLimit(requestsPerSecond: number): Promise<void> {
    const minInterval = 1000 / requestsPerSecond
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest
      await this.sleep(waitTime)
    }
    
    this.lastRequestTime = Date.now()
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Update scraping metrics
   */
  private updateMetrics(success: boolean, duration: number): void {
    this.metrics.totalRequests++
    
    if (success) {
      this.metrics.successfulRequests++
    } else {
      this.metrics.failedRequests++
    }

    // Update average response time
    const totalDuration = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + duration
    this.metrics.averageResponseTime = totalDuration / this.metrics.totalRequests

    this.metrics.lastRequestTime = new Date().toISOString()
    
    // Update rate limit remaining (simple implementation)
    if (success) {
      this.metrics.rateLimitRemaining = Math.max(0, this.metrics.rateLimitRemaining - 1)
    }
  }

  /**
   * Get current scraping metrics
   */
  getMetrics(): ScrapingMetrics {
    return { ...this.metrics }
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      blockedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: new Date().toISOString(),
      rateLimitRemaining: 10
    }
  }

  /**
   * Queue a scraping request for rate-limited execution
   */
  async queueScrapingRequest(url: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await this.scrapeUrl(url, options)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.processQueue()
    })
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()
      if (request) {
        await request()
        // Wait between requests for rate limiting
        await this.sleep(500) // 500ms between requests
      }
    }

    this.isProcessingQueue = false
  }

  /**
   * Health check for the scraper service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    message: string
    metrics: ScrapingMetrics
  }> {
    const metrics = this.getMetrics()
    
    if (metrics.totalRequests === 0) {
      return {
        status: 'healthy',
        message: 'Service ready, no requests yet',
        metrics
      }
    }

    const successRate = metrics.successfulRequests / metrics.totalRequests
    
    if (successRate >= 0.9) {
      return {
        status: 'healthy',
        message: `Service healthy with ${(successRate * 100).toFixed(1)}% success rate`,
        metrics
      }
    } else if (successRate >= 0.7) {
      return {
        status: 'degraded',
        message: `Service degraded with ${(successRate * 100).toFixed(1)}% success rate`,
        metrics
      }
    } else {
      return {
        status: 'unhealthy',
        message: `Service unhealthy with ${(successRate * 100).toFixed(1)}% success rate`,
        metrics
      }
    }
  }
}

/**
 * Legacy scraper function for backward compatibility
 * @deprecated Use EnhancedScraperService instead
 */
export async function scrapeWithScraperAPI(
  url: string, 
  apiKey: string, 
  options: ScrapingOptions = {}
): Promise<string | null> {
  console.warn('scrapeWithScraperAPI is deprecated. Use EnhancedScraperService instead.')
  
  const scraper = new EnhancedScraperService(apiKey)
  const result = await scraper.scrapeUrl(url, options)
  
  return result.success ? result.html : null
}
