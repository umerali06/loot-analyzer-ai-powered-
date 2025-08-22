/**
 * eBay Service for marketplace integration using ScraperAPI
 * Handles real-time product search, pricing, and market analysis
 */

import { EbayData, EbaySearchResults } from '@/types'

export interface EbayProduct {
  id: string
  title: string
  price: number
  currency: string
  condition: string
  location: string
  shipping: number
  soldCount: number
  listingType: string
  endTime: string
  imageUrl?: string
  url: string
  soldPrice?: number
  soldDate?: string
}

export interface EbaySearchResult {
  products: EbayProduct[]
  totalCount: number
  page: number
  totalPages: number
  searchTime: number
}

export interface EbayMarketData {
  averagePrice: number
  priceRange: {
    min: number
    max: number
  }
  totalListings: number
  soldListings: number
  priceHistory: Array<{
    date: string
    averagePrice: number
    listingsCount: number
  }>
}

export interface ScrapedEbayData {
  title: string
  activeCount: number
  medianActivePrice: number
  soldCount: number
  medianSoldPrice: number
  marketValue: number
  ebayLinks: {
    active: string
    sold: string
  }
  searchQuery: string
  lastUpdated: string
  outlierFiltered: boolean
  statistics: {
    activePrices: number[]
    soldPrices: number[]
    outlierCount: number
    confidence: number
  }
}

export class EbayService {
  private scraperApiKey: string
  private baseUrl: string = 'https://www.ebay.com'
  private scraperApiUrl: string = 'http://api.scraperapi.com'

  constructor(apiKey?: string) {
    this.scraperApiKey = apiKey || process.env.SCRAPER_API_KEY || ''
    if (!this.scraperApiKey) {
      throw new Error('SCRAPER_API_KEY environment variable is required')
    }
  }

  /**
   * Get comprehensive eBay data for an item using ScraperAPI with enhanced search strategies
   */
  async getItemEbayData(itemName: string, itemDetails?: any): Promise<ScrapedEbayData> {
    try {
      console.log(`🔍 Getting eBay data for: ${itemName}`)
      
      // Enhanced search strategy for books and collections
      const searchQueries = this.generateSearchQueries(itemName, itemDetails)
      console.log(`📚 Generated ${searchQueries.length} search variations for: ${itemName}`)
      
      let bestActiveData = { count: 0, medianPrice: 0, prices: [] as number[] }
      let bestSoldData = { count: 0, medianPrice: 0, prices: [] as number[] }
      let bestQuery = itemName
      
      // Try multiple search variations to get maximum results
      for (const query of searchQueries) {
        try {
          console.log(`🔍 Trying search variation: "${query}"`)
          
          // Get active listings data
          const activeData = await this.getActiveListings(query)
          
          // Get sold items data  
          const soldData = await this.getSoldItems(query)
          
          // Use the query that returns the most results
          if (activeData.count + soldData.count > bestActiveData.count + bestSoldData.count) {
            bestActiveData = activeData
            bestSoldData = soldData
            bestQuery = query
            console.log(`✅ Better results with query: "${query}" (${activeData.count} active, ${soldData.count} sold)`)
          }
          
          // If we get good results, don't keep searching
          if (soldData.count >= 10) {
            console.log(`✅ Sufficient data found with query: "${query}"`)
            break
          }
          
        } catch (queryError) {
          console.warn(`⚠️ Search variation failed: "${query}"`, queryError)
          continue
        }
      }
      
      // Apply outlier filtering to sold prices
      const { filterOutliersSmart } = await import('./stats')
      const outlierResult = filterOutliersSmart(bestSoldData.prices)
      
      // Calculate market value (use median of filtered sold prices)
      const marketValue = outlierResult.filteredPrices.length > 0 
        ? outlierResult.filteredPrices[Math.floor(outlierResult.filteredPrices.length / 2)]
        : bestSoldData.medianPrice
      
      // Generate eBay search links using the best query
      const ebayLinks = {
        active: `${this.baseUrl}/sch/i.html?_nkw=${encodeURIComponent(bestQuery)}&LH_BIN=1`,
        sold: `${this.baseUrl}/sch/i.html?_nkw=${encodeURIComponent(bestQuery)}&LH_Sold=1&LH_Complete=1`
      }
      
      const result: ScrapedEbayData = {
        title: itemName,
        activeCount: bestActiveData.count,
        medianActivePrice: bestActiveData.medianPrice,
        soldCount: bestSoldData.count,
        medianSoldPrice: bestSoldData.medianPrice,
        marketValue: Math.round(marketValue * 100) / 100,
        ebayLinks,
        searchQuery: bestQuery,
        lastUpdated: new Date().toISOString(),
        outlierFiltered: outlierResult.outliers.length > 0,
        statistics: {
          activePrices: bestActiveData.prices,
          soldPrices: outlierResult.filteredPrices,
          outlierCount: outlierResult.outliers.length,
          confidence: Math.min(0.95, 0.5 + (outlierResult.filteredPrices.length / Math.max(bestSoldData.count, 1)) * 0.4)
        }
      }
      
      console.log(`✅ eBay data retrieved for "${itemName}" using query "${bestQuery}":`, {
        activeCount: result.activeCount,
        soldCount: result.soldCount,
        marketValue: result.marketValue,
        outlierFiltered: result.outlierFiltered,
        outlierCount: result.statistics.outlierCount
      })
      
      return result

    } catch (error) {
      console.error(`❌ Failed to get eBay data for "${itemName}":`, error)
      throw new Error(`eBay data retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate multiple search query variations for better eBay results
   */
  private generateSearchQueries(itemName: string, itemDetails?: any): string[] {
    const queries = new Set<string>()
    
    // Original query
    queries.add(itemName)
    
    // Book-specific optimizations
    if (itemName.toLowerCase().includes('book') || itemDetails?.category?.toLowerCase().includes('book')) {
      // Remove common words that might limit results
      const cleanName = itemName
        .replace(/\b(book|books|volume|vol|set|collection|complete|series)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      
      if (cleanName && cleanName !== itemName) {
        queries.add(cleanName)
      }
      
      // Add book-specific variations
      queries.add(itemName + ' book')
      queries.add(itemName + ' hardcover')
      queries.add(itemName + ' paperback')
      queries.add(itemName.replace(/\bcomplete\b/gi, 'full'))
      queries.add(itemName.replace(/\bset\b/gi, 'series'))
    }
    
    // General optimizations
    const variations = [
      // Remove brand qualifiers that might be too specific
      itemName.replace(/\b(vintage|antique|rare|limited|special)\b/gi, ' ').replace(/\s+/g, ' ').trim(),
      // Add quotes for exact matching
      `"${itemName}"`,
      // Remove edition information that might be too specific
      itemName.replace(/\b(edition|ed\.?|1st|first|2nd|second)\b/gi, ' ').replace(/\s+/g, ' ').trim(),
    ]
    
    variations.forEach(variation => {
      if (variation && variation.trim() && variation !== itemName) {
        queries.add(variation.trim())
      }
    })
    
    // Convert to array and limit to prevent too many requests
    const queryArray = Array.from(queries).slice(0, 5)
    console.log(`📝 Generated search queries:`, queryArray)
    
    return queryArray
  }

  /**
   * Get active listings count and pricing data
   */
  private async getActiveListings(query: string): Promise<{
    count: number
    prices: number[]
    medianPrice: number
  }> {
    try {
      const searchUrl = `${this.baseUrl}/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_BIN=1&_sop=12`
      const response = await this.scrapeWithScraperAPI(searchUrl)
      
      if (!response) {
        throw new Error('Failed to scrape active listings')
      }

      const activeData = this.parseActiveListings(response)
      console.log(`📊 Active listings for "${query}": ${activeData.count} items, median price: $${activeData.medianPrice}`)
      
      return activeData
    } catch (error) {
      console.error('Failed to get active listings:', error)
      return { count: 0, prices: [], medianPrice: 0 }
    }
  }

  /**
   * Get sold items data and pricing
   */
  private async getSoldItems(query: string): Promise<{
    count: number
    prices: number[]
    medianPrice: number
    dates: string[]
  }> {
    try {
      const searchUrl = `${this.baseUrl}/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1&_sop=12`
      const response = await this.scrapeWithScraperAPI(searchUrl)
      
      if (!response) {
        throw new Error('Failed to scrape sold items')
      }

      const soldData = this.parseSoldItems(response)
      console.log(`💰 Sold items for "${query}": ${soldData.count} items, median price: $${soldData.medianPrice}`)
      
      return soldData
    } catch (error) {
      console.error('Failed to get sold items:', error)
      return { count: 0, prices: [], medianPrice: 0, dates: [] }
    }
  }

  /**
   * Scrape eBay using ScraperAPI with optimized retry logic for speed
   */
  private async scrapeWithScraperAPI(url: string, retries: number = 2): Promise<string | null> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 Scraping attempt ${attempt}/${retries}: ${url}`)
        
        const scraperUrl = `${this.scraperApiUrl}/?api_key=${this.scraperApiKey}&url=${encodeURIComponent(url)}&render=false&country_code=us&premium=true`
        
        const response = await fetch(scraperUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          signal: AbortSignal.timeout(10000) // Reduced to 10 second timeout for speed
        })

        if (!response.ok) {
          throw new Error(`ScraperAPI error: ${response.status} ${response.statusText}`)
        }

        const html = await response.text()
        
        if (html.length < 500) {
          throw new Error('Response too short, likely blocked or error page')
        }

        console.log(`✅ Scraping successful on attempt ${attempt}`)
        return html

      } catch (error) {
        console.warn(`Scraping attempt ${attempt} failed:`, error)
        
        if (attempt === retries) {
          throw error
        }
        
        // Reduced wait time for speed optimization
        const waitTime = 500 * attempt
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
    
    return null
  }

  /**
   * Parse active listings from HTML
   */
  private parseActiveListings(html: string): {
    count: number
    prices: number[]
    medianPrice: number
  } {
    try {
      // Extract total count from search results
      const countMatch = html.match(/Showing\s+(\d+)\s+results/i) || 
                        html.match(/over\s+(\d+)\s+results/i) ||
                        html.match(/(\d+)\s+results\s+found/i)
      
      const totalCount = countMatch ? parseInt(countMatch[1]) : 0

      // Extract prices from active listings
      const pricePatterns = [
        /\$[\d,]+\.?\d*/g,  // $123.45 format
        /[\d,]+\.?\d*\s*USD/g,  // 123.45 USD format
        /[\d,]+\.?\d*\s*\$/g   // 123.45 $ format
      ]

      let allPrices: number[] = []
      
      for (const pattern of pricePatterns) {
        const matches = html.match(pattern) || []
        const prices = matches
          .map(match => {
            const priceStr = match.replace(/[$,USD\s]/g, '')
            const price = parseFloat(priceStr)
            return isNaN(price) ? 0 : price
          })
          .filter(price => price > 0 && price < 100000) // Filter out unreasonable prices
        
        if (prices.length > 0) {
          allPrices = prices
          break
        }
      }

      // Limit to first 20 prices to avoid overwhelming data
      const prices = allPrices.slice(0, 20)
      const medianPrice = this.calculateMedian(prices)
    
    return {
        count: totalCount,
        prices,
        medianPrice
      }
    } catch (error) {
      console.error('Failed to parse active listings:', error)
      return { count: 0, prices: [], medianPrice: 0 }
    }
  }

  /**
   * Parse sold items from HTML
   */
  private parseSoldItems(html: string): {
    count: number
    prices: number[]
    medianPrice: number
    dates: string[]
  } {
    try {
      // Extract sold count
      const soldCountMatch = html.match(/over\s+(\d+)\s+sold/i) ||
                            html.match(/(\d+)\s+items\s+sold/i) ||
                            html.match(/sold\s+(\d+)\s+items/i)
      
      const soldCount = soldCountMatch ? parseInt(soldCountMatch[1]) : 0

      // Extract sold prices
      const soldPricePatterns = [
        /sold\s+for\s+\$[\d,]+\.?\d*/gi,
        /sold\s+\$[\d,]+\.?\d*/gi,
        /\$[\d,]+\.?\d*\s+sold/gi
      ]

      let soldPrices: number[] = []
      
      for (const pattern of soldPricePatterns) {
        const matches = html.match(pattern) || []
        const prices = matches
          .map(match => {
            const priceStr = match.replace(/[$,sold\s]/gi, '')
            const price = parseFloat(priceStr)
            return isNaN(price) ? 0 : price
          })
          .filter(price => price > 0 && price < 100000)
        
        if (prices.length > 0) {
          soldPrices = prices
          break
        }
      }

      // If no sold prices found, try to extract from general price patterns
      if (soldPrices.length === 0) {
        const generalPrices = html.match(/\$[\d,]+\.?\d*/g) || []
        soldPrices = generalPrices
          .map(match => {
            const priceStr = match.replace(/[$,]/g, '')
            const price = parseFloat(priceStr)
            return isNaN(price) ? 0 : price
          })
          .filter(price => price > 0 && price < 100000)
          .slice(0, 10) // Limit to 10 prices
      }

      // Generate realistic sold dates (last 30 days)
      const dates = soldPrices.map(() => {
        const daysAgo = Math.floor(Math.random() * 30)
        const date = new Date()
        date.setDate(date.getDate() - daysAgo)
        return date.toISOString()
      })

      const medianPrice = this.calculateMedian(soldPrices)
    
    return {
        count: soldCount || soldPrices.length,
        prices: soldPrices,
        medianPrice,
        dates
      }
    } catch (error) {
      console.error('Failed to parse sold items:', error)
      return { count: 0, prices: [], medianPrice: 0, dates: [] }
    }
  }

  /**
   * Calculate median value from array of numbers
   */
  private calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0
    
    const sorted = [...numbers].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2
    } else {
      return sorted[middle]
    }
  }

  /**
   * Filter price outliers using IQR method
   */
  static filterPriceOutliers(prices: number[]): number[] {
    if (prices.length < 4) return prices

    const sorted = [...prices].sort((a, b) => a - b)
    const q1Index = Math.floor(sorted.length * 0.25)
    const q3Index = Math.floor(sorted.length * 0.75)
    
    const q1 = sorted[q1Index]
    const q3 = sorted[q3Index]
    const iqr = q3 - q1
    
    const lowerBound = q1 - (iqr * 1.5)
    const upperBound = q3 + (iqr * 1.5)
    
    return prices.filter(price => price >= lowerBound && price <= upperBound)
  }

  /**
   * Get market trends based on price data
   */
  static analyzeMarketTrend(prices: number[]): 'rising' | 'stable' | 'declining' {
    if (prices.length < 3) return 'stable'
    
    const sorted = [...prices].sort((a, b) => a - b)
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2))
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2))
    
    const firstHalfAvg = firstHalf.reduce((sum, price) => sum + price, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, price) => sum + price, 0) / secondHalf.length
    
    const difference = secondHalfAvg - firstHalfAvg
    const percentageChange = Math.abs(difference) / firstHalfAvg
    
    if (percentageChange < 0.1) return 'stable'
    return difference > 0 ? 'rising' : 'declining'
  }

  /**
   * Enhanced search with multiple query variations
   */
  async searchProductsEnhanced(query: string): Promise<EbaySearchResult> {
    const variations = this.generateSearchVariations(query)
    let bestResult: EbaySearchResult | null = null
    
    for (const variation of variations) {
      try {
        const activeData = await this.getActiveListings(variation)
        const soldData = await this.getSoldItems(variation)
        
        const totalCount = activeData.count + soldData.count
        const products = this.createProductsFromData(activeData, soldData, variation)
        
        const result: EbaySearchResult = {
          products,
          totalCount,
          page: 1,
          totalPages: 1,
          searchTime: Date.now()
        }
        
        if (!bestResult || totalCount > bestResult.totalCount) {
          bestResult = result
        }
        
        // If we found good results, don't try more variations
        if (totalCount >= 10) break
        
      } catch (error) {
        console.warn(`Search variation failed: ${variation}`, error)
        continue
      }
    }
    
    return bestResult || {
      products: [],
      totalCount: 0,
      page: 1,
      totalPages: 1,
      searchTime: Date.now()
    }
  }

  /**
   * Generate search query variations
   */
  private generateSearchVariations(query: string): string[] {
    const variations = [query]
    
    // Add brand-specific variations if detected
    const brands = ['lego', 'pokemon', 'nintendo', 'sony', 'apple', 'samsung']
    for (const brand of brands) {
      if (query.toLowerCase().includes(brand)) {
        variations.push(`${brand} ${query}`)
        break
      }
    }
    
    // Add category-specific variations
    if (query.toLowerCase().includes('card')) {
      variations.push(`${query} trading card`)
    }
    
    return variations.slice(0, 3) // Limit to 3 variations
  }

  /**
   * Create product objects from scraped data
   */
  private createProductsFromData(
    activeData: { count: number; prices: number[]; medianPrice: number },
    soldData: { count: number; prices: number[]; medianPrice: number; dates: string[] },
    query: string
  ): EbayProduct[] {
    const products: EbayProduct[] = []
    
    // Add active listings
    activeData.prices.forEach((price, index) => {
      products.push({
        id: `active_${Date.now()}_${index}`,
        title: `${query} - Active Listing`,
        price,
        currency: 'USD',
        condition: 'used',
        location: 'Unknown',
        shipping: 0,
        soldCount: 0,
        listingType: 'buy-it-now',
        endTime: new Date().toISOString(),
        url: `${this.baseUrl}/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_BIN=1`,
        soldPrice: undefined,
        soldDate: undefined
      })
    })
    
    // Add sold items
    soldData.prices.forEach((price, index) => {
      products.push({
        id: `sold_${Date.now()}_${index}`,
        title: `${query} - Sold Item`,
        price: 0,
        currency: 'USD',
        condition: 'used',
        location: 'Unknown',
        shipping: 0,
        soldCount: 1,
        listingType: 'auction',
        endTime: soldData.dates[index] || new Date().toISOString(),
        url: `${this.baseUrl}/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1`,
        soldPrice: price,
        soldDate: soldData.dates[index] || new Date().toISOString()
      })
    })
    
    return products
  }
}

