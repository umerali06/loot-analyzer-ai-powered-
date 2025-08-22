import { NextRequest, NextResponse } from 'next/server'
import {
  createSuccessResponse,
  createErrorResponse,
  addPerformanceHeaders,
  enhancedAPI,
  PerformanceMetrics,
} from '@/lib/api-utils-enhanced'

// Mock Next.js
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({ data, options })),
  },
}))

// Mock the enhancedAPI instance
jest.mock('@/lib/api-utils-enhanced', () => ({
  ...jest.requireActual('@/lib/api-utils-enhanced'),
  enhancedAPI: {
    createResponse: jest.fn(),
    createErrorResponse: jest.fn(),
    getPerformanceMetrics: jest.fn(),
  },
}))

describe('api-utils-enhanced', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createSuccessResponse', () => {
    it('creates success response with data', () => {
      const data = { message: 'Success', id: 123 }
      const statusCode = 200

      const response = createSuccessResponse(data, statusCode)

      expect(enhancedAPI.createResponse).toHaveBeenCalledWith(data, statusCode)
      expect(response).toBeDefined()
    })

    it('creates success response with default status code', () => {
      const data = { message: 'Success' }

      createSuccessResponse(data)

      expect(enhancedAPI.createResponse).toHaveBeenCalledWith(data, 200)
    })
  })

  describe('createErrorResponse', () => {
    it('creates error response with message', () => {
      const message = 'Something went wrong'
      const statusCode = 400

      const response = createErrorResponse(message, statusCode)

      expect(enhancedAPI.createErrorResponse).toHaveBeenCalledWith(message, statusCode, undefined)
      expect(response).toBeDefined()
    })

    it('creates error response with default status code', () => {
      const message = 'Internal server error'

      createErrorResponse(message)

      expect(enhancedAPI.createErrorResponse).toHaveBeenCalledWith(message, 500, undefined)
    })

    it('creates error response with details', () => {
      const message = 'Validation failed'
      const details = { field: 'email', reason: 'Invalid format' }
      const statusCode = 422

      const response = createErrorResponse(message, statusCode, details)

      expect(enhancedAPI.createErrorResponse).toHaveBeenCalledWith(message, statusCode, details)
    })
  })

  describe('addPerformanceHeaders', () => {
    it('adds performance headers to response', () => {
      const mockResponse = {
        headers: {
          set: jest.fn(),
        },
      } as any

      const mockMetrics: PerformanceMetrics[] = [{
        startTime: Date.now() - 150,
        endTime: Date.now(),
        processingTime: 150,
        memoryUsage: 1024 * 1024,
        cacheHit: true,
        compressionRatio: 0.8,
        databaseQueries: 2,
        cacheOperations: 1,
      }]

      ;(enhancedAPI.getPerformanceMetrics as jest.Mock).mockReturnValue(mockMetrics)

      addPerformanceHeaders(mockResponse)

      expect(mockResponse.headers.set).toHaveBeenCalledWith('X-Processing-Time', '150.00ms')
      expect(mockResponse.headers.set).toHaveBeenCalledWith('X-Cache-Hit', 'true')
      expect(mockResponse.headers.set).toHaveBeenCalledWith('X-Memory-Usage', '1.00MB')
    })

    it('formats memory usage correctly', () => {
      const mockResponse = {
        headers: {
          set: jest.fn(),
        },
      } as any

      const mockMetrics: PerformanceMetrics[] = [{
        startTime: Date.now() - 100,
        endTime: Date.now(),
        processingTime: 100,
        memoryUsage: 2048 * 1024, // 2MB
        cacheHit: false,
        compressionRatio: 0.9,
        databaseQueries: 1,
        cacheOperations: 0,
      }]

      ;(enhancedAPI.getPerformanceMetrics as jest.Mock).mockReturnValue(mockMetrics)

      addPerformanceHeaders(mockResponse)

      expect(mockResponse.headers.set).toHaveBeenCalledWith('X-Memory-Usage', '2.00MB')
    })

    it('handles large memory usage', () => {
      const mockResponse = {
        headers: {
          set: jest.fn(),
        },
      } as any

      const mockMetrics: PerformanceMetrics[] = [{
        startTime: Date.now() - 100,
        endTime: Date.now(),
        processingTime: 100,
        memoryUsage: 1024 * 1024 * 1024, // 1GB
        cacheHit: true,
        compressionRatio: 0.7,
        databaseQueries: 5,
        cacheOperations: 2,
      }]

      ;(enhancedAPI.getPerformanceMetrics as jest.Mock).mockReturnValue(mockMetrics)

      addPerformanceHeaders(mockResponse)

      expect(mockResponse.headers.set).toHaveBeenCalledWith('X-Memory-Usage', '1024.00MB')
    })

    it('handles empty metrics', () => {
      const mockResponse = {
        headers: {
          set: jest.fn(),
        },
      } as any

      ;(enhancedAPI.getPerformanceMetrics as jest.Mock).mockReturnValue([])

      addPerformanceHeaders(mockResponse)

      expect(mockResponse.headers.set).not.toHaveBeenCalled()
    })
  })

  describe('enhancedAPI', () => {
    it('provides performance monitoring methods', () => {
      expect(enhancedAPI.getPerformanceMetrics).toBeDefined()
      expect(typeof enhancedAPI.getPerformanceMetrics).toBe('function')
    })

    it('handles performance metrics collection', () => {
      const mockMetrics: PerformanceMetrics[] = [{
        startTime: Date.now() - 100,
        endTime: Date.now(),
        processingTime: 100,
        memoryUsage: 512 * 1024,
        cacheHit: true,
        compressionRatio: 0.8,
        databaseQueries: 1,
        cacheOperations: 1,
      }]

      ;(enhancedAPI.getPerformanceMetrics as jest.Mock).mockReturnValue(mockMetrics)

      const metrics = enhancedAPI.getPerformanceMetrics()

      expect(metrics).toEqual(mockMetrics)
      expect(enhancedAPI.getPerformanceMetrics).toHaveBeenCalled()
    })
  })

  describe('performance monitoring', () => {
    it('measures processing time', async () => {
      const startTime = Date.now()
      
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const processingTime = Date.now() - startTime

      expect(processingTime).toBeGreaterThanOrEqual(45)
      expect(processingTime).toBeLessThanOrEqual(55)
    })

    it('measures memory usage', () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      // Simulate memory allocation
      const testArray = new Array(1000).fill('test')
      
      const currentMemory = process.memoryUsage().heapUsed
      const memoryIncrease = currentMemory - initialMemory

      expect(memoryIncrease).toBeGreaterThan(0)
      
      // Clean up
      testArray.length = 0
    })
  })

  describe('error handling', () => {
    it('handles missing performance metrics gracefully', () => {
      const mockResponse = {
        headers: {
          set: jest.fn(),
        },
      } as any

      ;(enhancedAPI.getPerformanceMetrics as jest.Mock).mockReturnValue(null)

      expect(() => addPerformanceHeaders(mockResponse)).not.toThrow()
    })

    it('handles invalid performance metrics gracefully', () => {
      const mockResponse = {
        headers: {
          set: jest.fn(),
        },
      } as any

      const invalidMetrics = [{
        startTime: 'invalid',
        endTime: 'invalid',
        processingTime: 'invalid',
        memoryUsage: 'invalid',
        cacheHit: 'invalid',
        compressionRatio: 'invalid',
        databaseQueries: 'invalid',
        cacheOperations: 'invalid',
      }] as any

      ;(enhancedAPI.getPerformanceMetrics as jest.Mock).mockReturnValue(invalidMetrics)

      expect(() => addPerformanceHeaders(mockResponse)).not.toThrow()
    })
  })
})
