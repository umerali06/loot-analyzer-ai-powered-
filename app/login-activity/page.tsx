'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { 
  Activity, 
  Clock, 
  Globe, 
  Monitor, 
  Shield, 
  ArrowLeft,
  RefreshCw
} from 'lucide-react'

interface LoginActivity {
  id: string
  sessionId: string | null
  type: 'session' | 'auth'
  action: string
  timestamp: string
  lastActivity: string
  expiresAt: string | null
  isActive: boolean | null
  userAgent: string
  ipAddress: string
  success: boolean
  reason?: string
}

interface CurrentSession {
  id: string
  sessionId: string
  createdAt: string
  lastActivity: string
  expiresAt: string
  userAgent: string
  ipAddress: string
}

interface ActivityStats {
  totalSessions: number
  activeSessions: number
  totalLogins: number
  failedLogins: number
  lastLogin: string | null
}

export default function LoginActivityPage() {
  const { isAuthenticated, accessToken } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null)
  const [activity, setActivity] = useState<LoginActivity[]>([])
  const [stats, setStats] = useState<ActivityStats>({
    totalSessions: 0,
    activeSessions: 0,
    totalLogins: 0,
    failedLogins: 0,
    lastLogin: null
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth?redirect=/login-activity')
    }
  }, [isAuthenticated, router])

  // Fetch login activity data
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchLoginActivity()
    }
  }, [isAuthenticated, accessToken])

  const fetchLoginActivity = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/user/login-activity', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setCurrentSession(data.data.currentSession)
          setActivity(data.data.activity)
          setStats(data.data.stats)
        }
      }
    } catch (error) {
      console.error('Failed to fetch login activity:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = async () => {
    setIsRefreshing(true)
    await fetchLoginActivity()
    setIsRefreshing(false)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-slate-300 border-t-slate-600 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-slate-300 border-t-slate-600 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading login activity...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/profile')}
                className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Profile</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Login Activity</h1>
                <p className="text-slate-600 mt-1">Monitor your account access and sessions</p>
              </div>
            </div>
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Session */}
            {currentSession && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-green-500" />
                  Current Session
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-3">
                      <Monitor className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-green-600">Device</p>
                        <p className="text-green-900 font-medium">{currentSession.userAgent}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-600">IP Address</p>
                        <p className="text-blue-900 font-medium">{currentSession.ipAddress}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Activity History */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Activity History</h2>
              <div className="space-y-4">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{item.action}</p>
                      <p className="text-xs text-slate-600">{item.userAgent} - {item.ipAddress}</p>
                      <p className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">Activity Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-slate-700">Total Sessions</span>
                  <span className="text-lg font-bold text-blue-900">{stats.totalSessions}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-slate-700">Active Sessions</span>
                  <span className="text-lg font-bold text-green-900">{stats.activeSessions}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

