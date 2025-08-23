/**
 * Simplified Auth Middleware
 * Uses MongoDB-based session management
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  verifyAccessToken, 
  extractTokenFromHeader, 
  validateTokenFormat
} from './auth-utils'
import { TokenPayload } from '../types/auth'
import { userSessionService } from './database-service'

// Middleware configuration
export interface AuthMiddlewareConfig {
  requireAuth: boolean
  allowedRoles?: string[]
  allowedPermissions?: string[]
  redirectTo?: string
  rateLimit?: {
    maxRequests: number
    windowMs: number
  }
  auditLog?: boolean
}

// Default configuration
const defaultConfig: AuthMiddlewareConfig = {
  requireAuth: true,
  redirectTo: '/auth',
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000 // 1 minute
  },
  auditLog: true
}

// Simple rate limiter
const rateLimiters = new Map<string, { count: number; resetTime: number }>()

function createRateLimiter(maxRequests: number, windowMs: number) {
  return (userId: string) => {
    const now = Date.now()
    const limiter = rateLimiters.get(userId)
    
    if (!limiter || now > limiter.resetTime) {
      rateLimiters.set(userId, { count: 1, resetTime: now + windowMs })
      return true
    }
    
    if (limiter.count >= maxRequests) {
      return false
    }
    
    limiter.count++
    return true
  }
}

/**
 * Enhanced middleware function to protect API routes
 */
export function withAuth(
  handler: (request: NextRequest, user?: TokenPayload, session?: any) => Promise<NextResponse>,
  config: Partial<AuthMiddlewareConfig> = {}
) {
  return async (request: NextRequest) => {
    const finalConfig: AuthMiddlewareConfig = { ...defaultConfig, ...config }
    
    try {
      console.log('🔐 Auth middleware called for:', request.method, request.nextUrl?.pathname || 'unknown path')
      
      // Get authorization header
      const authHeader = request.headers.get('authorization')
      console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing')
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ No valid auth header')
        if (finalConfig.requireAuth) {
          return NextResponse.json(
            { 
              success: false, 
              message: 'Authentication required',
              error: 'Missing or invalid authorization header'
            },
            { status: 401 }
          )
        }
        // If auth is not required, proceed without user
        return handler(request)
      }

      // Extract and validate token format
      const token = extractTokenFromHeader(authHeader)
      console.log('🔐 Token extracted:', token ? 'Yes' : 'No')
      
      if (!token || !validateTokenFormat(token)) {
        console.log('❌ Invalid token format')
        if (finalConfig.requireAuth) {
          return NextResponse.json(
            { 
              success: false, 
              message: 'Authentication failed',
              error: 'Invalid token format'
            },
            { status: 401 }
          )
        }
        return handler(request)
      }

      // Verify token with enhanced security
      console.log('🔐 Verifying token...')
      const user = verifyAccessToken(token)
      console.log('🔐 Token verification result:', user ? 'Success' : 'Failed')

      if (!user) {
        console.log('❌ Token verification failed')
        if (finalConfig.requireAuth) {
          return NextResponse.json(
            { 
              success: false, 
              message: 'Authentication failed',
              error: 'Invalid or expired token'
            },
            { status: 401 }
          )
        }
        // If auth is not required, proceed without user
        return handler(request)
      }

      // Find session in database using access token
      console.log('🔐 Looking for session with token...')
      console.log('🔐 Token length:', token.length)
      console.log('🔐 Token preview:', token.substring(0, 20) + '...')
      
      let session = await userSessionService.findSessionByAccessToken(token)
      console.log('🔐 Session found:', session ? 'Yes' : 'No')
      

      
      if (session) {
        console.log('🔐 Session details:', {
          sessionId: session.sessionId,
          userId: session.userId.toString(),
          isActive: session.isActive,
          expiresAt: session.expiresAt
        })
      }
      
      if (!session) {
        console.log('❌ Session not found in database')
        if (finalConfig.requireAuth) {
          return NextResponse.json(
            { 
              success: false, 
              message: 'Session not found',
              error: 'Invalid or expired session'
            },
            { status: 401 }
          )
        }
        return handler(request)
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        console.log('❌ Session expired')
        if (finalConfig.requireAuth) {
          return NextResponse.json(
            { 
              success: false, 
              message: 'Session expired',
              error: 'Please login again'
            },
            { status: 401 }
          )
        }
        return handler(request)
      }

      // Update session activity
      await userSessionService.updateSessionActivity(session.sessionId)
      console.log('✅ Session validated and activity updated')

      // Check role requirements if specified
      if (finalConfig.allowedRoles && finalConfig.allowedRoles.length > 0) {
        // Default to user role since UserSession doesn't have roles
        const userRoles = ['user']
        const hasRole = finalConfig.allowedRoles.some(role => 
          userRoles.includes(role)
        )
        
        if (!hasRole) {
          return NextResponse.json(
            { 
              success: false, 
              message: 'Access denied',
              error: 'Insufficient role permissions'
            },
            { status: 403 }
          )
        }
      }

      // Check permission requirements if specified
      if (finalConfig.allowedPermissions && finalConfig.allowedPermissions.length > 0) {
        // Default to basic user permissions since UserSession doesn't have permissions
        const userPermissions = ['read', 'write']
        const hasPermission = finalConfig.allowedPermissions.some(permission => 
          userPermissions.includes(permission)
        )
        
        if (!hasPermission) {
          return NextResponse.json(
            { 
              success: false, 
              message: 'Access denied',
              error: 'Insufficient permissions'
            },
            { status: 403 }
          )
        }
      }

      // Check rate limiting if configured
      if (finalConfig.rateLimit) {
        const rateLimiter = createRateLimiter(
          finalConfig.rateLimit.maxRequests,
          finalConfig.rateLimit.windowMs
        )
        
        if (!rateLimiter(user.userId)) {
          return NextResponse.json(
            { 
              success: false, 
              message: 'Too many requests',
              error: 'Rate limit exceeded'
            },
            { status: 429 }
          )
        }
      }

      // Call the handler with the authenticated user and session
      console.log('✅ Auth middleware successful, calling handler')
      console.log('🔐 User from token:', user)
      console.log('🔐 Session from DB:', session)
      
              // Pass both the JWT user data and the session data
        // The handler can access user.userId directly
        return handler(request, user, session)

    } catch (error) {
      console.error('❌ Auth middleware error:', error)
      
      if (finalConfig.requireAuth) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Authentication error',
            error: 'Internal server error during authentication'
          },
          { status: 500 }
        )
      }
      
      // If auth is not required, proceed without user
      return handler(request)
    }
  }
}

/**
 * Middleware function to protect pages (for use in getServerSideProps or similar)
 */
export function withPageAuth(
  handler: (context: any, user?: TokenPayload) => Promise<any>,
  config: Partial<AuthMiddlewareConfig> = {}
) {
  return async (context: any) => {
    const finalConfig: AuthMiddlewareConfig = { ...defaultConfig, ...config }
    
    try {
      // Get token from cookies or headers
      const token = context.req?.cookies?.accessToken || 
                   context.req?.headers?.authorization?.replace('Bearer ', '')

      if (!token) {
        if (finalConfig.requireAuth) {
          return {
            redirect: {
              destination: finalConfig.redirectTo,
              permanent: false
            }
          }
        }
        // If auth is not required, proceed without user
        return handler(context)
      }

      // Verify token
      const user = verifyAccessToken(token)

      if (!user) {
        if (finalConfig.requireAuth) {
          return {
            redirect: {
              destination: finalConfig.redirectTo,
              permanent: false
            }
          }
        }
        return handler(context)
      }

      // Check role requirements if specified
      if (finalConfig.allowedRoles && finalConfig.allowedRoles.length > 0) {
        // Basic role checking - in a real app, you'd use the session manager
        if (!finalConfig.allowedRoles.includes('user')) {
          return {
            redirect: {
              destination: '/unauthorized',
              permanent: false
            }
          }
        }
      }

      // Call the handler with the authenticated user
      return handler(context, user)

    } catch (error) {
      console.error('Page auth middleware error:', error)
      
      if (finalConfig.requireAuth) {
        return {
          redirect: {
            destination: finalConfig.redirectTo,
            permanent: false
          }
        }
      }
      
      // If auth is not required, proceed without user
      return handler(context)
    }
  }
}

/**
 * Utility function to extract user from request headers
 */
export function extractUserFromRequest(request: NextRequest): TokenPayload | null {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    return verifyAccessToken(token)
  } catch {
    return null
  }
}

/**
 * Utility function to check if user has required permissions
 */
export function hasPermission(user: TokenPayload, requiredPermission: string): boolean {
  // Basic permission checking - extend this based on your needs
  // For now, all authenticated users have basic permissions
  return true
}

/**
 * Utility function to get user context for logging
 */
export function getUserContext(user?: TokenPayload): Record<string, any> {
  if (!user) {
    return { authenticated: false }
  }

  return {
    authenticated: true,
    userId: user.userId,
    email: user.email,
    username: user.username
  }
}
