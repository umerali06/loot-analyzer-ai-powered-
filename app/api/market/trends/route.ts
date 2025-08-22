import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware-simple'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils-enhanced'
import { scraperService } from '@/lib/scraper-service'

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    if (req.method === 'GET') {
      // Get real-time market trends based on scraper data
      const sourceMetrics = scraperService.getSourceMetrics()
      const performanceMetrics = scraperService.getPerformanceMetrics()
      
      // Calculate market trends from scraper data
      const trends = sourceMetrics.map(source => {
        const growthRate = source.itemsScraped > 0 
          ? ((source.newListings / source.itemsScraped) * 100)
          : 0
        
        return {
          id: source.id,
          trend: `${source.name} Market Activity`,
          direction: growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable',
          percentage: Math.abs(growthRate),
          timeframe: '7 days',
          confidence: Math.max(70, 100 - source.errorCount * 10)
        }
      })
      
      // Add overall market trend
      const totalItems = sourceMetrics.reduce((sum, s) => sum + s.itemsScraped, 0)
      const totalNew = sourceMetrics.reduce((sum, s) => sum + s.newListings, 0)
      const overallGrowth = totalItems > 0 ? (totalNew / totalItems) * 100 : 0
      
      trends.unshift({
        id: 'overall',
        trend: 'Overall Market Growth',
        direction: overallGrowth > 10 ? 'up' : overallGrowth < -10 ? 'down' : 'stable',
        percentage: Math.abs(overallGrowth),
        timeframe: '7 days',
        confidence: 85
      })
      
      const response = {
        trends,
        marketOverview: {
          totalSources: sourceMetrics.length,
          totalItems,
          totalNewListings: totalNew,
          overallGrowth,
          lastUpdated: performanceMetrics.lastUpdated
        }
      }
      
      return createSuccessResponse(response)
      
    } else if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200 })
    }

    return createErrorResponse('Method not allowed', 405)

  } catch (error) {
    console.error('Market trends API error:', error)
    return createErrorResponse('Internal server error', 500, error)
  }
}

export const GET = withAuth(handler)
export const OPTIONS = handler
