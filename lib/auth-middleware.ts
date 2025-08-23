import { NextRequest, NextResponse } from 'next/server'
import { 
  verifySecureAccessToken, 
  extractTokenFromHeader, 
  validateTokenFormat,
  checkRefreshRateLimit,
  resetRefreshRateLimit
} from './auth-utils'
import { TokenPayload } from '../types/auth'

// Enhanced middleware configuration
export interface AuthMiddlewareConfig {
  requireAuth: boolean
  allowedRoles?: UserRole[]
  allowedPermissions?: UserPermission[]
  redirectTo?: string
  rateLimit?: {
    maxRequests: number
    windowMs: number
  }
  sessionTimeout?: number // in seconds
  auditLog?: boolean
}

// Default configuration
const defaultConfig: AuthMiddlewareConfig = {
  requireAuth: true,
  redirectTo: '/auth',
  allowedRoles: undefined,
  allowedPermissions: undefined,
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000 // 1 minute
  },
  sessionTimeout: 15 * 60, // 15 minutes
  auditLog: true
}

// Session store for active sessions (in production, use Redis or database)
interface SessionData {
  userId: string
  email: string
  username: string
  lastActivity: number
  permissions: UserPermission[]
  roles: UserRole[]
  ipAddress: string
  userAgent: string
}

const activeSessions = new Map<string, SessionData>()

// Role definitions
export const USER_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest'
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

// Permission definitions
export const USER_PERMISSIONS = {
  // Analysis permissions
  ANALYZE_LOTS: 'analyze:lots',
  VIEW_HISTORY: 'view:history',
  EXPORT_DATA: 'export:data',
  
  // User management permissions
  MANAGE_PROFILE: 'manage:profile',
  CHANGE_PASSWORD: 'change:password',
  
  // Admin permissions
  MANAGE_USERS: 'manage:users',
  VIEW_ANALYTICS: 'view:analytics',
  SYSTEM_CONFIG: 'system:config'
} as const

export type UserPermission = typeof USER_PERMISSIONS[keyof typeof USER_PERMISSIONS]

// Role-permission mapping
const ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  [USER_ROLES.ADMIN]: [
    USER_PERMISSIONS.ANALYZE_LOTS,
    USER_PERMISSIONS.VIEW_HISTORY,
    USER_PERMISSIONS.EXPORT_DATA,
    USER_PERMISSIONS.MANAGE_PROFILE,
    USER_PERMISSIONS.CHANGE_PASSWORD,
    USER_PERMISSIONS.MANAGE_USERS,
    USER_PERMISSIONS.VIEW_ANALYTICS,
    USER_PERMISSIONS.SYSTEM_CONFIG
  ],
  [USER_ROLES.MODERATOR]: [
    USER_PERMISSIONS.ANALYZE_LOTS,
    USER_PERMISSIONS.VIEW_HISTORY,
    USER_PERMISSIONS.EXPORT_DATA,
    USER_PERMISSIONS.MANAGE_PROFILE,
    USER_PERMISSIONS.CHANGE_PASSWORD,
    USER_PERMISSIONS.VIEW_ANALYTICS
  ],
  [USER_ROLES.USER]: [
    USER_PERMISSIONS.ANALYZE_LOTS,
    USER_PERMISSIONS.VIEW_HISTORY,
    USER_PERMISSIONS.EXPORT_DATA,
    USER_PERMISSIONS.MANAGE_PROFILE,
    USER_PERMISSIONS.CHANGE_PASSWORD
  ],
  [USER_ROLES.GUEST]: [
    USER_PERMISSIONS.ANALYZE_LOTS
  ]
}

/**
 * Enhanced middleware function to protect API routes
 */
export function withAuth(
  handler: (request: NextRequest, user?: TokenPayload, session?: SessionData) => Promise<NextResponse>,
  config: Partial<AuthMiddlewareConfig> = {}
) {
  return async (request: NextRequest) => {
    const finalConfig: AuthMiddlewareConfig = { ...defaultConfig, ...config }
    
    try {
      // Get authorization header
      const authHeader = request.headers.get('authorization')
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
      if (!token || !validateTokenFormat(token)) {
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
      const user = verifySecureAccessToken(token)

      if (!user) {
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

      // Get or create session
      const session = await getOrCreateSession(user, request, finalConfig)
      
      if (!session) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Session creation failed',
            error: 'Unable to create user session'
          },
          { status: 500 }
        )
      }

      // Check session timeout
      if (isSessionExpired(session, finalConfig.sessionTimeout!)) {
        // Remove expired session
        activeSessions.delete(user.userId)
        
        return NextResponse.json(
          { 
            success: false, 
            message: 'Session expired',
            error: 'Please log in again'
          },
          { status: 401 }
        )
      }

      // Update session activity
      updateSessionActivity(session)

      // Check role requirements if specified
      if (finalConfig.allowedRoles && finalConfig.allowedRoles.length > 0) {
        if (!hasRequiredRole(session.roles, finalConfig.allowedRoles)) {
          if (finalConfig.auditLog) {
            logAccessDenied(session, 'Insufficient role permissions', request)
          }
          
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
        if (!hasRequiredPermissions(session.permissions, finalConfig.allowedPermissions)) {
          if (finalConfig.auditLog) {
            logAccessDenied(session, 'Insufficient permissions', request)
          }
          
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
          if (finalConfig.auditLog) {
            logAccessDenied(session, 'Rate limit exceeded', request)
          }
          
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

      // Log successful access if audit logging is enabled
      if (finalConfig.auditLog) {
        logSuccessfulAccess(session, request)
      }

      // Call the handler with the authenticated user and session
      return handler(request, user, session)

    } catch (error) {
      console.error('Auth middleware error:', error)
      
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
 * Get or create a user session
 */
async function getOrCreateSession(
  user: TokenPayload, 
  request: NextRequest, 
  config: AuthMiddlewareConfig
): Promise<SessionData | null> {
  try {
    // Check if session already exists
    let session = activeSessions.get(user.userId)
    
    if (session) {
      // Update session with current request info
      session.ipAddress = getClientIP(request)
      session.userAgent = request.headers.get('user-agent') || 'Unknown'
      return session
    }

    // Create new session
    const newSession: SessionData = {
      userId: user.userId,
      email: user.email,
      username: user.username,
      lastActivity: Date.now(),
      permissions: getUserPermissions(user),
      roles: getUserRoles(user),
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'Unknown'
    }

    activeSessions.set(user.userId, newSession)
    return newSession

  } catch (error) {
    console.error('Session creation error:', error)
    return null
  }
}

/**
 * Get user permissions based on token claims
 */
function getUserPermissions(user: TokenPayload): UserPermission[] {
  // In a real app, this would come from the database or token claims
  // For now, we'll assign basic permissions to all users
  return [
    USER_PERMISSIONS.ANALYZE_LOTS,
    USER_PERMISSIONS.VIEW_HISTORY,
    USER_PERMISSIONS.EXPORT_DATA,
    USER_PERMISSIONS.MANAGE_PROFILE,
    USER_PERMISSIONS.CHANGE_PASSWORD
  ]
}

/**
 * Get user roles based on token claims
 */
function getUserRoles(user: TokenPayload): UserRole[] {
  // In a real app, this would come from the database or token claims
  // For now, we'll assign the USER role to all authenticated users
  return [USER_ROLES.USER]
}

/**
 * Check if session has expired
 */
function isSessionExpired(session: SessionData, timeoutSeconds: number): boolean {
  const now = Date.now()
  const lastActivity = session.lastActivity
  const timeoutMs = timeoutSeconds * 1000
  
  return (now - lastActivity) > timeoutMs
}

/**
 * Update session activity timestamp
 */
function updateSessionActivity(session: SessionData): void {
  session.lastActivity = Date.now()
}

/**
 * Check if user has required role
 */
function hasRequiredRole(userRoles: UserRole[], requiredRoles: UserRole[]): boolean {
  return userRoles.some(role => requiredRoles.includes(role))
}

/**
 * Check if user has required permissions
 */
function hasRequiredPermissions(userPermissions: UserPermission[], requiredPermissions: UserPermission[]): boolean {
  return requiredPermissions.every(permission => userPermissions.includes(permission))
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         request.ip ||
         'Unknown'
}

/**
 * Log successful access
 */
function logSuccessfulAccess(session: SessionData, request: NextRequest): void {
  console.log(`[AUDIT] Successful access - User: ${session.username} (${session.userId}), IP: ${session.ipAddress}, Endpoint: ${request.nextUrl?.pathname}`)
}

/**
 * Log access denied
 */
function logAccessDenied(session: SessionData, reason: string, request: NextRequest): void {
  console.log(`[AUDIT] Access denied - User: ${session.username} (${session.userId}), IP: ${session.ipAddress}, Endpoint: ${request.nextUrl?.pathname}, Reason: ${reason}`)
}

/**
 * Middleware function to protect pages (for use in getServerSideProps or similar)
 */
export function withPageAuth(
  handler: (context: any, user?: TokenPayload) => Promise<any>,
  config: Partial<AuthMiddlewareConfig> = {}
) {
  return async (context: any) => {
    const finalConfig = { ...defaultConfig, ...config }
    
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
      const user = verifySecureAccessToken(token)

      if (!user) {
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

      // Check role requirements if specified
      if (finalConfig.allowedRoles && finalConfig.allowedRoles.length > 0) {
        // Basic role checking
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
    return verifySecureAccessToken(token)
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

/**
 * Rate limiting helper for authenticated requests
 */
export function createRateLimiter(maxRequests: number = 100, windowMs: number = 60000) {
  const requests = new Map<string, { count: number; resetTime: number }>()

  return function checkRateLimit(userId: string): boolean {
    const now = Date.now()
    const userRequests = requests.get(userId)

    if (!userRequests || now > userRequests.resetTime) {
      requests.set(userId, { count: 1, resetTime: now + windowMs })
      return true
    }

    if (userRequests.count >= maxRequests) {
      return false
    }

    userRequests.count++
    return true
  }
}
