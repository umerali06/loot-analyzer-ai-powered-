import { NextRequest, NextResponse } from 'next/server'
import { comparePassword, generateAccessToken, generateRefreshToken } from '@/lib/auth-utils'
import { validateEmail } from '@/lib/auth-utils'
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse, 
  logRequest, 
  logResponse, 
  generateRequestId,
  corsHeaders
} from '@/lib/api-utils'
import { userService, userSessionService } from '@/lib/database-service'

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  logRequest(request, { requestId, endpoint: '/api/auth/login' })

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
    const { email, password } = body

    // Validate required fields
    const errors: string[] = []
    
    if (!email) {
      errors.push('Email is required')
    } else if (!validateEmail(email)) {
      errors.push('Invalid email format')
    }
    
    if (!password) {
      errors.push('Password is required')
    }

    if (errors.length > 0) {
      const response = validationErrorResponse(
        'Validation failed',
        errors
      )
      logResponse(response, { requestId })
      return response
    }

    // Find user by email in database
    console.log('🔍 Searching for user with email:', email)
    
    const userResult = await userService.findByEmail(email.toLowerCase())
    
    if (!userResult.success || !userResult.data) {
      console.log('🔍 User not found with email:', email)
      const response = errorResponse(
        'Invalid credentials',
        401,
        'The email or password you entered is incorrect. Please try again.'
      )
      logResponse(response, { requestId })
      return response
    }

    const user = userResult.data
    console.log('🔍 User found:', {
      id: user._id,
      email: user.email,
      username: user.username,
      isActive: user.isActive
    })

    // Verify password
    console.log('🔐 Verifying password...')
    const isPasswordValid = await comparePassword(password, user.password)
    
    if (!isPasswordValid) {
      console.log('🔐 Password verification failed')
      const response = errorResponse(
        'Invalid credentials',
        401,
        'The email or password you entered is incorrect. Please try again.'
      )
      logResponse(response, { requestId })
      return response
    }

    console.log('🔐 Password verified successfully')

    // Check if user is active
    if (!user.isActive) {
      const response = errorResponse(
        'Account deactivated',
        403,
        'Your account has been deactivated. Please contact support for assistance.'
      )
      logResponse(response, { requestId })
      return response
    }

    // Generate tokens
    console.log('🔑 Generating tokens...')
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)
    console.log('🔑 Tokens generated successfully')

    // Update user's last login time
    console.log('👤 Updating last login time...')
    await userService.updateLastLogin(user._id)
    console.log('👤 Last login time updated')

    // Create session in database
    console.log('📝 Creating session...')
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    
    const sessionData = {
      userId: user._id,
      sessionId,
      accessToken,
      refreshToken,
      isActive: true,
      expiresAt
    }
    
    console.log('📝 Session data to create:', {
      userId: sessionData.userId.toString(),
      sessionId: sessionData.sessionId,
      accessTokenLength: sessionData.accessToken.length,
      isActive: sessionData.isActive,
      expiresAt: sessionData.expiresAt
    })
    
    const sessionResult = await userSessionService.create(sessionData)

    if (!sessionResult.success) {
      console.error('❌ Session creation failed:', sessionResult)
      throw new Error('Failed to create session in database')
    }

    console.log('📝 Session created successfully with ID:', sessionResult.data?._id)
    
    // Verify the session was actually created by trying to find it
    console.log('🔍 Verifying session creation...')
    const verifySession = await userSessionService.findSessionByAccessToken(accessToken)
    console.log('🔍 Session verification result:', verifySession ? 'Found' : 'Not found')
    if (verifySession) {
      console.log('🔍 Verified session details:', {
        sessionId: verifySession.sessionId,
        userId: verifySession.userId.toString(),
        isActive: verifySession.isActive,
        expiresAt: verifySession.expiresAt
      })
    }

    // Prepare user data (exclude password)
    const { password: _, ...userData } = user

    // Create response data
    const responseData = {
      user: userData,
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutes in seconds
    }

    const response = successResponse(
      responseData,
      'Login successful'
    )

    logResponse(response, { requestId, userId: user._id.toString() })
    return response

  } catch (error) {
    console.error('Login error:', error)
    
    const response = errorResponse(
      'Login failed',
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
