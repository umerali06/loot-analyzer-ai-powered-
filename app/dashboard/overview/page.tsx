'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useRouter } from 'next/navigation'

interface AnalysisStats {
  totalAnalyses: number
  totalItems: number
  totalValue: number
  averageValue: number
  highestValue: number
  lowestValue: number
  successRate: number
  lastAnalysisDate: string | null
}

interface RecentAnalysis {
  id: string
  title: string
  itemCount: number
  totalValue: number
  status: string
  createdAt: string
}

export default function DashboardOverviewPage() {
  const { user, accessToken, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<AnalysisStats>({
    totalAnalyses: 0,
    totalItems: 0,
    totalValue: 0,
    averageValue: 0,
    highestValue: 0,
    lowestValue: 0,
    successRate: 0,
    lastAnalysisDate: null
  })
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isLive, setIsLive] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth?redirect=/dashboard/overview')
    }
  }, [isAuthenticated, router])

  // Load dashboard data
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadDashboardData()
      
      // Set up real-time refresh every 30 seconds
      const interval = setInterval(() => {
        if (isAuthenticated && accessToken) {
          loadDashboardData()
        }
      }, 30000) // 30 seconds
      
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, accessToken])

  const loadDashboardData = async () => {
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

      // Fetch dashboard overview data
      const response = await fetch('/api/dashboard/overview', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': userId
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load dashboard data: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        const dashboardData = data.data
        
        // Set statistics from API
        setStats({
          totalAnalyses: dashboardData.stats.totalAnalyses,
          totalItems: dashboardData.stats.totalItems,
          totalValue: dashboardData.stats.totalValue,
          averageValue: dashboardData.stats.averageValue,
          highestValue: dashboardData.stats.highestValue,
          lowestValue: dashboardData.stats.lowestValue,
          successRate: dashboardData.stats.successRate,
          lastAnalysisDate: dashboardData.stats.lastAnalysisDate ? 
            new Date(dashboardData.stats.lastAnalysisDate).toLocaleDateString() : null
        })

        // Set recent analyses from API
        const recent = dashboardData.recentAnalyses.map((analysis: any) => ({
          id: analysis.id,
          title: analysis.title,
          itemCount: analysis.itemCount,
          totalValue: analysis.totalValue,
          status: analysis.status,
          createdAt: new Date(analysis.createdAt).toLocaleDateString()
        }))

        setRecentAnalyses(recent)
        setLastUpdated(new Date())
        setIsLive(true)
      } else {
        setError(data.message || 'Failed to load dashboard data')
      }
    } catch (error) {
      console.error('Dashboard data loading error:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
      setIsLive(false)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = async () => {
    setIsRefreshing(true)
    try {
      await loadDashboardData()
      // Show success notification
      console.log('✅ Dashboard data refreshed successfully')
    } catch (error) {
      console.error('❌ Failed to refresh dashboard data:', error)
    } finally {
      setIsRefreshing(false)
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
          <p className="text-slate-600">Loading dashboard...</p>
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
              <h1 className="text-3xl font-bold text-slate-900">Dashboard Overview</h1>
              <p className="text-slate-600 mt-1">
                Welcome back, {user?.username || 'User'}! Here's your analysis summary.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Live Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className={`text-sm font-medium ${isLive ? 'text-green-600' : 'text-red-600'}`}>
                  {isLive ? 'Live' : 'Offline'}
                </span>
              </div>
              
              {/* Last Updated */}
              {lastUpdated && (
                <div className="text-sm text-slate-500">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
              
              {/* Refresh Button */}
              <button
                onClick={refreshData}
                disabled={isRefreshing}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh Data'}
              </button>
            </div>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Analyses */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Analyses</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.totalAnalyses}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Real-time</div>
                <div className="text-xs text-green-600 font-medium">✓ Live</div>
              </div>
            </div>
          </div>

          {/* Total Items */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Items</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.totalItems}</p>
              </div>
            </div>
          </div>

          {/* Total Value */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Value</p>
                <p className="text-2xl font-semibold text-slate-900">${stats.totalValue.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Success Rate</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Average Value */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Value Analysis</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Average Value:</span>
                <span className="font-medium">${stats.averageValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Highest Value:</span>
                <span className="font-medium text-green-600">${stats.highestValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Lowest Value:</span>
                <span className="font-medium text-red-600">${stats.lowestValue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 lg:col-span-2">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Recent Activity</h3>
            {stats.lastAnalysisDate ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Last Analysis:</span>
                  <span className="font-medium">{stats.lastAnalysisDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Items Analyzed:</span>
                  <span className="font-medium">{stats.totalItems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Analyses This Session:</span>
                  <span className="font-medium">{stats.totalAnalyses}</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">No analyses completed yet</p>
            )}
          </div>
        </div>

        {/* Recent Analyses */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-slate-900">Recent Analyses</h3>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-xs text-slate-500">
                  {isLive ? 'Live updates' : 'Updates paused'}
                </span>
              </div>
            </div>
          </div>
          <div className="p-6">
            {recentAnalyses.length > 0 ? (
              <div className="space-y-4">
                {recentAnalyses.map((analysis) => (
                  <div key={analysis.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-slate-900">{analysis.title}</h4>
                      <p className="text-sm text-slate-600">
                        {analysis.itemCount} items • {analysis.createdAt}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">${analysis.totalValue.toFixed(2)}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        analysis.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {analysis.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-slate-900">No analyses yet</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Start analyzing images to see your results here.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => router.push('/analyze')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                  >
                    Start Analysis
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => router.push('/analyze')}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors duration-200"
          >
            📸 Start New Analysis
          </button>
          <button
            onClick={() => router.push('/history')}
            className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-lg transition-colors duration-200"
          >
            📚 View Full History
          </button>
        </div>
      </div>
    </div>
  )
}
