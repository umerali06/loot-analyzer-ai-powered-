import { NextRequest, NextResponse } from 'next/server'
import { 
  successResponse, 
  errorResponse, 
  logRequest, 
  logResponse, 
  generateRequestId,
  corsHeaders
} from '../../../../lib/api-utils'

// Force dynamic rendering since this route needs to access request headers
export const dynamic = 'force-dynamic'
import { blacklistToken, extractTokenFromHeader } from '../../../../lib/auth-utils'

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  logRequest(request, { requestId, endpoint: '/api/auth/logout' })

  try {
    // Get authorization header and extract token
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (token) {
      // Add token to blacklist for security
      blacklistToken(token)
      
      // Log the logout for audit purposes
      console.log(`User logged out. Token added to blacklist: ${token.substring(0, 20)}...`)
    }

    const response = successResponse(
      null,
      'Logout successful'
    )

    logResponse(response, { requestId })
    return response

  } catch (error) {
    console.error('Logout error:', error)
    
    const response = errorResponse(
      'Logout failed',
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
