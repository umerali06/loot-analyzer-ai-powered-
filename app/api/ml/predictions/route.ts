import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware-simple'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils-enhanced'
import { analysisService } from '@/lib/database-service'
import { scraperService } from '@/lib/scraper-service'

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    if (req.method === 'GET') {
      const userId = req.headers.get('x-user-id')
      if (!userId) {
        return createErrorResponse('User authentication required', 401)
      }

      // Get recent analyses for the user to base predictions on
      const recentAnalyses = await analysisService.findByUserId(
        userId,
        { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' }
      )

      // Get current market data from scraper
      const scraperMetrics = scraperService.getPerformanceMetrics()
      const sourceMetrics = scraperService.getSourceMetrics()

      // Generate ML predictions based on historical data and market trends
      const predictions = []

      // Electronics category prediction
      const electronicsAnalyses = recentAnalyses.data.filter(analysis => 
        analysis.items?.some(item => item.category === 'Electronics')
      )
      const electronicsValue = electronicsAnalyses.reduce((sum, analysis) => 
        sum + (analysis.summary?.totalValue || 0), 0
      )
      const electronicsCount = electronicsAnalyses.length

      if (electronicsCount > 0) {
        const avgValue = electronicsValue / electronicsCount
        const marketGrowth = sourceMetrics.find(s => s.name === 'eBay')?.newListings || 0
        
        predictions.push({
          id: 1,
          category: 'Electronics',
          predictedDemand: avgValue > 100 ? 'Very High' : avgValue > 50 ? 'High' : 'Medium',
          priceTrend: marketGrowth > 10 ? 'Rapid Increase' : marketGrowth > 5 ? 'Increasing' : 'Stable',
          confidence: Math.min(95, 70 + (avgValue / 10) + (marketGrowth * 2)),
          nextWeekForecast: marketGrowth > 10 ? '+25%' : marketGrowth > 5 ? '+18%' : '+5%',
          riskLevel: marketGrowth > 15 ? 'Medium' : 'Low'
        })
      }

      // Furniture category prediction
      const furnitureAnalyses = recentAnalyses.data.filter(analysis => 
        analysis.items?.some(item => item.category === 'Furniture')
      )
      const furnitureValue = furnitureAnalyses.reduce((sum, analysis) => 
        sum + (analysis.summary?.totalValue || 0), 0
      )
      const furnitureCount = furnitureAnalyses.length

      if (furnitureCount > 0) {
        const avgValue = furnitureValue / furnitureCount
        const marketGrowth = sourceMetrics.find(s => s.name === 'Facebook Marketplace')?.newListings || 0
        
        predictions.push({
          id: 2,
          category: 'Furniture',
          predictedDemand: avgValue > 200 ? 'High' : avgValue > 100 ? 'Medium' : 'Low',
          priceTrend: marketGrowth > 8 ? 'Increasing' : marketGrowth > 3 ? 'Stable' : 'Decreasing',
          confidence: Math.min(90, 65 + (avgValue / 20) + (marketGrowth * 3)),
          nextWeekForecast: marketGrowth > 8 ? '+15%' : marketGrowth > 3 ? '+8%' : '+2%',
          riskLevel: marketGrowth > 12 ? 'Medium' : 'Low'
        })
      }

      // Collectibles category prediction
      const collectiblesAnalyses = recentAnalyses.data.filter(analysis => 
        analysis.items?.some(item => item.category === 'Collectibles')
      )
      const collectiblesValue = collectiblesAnalyses.reduce((sum, analysis) => 
        sum + (analysis.summary?.totalValue || 0), 0
      )
      const collectiblesCount = collectiblesAnalyses.length

      if (collectiblesCount > 0) {
        const avgValue = collectiblesValue / collectiblesCount
        const marketGrowth = sourceMetrics.find(s => s.name === 'eBay')?.newListings || 0
        
        predictions.push({
          id: 3,
          category: 'Collectibles',
          predictedDemand: avgValue > 150 ? 'Very High' : avgValue > 75 ? 'High' : 'Medium',
          priceTrend: marketGrowth > 12 ? 'Rapid Increase' : marketGrowth > 6 ? 'Increasing' : 'Stable',
          confidence: Math.min(92, 75 + (avgValue / 15) + (marketGrowth * 2.5)),
          nextWeekForecast: marketGrowth > 12 ? '+30%' : marketGrowth > 6 ? '+20%' : '+8%',
          riskLevel: marketGrowth > 18 ? 'Medium' : 'Low'
        })
      }

      // Add general market prediction based on scraper data
      const totalMarketGrowth = sourceMetrics.reduce((sum, s) => sum + s.newListings, 0)
      const overallMarketTrend = totalMarketGrowth > 20 ? 'Very High' : totalMarketGrowth > 10 ? 'High' : 'Medium'
      
      predictions.push({
        id: 4,
        category: 'Overall Market',
        predictedDemand: overallMarketTrend,
        priceTrend: totalMarketGrowth > 15 ? 'Rapid Increase' : totalMarketGrowth > 8 ? 'Increasing' : 'Stable',
        confidence: Math.min(88, 70 + (totalMarketGrowth * 2)),
        nextWeekForecast: totalMarketGrowth > 15 ? '+22%' : totalMarketGrowth > 8 ? '+12%' : '+5%',
        riskLevel: totalMarketGrowth > 25 ? 'Medium' : 'Low'
      })

      const response = {
        predictions,
        summary: {
          totalPredictions: predictions.length,
          averageConfidence: predictions.length > 0 
            ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length 
            : 0,
          marketTrend: overallMarketTrend,
          lastUpdated: new Date().toISOString()
        }
      }

      return createSuccessResponse(response)

    } else if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200 })
    }

    return createErrorResponse('Method not allowed', 405)

  } catch (error) {
    console.error('ML predictions API error:', error)
    return createErrorResponse('Internal server error', 500, error)
  }
}

export const GET = withAuth(handler)
export const OPTIONS = handler
