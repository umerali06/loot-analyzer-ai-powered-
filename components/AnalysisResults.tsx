'use client'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Download, 
  Filter, 
  Search, 
  SortAsc, 
  SortDesc,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface AnalysisItem {
  id: string
  name: string
  description?: string
  estimatedValue: {
    min: number
    max: number
    median: number
    mean: number
    currency: string
  }
  confidence: number
  category?: string
  condition?: string
  // Add eBay data fields
  marketValue?: number
  gptEstimate?: number
  activeListings?: number
  soldCount?: number
  priceRange?: {
    min: number
    max: number
    median: number
  }
  ebayLinks?: {
    active: string
    sold: string
  }
}

interface AnalysisResult {
  id: string
  imageId: string
  items: AnalysisItem[]
  summary: {
    totalItems: number
    totalValue: number
    averageConfidence: number
    processingTime: number
  }
  timestamp: Date
}

interface AnalysisResultsProps {
  analysisResults: AnalysisResult[]
}

// Virtual scrolling configuration
const ITEM_HEIGHT = 80
const VISIBLE_ITEMS = 10
const BUFFER_SIZE = 5

// Memoized item component for performance
const AnalysisItemRow = React.memo<{
  item: AnalysisItem
  onToggleDetails: (itemId: string) => void
  expandedItems: Set<string>
}>(({ item, onToggleDetails, expandedItems }) => {
  const isExpanded = expandedItems.has(item.id)
  
  const valueRange = useMemo(() => {
    const { min, max, median, currency } = item.estimatedValue
    return {
      range: `${currency}${min.toFixed(2)} - ${currency}${max.toFixed(2)}`,
      median: `${currency}${median.toFixed(2)}`,
      mean: `${currency}${item.estimatedValue.mean.toFixed(2)}`
    }
  }, [item.estimatedValue])

  const confidenceColor = useMemo(() => {
    if (item.confidence >= 0.8) return 'bg-green-100 text-green-800'
    if (item.confidence >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }, [item.confidence])

  const handleToggle = useCallback(() => {
    onToggleDetails(item.id)
  }, [item.id, onToggleDetails])

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
            {item.category && (
              <Badge variant="outline" className="text-xs">
                {item.category}
              </Badge>
            )}
            {item.condition && (
              <Badge variant="secondary" className="text-xs">
                {item.condition}
              </Badge>
            )}
          </div>
          
          {/* eBay Data Row */}
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Active:</span>
              <span className="ml-1 font-medium">{item.activeListings || 0}</span>
            </div>
            <div>
              <span className="text-gray-500">Sold:</span>
              <span className="ml-1 font-medium">{item.soldCount || 0}</span>
            </div>
            <div>
              <span className="text-gray-500">Market Value:</span>
              <span className="ml-1 font-medium text-green-600">
                ${item.marketValue?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">AI Estimate:</span>
              <span className="ml-1 font-medium text-blue-600">
                ${item.gptEstimate?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
          
          {/* Price Range */}
          {item.priceRange && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="text-gray-500">Price Range:</span>
              <span className="ml-1">
                ${item.priceRange.min.toFixed(2)} - ${item.priceRange.max.toFixed(2)}
              </span>
              <span className="ml-3 text-gray-500">Median:</span>
              <span className="ml-1 font-medium">${item.priceRange.median.toFixed(2)}</span>
            </div>
          )}
          
          {/* eBay Links */}
          {item.ebayLinks && (
            <div className="mt-2 flex gap-2">
              <a
                href={item.ebayLinks.active}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                View Active Listings
              </a>
              <a
                href={item.ebayLinks.sold}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-600 hover:text-green-800 underline"
              >
                View Sold Items
              </a>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <Badge className={confidenceColor}>
            {Math.round(item.confidence * 100)}%
          </Badge>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            className="p-1 h-8 w-8"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-gray-700 mb-2">AI Analysis</h5>
              <p className="text-gray-600">{item.description || 'No description available'}</p>
            </div>
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Value Breakdown</h5>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Estimated Range:</span>
                  <span className="font-medium">{valueRange.range}</span>
                </div>
                <div className="flex justify-between">
                  <span>Median:</span>
                  <span className="font-medium">{valueRange.median}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mean:</span>
                  <span className="font-medium">{valueRange.mean}</span>
            </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

AnalysisItemRow.displayName = 'AnalysisItemRow'

// Memoized summary component
const AnalysisSummary = React.memo<{
  results: AnalysisResult[]
}>(({ results }) => {
  const summary = useMemo(() => {
    const totalItems = results.reduce((sum, result) => sum + result.summary.totalItems, 0)
    const totalValue = results.reduce((sum, result) => sum + result.summary.totalValue, 0)
    const avgConfidence = results.reduce((sum, result) => 
      sum + result.summary.averageConfidence, 0
    ) / results.length
    
    return { totalItems, totalValue, avgConfidence }
  }, [results])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{summary.totalItems}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            ${summary.totalValue.toFixed(2)}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Avg Confidence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {(summary.avgConfidence * 100).toFixed(1)}%
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

AnalysisSummary.displayName = 'AnalysisSummary'

// Main component with performance optimizations
export default function AnalysisResults({ analysisResults }: AnalysisResultsProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'value' | 'confidence' | 'name'>('value')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  
  // Virtual scrolling state
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Memoized filtered and sorted items
  const processedItems = useMemo(() => {
    let items = analysisResults.flatMap(result => 
      result.items.map(item => ({
        ...item,
        analysisId: result.id,
        imageId: result.imageId
      }))
    )

    // Apply search filter
    if (searchTerm) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply category filter
    if (selectedCategories.size > 0) {
      items = items.filter(item => 
        item.category && selectedCategories.has(item.category)
      )
    }

    // Apply condition filter
    if (selectedConditions.size > 0) {
      items = items.filter(item => 
        item.condition && selectedConditions.has(item.condition)
      )
    }

    // Apply sorting
    items.sort((a, b) => {
      let aValue: number, bValue: number
      
      switch (sortBy) {
        case 'value':
          aValue = a.estimatedValue.median
          bValue = b.estimatedValue.median
          break
        case 'confidence':
          aValue = a.confidence
          bValue = b.confidence
          break
        case 'name':
          aValue = a.name.localeCompare(b.name)
          bValue = 0
          break
        default:
          return 0
      }
      
      if (sortBy === 'name') {
        return sortOrder === 'asc' ? aValue : -aValue
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })

    return items
  }, [analysisResults, searchTerm, selectedCategories, selectedConditions, sortBy, sortOrder])

  // Memoized available categories and conditions
  const availableCategories = useMemo(() => {
    const categories = new Set<string>()
    analysisResults.forEach(result => {
      result.items.forEach(item => {
        if (item.category) categories.add(item.category)
      })
    })
    return Array.from(categories).sort()
  }, [analysisResults])

  const availableConditions = useMemo(() => {
    const conditions = new Set<string>()
    analysisResults.forEach(result => {
      result.items.forEach(item => {
        if (item.condition) conditions.add(item.condition)
      })
    })
    return Array.from(conditions).sort()
  }, [analysisResults])

  // Virtual scrolling calculations
  const totalHeight = processedItems.length * ITEM_HEIGHT
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE)
  const endIndex = Math.min(
    processedItems.length,
    Math.ceil((scrollTop + (VISIBLE_ITEMS * ITEM_HEIGHT)) / ITEM_HEIGHT) + BUFFER_SIZE
  )
  
  const visibleItems = processedItems.slice(startIndex, endIndex)
  const offsetY = startIndex * ITEM_HEIGHT

  // Event handlers
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const handleToggleDetails = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

  const handleSort = useCallback((field: 'value' | 'confidence' | 'name') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }, [sortBy])

  const handleCategoryToggle = useCallback((category: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }, [])

  const handleConditionToggle = useCallback((condition: string) => {
    setSelectedConditions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(condition)) {
        newSet.delete(condition)
      } else {
        newSet.add(condition)
      }
      return newSet
    })
  }, [])

  const handleExport = useCallback((format: 'csv' | 'json') => {
    if (processedItems.length === 0) return

    const data = processedItems.map(item => ({
      name: item.name,
      description: item.description,
      category: item.category,
      condition: item.condition,
      estimatedValue: item.estimatedValue.median,
      confidence: item.confidence,
      analysisId: item.analysisId,
      imageId: item.imageId
    }))

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `analysis-results-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
    } else if (format === 'csv') {
      const csvContent = [
        ['Name', 'Description', 'Category', 'Condition', 'Estimated Value', 'Confidence', 'Analysis ID', 'Image ID'],
        ...data.map(row => [
          row.name,
          row.description || '',
          row.category || '',
          row.condition || '',
          row.estimatedValue.toFixed(2),
          (row.confidence * 100).toFixed(1),
          row.analysisId,
          row.imageId
        ])
      ].map(row => row.join(',')).join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `analysis-results-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    }
  }, [processedItems])

  const clearFilters = useCallback(() => {
    setSearchTerm('')
    setSelectedCategories(new Set())
    setSelectedConditions(new Set())
  }, [])

  // Reset scroll position when filters change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
      setScrollTop(0)
    }
  }, [searchTerm, selectedCategories, selectedConditions, sortBy, sortOrder])

  if (analysisResults.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">No analysis results available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <AnalysisSummary results={analysisResults} />

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Analysis Results</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv')}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('json')}
              >
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
            </div>
          </div>
          <CardDescription>
            {processedItems.length} items found
            {processedItems.length !== analysisResults.flatMap(r => r.items).length && 
              ` (filtered from ${analysisResults.flatMap(r => r.items).length} total)`
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search and Sort */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort('value')}
                className={sortBy === 'value' ? 'bg-blue-50 border-blue-200' : ''}
              >
                Value
                {sortBy === 'value' && (
                  sortOrder === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort('confidence')}
                className={sortBy === 'confidence' ? 'bg-blue-50 border-blue-200' : ''}
              >
                Confidence
                {sortBy === 'confidence' && (
                  sortOrder === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort('name')}
                className={sortBy === 'name' ? 'bg-blue-50 border-blue-200' : ''}
              >
                Name
                {sortBy === 'name' && (
                  sortOrder === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Categories</h5>
                  <div className="space-y-2">
                    {availableCategories.map(category => (
                      <label key={category} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedCategories.has(category)}
                          onChange={() => handleCategoryToggle(category)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Conditions</h5>
                  <div className="space-y-2">
                    {availableConditions.map(condition => (
                      <label key={condition} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedConditions.has(condition)}
                          onChange={() => handleConditionToggle(condition)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{condition}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results List with Virtual Scrolling */}
      <Card>
        <CardHeader>
          <CardTitle>Items ({processedItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={containerRef}
            className="h-96 overflow-y-auto border border-gray-200 rounded-lg"
            onScroll={handleScroll}
          >
            <div style={{ height: totalHeight, position: 'relative' }}>
              <div style={{ transform: `translateY(${offsetY}px)` }}>
                {visibleItems.map((item, index) => (
                  <div key={item.id} style={{ height: ITEM_HEIGHT }}>
                    <AnalysisItemRow
                      item={item}
                      onToggleDetails={handleToggleDetails}
                      expandedItems={expandedItems}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
