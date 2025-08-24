export interface Item {
  id: string
  name: string
  description?: string
  confidence: number
  category?: string
  condition?: string
  brand?: string
  model?: string
  year?: string
  rarity?: string
  features?: string[]
  estimatedValue?: {
    min: number
    max: number
    mean: number
    currency: string
  }
  aiEstimate?: {
    reasoning: string
    factors: string[]
    value: number
    confidence: number
  }
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface EbayData {
  itemId: string
  title: string
  soldPrice: number
  soldDate: string
  listingUrl: string
  condition: string
}

export interface EbaySearchResults {
  soldItems: EbayData[]
  activeCount: number
  searchQuery: string
  lastUpdated: string
}

// New enhanced eBay data structure
export interface EnhancedEbayData {
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

// Scraped eBay data interface for the new parser
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
  soldWindowDays: number
  statistics: {
    activePrices: number[]
    soldPrices: number[]
    outlierCount: number
    confidence: number
    soldDates: string[]
    outlierMethod: string
    dataSource?: string
    blockingDetected?: boolean
    successRate?: number
    totalAttempts?: number
    successfulAttempts?: number
    realDataUsed?: boolean
    fallbackUsed?: boolean
  }
}

export interface ItemAnalysis {
  item: Item
  ebayData: EbayData[]
  marketValue: number
  gptEstimate: number
  activeListings: number
  soldCount: number
  priceRange: {
    min: number
    max: number
    median: number
  }
  // Enhanced eBay data
  ebayLinks?: {
    active: string
    sold: string
  }
  medianActivePrice?: number
  outlierFiltered?: boolean
  outlierCount?: number
  confidence?: number
}

export interface LotAnalysis {
  id: string
  userId: string
  createdAt: Date
  images: string[]
  items: ItemAnalysis[]
  totalEstimatedValue: number
  totalMarketValue: number
  status: 'processing' | 'completed' | 'failed'
  processingTime?: number
}

export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
  lastLogin: Date
  subscription: 'free' | 'premium'
  usageCount: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ImageUploadResponse {
  imageId: string
  url: string
  processingStatus: 'uploaded' | 'processing' | 'completed'
}

export interface AnalysisRequest {
  imageIds: string[]
  userId?: string
  options?: {
    includeGptEstimate?: boolean
    maxEbayResults?: number
    filterOutliers?: boolean
    soldWindowDays?: number
    categoryHint?: string
    maxSearchQueries?: number
    debug?: boolean
  }
}

