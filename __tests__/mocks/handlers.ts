import { http, HttpResponse } from 'msw'

// Mock API handlers for testing
export const handlers = [
  // Authentication endpoints
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      success: true,
      user: {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
      },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    })
  }),

  http.post('/api/auth/register', () => {
    return HttpResponse.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
      },
    })
  }),

  http.post('/api/auth/refresh', () => {
    return HttpResponse.json({
      success: true,
      accessToken: 'new-mock-access-token',
    })
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
  }),

  // Image upload endpoint
  http.post('/api/upload', () => {
    return HttpResponse.json({
      success: true,
      images: [
        {
          id: 'img-123',
          filename: 'test-image.jpg',
          size: 1024 * 1024,
          type: 'image/jpeg',
          url: 'https://example.com/test-image.jpg',
          optimizedSize: 512 * 1024,
          format: 'webp',
          dimensions: { width: 800, height: 600 },
        },
      ],
      totalProcessed: 1,
      timestamp: new Date().toISOString(),
    })
  }),

  // Analysis endpoint
  http.post('/api/analyze', () => {
    return HttpResponse.json({
      success: true,
      analysisId: 'analysis-123',
      results: [
        {
          imageId: 'img-123',
          filename: 'test-image.jpg',
          items: [
            {
              id: 'item-1',
              name: 'Test Item',
              description: 'A test item for analysis',
              category: 'Electronics',
              condition: 'Good',
              estimatedValue: {
                min: 50,
                max: 100,
                median: 75,
                mean: 75,
                currency: 'USD',
              },
              confidence: 0.85,
            },
          ],
          processingTime: 1500,
        },
      ],
      summary: {
        totalImages: 1,
        totalItems: 1,
        totalValue: {
          min: 50,
          max: 100,
          median: 75,
          mean: 75,
          currency: 'USD',
        },
        averageConfidence: 0.85,
        processingTime: 1500,
      },
    })
  }),

  // Performance monitoring endpoints
  http.get('/api/performance', () => {
    return HttpResponse.json({
      success: true,
      summary: {
        totalRequests: 100,
        averageResponseTime: '150ms',
        cacheHitRate: '75%',
        totalCacheOperations: 150,
        totalDatabaseQueries: 50,
      },
      system: {
        timestamp: new Date().toISOString(),
        uptime: 3600,
        memory: {
          heapUsed: 50 * 1024 * 1024,
          heapTotal: 100 * 1024 * 1024,
          external: 10 * 1024 * 1024,
          rss: 80 * 1024 * 1024,
        },
        cpu: {
          user: 1000000,
          system: 500000,
        },
        platform: 'development',
        nodeVersion: '18.0.0',
        environment: 'development',
      },
    })
  }),

  http.get('/api/database-maintenance', () => {
    return HttpResponse.json({
      success: true,
      status: {
        isRunning: false,
        lastRun: new Date().toISOString(),
        nextScheduledRun: new Date(Date.now() + 3600000).toISOString(),
        totalTasksCompleted: 25,
        lastError: null,
      },
      scheduledTasks: [
        {
          name: 'Index Optimization',
          schedule: '0 2 * * *',
          lastRun: new Date().toISOString(),
          nextRun: new Date(Date.now() + 3600000).toISOString(),
          status: 'scheduled',
        },
      ],
    })
  }),

  // Analysis history endpoint
  http.get('/api/analysis-history', () => {
    return HttpResponse.json({
      success: true,
      analyses: [
        {
          id: 'analysis-123',
          userId: 'user-123',
          analysisId: 'analysis-123',
          status: 'completed',
          createdAt: new Date().toISOString(),
          summary: {
            totalImages: 1,
            totalItems: 1,
            totalValue: {
              min: 50,
              max: 100,
              median: 75,
              mean: 75,
              currency: 'USD',
            },
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    })
  }),

  // Health check endpoint
  http.get('/api/health', () => {
    return HttpResponse.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: 'development',
      uptime: 3600,
      memory: {
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 80 * 1024 * 1024,
      },
      checks: {
        database: 'healthy',
        cache: 'healthy',
        imageProcessing: 'healthy',
      },
    })
  }),
]
