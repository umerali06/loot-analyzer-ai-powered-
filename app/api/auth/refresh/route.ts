import { NextRequest, NextResponse } from 'next/server'
import { 
  verifyRefreshToken, 
  generateAccessToken, 
  generateRefreshToken,
  checkRefreshRateLimit,
  resetRefreshRateLimit
} from '@/lib/auth-utils'
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse, 
  logRequest, 
  logResponse, 
  generateRequestId,
  corsHeaders
} from '@/lib/api-utils'
import { userService } from '@/lib/database-service'

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  logRequest(request, { requestId, endpoint: '/api/auth/refresh' })

  try {
    // Check if the request has a body
    if (!request.body) {
      const response = validationErrorResponse(
        'No request body provided',
        ['body']
      )
      logResponse(response, { requestId })
      return response
    }

    // Parse request body
    const body = await request.json()
    const { refreshToken } = body

    // Validate refresh token
    if (!refreshToken) {
      const response = validationErrorResponse(
        'Refresh token is required',
        ['refreshToken']
      )
      logResponse(response, { requestId })
      return response
    }

    // Verify refresh token
    const tokenPayload = verifyRefreshToken(refreshToken)
    
    if (!tokenPayload) {
      const response = errorResponse(
        'Token refresh failed',
        401,
        'Invalid or expired refresh token'
      )
      logResponse(response, { requestId })
      return response
    }

    // Check rate limiting for refresh attempts
    if (!checkRefreshRateLimit(tokenPayload.userId)) {
      const response = errorResponse(
        'Token refresh failed',
        429,
        'Too many refresh attempts. Please try again later.'
      )
      logResponse(response, { requestId })
      return response
    }

    // Find user by custom ID from token in database
    const userResult = await userService.findById(tokenPayload.userId)
    
    if (!userResult.success || !userResult.data) {
      const response = errorResponse(
        'Token refresh failed',
        401,
        'User not found'
      )
      logResponse(response, { requestId })
      return response
    }

    const user = userResult.data

    // Create a user object with the required id field for JWT generation
    const userForJWT = {
      ...user,
      id: user._id?.toString() || `user_${Date.now()}`
    }

    // Check if user is active
    if (!user.isActive) {
      const response = errorResponse(
        'Token refresh failed',
        403,
        'Account is disabled'
      )
      logResponse(response, { requestId })
      return response
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(userForJWT)
    const newRefreshToken = generateRefreshToken(userForJWT)

    // Update user's last activity
    await userService.update(user._id, { 
      lastLogin: new Date(),
      updatedAt: new Date()
    })

    // Update the session's access token in the database
    // This is crucial to keep the session valid after token refresh
    try {
      const { userSessionService } = await import('@/lib/database-service')
      
      // Find the session by the old refresh token and update it with new tokens
      const sessionsResult = await userSessionService.find({ 
        userId: user._id,
        refreshToken: refreshToken,
        isActive: true
      })
      
      if (sessionsResult.data && sessionsResult.data.length > 0) {
        const session = sessionsResult.data[0]
        console.log('🔄 Updating session with new tokens:', {
          sessionId: session.sessionId,
          oldAccessTokenLength: session.accessToken.length,
          newAccessTokenLength: newAccessToken.length
        })
        
        await userSessionService.update(session._id, {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          updatedAt: new Date()
        })
        
        console.log('✅ Session updated with new tokens')
      } else {
        console.log('⚠️ No active session found to update with new tokens')
      }
    } catch (sessionUpdateError) {
      console.error('❌ Failed to update session with new tokens:', sessionUpdateError)
      // Don't fail the refresh - the user can still use the new tokens
      // but they'll need to login again if the session lookup fails
    }

    // Create response data
    const responseData = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60 // 15 minutes in seconds
    }

    const response = successResponse(
      responseData,
      'Token refreshed successfully'
    )

    logResponse(response, { requestId, userId: user._id?.toString() || 'unknown' })
    return response

  } catch (error) {
    console.error('Token refresh error:', error)
    
    const response = errorResponse(
      'Token refresh failed',
      500,
      error instanceof Error ? error.message : 'Internal server error',
      { requestId }
    )
    
    logResponse(response, { requestId })
    return response
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  })
}
