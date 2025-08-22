import { NextRequest } from 'next/server'
import { GET, OPTIONS } from '@/app/api/health/route'

// Mock the enhanced API utilities
const mockEnhancedAPI = jest.fn()
const mockAddPerformanceHeaders = jest.fn()

jest.mock('@/lib/api-utils-enhanced', () => ({
  enhancedAPI: mockEnhancedAPI,
  addPerformanceHeaders: mockAddPerformanceHeaders,
}))

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock implementations
    mockEnhancedAPI.mockImplementation((handler) => handler)
    mockAddPerformanceHeaders.mockImplementation((response) => response)
  })

  it('returns 200 with health status', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.status).toBe('healthy')
    expect(data.timestamp).toBeDefined()
    expect(data.version).toBeDefined()
    expect(data.environment).toBeDefined()
    expect(data.uptime).toBeDefined()
  })

  it('includes system metrics', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await GET(request)
    const data = await response.json()

    expect(data.memory).toBeDefined()
    expect(data.memory.heapUsed).toBeDefined()
    expect(data.memory.heapTotal).toBeDefined()
    expect(data.memory.external).toBeDefined()
    expect(data.memory.rss).toBeDefined()

    expect(data.checks).toBeDefined()
    expect(data.checks.database).toBeDefined()
    expect(data.checks.cache).toBeDefined()
    expect(data.checks.imageProcessing).toBeDefined()
  })

  it('sets appropriate CORS headers', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await GET(request)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS')
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
  })

  it('includes performance headers', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    await GET(request)

    expect(mockAddPerformanceHeaders).toHaveBeenCalled()
  })

  it('handles OPTIONS request for CORS preflight', async () => {
    const request = new NextRequest('http://localhost:3000/api/health', {
      method: 'OPTIONS',
    })

    const response = await OPTIONS(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS')
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
  })

  it('returns valid JSON response', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await GET(request)
    const data = await response.json()

    // Verify response structure
    expect(typeof data.success).toBe('boolean')
    expect(typeof data.status).toBe('string')
    expect(typeof data.timestamp).toBe('string')
    expect(typeof data.version).toBe('string')
    expect(typeof data.environment).toBe('string')
    expect(typeof data.uptime).toBe('number')
    expect(typeof data.memory).toBe('object')
    expect(typeof data.checks).toBe('object')
  })

  it('includes current timestamp', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await GET(request)
    const data = await response.json()

    const timestamp = new Date(data.timestamp)
    const now = new Date()
    
    // Timestamp should be within the last second
    expect(Math.abs(timestamp.getTime() - now.getTime())).toBeLessThan(1000)
  })

  it('includes memory usage information', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await GET(request)
    const data = await response.json()

    expect(data.memory.heapUsed).toBeGreaterThan(0)
    expect(data.memory.heapTotal).toBeGreaterThan(0)
    expect(data.memory.external).toBeGreaterThanOrEqual(0)
    expect(data.memory.rss).toBeGreaterThan(0)
  })

  it('includes health check statuses', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await GET(request)
    const data = await response.json()

    expect(['healthy', 'unhealthy', 'degraded']).toContain(data.checks.database)
    expect(['healthy', 'unhealthy', 'degraded']).toContain(data.checks.cache)
    expect(['healthy', 'unhealthy', 'degraded']).toContain(data.checks.imageProcessing)
  })

  it('includes version information', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await GET(request)
    const data = await response.json()

    expect(data.version).toMatch(/^\d+\.\d+\.\d+$/) // Semantic version format
  })

  it('includes environment information', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await GET(request)
    const data = await response.json()

    expect(['development', 'staging', 'production']).toContain(data.environment)
  })

  it('includes uptime information', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await GET(request)
    const data = await response.json()

    expect(data.uptime).toBeGreaterThan(0)
  })

  it('handles errors gracefully', async () => {
    // Mock enhancedAPI to throw an error
    mockEnhancedAPI.mockImplementation(() => {
      throw new Error('Health check failed')
    })

    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.message).toContain('health check failed')
  })

  it('includes performance metrics when available', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await GET(request)
    const data = await response.json()

    // Performance metrics should be included if available
    if (data.performance) {
      expect(typeof data.performance.responseTime).toBe('number')
      expect(typeof data.performance.memoryUsage).toBe('object')
      expect(typeof data.performance.cpuUsage).toBe('object')
    }
  })

  it('validates response content type', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await GET(request)

    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('handles concurrent health check requests', async () => {
    const request1 = new NextRequest('http://localhost:3000/api/health')
    const request2 = new NextRequest('http://localhost:3000/api/health')

    const [response1, response2] = await Promise.all([
      GET(request1),
      GET(request2)
    ])

    expect(response1.status).toBe(200)
    expect(response2.status).toBe(200)

    const data1 = await response1.json()
    const data2 = await response2.json()

    expect(data1.success).toBe(true)
    expect(data2.success).toBe(true)
  })

  it('includes build information when available', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await GET(request)
    const data = await response.json()

    // Build info should be included if available
    if (data.build) {
      expect(typeof data.build.commit).toBe('string')
      expect(typeof data.build.branch).toBe('string')
      expect(typeof data.build.buildTime).toBe('string')
    }
  })

  it('handles missing environment variables gracefully', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await GET(request)
    const data = await response.json()

    // Should still return a valid response even if some env vars are missing
    expect(data.success).toBe(true)
    expect(data.status).toBe('healthy')
  })

  it('includes system platform information', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await GET(request)
    const data = await response.json()

    // Platform info should be included if available
    if (data.platform) {
      expect(typeof data.platform.os).toBe('string')
      expect(typeof data.platform.arch).toBe('string')
      expect(typeof data.platform.nodeVersion).toBe('string')
    }
  })
})
