import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware-simple'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils-enhanced'
import { scraperService } from '@/lib/scraper-service'

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    if (req.method === 'GET') {
      // Get real-time scraper statistics
      const stats = scraperService.getStats()
      const sourceMetrics = scraperService.getSourceMetrics()
      const performanceMetrics = scraperService.getPerformanceMetrics()
      
      const response = {
        stats,
        sourceMetrics,
        performanceMetrics,
        timestamp: new Date().toISOString()
      }
      
      return createSuccessResponse(response)
      
    } else if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200 })
    }

    return createErrorResponse('Method not allowed', 405)

  } catch (error) {
    console.error('Scraper stats API error:', error)
    return createErrorResponse('Internal server error', 500, error)
  }
}

export const GET = withAuth(handler)
export const OPTIONS = handler
