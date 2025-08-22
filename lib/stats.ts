/**
 * Statistical utilities for price analysis and outlier detection
 */

export interface PriceStatistics {
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

export interface OutlierFilterResult {
  filteredPrices: number[]
  outliers: number[]
  statistics: PriceStatistics
  method: 'iqr' | 'mad' | 'zscore'
}

/**
 * Calculate comprehensive price statistics
 */
export function calculatePriceStatistics(prices: number[]): PriceStatistics {
  if (prices.length === 0) {
    return getEmptyStatistics()
  }

  const sortedPrices = [...prices].sort((a, b) => a - b)
  const n = sortedPrices.length

  // Basic statistics
  const min = sortedPrices[0]
  const max = sortedPrices[n - 1]
  const mean = sortedPrices.reduce((sum, price) => sum + price, 0) / n

  // Median
  const median = n % 2 === 0
    ? (sortedPrices[n / 2 - 1] + sortedPrices[n / 2]) / 2
    : sortedPrices[Math.floor(n / 2)]

  // Mode (most frequent price range)
  const mode = calculateMode(sortedPrices)

  // Quartiles
  const q1Index = Math.floor(n * 0.25)
  const q3Index = Math.floor(n * 0.75)
  const q1 = sortedPrices[q1Index]
  const q3 = sortedPrices[q3Index]
  const iqr = q3 - q1

  // Variance and standard deviation
  const variance = sortedPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / n
  const standardDeviation = Math.sqrt(variance)

  // Count outliers using IQR method
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr
  const outlierCount = sortedPrices.filter(price => price < lowerBound || price > upperBound).length

  return {
    min,
    max,
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    mode: Math.round(mode * 100) / 100,
    standardDeviation: Math.round(standardDeviation * 100) / 100,
    variance: Math.round(variance * 100) / 100,
    q1: Math.round(q1 * 100) / 100,
    q3: Math.round(q3 * 100) / 100,
    iqr: Math.round(iqr * 100) / 100,
    outlierCount,
    sampleSize: n
  }
}

/**
 * Filter outliers using IQR method (Tukey's method)
 */
export function filterOutliersIQR(prices: number[], multiplier: number = 1.5): OutlierFilterResult {
  if (prices.length < 4) {
    return {
      filteredPrices: prices,
      outliers: [],
      statistics: calculatePriceStatistics(prices),
      method: 'iqr'
    }
  }

  const statistics = calculatePriceStatistics(prices)
  const lowerBound = statistics.q1 - (multiplier * statistics.iqr)
  const upperBound = statistics.q3 + (multiplier * statistics.iqr)

  const filteredPrices: number[] = []
  const outliers: number[] = []

  prices.forEach(price => {
    if (price >= lowerBound && price <= upperBound) {
      filteredPrices.push(price)
    } else {
      outliers.push(price)
    }
  })

  return {
    filteredPrices,
    outliers,
    statistics,
    method: 'iqr'
  }
}

/**
 * Filter outliers using MAD method (Median Absolute Deviation)
 */
export function filterOutliersMAD(prices: number[], threshold: number = 3.5): OutlierFilterResult {
  if (prices.length < 4) {
    return {
      filteredPrices: prices,
      outliers: [],
      statistics: calculatePriceStatistics(prices),
      method: 'mad'
    }
  }

  const median = calculateMedian(prices)
  const mad = calculateMAD(prices, median)
  const lowerBound = median - (threshold * mad)
  const upperBound = median + (threshold * mad)

  const filteredPrices: number[] = []
  const outliers: number[] = []

  prices.forEach(price => {
    if (price >= lowerBound && price <= upperBound) {
      filteredPrices.push(price)
    } else {
      outliers.push(price)
    }
  })

  return {
    filteredPrices,
    outliers,
    statistics: calculatePriceStatistics(filteredPrices),
    method: 'mad'
  }
}

/**
 * Filter outliers using Z-score method
 */
export function filterOutliersZScore(prices: number[], threshold: number = 3): OutlierFilterResult {
  if (prices.length < 4) {
    return {
      filteredPrices: prices,
      outliers: [],
      statistics: calculatePriceStatistics(prices),
      method: 'zscore'
    }
  }

  const statistics = calculatePriceStatistics(prices)
  const filteredPrices: number[] = []
  const outliers: number[] = []

  prices.forEach(price => {
    const zScore = Math.abs((price - statistics.mean) / statistics.standardDeviation)
    if (zScore <= threshold) {
      filteredPrices.push(price)
    } else {
      outliers.push(price)
    }
  })

  return {
    filteredPrices,
    outliers,
    statistics: calculatePriceStatistics(filteredPrices),
    method: 'zscore'
  }
}

/**
 * Smart outlier filtering that chooses the best method
 */
export function filterOutliersSmart(prices: number[]): OutlierFilterResult {
  if (prices.length < 4) {
    return {
      filteredPrices: prices,
      outliers: [],
      statistics: calculatePriceStatistics(prices),
      method: 'iqr'
    }
  }

  // Try IQR first
  const iqrResult = filterOutliersIQR(prices)
  
  // If IQR removes too many items (>50%), try MAD
  if (iqrResult.filteredPrices.length < prices.length * 0.5) {
    const madResult = filterOutliersMAD(prices)
    
    // If MAD is better, use it
    if (madResult.filteredPrices.length > iqrResult.filteredPrices.length) {
      return madResult
    }
  }

  return iqrResult
}

/**
 * Calculate median value
 */
export function calculateMedian(numbers: number[]): number {
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
 * Calculate mode using price ranges
 */
export function calculateMode(sortedPrices: number[]): number {
  if (sortedPrices.length === 0) return 0
  
  const priceRanges = new Map<number, number>()
  const rangeSize = Math.max(1, Math.ceil((sortedPrices[sortedPrices.length - 1] - sortedPrices[0]) / 10))

  for (const price of sortedPrices) {
    const range = Math.floor(price / rangeSize) * rangeSize
    priceRanges.set(range, (priceRanges.get(range) || 0) + 1)
  }

  let maxCount = 0
  let modeRange = sortedPrices[0]

  priceRanges.forEach((count, range) => {
    if (count > maxCount) {
      maxCount = count
      modeRange = range
    }
  })

  return modeRange + rangeSize / 2
}

/**
 * Calculate Median Absolute Deviation
 */
export function calculateMAD(prices: number[], median: number): number {
  const deviations = prices.map(price => Math.abs(price - median))
  return calculateMedian(deviations)
}

/**
 * Get empty statistics object
 */
export function getEmptyStatistics(): PriceStatistics {
  return {
    min: 0,
    max: 0,
    mean: 0,
    median: 0,
    mode: 0,
    standardDeviation: 0,
    variance: 0,
    q1: 0,
    q3: 0,
    iqr: 0,
    outlierCount: 0,
    sampleSize: 0
  }
}

/**
 * Calculate confidence interval for mean
 */
export function calculateConfidenceInterval(
  prices: number[], 
  confidenceLevel: number = 0.95
): { lower: number; upper: number; confidence: number } {
  if (prices.length < 2) {
    return { lower: 0, upper: 0, confidence: 0 }
  }

  const statistics = calculatePriceStatistics(prices)
  const standardError = statistics.standardDeviation / Math.sqrt(prices.length)
  
  // Z-score for 95% confidence (1.96)
  const zScore = confidenceLevel === 0.95 ? 1.96 : 1.645
  
  const marginOfError = zScore * standardError
  
  return {
    lower: Math.max(0, statistics.mean - marginOfError),
    upper: statistics.mean + marginOfError,
    confidence: confidenceLevel
  }
}

/**
 * Detect price anomalies using multiple methods
 */
export function detectPriceAnomalies(prices: number[]): {
  anomalies: number[]
  method: string
  confidence: number
} {
  if (prices.length < 4) {
    return { anomalies: [], method: 'insufficient_data', confidence: 0 }
  }

  // Try multiple detection methods
  const iqrResult = filterOutliersIQR(prices)
  const madResult = filterOutliersMAD(prices)
  const zscoreResult = filterOutliersZScore(prices)

  // Choose the method that finds the most anomalies
  const results = [
    { method: 'iqr', anomalies: iqrResult.outliers, count: iqrResult.outliers.length },
    { method: 'mad', anomalies: madResult.outliers, count: madResult.outliers.length },
    { method: 'zscore', anomalies: zscoreResult.outliers, count: zscoreResult.outliers.length }
  ]

  const bestResult = results.reduce((best, current) => 
    current.count > best.count ? current : best
  )

  const confidence = Math.min(0.95, 0.5 + (bestResult.count / prices.length) * 0.4)

  return {
    anomalies: bestResult.anomalies,
    method: bestResult.method,
    confidence
  }
}
