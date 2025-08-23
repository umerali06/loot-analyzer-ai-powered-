'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/navigation'

interface AnalysisItem {
  id: string
  title: string
  description?: string
  status: string
  itemCount: number
  totalValue: number
  createdAt: string
  updatedAt: string
  items: Array<{
    name: string
    category: string
    condition: string
    estimatedValue: {
      min: number
      max: number
      mean: number
      currency: string
    }
    confidence: number
  }>
}

export default function HistoryPage() {
  const { user, accessToken, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([])
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisItem | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth?redirect=/history')
    }
  }, [isAuthenticated, router])

  // Load history data
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadHistoryData()
    }
  }, [isAuthenticated, accessToken])

  const loadHistoryData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Extract userId from token if user object is not available
      let userId = user?.id
      if (!userId && accessToken) {
        try {
          const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]))
          userId = tokenPayload.userId
        } catch (e) {
          console.warn('Could not extract userId from token:', e)
          setError('Could not identify user. Please log in again.')
          return
        }
      }

      if (!userId) {
        setError('User ID not available. Please log in again.')
        return
      }

      // Fetch user's analysis history
      const response = await fetch('/api/analyses', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': userId
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load history: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        const analysesData = data.data.analyses || []
        
        // Transform data for display
        const transformedAnalyses = analysesData.map((analysis: any) => ({
          id: analysis._id,
          title: analysis.title || `Analysis ${analysis._id.slice(-6)}`,
          description: analysis.description || 'No description available',
          status: analysis.status,
          itemCount: analysis.items?.length || 0,
          totalValue: analysis.summary?.totalValue || 0,
          createdAt: new Date(analysis.createdAt).toLocaleDateString(),
          updatedAt: new Date(analysis.updatedAt).toLocaleDateString(),
          items: analysis.items || []
        }))

        setAnalyses(transformedAnalyses)
      } else {
        setError(data.message || 'Failed to load history')
      }
    } catch (error) {
      console.error('History loading error:', error)
      setError(error instanceof Error ? error.message : 'Failed to load history')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter analyses based on search and status
  const filteredAnalyses = analyses.filter(analysis => {
    const matchesSearch = analysis.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         analysis.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || analysis.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Analysis History</h1>
              <p className="text-slate-600 mt-1">
                View all your completed analyses and their results.
              </p>
            </div>
            <button
              onClick={() => router.push('/analyze')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors duration-200"
            >
              📸 New Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search analyses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-slate-600">
            Showing {filteredAnalyses.length} of {analyses.length} analyses
          </p>
        </div>

        {/* Analyses List */}
        {filteredAnalyses.length > 0 ? (
          <div className="space-y-4">
            {filteredAnalyses.map((analysis) => (
              <div
                key={analysis.id}
                className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"
              >
                {/* Analysis Header */}
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {analysis.title}
                      </h3>
                      {analysis.description && (
                        <p className="text-slate-600 text-sm mb-3">{analysis.description}</p>
                      )}
                      <div className="flex items-center space-x-6 text-sm text-slate-500">
                        <span>📅 {analysis.createdAt}</span>
                        <span>📊 {analysis.itemCount} items</span>
                        <span>💰 {formatCurrency(analysis.totalValue)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(analysis.status)}`}>
                        {analysis.status}
                      </span>
                      <button
                        onClick={() => setSelectedAnalysis(selectedAnalysis?.id === analysis.id ? null : analysis)}
                        className="px-3 py-1 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        {selectedAnalysis?.id === analysis.id ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Analysis Details */}
                {selectedAnalysis?.id === analysis.id && (
                  <div className="p-6 bg-slate-50">
                    <h4 className="font-medium text-slate-900 mb-4">Analysis Items</h4>
                    {analysis.items.length > 0 ? (
                      <div className="space-y-3">
                        {analysis.items.map((item, index) => (
                          <div key={index} className="bg-white p-4 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-slate-900">{item.name}</h5>
                                <p className="text-sm text-slate-600">
                                  {item.category} • {item.condition}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-slate-900">
                                  {formatCurrency(item.estimatedValue.mean)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Range: {formatCurrency(item.estimatedValue.min)} - {formatCurrency(item.estimatedValue.max)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Confidence: {Math.round(item.confidence * 100)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-4">No items found in this analysis</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-900">No analyses found</h3>
            <p className="mt-1 text-sm text-slate-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters.'
                : 'Start analyzing images to see your history here.'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <div className="mt-6">
                <button
                  onClick={() => router.push('/analyze')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                >
                  Start Your First Analysis
                </button>
              </div>
            )}
          </div>
        )}

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/dashboard/overview')}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}