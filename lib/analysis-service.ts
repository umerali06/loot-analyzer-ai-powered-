import { AIVisionService } from './ai-vision'
import { EbayService } from './ebay-service'
import { Item, ItemAnalysis, LotAnalysis, AnalysisRequest, EbayData } from '@/types'
import { 
  calculatePriceStatistics as calculateStats, 
  filterOutliersSmart, 
  calculateMedian,
  getEmptyStatistics 
} from './stats'

// Statistical constants
const MIN_SAMPLE_SIZE = 3
const MAX_PRICE_VARIANCE = 0.8 // 80% variance threshold

// Price calculation weights
const WEIGHTS = {
  MEDIAN: 0.4,
  MEAN: 0.3,
  MODE: 0.2,
  RECENT: 0.1
}

interface PriceStatistics {
  min: number
  max: number
  mean: number
  median: number
  mode: number
  standardDeviation: number
  variance: number
  q1: number
  q3: number
  iqr: number
  outlierCount: number
  sampleSize: number
}

interface CalculationResult {
  marketValue: number
  confidence: number
  statistics: PriceStatistics
  methodology: string
}

export class AnalysisService {
  /**
   * Main method to analyze a lot of items from images
   */
  static async analyzeLot(request: AnalysisRequest): Promise<LotAnalysis> {
    const startTime = Date.now()

    try {
      // Step 1: AI Vision Analysis
      console.log('Starting AI vision analysis...')
      const items = await AIVisionService.analyzeMultipleImages(request.imageIds)

      if (items.length === 0) {
        throw new Error('No items identified in the uploaded images')
      }

      console.log(`Identified ${items.length} items:`, items.map(item => item.name))

      // Step 2: Analyze each item
      const itemAnalyses: ItemAnalysis[] = []
      let totalEstimatedValue = 0
      let totalMarketValue = 0

      for (const item of items) {
        try {
          console.log(`Analyzing item: ${item.name}`)
          const analysis = await this.analyzeItem(item, request.options)
          itemAnalyses.push(analysis)

          totalEstimatedValue += analysis.gptEstimate
          totalMarketValue += analysis.marketValue

        } catch (error) {
          console.error(`Failed to analyze item ${item.name}:`, error)
          // Continue with other items but add a minimal analysis
          itemAnalyses.push(this.createFallbackAnalysis(item))
        }
      }

      // Step 3: Create lot analysis result
      const processingTime = Date.now() - startTime
      const lotAnalysis: LotAnalysis = {
        id: `lot_${Date.now()}`,
        userId: request.userId || 'anonymous',
        createdAt: new Date(),
        images: request.imageIds,
        items: itemAnalyses,
        totalEstimatedValue: Math.round(totalEstimatedValue * 100) / 100,
        totalMarketValue: Math.round(totalMarketValue * 100) / 100,
        status: 'completed',
        processingTime
      }

      console.log('Lot analysis completed successfully:', {
        itemCount: itemAnalyses.length,
        totalEstimatedValue: lotAnalysis.totalEstimatedValue,
        totalMarketValue: lotAnalysis.totalMarketValue,
        processingTime
      })

      return lotAnalysis

    } catch (error) {
      console.error('Lot analysis failed:', error)
      throw new Error(`Lot analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Analyze a single item to get comprehensive data
   */
  private static async analyzeItem(
    item: Item,
    options?: AnalysisRequest['options']
  ): Promise<ItemAnalysis> {
    try {
      // Get eBay data with new structure
      const ebayService = new EbayService(process.env.SCRAPER_API_KEY || '')
      const ebayData = await ebayService.getItemEbayData(item.name)
      
      // Get GPT estimate if requested
      let gptEstimate = 0
      if (options?.includeGptEstimate !== false) {
        gptEstimate = await AIVisionService.getGptEstimate(item.name)
      }
      
      // Calculate price range from eBay data
      const priceRange = {
        min: ebayData.statistics.soldPrices.length > 0 ? Math.min(...ebayData.statistics.soldPrices) : 0,
        max: ebayData.statistics.soldPrices.length > 0 ? Math.max(...ebayData.statistics.soldPrices) : 0,
        median: ebayData.medianSoldPrice
      }
      
      const analysis: ItemAnalysis = {
        item,
        ebayData: [], // Keep for backward compatibility
        marketValue: ebayData.marketValue,
        gptEstimate: Math.round(gptEstimate * 100) / 100,
        activeListings: ebayData.activeCount,
        soldCount: ebayData.soldCount,
        priceRange
      }
      
      return analysis

    } catch (error) {
      console.error(`Failed to analyze item ${item.name}:`, error)
      return this.createFallbackAnalysis(item)
    }
  }

  /**
   * Advanced market value calculation using multiple statistical methods
   */
  private static calculateMarketValue(soldItems: EbayData[]): CalculationResult {
    if (soldItems.length === 0) {
      return {
        marketValue: 0,
        confidence: 0,
        statistics: getEmptyStatistics(),
        methodology: 'No data available'
      }
    }

    const prices = soldItems
      .map(item => item.soldPrice)
      .filter(price => price > 0)
      .sort((a, b) => a - b)

    if (prices.length === 0) {
      return {
        marketValue: 0,
        confidence: 0,
        statistics: getEmptyStatistics(),
        methodology: 'No valid prices found'
      }
    }

    const statistics = this.calculatePriceStatistics(prices)
    let marketValue: number
    let methodology: string
    let confidence: number

    if (prices.length < MIN_SAMPLE_SIZE) {
      // Small sample size - use simple average
      marketValue = statistics.mean
      methodology = 'Simple average (small sample)'
      confidence = Math.max(0.3, 0.8 - (MIN_SAMPLE_SIZE - prices.length) * 0.2)
    } else if (statistics.standardDeviation / statistics.mean > MAX_PRICE_VARIANCE) {
      // High variance - use median
      marketValue = statistics.median
      methodology = 'Median (high variance)'
      confidence = 0.7
    } else {
      // Normal case - use weighted combination
      marketValue = this.calculateWeightedMarketValue(statistics, soldItems)
      methodology = 'Weighted statistical combination'
      confidence = Math.min(0.95, 0.6 + (prices.length / 20) * 0.3)
    }

    return {
      marketValue: Math.round(marketValue * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      statistics,
      methodology
    }
  }

  /**
   * Calculate comprehensive price statistics using stats utility
   */
  private static calculatePriceStatistics(prices: number[]): PriceStatistics {
    return calculateStats(prices)
  }



  /**
   * Calculate weighted market value using multiple methods
   */
  private static calculateWeightedMarketValue(statistics: PriceStatistics, soldItems: EbayData[]): number {
    // Calculate recent price bias (more weight to recent sales)
    const recentPrices = soldItems
      .filter(item => {
        const saleDate = new Date(item.soldDate)
        const daysAgo = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24)
        return daysAgo <= 30 // Last 30 days
      })
      .map(item => item.soldPrice)

    const recentAverage = recentPrices.length > 0
      ? recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length
      : statistics.mean

    // Weighted combination
    const weightedValue = 
      statistics.median * WEIGHTS.MEDIAN +
      statistics.mean * WEIGHTS.MEAN +
      statistics.mode * WEIGHTS.MODE +
      recentAverage * WEIGHTS.RECENT

    return weightedValue
  }

  /**
   * Filter out price outliers using smart outlier detection
   */
  static filterPriceOutliers(items: EbayData[]): EbayData[] {
    if (items.length < MIN_SAMPLE_SIZE) return items

    const prices = items.map(item => item.soldPrice).filter(price => price > 0)
    if (prices.length === 0) return items

    // Use smart outlier filtering from stats utility
    const outlierResult = filterOutliersSmart(prices)
    
    // Map filtered prices back to items
    const filteredItems = items.filter(item => 
      outlierResult.filteredPrices.includes(item.soldPrice)
    )

    console.log(`Smart outlier filtering (${outlierResult.method}): ${items.length} → ${filteredItems.length} items (removed ${outlierResult.outliers.length} outliers)`)
    
    // Return original if we filtered out too many items
    return filteredItems.length >= Math.ceil(items.length * 0.5) ? filteredItems : items
  }

  /**
   * Get analysis summary statistics
   */
  static getAnalysisSummary(analysis: LotAnalysis) {
    const itemCount = analysis.items.length
    const highValueItems = analysis.items.filter(item => item.marketValue > 50)
    const lowValueItems = analysis.items.filter(item => item.marketValue < 10)
    const averageConfidence = analysis.items.reduce((sum, item) => sum + item.item.confidence, 0) / itemCount

    return {
      itemCount,
      highValueItems: highValueItems.length,
      lowValueItems: lowValueItems.length,
      averageItemValue: Math.round((analysis.totalMarketValue / itemCount) * 100) / 100,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      roiEstimate: analysis.totalEstimatedValue > 0
        ? Math.round(((analysis.totalMarketValue - analysis.totalEstimatedValue) / analysis.totalEstimatedValue * 100) * 100) / 100
        : 0,
      processingTime: analysis.processingTime
    }
  }

  /**
   * Export analysis to CSV format
   */
  static exportToCSV(analysis: LotAnalysis): string {
    const headers = [
      'Item Name', 
      'Confidence', 
      'Market Value', 
      'GPT Estimate', 
      'Active Listings', 
      'Sold Count', 
      'Min Price', 
      'Max Price', 
      'Median Price'
    ]
    
    const rows = analysis.items.map(item => [
      item.item.name,
      `${Math.round(item.item.confidence * 100)}%`,
      `$${item.marketValue}`,
      `$${item.gptEstimate}`,
      item.activeListings,
      item.soldCount,
      `$${item.priceRange.min}`,
      `$${item.priceRange.max}`,
      `$${item.priceRange.median}`
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    return csvContent
  }

  /**
   * Create a fallback analysis for failed items
   */
  private static createFallbackAnalysis(item: Item): ItemAnalysis {
    return {
      item,
      ebayData: [],
      marketValue: 25.0, // Conservative default
      gptEstimate: 25.0,
      activeListings: 0,
      soldCount: 0,
      priceRange: { min: 0, max: 0, median: 0 }
    }
  }



  /**
   * Validate calculation results
   */
  static validateCalculation(result: CalculationResult): boolean {
    return !isNaN(result.marketValue) && 
           result.marketValue >= 0 && 
           result.confidence >= 0 && 
           result.confidence <= 1
  }
}
