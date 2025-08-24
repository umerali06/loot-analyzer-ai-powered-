/**
 * Enhanced Statistics Library for Lot Analyzer
 * Provides robust outlier detection, confidence scoring, and statistical analysis
 * Replaces basic IQR with advanced MAD + IQR hybrid approach
 */

export interface OutlierResult {
  filteredPrices: number[]
  outliers: number[]
  method: string
  confidence: number
  statistics: {
    originalCount: number
    filteredCount: number
    outlierCount: number
    variance: number
    standardDeviation: number
    coefficientOfVariation: number
    mad: number
    iqr: number
  }
}

export interface ConfidenceFactors {
  sampleSize: number
  recentCoverage: number
  priceStability: number
  dataQuality: number
  overall: number
}

/**
 * Enhanced outlier filtering with multiple methods
 * Uses MAD for high-variance data, IQR for normal data, trimmed mean as fallback
 */
export function filterOutliersSmart(prices: number[], options: {
  method?: 'auto' | 'mad' | 'iqr' | 'trimmed'
  confidenceThreshold?: number
  minSampleSize?: number
} = {}): OutlierResult {
  const {
    method = 'auto',
    confidenceThreshold = 0.3,
    minSampleSize = 4
  } = options

  if (prices.length < minSampleSize) {
    return {
      filteredPrices: prices,
      outliers: [],
      method: 'insufficient_data',
      confidence: 0.1,
      statistics: {
        originalCount: prices.length,
        filteredCount: prices.length,
        outlierCount: 0,
        variance: 0,
        standardDeviation: 0,
        coefficientOfVariation: 0,
        mad: 0,
        iqr: 0
      }
    }
  }

  // Calculate basic statistics
  const sorted = [...prices].sort((a, b) => a - b)
  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length
  const standardDeviation = Math.sqrt(variance)
  const coefficientOfVariation = standardDeviation / mean

  // Calculate MAD (Median Absolute Deviation)
  const median = calculateMedian(prices)
  const mad = calculateMAD(prices, median)

  // Calculate IQR
  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const iqr = q3 - q1

  // Determine best method automatically
  let selectedMethod = method
  if (method === 'auto') {
    if (prices.length >= 8 && coefficientOfVariation > 0.8) {
      selectedMethod = 'mad' // High variance, use MAD
    } else if (prices.length >= 6) {
      selectedMethod = 'iqr' // Normal variance, use IQR
    } else {
      selectedMethod = 'trimmed' // Small sample, use trimmed mean
    }
  }

  // Apply selected outlier filtering method
  let filteredPrices: number[]
  let outliers: number[]

  switch (selectedMethod) {
    case 'mad':
      const madResult = filterOutliersMAD(prices, median, mad)
      filteredPrices = madResult.filtered
      outliers = madResult.outliers
      break

    case 'iqr':
      const iqrResult = filterOutliersIQR(prices, q1, q3, iqr)
      filteredPrices = iqrResult.filtered
      outliers = iqrResult.outliers
      break

    case 'trimmed':
      const trimmedResult = filterOutliersTrimmed(prices)
      filteredPrices = trimmedResult.filtered
      outliers = trimmedResult.outliers
      break

    default:
      filteredPrices = prices
      outliers = []
  }

  // Calculate confidence based on multiple factors
  const confidence = calculateConfidence({
    sampleSize: prices.length,
    filteredCount: filteredPrices.length,
    variance,
    standardDeviation,
    coefficientOfVariation,
    method: selectedMethod
  })

  return {
    filteredPrices,
    outliers,
    method: selectedMethod,
    confidence,
    statistics: {
      originalCount: prices.length,
      filteredCount: filteredPrices.length,
      outlierCount: outliers.length,
      variance,
      standardDeviation,
      coefficientOfVariation,
      mad,
      iqr
    }
  }
}

/**
 * Filter outliers using Median Absolute Deviation (MAD)
 * More robust than IQR for high-variance data
 */
function filterOutliersMAD(prices: number[], median: number, mad: number): {
  filtered: number[]
  outliers: number[]
} {
  const threshold = 2.5 * mad // 2.5 MAD is approximately 99% confidence
  const filtered: number[] = []
  const outliers: number[] = []

  for (const price of prices) {
    const deviation = Math.abs(price - median)
    if (deviation <= threshold) {
      filtered.push(price)
    } else {
      outliers.push(price)
    }
  }

  return { filtered, outliers }
}

/**
 * Filter outliers using Interquartile Range (IQR)
 * Standard method for normal distribution data
 */
function filterOutliersIQR(prices: number[], q1: number, q3: number, iqr: number): {
  filtered: number[]
  outliers: number[]
} {
  const lowerBound = q1 - (iqr * 1.5)
  const upperBound = q3 + (iqr * 1.5)
  
  const filtered: number[] = []
  const outliers: number[] = []

  for (const price of prices) {
    if (price >= lowerBound && price <= upperBound) {
      filtered.push(price)
    } else {
      outliers.push(price)
    }
  }

  return { filtered, outliers }
}

/**
 * Filter outliers using trimmed mean approach
 * Removes top and bottom 10% of data
 */
function filterOutliersTrimmed(prices: number[]): {
  filtered: number[]
  outliers: number[]
} {
  const sorted = [...prices].sort((a, b) => a - b)
  const trimPercent = 0.1 // 10%
  const trimCount = Math.floor(prices.length * trimPercent)
  
  const filtered = sorted.slice(trimCount, -trimCount)
  const outliers = [
    ...sorted.slice(0, trimCount),
    ...sorted.slice(-trimCount)
  ]

  return { filtered, outliers }
}

/**
 * Calculate Median Absolute Deviation (MAD)
 * Robust measure of variability
 */
function calculateMAD(prices: number[], median: number): number {
  const deviations = prices.map(price => Math.abs(price - median))
  return calculateMedian(deviations)
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
 * Calculate confidence score based on multiple factors
 * Returns value between 0 and 0.95
 */
function calculateConfidence(factors: {
  sampleSize: number
  filteredCount: number
  variance: number
  standardDeviation: number
  coefficientOfVariation: number
  method: string
}): number {
  let confidence = 0.5 // Base confidence

  // Sample size factor
  if (factors.sampleSize >= 12) {
    confidence += 0.2
  } else if (factors.sampleSize >= 8) {
    confidence += 0.15
  } else if (factors.sampleSize >= 6) {
    confidence += 0.1
  }

  // Data quality factor (ratio of filtered to original)
  const dataQualityRatio = factors.filteredCount / factors.sampleSize
  if (dataQualityRatio >= 0.8) {
    confidence += 0.15
  } else if (dataQualityRatio >= 0.6) {
    confidence += 0.1
  } else if (dataQualityRatio < 0.4) {
    confidence -= 0.1
  }

  // Price stability factor (coefficient of variation)
  if (factors.coefficientOfVariation < 0.3) {
    confidence += 0.1 // Very stable prices
  } else if (factors.coefficientOfVariation < 0.5) {
    confidence += 0.05 // Stable prices
  } else if (factors.coefficientOfVariation > 0.8) {
    confidence -= 0.15 // High variance
  }

  // Method factor
  if (factors.method === 'mad') {
    confidence += 0.05 // MAD is more robust
  } else if (factors.method === 'trimmed') {
    confidence -= 0.05 // Trimmed mean is less precise
  }

  // Clamp confidence between 0 and 0.95
  return Math.max(0, Math.min(0.95, confidence))
}

/**
 * Calculate weighted market value using multiple factors
 * Combines median, mean, and outlier-filtered data
 */
export function calculateWeightedMarketValue(prices: number[], options: {
  useOutliers?: boolean
  weightMethod?: 'median' | 'mean' | 'hybrid'
  confidenceThreshold?: number
} = {}): {
  value: number
  confidence: number
  method: string
  factors: {
    median: number
    mean: number
    outlierFiltered: number
    sampleSize: number
  }
} {
  const {
    useOutliers = false,
    weightMethod = 'hybrid',
    confidenceThreshold = 0.3
  } = options

  if (prices.length === 0) {
    return {
      value: 0,
      confidence: 0,
      method: 'no_data',
      factors: {
        median: 0,
        mean: 0,
        outlierFiltered: 0,
        sampleSize: 0
      }
    }
  }

  // Calculate basic statistics
  const median = calculateMedian(prices)
  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length

  // Apply outlier filtering if requested
  let outlierFiltered = median
  let outlierConfidence = 0
  let outlierMethod = 'none'

  if (!useOutliers && prices.length >= 4) {
    const outlierResult = filterOutliersSmart(prices)
    if (outlierResult.filteredPrices.length > 0) {
      outlierFiltered = calculateMedian(outlierResult.filteredPrices)
      outlierConfidence = outlierResult.confidence
      outlierMethod = outlierResult.method
    }
  }

  // Calculate weighted value based on method
  let finalValue: number
  let finalMethod: string

  switch (weightMethod) {
    case 'median':
      finalValue = median
      finalMethod = 'median'
      break

    case 'mean':
      finalValue = mean
      finalMethod = 'mean'
      break

    case 'hybrid':
    default:
      // Hybrid approach: use outlier-filtered if confidence is high, otherwise median
      if (outlierConfidence >= confidenceThreshold) {
        finalValue = outlierFiltered
        finalMethod = `outlier_filtered_${outlierMethod}`
      } else {
        finalValue = median
        finalMethod = 'median_fallback'
      }
      break
  }

  // Calculate overall confidence
  const overallConfidence = Math.min(0.95, 
    (outlierConfidence + (prices.length / 20) * 0.3) / 2
  )

  return {
    value: Math.round(finalValue * 100) / 100,
    confidence: overallConfidence,
    method: finalMethod,
    factors: {
      median,
      mean,
      outlierFiltered,
      sampleSize: prices.length
    }
  }
}

/**
 * Analyze price trends and patterns
 * Provides insights for market analysis
 */
export function analyzePriceTrends(prices: number[], dates?: string[]): {
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile'
  volatility: 'low' | 'medium' | 'high'
  seasonality: boolean
  insights: string[]
} {
  if (prices.length < 3) {
    return {
      trend: 'stable',
      volatility: 'low',
      seasonality: false,
      insights: ['Insufficient data for trend analysis']
    }
  }

  const sorted = [...prices].sort((a, b) => a - b)
  const median = calculateMedian(prices)
  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length
  const standardDeviation = Math.sqrt(variance)
  const coefficientOfVariation = standardDeviation / mean

  // Determine trend
  let trend: 'increasing' | 'decreasing' | 'stable' | 'volatile'
  if (coefficientOfVariation > 0.8) {
    trend = 'volatile'
  } else if (prices[prices.length - 1] > prices[0] * 1.1) {
    trend = 'increasing'
  } else if (prices[prices.length - 1] < prices[0] * 0.9) {
    trend = 'decreasing'
  } else {
    trend = 'stable'
  }

  // Determine volatility
  let volatility: 'low' | 'medium' | 'high'
  if (coefficientOfVariation < 0.3) {
    volatility = 'low'
  } else if (coefficientOfVariation < 0.6) {
    volatility = 'medium'
  } else {
    volatility = 'high'
  }

  // Check for seasonality (if dates provided)
  let seasonality = false
  if (dates && dates.length >= 6) {
    // Simple seasonality check - look for patterns in price variations
    const priceVariations = prices.slice(1).map((price, i) => 
      Math.abs(price - prices[i]) / prices[i]
    )
    const avgVariation = priceVariations.reduce((sum, v) => sum + v, 0) / priceVariations.length
    seasonality = avgVariation > 0.2 // High variation might indicate seasonality
  }

  // Generate insights
  const insights: string[] = []
  
  if (trend === 'increasing') {
    insights.push('Prices showing upward trend - consider holding for appreciation')
  } else if (trend === 'decreasing') {
    insights.push('Prices declining - good time to buy, but monitor for further drops')
  } else if (trend === 'volatile') {
    insights.push('High price volatility - consider dollar-cost averaging approach')
  }

  if (volatility === 'high') {
    insights.push('High price volatility indicates market uncertainty')
  } else if (volatility === 'low') {
    insights.push('Stable prices suggest established market value')
  }

  if (seasonality) {
    insights.push('Seasonal price patterns detected - timing may affect value')
  }

  return {
    trend,
    volatility,
    seasonality,
    insights
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use filterOutliersSmart instead
 */
export function filterPriceOutliers(prices: number[]): number[] {
  console.warn('filterPriceOutliers is deprecated. Use filterOutliersSmart instead.')
  const result = filterOutliersSmart(prices)
  return result.filteredPrices
}

