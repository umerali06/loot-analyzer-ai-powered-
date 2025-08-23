import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '../../../../lib/auth-middleware-simple'

// Force dynamic rendering since this route uses auth middleware
export const dynamic = 'force-dynamic'
import { createSuccessResponse, createErrorResponse } from '../../../../lib/api-utils-enhanced'
import { getDatabase } from '../../../../lib/database'
import { ObjectId } from 'mongodb'

async function handler(req: NextRequest, user?: any, session?: any): Promise<NextResponse> {
  try {
    if (req.method === 'GET') {
      const userId = user?.userId
      if (!userId) {
        return createErrorResponse('User ID not found', 400)
      }

      const db = await getDatabase()
      const sessionsCollection = db.collection('user_sessions')
      
      // Convert string userId to ObjectId for MongoDB query
      const userObjectId = new ObjectId(userId)
      console.log('🔐 Login Activity API - Converting userId to ObjectId:', userId, '->', userObjectId)
      
      // Get user's login sessions
      const loginSessions = await sessionsCollection.find(
        { userId: userObjectId },
        { 
          sort: { createdAt: -1 },
          limit: 50,
          projection: {
            _id: 1,
            sessionId: 1,
            createdAt: 1,
            lastActivity: 1,
            expiresAt: 1,
            isActive: 1,
            userAgent: 1,
            ipAddress: 1
          }
        }
      ).toArray()

      // Get user's login history from auth collection if it exists
      const authCollection = db.collection('auth_logs')
      const authLogs = await authCollection.find(
        { userId: userObjectId, action: { $in: ['login', 'logout', 'failed_login'] } },
        {
          sort: { timestamp: -1 },
          limit: 50,
          projection: {
            _id: 1,
            action: 1,
            timestamp: 1,
            ipAddress: 1,
            userAgent: 1,
            success: 1,
            reason: 1
          }
        }
      ).toArray()

      // Format the data
      const formattedSessions = loginSessions.map((session: any) => ({
        id: session._id.toString(),
        sessionId: session.sessionId,
        type: 'session',
        action: session.isActive ? 'active_session' : 'expired_session',
        timestamp: session.createdAt,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
        isActive: session.isActive,
        userAgent: session.userAgent || 'Unknown',
        ipAddress: session.ipAddress || 'Unknown',
        success: true
      }))

      const formattedAuthLogs = authLogs.map((log: any) => ({
        id: log._id.toString(),
        sessionId: null,
        type: 'auth',
        action: log.action,
        timestamp: log.timestamp,
        lastActivity: log.timestamp,
        expiresAt: null,
        isActive: null,
        userAgent: log.userAgent || 'Unknown',
        ipAddress: log.ipAddress || 'Unknown',
        success: log.success,
        reason: log.reason
      }))

      // Combine and sort by timestamp
      const allActivity = [...formattedSessions, ...formattedAuthLogs]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50)

      // Get current session info
      const currentSession = loginSessions.find((s: any) => s.isActive && s.sessionId === session.sessionId)

      return createSuccessResponse({
        currentSession: currentSession ? {
          id: currentSession._id.toString(),
          sessionId: currentSession.sessionId,
          createdAt: currentSession.createdAt,
          lastActivity: currentSession.lastActivity,
          expiresAt: currentSession.expiresAt,
          userAgent: currentSession.userAgent || 'Unknown',
          ipAddress: currentSession.ipAddress || 'Unknown'
        } : null,
        activity: allActivity,
        stats: {
          totalSessions: loginSessions.length,
          activeSessions: loginSessions.filter((s: any) => s.isActive).length,
          totalLogins: authLogs.filter((l: any) => l.action === 'login' && l.success).length,
          failedLogins: authLogs.filter((l: any) => l.action === 'failed_login').length,
          lastLogin: allActivity.find((a: any) => a.action === 'login' && a.success)?.timestamp || null
        }
      })

    } else {
      return createErrorResponse('Method not allowed', 405)
    }

  } catch (error) {
    console.error('Login activity API error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export const GET = withAuth(handler)
