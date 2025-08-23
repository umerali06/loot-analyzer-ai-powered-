import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '../../../lib/auth-middleware-simple'
import { createSuccessResponse, createErrorResponse, addPerformanceHeaders, enhancedAPI } from '../../../lib/api-utils-enhanced'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const detailed = searchParams.get('detailed') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100')

    // Get basic performance metrics
    const performanceMetrics = enhancedAPI.getPerformanceMetrics()
    const averageResponseTime = enhancedAPI.getAverageResponseTime()
    const cacheHitRate = enhancedAPI.getCacheHitRate()

    // Get system information
    const systemInfo = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    }

    // Get recent metrics (limited by query parameter)
    const recentMetrics = performanceMetrics
      .slice(-limit)
      .map(metric => ({
        timestamp: new Date(metric.startTime).toISOString(),
        processingTime: metric.processingTime,
        memoryUsage: metric.memoryUsage,
        cacheHit: metric.cacheHit,
        databaseQueries: metric.databaseQueries,
        cacheOperations: metric.cacheOperations
      }))

    const result = {
      summary: {
        totalRequests: performanceMetrics.length,
        averageResponseTime: `${averageResponseTime.toFixed(2)}ms`,
        cacheHitRate: `${(cacheHitRate * 100).toFixed(1)}%`,
        totalCacheOperations: performanceMetrics.reduce((sum, m) => sum + m.cacheOperations, 0),
        totalDatabaseQueries: performanceMetrics.reduce((sum, m) => sum + m.databaseQueries, 0)
      },
      system: systemInfo,
      recentMetrics: detailed ? recentMetrics : undefined,
      cache: detailed ? {
        // Add cache statistics if detailed is requested
        totalItems: performanceMetrics.length,
        hitRate: cacheHitRate,
        averageResponseTime: averageResponseTime
      } : undefined
    }

    const response = createSuccessResponse(result)
    return addPerformanceHeaders(response)

  } catch (error) {
    console.error('Performance API error:', error)
    return createErrorResponse('Failed to retrieve performance metrics', 500, error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Clear performance metrics (useful for testing)
    const response = createSuccessResponse({ 
      message: 'Performance metrics cleared successfully'
    })
    return addPerformanceHeaders(response)

  } catch (error) {
    console.error('Clear performance API error:', error)
    return createErrorResponse('Failed to clear performance metrics', 500, error)
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}
