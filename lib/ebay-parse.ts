import * as cheerio from 'cheerio'

export interface EbayActiveResult {
  count: number
  prices: number[]
  medianPrice: number
  items: Array<{
    title: string
    price: number
    shipping: number
    location: string
    condition: string
  }>
}

export interface EbaySoldResult {
  count: number
  prices: number[]
  medianPrice: number
  dates: string[]
  items: Array<{
    title: string
    price: number
    shipping: number
    location: string
    soldDate: string
    condition: string
  }>
}

export interface EbayParseOptions {
  soldWindowDays?: number
  minPrice?: number
  maxPrice?: number
}

/**
 * Parse eBay active listings page HTML using Cheerio
 * Replaces fragile regex with robust DOM parsing
 */
export function parseActiveListings(html: string, options: EbayParseOptions = {}): EbayActiveResult {
  const $ = cheerio.load(html)
  
  // Get official result count from eBay's dedicated element
  const resultCountText = $('.srp-controls__count-heading .BOLD').text().trim()
  const officialCount = extractNumberFromText(resultCountText) || 0
  
  const items: Array<{
    title: string
    price: number
    shipping: number
    location: string
    condition: string
  }> = []
  
  // Parse each listing card
  $('.s-item').each((index, element) => {
    const $item = $(element)
    
    // Skip sponsored items and non-product cards
    if ($item.hasClass('s-item--ad') || $item.hasClass('s-item--featured')) {
      return
    }
    
    const title = $item.find('.s-item__title').text().trim()
    if (!title || title === 'Shop on eBay') {
      return
    }
    
    // Extract price (handle both auction and buy-it-now)
    const priceText = $item.find('.s-item__price').text().trim()
    const price = extractPrice(priceText)
    
    // Extract shipping cost
    const shippingText = $item.find('.s-item__shipping').text().trim()
    const shipping = extractShipping(shippingText)
    
    // Extract location
    const location = $item.find('.s-item__location').text().trim() || 'Unknown'
    
    // Extract condition
    const condition = $item.find('.s-item__condition').text().trim() || 'Unknown'
    
    // Apply price filters if specified
    if (options.minPrice && price < options.minPrice) return
    if (options.maxPrice && price > options.maxPrice) return
    
    items.push({
      title,
      price,
      shipping,
      location,
      condition
    })
  })
  
  const prices = items.map(item => item.price).filter(price => price > 0)
  const medianPrice = calculateMedian(prices)
  
  return {
    count: items.length,
    prices,
    medianPrice,
    items
  }
}

/**
 * Parse eBay sold listings page HTML using Cheerio
 * Includes real date parsing and filtering by time window
 */
export function parseSoldListings(html: string, options: EbayParseOptions = {}): EbaySoldResult {
  const $ = cheerio.load(html)
  
  // Get official sold count from eBay's dedicated element
  const soldCountText = $('.srp-controls__count-heading .BOLD').text().trim()
  const officialCount = extractNumberFromText(soldCountText) || 0
  
  const items: Array<{
    title: string
    price: number
    shipping: number
    location: string
    soldDate: string
    condition: string
  }> = []
  
  const soldWindowDays = options.soldWindowDays || 30
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - soldWindowDays)
  
  // Parse each sold listing card
  $('.s-item').each((index, element) => {
    const $item = $(element)
    
    // Skip sponsored items and non-product cards
    if ($item.hasClass('s-item--ad') || $item.hasClass('s-item--featured')) {
      return
    }
    
    const title = $item.find('.s-item__title').text().trim()
    if (!title || title === 'Shop on eBay') {
      return
    }
    
    // Extract sold price
    const priceText = $item.find('.s-item__price').text().trim()
    const price = extractPrice(priceText)
    
    // Extract shipping cost
    const shippingText = $item.find('.s-item__shipping').text().trim()
    const shipping = extractShipping(shippingText)
    
    // Extract location
    const location = $item.find('.s-item__location').text().trim() || 'Unknown'
    
    // Extract sold date - this is critical for filtering
    const soldDateText = $item.find('.s-item__title--tagblock .POSITIVE').text().trim()
    const soldDate = parseSoldDate(soldDateText)
    
    // Extract condition
    const condition = $item.find('.s-item__condition').text().trim() || 'Unknown'
    
    // Apply price filters if specified
    if (options.minPrice && price < options.minPrice) return
    if (options.maxPrice && price > options.maxPrice) return
    
    // Apply date filter for recent sales
    if (soldDate && soldDate < cutoffDate) return
    
    items.push({
      title,
      price,
      shipping,
      location,
      soldDate: soldDate ? soldDate.toISOString() : 'Unknown',
      condition
    })
  })
  
  const prices = items.map(item => item.price).filter(price => price > 0)
  const medianPrice = calculateMedian(prices)
  const dates = items.map(item => item.soldDate).filter(date => date !== 'Unknown')
  
  return {
    count: items.length,
    prices,
    medianPrice,
    dates,
    items
  }
}

/**
 * Extract numeric value from text (e.g., "1,234 results" -> 1234)
 */
function extractNumberFromText(text: string): number | null {
  const match = text.match(/(\d{1,3}(?:,\d{3})*)/)
  if (match) {
    return parseInt(match[1].replace(/,/g, ''), 10)
  }
  return null
}

/**
 * Extract price from eBay price text (e.g., "$12.99 to $15.99" -> 12.99)
 */
function extractPrice(priceText: string): number {
  if (!priceText) return 0
  
  // Handle range prices (e.g., "$12.99 to $15.99")
  const rangeMatch = priceText.match(/\$?(\d+(?:\.\d{2})?)/)
  if (rangeMatch) {
    return parseFloat(rangeMatch[1])
  }
  
  // Handle single prices
  const singleMatch = priceText.match(/\$?(\d+(?:\.\d{2})?)/)
  if (singleMatch) {
    return parseFloat(singleMatch[1])
  }
  
  return 0
}

/**
 * Extract shipping cost from shipping text
 */
function extractShipping(shippingText: string): number {
  if (!shippingText) return 0
  
  if (shippingText.toLowerCase().includes('free')) {
    return 0
  }
  
  const match = shippingText.match(/\$?(\d+(?:\.\d{2})?)/)
  if (match) {
    return parseFloat(match[1])
  }
  
  return 0
}

/**
 * Parse sold date from eBay's date text
 * Handles various formats: "Sold 3 days ago", "Sold Aug 15", "Sold 2023-08-15"
 */
function parseSoldDate(dateText: string): Date | null {
  if (!dateText) return null
  
  const now = new Date()
  
  // Handle "Sold X days ago"
  const daysAgoMatch = dateText.match(/Sold (\d+) days? ago/)
  if (daysAgoMatch) {
    const daysAgo = parseInt(daysAgoMatch[1], 10)
    const soldDate = new Date()
    soldDate.setDate(soldDate.getDate() - daysAgo)
    return soldDate
  }
  
  // Handle "Sold X hours ago"
  const hoursAgoMatch = dateText.match(/Sold (\d+) hours? ago/)
  if (hoursAgoMatch) {
    const hoursAgo = parseInt(hoursAgoMatch[1], 10)
    const soldDate = new Date()
    soldDate.setHours(soldDate.getHours() - hoursAgo)
    return soldDate
  }
  
  // Handle "Sold Aug 15" (current year)
  const monthDayMatch = dateText.match(/Sold (\w{3}) (\d{1,2})/)
  if (monthDayMatch) {
    const month = monthDayMatch[1]
    const day = parseInt(monthDayMatch[2], 10)
    const monthIndex = getMonthIndex(month)
    if (monthIndex !== -1) {
      const soldDate = new Date(now.getFullYear(), monthIndex, day)
      // If the date is in the future, it's from last year
      if (soldDate > now) {
        soldDate.setFullYear(soldDate.getFullYear() - 1)
      }
      return soldDate
    }
  }
  
  // Handle "Sold 2023-08-15" format
  const fullDateMatch = dateText.match(/Sold (\d{4})-(\d{1,2})-(\d{1,2})/)
  if (fullDateMatch) {
    const year = parseInt(fullDateMatch[1], 10)
    const month = parseInt(fullDateMatch[2], 10) - 1
    const day = parseInt(fullDateMatch[3], 10)
    return new Date(year, month, day)
  }
  
  return null
}

/**
 * Get month index from month abbreviation
 */
function getMonthIndex(month: string): number {
  const months = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ]
  const monthLower = month.toLowerCase()
  return months.findIndex(m => monthLower.startsWith(m))
}

/**
 * Calculate median from array of numbers
 */
function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0
  
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  } else {
    return sorted[mid]
  }
}

/**
 * Validate parsed results for data quality
 */
export function validateParsedResults(result: EbayActiveResult | EbaySoldResult): {
  isValid: boolean
  issues: string[]
} {
  const issues: string[] = []
  
  if (result.count === 0) {
    issues.push('No items found')
  }
  
  if (result.prices.length === 0) {
    issues.push('No valid prices found')
  }
  
  if (result.prices.some(price => price <= 0)) {
    issues.push('Some prices are invalid (≤ 0)')
  }
  
  if (result.prices.some(price => price > 100000)) {
    issues.push('Some prices seem unreasonably high (> $100,000)')
  }
  
  if ('dates' in result && result.dates.length === 0) {
    issues.push('No valid dates found for sold items')
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}
