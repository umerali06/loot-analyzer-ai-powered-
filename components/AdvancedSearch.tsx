'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Filter, TrendingUp, Clock, DollarSign, Tag, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

interface SearchResult {
  id: string
  type: 'analysis' | 'item' | 'category'
  title: string
  description: string
  value?: number
  category?: string
  condition?: string
  date?: string
  relevance: number
  highlights: string[]
}

interface SearchFilters {
  category: string[]
  condition: string[]
  minValue: number
  maxValue: number
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year'
}

export default function AdvancedSearch() {
  const { isAuthenticated, accessToken } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    category: [],
    condition: [],
    minValue: 0,
    maxValue: 1000,
    dateRange: 'all'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load recent searches from localStorage
  useEffect(() => {
    if (isAuthenticated) {
      const saved = localStorage.getItem('recentSearches')
      if (saved) {
        setRecentSearches(JSON.parse(saved))
      }
    }
  }, [isAuthenticated])

  // NLP-enhanced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !isAuthenticated) return

    setIsSearching(true)
    try {
      // Save to recent searches
      const newRecentSearches = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5)
      setRecentSearches(newRecentSearches)
      localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches))

      // Use dedicated search API
      const searchParams = new URLSearchParams({
        q: searchQuery,
        limit: '20',
        page: '1'
      })

      if (filters.category.length > 0) {
        searchParams.append('filters', JSON.stringify({ category: filters.category }))
      }
      if (filters.condition.length > 0) {
        const currentFilters = JSON.parse(searchParams.get('filters') || '{}')
        currentFilters.condition = filters.condition
        searchParams.set('filters', JSON.stringify(currentFilters))
      }
      if (filters.minValue > 0 || filters.maxValue < 1000) {
        const currentFilters = JSON.parse(searchParams.get('filters') || '{}')
        currentFilters.minValue = filters.minValue
        currentFilters.maxValue = filters.maxValue
        searchParams.set('filters', JSON.stringify(currentFilters))
      }
      if (filters.dateRange !== 'all') {
        const currentFilters = JSON.parse(searchParams.get('filters') || '{}')
        currentFilters.dateRange = filters.dateRange
        searchParams.set('filters', JSON.stringify(currentFilters))
      }

      const response = await fetch(`/api/search?${searchParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          // Transform API results to match our interface
          const transformedResults = data.data.results.map((result: any) => ({
            id: result.id,
            type: result.type,
            title: result.title,
            description: result.description,
            value: result.value,
            category: result.category,
            condition: result.condition,
            date: result.date,
            relevance: result.relevance,
            highlights: result.highlights || []
          }))
          setResults(transformedResults)
        } else {
          setResults([])
        }
      } else {
        console.error('Search API failed:', response.status)
        setResults([])
      }
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [isAuthenticated, accessToken, recentSearches, filters])

  // Search processing is now handled by the dedicated search API

  // Generate intelligent search suggestions
  const generateSuggestions = (input: string) => {
    if (!input.trim()) {
      setSuggestions([])
      return
    }

    const suggestions = [
      // Category-based suggestions
      ...(input.toLowerCase().includes('pokemon') ? ['Pokemon cards', 'Pokemon trading cards', 'Pokemon value'] : []),
      ...(input.toLowerCase().includes('card') ? ['Trading cards', 'Card condition', 'Card value'] : []),
      ...(input.toLowerCase().includes('value') ? ['High value items', 'Low value items', 'Value range'] : []),
      
      // Condition-based suggestions
      ...(input.toLowerCase().includes('condition') ? ['Mint condition', 'Good condition', 'Fair condition'] : []),
      
      // Date-based suggestions
      ...(input.toLowerCase().includes('recent') ? ['Recent analyses', 'This week', 'This month'] : []),
      
      // Generic suggestions
      'High value items',
      'Recent analyses',
      'Pokemon cards',
      'Trading cards',
      'Good condition items'
    ].filter(suggestion => 
      suggestion.toLowerCase().includes(input.toLowerCase()) && 
      suggestion.toLowerCase() !== input.toLowerCase()
    )

    setSuggestions(suggestions.slice(0, 5))
  }

  // Handle search input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    generateSuggestions(value)
    
    if (value.trim()) {
      setIsOpen(true)
      // Debounced search
      const timeoutId = setTimeout(() => performSearch(value), 300)
      return () => clearTimeout(timeoutId)
    } else {
      setIsOpen(false)
      setResults([])
    }
  }

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      performSearch(query)
    }
  }

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'analysis') {
      router.push(`/analyze?id=${result.id}`)
    } else {
      // For items, navigate to the analysis containing the item
      router.push(`/analyze?id=${result.id}`)
    }
    setIsOpen(false)
    setQuery('')
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    performSearch(suggestion)
    setIsOpen(false)
  }

  // Handle recent search click
  const handleRecentSearchClick = (recentSearch: string) => {
    setQuery(recentSearch)
    performSearch(recentSearch)
    setIsOpen(false)
  }

  // Clear search
  const clearSearch = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    setSuggestions([])
  }

  return (
    <div className="relative" ref={searchRef}>
      {/* Search Input */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Search analyses, items, categories..."
          className="pl-10 pr-10 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200 w-64 text-sm bg-slate-50 focus:bg-white"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Search Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-96 overflow-y-auto">
          {/* Search Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-slate-700">Suggestions</span>
              </div>
              <div className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md transition-colors duration-150"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && !query && (
            <div className="p-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Recent Searches</span>
              </div>
              <div className="space-y-1">
                {recentSearches.map((recentSearch, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(recentSearch)}
                    className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md transition-colors duration-150"
                  >
                    {recentSearch}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  {isSearching ? 'Searching...' : `${results.length} results`}
                </span>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  <Filter className="h-3 w-3" />
                  <span>Filters</span>
                </button>
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="mb-3 p-3 bg-slate-50 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Min Value</label>
                      <input
                        type="number"
                        value={filters.minValue}
                        onChange={(e) => setFilters(prev => ({ ...prev, minValue: parseInt(e.target.value) || 0 }))}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Max Value</label>
                      <input
                        type="number"
                        value={filters.maxValue}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxValue: parseInt(e.target.value) || 1000 }))}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Date Range</label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="year">This Year</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Results List */}
              <div className="space-y-2">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left p-3 hover:bg-slate-50 rounded-lg transition-colors duration-150 border border-transparent hover:border-slate-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-slate-900">{result.title}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            result.type === 'analysis' ? 'bg-blue-100 text-blue-700' :
                            result.type === 'item' ? 'bg-green-100 text-green-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {result.type}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{result.description}</p>
                        
                        {/* Highlights */}
                        {result.highlights.length > 0 && (
                          <div className="mb-2">
                            {result.highlights.map((highlight, index) => (
                              <span key={index} className="inline-block text-xs text-slate-500 bg-yellow-100 px-2 py-1 rounded mr-2 mb-1">
                                {highlight}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center space-x-4 text-xs text-slate-500">
                          {result.category && (
                            <div className="flex items-center space-x-1">
                              <Tag className="h-3 w-3" />
                              <span>{result.category}</span>
                            </div>
                          )}
                          {result.value && (
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-3 w-3" />
                              <span>${result.value}</span>
                            </div>
                          )}
                          {result.date && (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(result.date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Relevance Score */}
                      <div className="flex items-center space-x-1 text-xs text-slate-400">
                        <TrendingUp className="h-3 w-3" />
                        <span>{Math.round(result.relevance)}%</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!isSearching && query && results.length === 0 && (
            <div className="p-6 text-center">
              <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No results found for "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">Try different keywords or check your filters</p>
            </div>
          )}

          {/* Loading State */}
          {isSearching && (
            <div className="p-6 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-slate-300 border-t-slate-600 rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-slate-500">Searching...</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
