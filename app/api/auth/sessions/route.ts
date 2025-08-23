import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '../../../../lib/auth-middleware-simple'

// Force dynamic rendering since this route needs to access request headers
export const dynamic = 'force-dynamic'
import {
  successResponse,
  errorResponse,
  logRequest,
  logResponse,
  generateRequestId,
  corsHeaders
} from '../../../../lib/api-utils'
import { userSessionService } from '../../../../lib/database-service'

// GET /api/auth/sessions - List user's active sessions
const getSessions = async (request: NextRequest, user: any, session: any) => {
  const requestId = generateRequestId()
  console.log('🔍 Sessions API called with:', { user, session })
  logRequest(request, { requestId, endpoint: '/api/auth/sessions', userId: user?.userId })

  try {
    console.log('🔍 Fetching sessions for user:', user?.userId)
    
    // Use the new database service
    const sessionsResult = await userSessionService.find({ userId: user.userId })
    
    // PaginatedResult doesn't have success property, data is always available
    const userSessions = sessionsResult.data
    console.log('🔍 Found sessions:', userSessions.length)
    
    const response = successResponse(
      {
        sessions: userSessions.map(s => ({
          id: s.sessionId,
          createdAt: s.createdAt.toISOString(),
          lastActivity: s.updatedAt.toISOString(),
          expiresAt: s.expiresAt.toISOString(),
          ipAddress: 'unknown', // Not stored in new structure
          userAgent: 'unknown', // Not stored in new structure
          permissions: ['user'], // Default permissions
          roles: ['user'] // Default roles
        })),
        total: userSessions.length
      },
      'Sessions retrieved successfully'
    )

    logResponse(response, { requestId, userId: user.userId })
    return response

  } catch (error) {
    console.error('❌ Get sessions error:', error)
    
    const response = errorResponse(
      'Failed to retrieve sessions',
      500,
      error instanceof Error ? error.message : 'Internal server error',
      { requestId }
    )

    logResponse(response, { requestId, userId: user?.userId })
    return response
  }
}

// DELETE /api/auth/sessions - Terminate a specific session or all sessions
const deleteSessions = async (request: NextRequest, user: any, session: any) => {
  const requestId = generateRequestId()
  logRequest(request, { requestId, endpoint: '/api/auth/sessions', userId: user?.userId })

  try {
    const { searchParams } = request.nextUrl
    const sessionId = searchParams.get('sessionId')
    const terminateAll = searchParams.get('terminateAll') === 'true'

    let result: { removed: number; message: string }

    if (terminateAll) {
      // Terminate all sessions for the user
      const sessionsResult = await userSessionService.find({ userId: user.userId })
      let removedCount = 0
      
      // PaginatedResult doesn't have success property, data is always available
      for (const session of sessionsResult.data) {
        const deactivateResult = await userSessionService.deactivateSession(session.sessionId)
        if (deactivateResult.success) {
          removedCount++
        }
      }
      
      result = {
        removed: removedCount,
        message: `Terminated ${removedCount} sessions`
      }
    } else if (sessionId) {
      // Terminate a specific session
      const deactivateResult = await userSessionService.deactivateSession(sessionId)
      result = {
        removed: deactivateResult.success ? 1 : 0,
        message: deactivateResult.success ? 'Session terminated successfully' : 'Session not found'
      }
    } else {
      // Terminate current session only
      const deactivateResult = await userSessionService.deactivateSession(session.sessionId)
      result = {
        removed: deactivateResult.success ? 1 : 0,
        message: deactivateResult.success ? 'Current session terminated' : 'Session not found'
      }
    }

    const response = successResponse(
      result,
      'Session operation completed'
    )

    logResponse(response, { requestId, userId: user.userId })
    return response

  } catch (error) {
    console.error('Delete sessions error:', error)
    
    const response = errorResponse(
      'Failed to terminate sessions',
      500,
      error instanceof Error ? error.message : 'Internal server error',
      { requestId }
    )

    logResponse(response, { requestId, userId: user?.userId })
    return response
  }
}

// Main handler
export const GET = withAuth(getSessions)
export const DELETE = withAuth(deleteSessions)

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  })
}
