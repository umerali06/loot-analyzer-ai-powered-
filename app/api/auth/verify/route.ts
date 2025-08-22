import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth-utils'
import { userService } from '@/lib/database-service'
import { 
  successResponse, 
  errorResponse, 
  logRequest, 
  logResponse, 
  generateRequestId,
  corsHeaders
} from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  logRequest(request, { requestId, endpoint: '/api/auth/verify' })

  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response = errorResponse(
        'Authentication required',
        401,
        'Missing or invalid authorization header'
      )
      logResponse(response, { requestId })
      return response
    }

    // Extract token
    const token = authHeader.substring(7)
    
    // Verify token
    const tokenPayload = verifyAccessToken(token)
    
    if (!tokenPayload) {
      const response = errorResponse(
        'Authentication failed',
        401,
        'Invalid or expired token'
      )
      logResponse(response, { requestId })
      return response
    }

    // Find user in database
    const userResult = await userService.findById(tokenPayload.userId)
    
    if (!userResult.success || !userResult.data) {
      const response = errorResponse(
        'User not found',
        404,
        'User not found'
      )
      logResponse(response, { requestId })
      return response
    }

    const user = userResult.data

    // Return user data (excluding sensitive information)
    const userData = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin
    }

    const response = successResponse(
      { user: userData },
      'Token verified successfully'
    )

    logResponse(response, { requestId, userId: user._id.toString() })
    return response

  } catch (error) {
    console.error('Token verification error:', error)
    
    const response = errorResponse(
      'Token verification failed',
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
