/**
 * Session Management Service
 * Handles user sessions, roles, permissions, and access control
 */

import { TokenPayload } from '@/types/auth'

// Session data interface
export interface SessionData {
  userId: string
  email: string
  username: string
  lastActivity: number
  permissions: UserPermission[]
  roles: UserRole[]
  ipAddress: string
  userAgent: string
  createdAt: number
  expiresAt: number
}

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

// Session configuration
export interface SessionConfig {
  sessionTimeout: number // in seconds
  maxSessionsPerUser: number
  cleanupInterval: number // in milliseconds
  auditLog: boolean
}

const DEFAULT_SESSION_CONFIG: SessionConfig = {
  sessionTimeout: 15 * 60, // 15 minutes
  maxSessionsPerUser: 3,
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  auditLog: true
}

/**
 * Session Manager Class
 */
export class SessionManager {
  private sessions: Map<string, SessionData> = new Map()
  private userSessions: Map<string, Set<string>> = new Map() // userId -> Set of sessionIds
  private config: SessionConfig
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_SESSION_CONFIG, ...config }
    this.startCleanupInterval()
  }

  /**
   * Create a new session for a user
   */
  createSession(
    user: TokenPayload,
    ipAddress: string,
    userAgent: string
  ): SessionData {
    const now = Date.now()
    const expiresAt = now + (this.config.sessionTimeout * 1000)

    const session: SessionData = {
      userId: user.userId,
      email: user.email,
      username: user.username,
      lastActivity: now,
      permissions: this.getUserPermissions(user),
      roles: this.getUserRoles(user),
      ipAddress,
      userAgent,
      createdAt: now,
      expiresAt
    }

    // Generate unique session ID
    const sessionId = this.generateSessionId(user.userId, now)
    
    // Store session
    this.sessions.set(sessionId, session)
    
    // Track user sessions
    if (!this.userSessions.has(user.userId)) {
      this.userSessions.set(user.userId, new Set())
    }
    this.userSessions.get(user.userId)!.add(sessionId)

    // Enforce max sessions per user
    this.enforceMaxSessionsPerUser(user.userId)

    if (this.config.auditLog) {
      console.log(`[SESSION] Created session for user ${user.username} (${user.userId}) from IP ${ipAddress}`)
    }

    return session
  }

  /**
   * Get an existing session by ID
   */
  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId)
    
    if (!session) {
      return null
    }

    // Check if session has expired
    if (this.isSessionExpired(session)) {
      this.removeSession(sessionId)
      return null
    }

    // Update last activity
    session.lastActivity = Date.now()
    session.expiresAt = Date.now() + (this.config.sessionTimeout * 1000)

    return session
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): SessionData[] {
    const sessionIds = this.userSessions.get(userId)
    if (!sessionIds) {
      return []
    }

    const sessions: SessionData[] = []
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId)
      if (session && !this.isSessionExpired(session)) {
        sessions.push(session)
      }
    }

    return sessions
  }

  /**
   * Remove a specific session
   */
  removeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    // Remove from sessions map
    this.sessions.delete(sessionId)

    // Remove from user sessions tracking
    const userSessions = this.userSessions.get(session.userId)
    if (userSessions) {
      userSessions.delete(sessionId)
      if (userSessions.size === 0) {
        this.userSessions.delete(session.userId)
      }
    }

    if (this.config.auditLog) {
      console.log(`[SESSION] Removed session for user ${session.username} (${session.userId})`)
    }

    return true
  }

  /**
   * Remove all sessions for a user
   */
  removeUserSessions(userId: string): number {
    const sessionIds = this.userSessions.get(userId)
    if (!sessionIds) {
      return 0
    }

    let removedCount = 0
    for (const sessionId of sessionIds) {
      if (this.removeSession(sessionId)) {
        removedCount++
      }
    }

    return removedCount
  }

  /**
   * Check if user has required role
   */
  hasRequiredRole(session: SessionData, requiredRoles: UserRole[]): boolean {
    return session.roles.some(role => requiredRoles.includes(role))
  }

  /**
   * Check if user has required permissions
   */
  hasRequiredPermissions(session: SessionData, requiredPermissions: UserPermission[]): boolean {
    return requiredPermissions.every(permission => session.permissions.includes(permission))
  }

  /**
   * Get user permissions based on token claims
   */
  private getUserPermissions(user: TokenPayload): UserPermission[] {
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
  private getUserRoles(user: TokenPayload): UserRole[] {
    // In a real app, this would come from the database or token claims
    // For now, we'll assign the USER role to all authenticated users
    return [USER_ROLES.USER]
  }

  /**
   * Check if session has expired
   */
  private isSessionExpired(session: SessionData): boolean {
    return Date.now() > session.expiresAt
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(userId: string, timestamp: number): string {
    return `${userId}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Enforce maximum sessions per user
   */
  private enforceMaxSessionsPerUser(userId: string): void {
    const userSessions = this.userSessions.get(userId)
    if (!userSessions || userSessions.size <= this.config.maxSessionsPerUser) {
      return
    }

    // Remove oldest sessions
    const sessionIds = Array.from(userSessions)
    const sessions = sessionIds
      .map(id => ({ id, session: this.sessions.get(id) }))
      .filter(({ session }) => session !== undefined)
      .sort((a, b) => a.session!.createdAt - b.session!.createdAt)

    const sessionsToRemove = sessions.slice(0, sessions.length - this.config.maxSessionsPerUser)
    
    for (const { id } of sessionsToRemove) {
      this.removeSession(id)
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions()
    }, this.config.cleanupInterval)
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session)) {
        this.removeSession(sessionId)
        cleanedCount++
      }
    }

    if (cleanedCount > 0 && this.config.auditLog) {
      console.log(`[SESSION] Cleaned up ${cleanedCount} expired sessions`)
    }
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number
    activeUsers: number
    totalUserSessions: number
  } {
    return {
      totalSessions: this.sessions.size,
      activeUsers: this.userSessions.size,
      totalUserSessions: Array.from(this.userSessions.values()).reduce((sum, sessions) => sum + sessions.size, 0)
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager()

// Export utility functions
export function getClientIP(request: any): string {
  return request.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers?.get('x-real-ip') ||
         request.ip ||
         'Unknown'
}

export function logSuccessfulAccess(session: SessionData, endpoint: string): void {
  console.log(`[AUDIT] Successful access - User: ${session.username} (${session.userId}), IP: ${session.ipAddress}, Endpoint: ${endpoint}`)
}

export function logAccessDenied(session: SessionData, reason: string, endpoint: string): void {
  console.log(`[AUDIT] Access denied - User: ${session.username} (${session.userId}), IP: ${session.ipAddress}, Endpoint: ${endpoint}, Reason: ${reason}`)
}
