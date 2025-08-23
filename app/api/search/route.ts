import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '../../../lib/auth-middleware-simple'
import { createSuccessResponse, createErrorResponse, addPerformanceHeaders } from '../../../lib/api-utils-enhanced'
import { analysisService } from '../../../lib/database-service'

interface SearchFilters {
  category?: string[]
  condition?: string[]
  minValue?: number
  maxValue?: number
  dateRange?: 'all' | 'today' | 'week' | 'month' | 'year'
  status?: string[]
}

interface SearchQuery {
  q: string
  filters?: SearchFilters
  limit?: number
  page?: number
}

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    if (req.method === 'GET') {
      const { searchParams } = new URL(req.url)
      const query = searchParams.get('q') || ''
      const filtersParam = searchParams.get('filters')
      const limit = parseInt(searchParams.get('limit') || '20')
      const page = parseInt(searchParams.get('page') || '1')

      if (!query.trim()) {
        return createErrorResponse('Search query is required', 400)
      }

      // Parse filters from query params
      let filters: SearchFilters = {}
      if (filtersParam) {
        try {
          filters = JSON.parse(filtersParam)
        } catch (error) {
          console.log('⚠️ Invalid filters format, using defaults')
        }
      }

      // Get user ID from headers
      const userId = req.headers.get('x-user-id')
      if (!userId) {
        return createErrorResponse('User authentication required', 401)
      }

      console.log('🔍 Search request:', { query, filters, limit, page, userId })

      try {
        // Fetch all analyses for the user
        const result = await analysisService.findByUserId(
          userId,
          { page: 1, limit: 1000, sortBy: 'createdAt', sortOrder: 'desc' }
        )

        if (!result?.data) {
          return createSuccessResponse({
            results: [],
            total: 0,
            query,
            filters,
            pagination: { page, limit, total: 0, totalPages: 0 }
          })
        }

        const analyses = result.data
        console.log(`🔍 Found ${analyses.length} analyses to search through`)

        // Perform NLP-enhanced search
        const searchResults = performAdvancedSearch(query, analyses, filters, { page, limit })
        
        console.log(`✅ Search completed: ${searchResults.results.length} results found`)

        const response = createSuccessResponse(searchResults)
        return addPerformanceHeaders(response)

      } catch (dbError) {
        console.error('❌ Database error during search:', dbError)
        return createErrorResponse('Failed to perform search', 500, dbError)
      }

    } else if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200 })
    }

    return createErrorResponse('Method not allowed', 405)

  } catch (error) {
    console.error('❌ Search API error:', error)
    return createErrorResponse('Internal server error', 500, error)
  }
}

// NLP-enhanced search function
function performAdvancedSearch(
  query: string, 
  analyses: any[], 
  filters: SearchFilters, 
  pagination: { page: number; limit: number }
) {
  const searchQuery = query.toLowerCase()
  const queryWords = searchQuery.split(/\s+/).filter(word => word.length > 2)
  
  const results: any[] = []
  const analysisMap = new Map() // Track which analysis each result belongs to

  // Search through analyses and items
  analyses.forEach(analysis => {
    // Search in analysis metadata
    const analysisRelevance = calculateSearchRelevance(searchQuery, queryWords, [
      analysis.title || '',
      analysis.description || '',
      analysis.status || ''
    ])

    if (analysisRelevance > 0) {
      results.push({
        id: analysis._id?.toString() || analysis.id,
        type: 'analysis',
        title: analysis.title || `Analysis ${analysis._id?.toString().slice(-6)}`,
        description: analysis.description || 'No description available',
        value: analysis.summary?.totalValue || 0,
        category: analysis.items?.[0]?.category || 'Unknown',
        condition: analysis.items?.[0]?.condition || 'Unknown',
        date: analysis.createdAt,
        relevance: analysisRelevance,
        highlights: extractSearchHighlights(searchQuery, queryWords, analysis.title || ''),
        analysisId: analysis._id?.toString() || analysis.id
      })
      analysisMap.set(analysis._id?.toString() || analysis.id, analysis)
    }

    // Search in individual items
    analysis.items?.forEach((item: any) => {
      const itemRelevance = calculateSearchRelevance(searchQuery, queryWords, [
        item.name || '',
        item.category || '',
        item.condition || '',
        (item.estimatedValue?.mean || 0).toString()
      ])

      if (itemRelevance > 0) {
        results.push({
          id: item._id?.toString() || item.id,
          type: 'item',
          title: item.name || 'Unnamed Item',
          description: `${item.category} - ${item.condition} condition`,
          value: item.estimatedValue?.mean || 0,
          category: item.category || 'Unknown',
          condition: item.condition || 'Unknown',
          date: analysis.createdAt,
          relevance: itemRelevance,
          highlights: extractSearchHighlights(searchQuery, queryWords, item.name || ''),
          analysisId: analysis._id?.toString() || analysis.id,
          parentAnalysis: {
            id: analysis._id?.toString() || analysis.id,
            title: analysis.title || `Analysis ${analysis._id?.toString().slice(-6)}`
          }
        })
      }
    })
  })

  // Apply filters
  let filteredResults = results.filter(result => {
    // Category filter
    if (filters.category && filters.category.length > 0) {
      if (!result.category || !filters.category.includes(result.category)) {
        return false
      }
    }

    // Condition filter
    if (filters.condition && filters.condition.length > 0) {
      if (!result.condition || !filters.condition.includes(result.condition)) {
        return false
      }
    }

    // Value range filter
    if (filters.minValue !== undefined || filters.maxValue !== undefined) {
      const minValue = filters.minValue || 0
      const maxValue = filters.maxValue || 1000000
      if (result.value === undefined || result.value < minValue || result.value > maxValue) {
        return false
      }
    }

    // Date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      const resultDate = new Date(result.date)
      const now = new Date()
      
      switch (filters.dateRange) {
        case 'today':
          if (!isSameDay(resultDate, now)) return false
          break
        case 'week':
          if (!isWithinDays(resultDate, now, 7)) return false
          break
        case 'month':
          if (!isWithinDays(resultDate, now, 30)) return false
          break
        case 'year':
          if (!isWithinDays(resultDate, now, 365)) return false
          break
      }
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      const analysis = analysisMap.get(result.analysisId)
      if (!analysis || !filters.status.includes(analysis.status)) {
        return false
      }
    }

    return true
  })

  // Sort by relevance and date
  filteredResults.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance
    if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime()
    return 0
  })

  // Apply pagination
  const total = filteredResults.length
  const startIndex = (pagination.page - 1) * pagination.limit
  const endIndex = startIndex + pagination.limit
  const paginatedResults = filteredResults.slice(startIndex, endIndex)

  return {
    results: paginatedResults,
    total,
    query,
    filters,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      hasNext: endIndex < total,
      hasPrev: pagination.page > 1
    }
  }
}

// Calculate search relevance using NLP-like techniques
function calculateSearchRelevance(query: string, queryWords: string[], textFields: string[]): number {
  let score = 0
  const allText = textFields.join(' ').toLowerCase()

  // Exact phrase match (highest priority)
  if (allText.includes(query)) {
    score += 100
  }

  // Word-by-word matching
  queryWords.forEach(word => {
    if (allText.includes(word)) {
      score += 20
      // Bonus for word boundaries
      const wordBoundaryRegex = new RegExp(`\\b${word}\\b`, 'i')
      if (wordBoundaryRegex.test(allText)) {
        score += 10
      }
    }
  })

  // Category-specific matching
  if (textFields.some(field => field.toLowerCase().includes('pokemon'))) {
    if (query.includes('pokemon') || query.includes('card') || query.includes('trading')) {
      score += 30
    }
  }

  // Value range matching
  const valueMatch = query.match(/\$?(\d+)/)
  if (valueMatch) {
    const queryValue = parseInt(valueMatch[1])
    textFields.forEach(field => {
      const fieldValue = field.match(/\$?(\d+)/)
      if (fieldValue) {
        const fieldVal = parseInt(fieldValue[1])
        const difference = Math.abs(queryValue - fieldVal)
        if (difference <= 10) score += 15
        else if (difference <= 25) score += 10
        else if (difference <= 50) score += 5
      }
    })
  }

  // Condition matching
  const conditionWords = ['mint', 'good', 'fair', 'poor', 'excellent']
  conditionWords.forEach(condition => {
    if (query.includes(condition) && allText.includes(condition)) {
      score += 25
    }
  })

  return score
}

// Extract search highlights
function extractSearchHighlights(query: string, queryWords: string[], text: string): string[] {
  const highlights: string[] = []
  const lowerText = text.toLowerCase()

  queryWords.forEach(word => {
    if (lowerText.includes(word)) {
      const index = lowerText.indexOf(word)
      const start = Math.max(0, index - 20)
      const end = Math.min(text.length, index + word.length + 20)
      let highlight = text.substring(start, end)
      
      if (start > 0) highlight = '...' + highlight
      if (end < text.length) highlight = highlight + '...'
      
      highlights.push(highlight)
    }
  })

  return highlights.slice(0, 3)
}

// Date utility functions
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() === date2.toDateString()
}

function isWithinDays(date1: Date, date2: Date, days: number): boolean {
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= days
}

export const GET = withAuth(handler)
export const OPTIONS = handler
