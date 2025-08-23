'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { 
  Monitor, 
  Smartphone, 
  Globe, 
  Clock, 
  Shield, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface Session {
  id: string
  createdAt: string
  lastActivity: string
  expiresAt: string
  ipAddress: string
  userAgent: string
  permissions: string[]
  roles: string[]
}

interface SessionManagerProps {
  className?: string
}

export default function SessionManager({ className = '' }: SessionManagerProps) {
  const { accessToken } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [terminating, setTerminating] = useState<string | null>(null)

  // Fetch user sessions
  const fetchSessions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/auth/sessions', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch sessions')
      }

      const data = await response.json()
      setSessions(data.data.sessions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions')
    } finally {
      setLoading(false)
    }
  }

  // Terminate a specific session
  const terminateSession = async (sessionId: string) => {
    try {
      setTerminating(sessionId)
      
      const response = await fetch(`/api/auth/sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to terminate session')
      }

      // Remove the terminated session from the list
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to terminate session')
    } finally {
      setTerminating(null)
    }
  }

  // Terminate all other sessions
  const terminateAllOtherSessions = async () => {
    try {
      setTerminating('all')
      
      const response = await fetch('/api/auth/sessions?terminateAll=true', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to terminate sessions')
      }

      // Keep only the current session
      setSessions(prev => prev.slice(0, 1))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to terminate sessions')
    } finally {
      setTerminating(null)
    }
  }

  // Get device icon based on user agent
  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase()
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-4 w-4" />
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Monitor className="h-4 w-4" />
    } else {
      return <Globe className="h-4 w-4" />
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  // Check if session is current
  const isCurrentSession = (session: Session) => {
    // This is a simplified check - in a real app, you'd compare with the current session ID
    return session.lastActivity === sessions[0]?.lastActivity
  }

  // Get session status
  const getSessionStatus = (session: Session) => {
    const now = new Date()
    const expiresAt = new Date(session.expiresAt)
    
    if (expiresAt <= now) {
      return { status: 'expired', icon: <XCircle className="h-4 w-4 text-red-500" />, text: 'Expired' }
    }
    
    const timeUntilExpiry = expiresAt.getTime() - now.getTime()
    const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60))
    
    if (minutesUntilExpiry <= 5) {
      return { status: 'expiring', icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />, text: 'Expiring soon' }
    }
    
    return { status: 'active', icon: <CheckCircle className="h-4 w-4 text-green-500" />, text: 'Active' }
  }

  useEffect(() => {
    if (accessToken) {
      fetchSessions()
    }
  }, [accessToken])

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
            <p className="text-sm text-gray-500">
              Manage your active sessions across devices
            </p>
          </div>
          {sessions.length > 1 && (
            <button
              onClick={terminateAllOtherSessions}
              disabled={terminating === 'all'}
              className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {terminating === 'all' ? 'Terminating...' : 'Terminate All Others'}
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="divide-y divide-gray-200">
        {sessions.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No active sessions found</p>
          </div>
        ) : (
          sessions.map((session, index) => {
            const status = getSessionStatus(session)
            const isCurrent = isCurrentSession(session)
            
            return (
              <div key={session.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* Device Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getDeviceIcon(session.userAgent)}
                    </div>

                    {/* Session Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {isCurrent ? 'Current Session' : `Session ${index + 1}`}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Current
                          </span>
                        )}
                        <div className="flex items-center space-x-1">
                          {status.icon}
                          <span className="text-xs text-gray-500">{status.text}</span>
                        </div>
                      </div>

                      {/* Session Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Globe className="h-3 w-3" />
                          <span>{session.ipAddress}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Last active: {formatDate(session.lastActivity)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Shield className="h-3 w-3" />
                          <span>Created: {formatDate(session.createdAt)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Expires: {formatDate(session.expiresAt)}</span>
                        </div>
                      </div>

                      {/* User Agent */}
                      <div className="mt-2">
                        <p className="text-xs text-gray-400 truncate" title={session.userAgent}>
                          {session.userAgent}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isCurrent && (
                    <div className="flex-shrink-0 ml-4">
                      <button
                        onClick={() => terminateSession(session.id)}
                        disabled={terminating === session.id}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Terminate this session"
                      >
                        {terminating === session.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</span>
          <button
            onClick={fetchSessions}
            className="text-blue-600 hover:text-blue-700 hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
