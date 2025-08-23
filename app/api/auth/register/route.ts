import { NextRequest, NextResponse } from 'next/server'
import { 
  hashPassword, 
  generateAccessToken, 
  generateRefreshToken,
  validateEmail,
  validateUsername,
  validatePassword
} from '../../../../lib/auth-utils'

// Force dynamic rendering since this route needs to access request headers
export const dynamic = 'force-dynamic'
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse, 
  logRequest, 
  logResponse, 
  generateRequestId,
  corsHeaders
} from '../../../../lib/api-utils'
import { userService, userSessionService } from '../../../../lib/database-service'
const { ObjectId } = require('mongodb')

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  logRequest(request, { requestId, endpoint: '/api/auth/register' })

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
    const { email, username, password, firstName, lastName } = body

    // Validate required fields
    const errors: string[] = []
    
    if (!email) {
      errors.push('Email is required')
    } else if (!validateEmail(email)) {
      errors.push('Invalid email format')
    }
    
    if (!username) {
      errors.push('Username is required')
    } else {
      const usernameValidation = validateUsername(username)
      if (!usernameValidation.isValid) {
        errors.push(...usernameValidation.errors)
      }
    }
    
    if (!password) {
      errors.push('Password is required')
    } else {
      const passwordValidation = validatePassword(password)
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors)
      }
    }

    // Validate optional fields if provided
    if (firstName && firstName.trim().length < 2) {
      errors.push('First name must be at least 2 characters long')
    }
    
    if (lastName && lastName.trim().length < 2) {
      errors.push('Last name must be at least 2 characters long')
    }

    if (errors.length > 0) {
      const response = validationErrorResponse(
        'Validation failed',
        errors
      )
      logResponse(response, { requestId })
      return response
    }

    // Check if email already exists
    const emailExistsResult = await userService.findByEmail(email)
    if (emailExistsResult.success && emailExistsResult.data) {
      const response = errorResponse(
        'Email already exists',
        409,
        'An account with this email address is already registered. Please use a different email or try logging in instead.'
      )
      logResponse(response, { requestId })
      return response
    }

    // Check if username already exists
    const usernameExistsResult = await userService.findByUsername(username)
    if (usernameExistsResult.success && usernameExistsResult.data) {
      const response = errorResponse(
        'Username already taken',
        409,
        'This username is already taken. Please choose a different username.'
      )
      logResponse(response, { requestId })
      return response
    }

    // Hash password
    console.log('🔐 Hashing password...')
    const passwordHash = await hashPassword(password)
    console.log('🔐 Password hashed successfully')

    // Create new user in database
    console.log('👤 Creating user in database...')
    const newUserResult = await userService.create({
      email,
      username,
      password: passwordHash,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      role: 'user',
      isActive: true
    })

    if (!newUserResult.success || !newUserResult.data) {
      throw new Error('Failed to create user in database')
    }

    const newUser = newUserResult.data
    console.log('👤 User created:', {
      id: newUser._id,
      email: newUser.email,
      username: newUser.username
    })

    // Generate tokens
    const accessToken = generateAccessToken(newUser)
    const refreshToken = generateRefreshToken(newUser)

    // Create session in database
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    
    const sessionResult = await userSessionService.create({
      userId: newUser._id,
      sessionId,
      accessToken,
      refreshToken,
      isActive: true,
      expiresAt
    })

    if (!sessionResult.success) {
      throw new Error('Failed to create session in database')
    }

    // Prepare user data (exclude password)
    const { password: _, ...userData } = newUser

    // Create response data
    const responseData = {
      user: userData,
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutes in seconds
    }

    const response = successResponse(
      responseData,
      'Account created successfully'
    )

    logResponse(response, { requestId, userId: newUser._id.toString() })
    return response

  } catch (error) {
    console.error('Registration error:', error)
    
    const response = errorResponse(
      'Registration failed',
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
