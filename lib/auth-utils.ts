import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PasswordValidation, TokenPayload, User as AuthUser } from '../types/auth'
import { User as DbUser } from '../types/database'
import { PASSWORD_CONFIG } from './password-config'

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production'
const ACCESS_TOKEN_EXPIRY = '1h'  // Increased from '15m' to '1h'
const REFRESH_TOKEN_EXPIRY = '7d'

// Token blacklist for logout (in production, use Redis or database)
const tokenBlacklist = new Set<string>()

// Rate limiting for token refresh
const refreshAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_REFRESH_ATTEMPTS = 5
const REFRESH_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

/**
 * Convert database User to auth User
 */
function convertDbUserToAuthUser(dbUser: DbUser): AuthUser {
  return {
    id: dbUser._id.toString(),
    email: dbUser.email,
    username: dbUser.username,
    firstName: '', // Not stored in new database structure
    lastName: '',  // Not stored in new database structure
    createdAt: dbUser.createdAt.toISOString(),
    updatedAt: dbUser.updatedAt.toISOString(),
    lastLoginAt: dbUser.lastLogin?.toISOString(),
    isActive: dbUser.isActive,
    preferences: {
      defaultAnalysisOptions: {
        filterOutliers: true,
        includeGptEstimate: true,
        maxEbayResults: 10
      },
      notifications: {
        email: true,
        push: false
      },
      theme: 'system' as 'light' | 'dark' | 'system'
    }
  }
}



/**
 * Enhanced password validation with comprehensive security rules
 */
export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = []
  let score = 0

  // Length check
  if (password.length < PASSWORD_CONFIG.minLength) {
    errors.push(`Password must be at least ${PASSWORD_CONFIG.minLength} characters long`)
  } else if (password.length >= PASSWORD_CONFIG.recommendedLength) {
    score += PASSWORD_CONFIG.scoring.length.recommended
  } else {
    score += PASSWORD_CONFIG.scoring.length.min
  }

  // Character variety checks
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)
  const hasUnicode = /[\u0080-\uFFFF]/.test(password)

  if (PASSWORD_CONFIG.requireUppercase && !hasUppercase) {
    errors.push('Password must contain at least one uppercase letter')
  } else if (hasUppercase) {
    score += PASSWORD_CONFIG.scoring.characterTypes.uppercase
  }

  if (PASSWORD_CONFIG.requireLowercase && !hasLowercase) {
    errors.push('Password must contain at least one lowercase letter')
  } else if (hasLowercase) {
    score += PASSWORD_CONFIG.scoring.characterTypes.lowercase
  }

  if (PASSWORD_CONFIG.requireNumbers && !hasNumbers) {
    errors.push('Password must contain at least one number')
  } else if (hasNumbers) {
    score += PASSWORD_CONFIG.scoring.characterTypes.numbers
  }

  if (PASSWORD_CONFIG.requireSpecialChars && !hasSpecialChars) {
    errors.push('Password must contain at least one special character')
  } else if (hasSpecialChars) {
    score += PASSWORD_CONFIG.scoring.characterTypes.specialChars
  }

  if (hasUnicode) {
    score += PASSWORD_CONFIG.scoring.characterTypes.unicode
  }

  // Pattern checks (warnings, not blocking errors)
  const hasRepeatingChars = /(.)\1{2,}/.test(password)
  const hasSequentialChars = /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|123|234|345|456|567|678|789|012)/i.test(password)
  const hasKeyboardPatterns = /(qwerty|asdfgh|zxcvbn|123456|654321)/i.test(password)

  // Only warn about patterns, don't block registration
  if (hasRepeatingChars) {
    score += PASSWORD_CONFIG.scoring.penalties.repeatingChars
  }

  if (hasSequentialChars) {
    score += PASSWORD_CONFIG.scoring.penalties.sequentialChars
  }

  if (hasKeyboardPatterns) {
    score += PASSWORD_CONFIG.scoring.penalties.keyboardPatterns
  }

  // Common password check - only warn, don't block
  if (PASSWORD_CONFIG.commonPasswords.some(common => password.toLowerCase().includes(common))) {
    score += PASSWORD_CONFIG.scoring.penalties.commonWords
  }

  // Entropy calculation (simplified) - only warn, don't block
  const uniqueChars = new Set(password).size
  if (uniqueChars < password.length * 0.6) {
    score += PASSWORD_CONFIG.scoring.penalties.lowEntropy
  } else {
    score += 1
  }

  // Determine strength level using configuration thresholds
  const thresholds = {
    weak: 2,
    medium: 4,
    strong: 6
  }
  
  let strength: 'weak' | 'medium' | 'strong'
  if (score >= thresholds.strong && errors.length === 0) {
    strength = 'strong'
  } else if (score >= thresholds.medium && errors.length <= 1) {
    strength = 'medium'
  } else {
    strength = 'weak'
  }

  // Final validation
  const isValid = errors.length === 0 && score >= thresholds.weak

  return {
    isValid,
    errors,
    warnings: [], // Add warnings array for compatibility
    strength,
    score: Math.max(0, score) // Ensure score is not negative
  }
}

/**
 * Generate a cryptographically secure password
 */
export function generateSecurePassword(length?: number): string {
  const passwordLength = length ?? PASSWORD_CONFIG.recommendedLength
  const charset = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  }

  let password = ''
  
  // Ensure at least one character from each category
  password += charset.uppercase[Math.floor(Math.random() * charset.uppercase.length)]
  password += charset.lowercase[Math.floor(Math.random() * charset.lowercase.length)]
  password += charset.numbers[Math.floor(Math.random() * charset.numbers.length)]
  password += charset.symbols[Math.floor(Math.random() * charset.symbols.length)]

  // Fill the rest with random characters
  const allChars = charset.uppercase + charset.lowercase + charset.numbers + charset.symbols
  for (let i = 4; i < passwordLength; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Enhanced password hashing with configurable salt rounds
 */
export async function hashPassword(password: string, saltRounds?: number): Promise<string> {
  try {
    const rounds = saltRounds ?? PASSWORD_CONFIG.bcryptSaltRounds
    const salt = await bcrypt.genSalt(rounds)
    return await bcrypt.hash(password, salt)
  } catch (error) {
    console.error('Password hashing error:', error)
    throw new Error('Failed to hash password')
  }
}

/**
 * Enhanced password comparison with timing attack protection
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash)
  } catch (error) {
    console.error('Password comparison error:', error)
    throw new Error('Failed to compare passwords')
  }
}

/**
 * Check if password hash needs rehashing (for security updates)
 */
export async function needsRehash(hash: string, saltRounds?: number): Promise<boolean> {
  try {
    const rounds = saltRounds ?? PASSWORD_CONFIG.bcryptSaltRounds
    return bcrypt.getRounds(hash) < rounds
  } catch (error) {
    console.error('Hash validation error:', error)
    return true // If we can't validate, assume it needs rehashing
  }
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(user: DbUser): string {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    username: user.username,
    iat: Math.floor(Date.now() / 1000)
    // Remove exp property - let jwt.sign handle it with expiresIn
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })
}

/**
 * Generate refresh token for user
 */
export function generateRefreshToken(user: DbUser): string {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    username: user.username,
    iat: Math.floor(Date.now() / 1000)
    // Remove exp property - let jwt.sign handle it with expiresIn
  }
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY })
}

/**
 * Verify JWT access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * Verify JWT refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * Generate secure random token for password reset
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Sanitize user data for public responses (remove sensitive information)
 */
export function sanitizeUser(user: AuthUser): Omit<AuthUser, 'password'> {
  const { password, ...sanitizedUser } = user as any
  return sanitizedUser
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any
    if (!decoded || !decoded.exp) return true
    
    const currentTime = Math.floor(Date.now() / 1000)
    return decoded.exp < currentTime
  } catch {
    return true
  }
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as any
    if (!decoded || !decoded.exp) return null
    
    return new Date(decoded.exp * 1000)
  } catch {
    return null
  }
}

/**
 * Generate password reset token with expiration
 */
export function generatePasswordResetToken(): { token: string; expiresAt: Date } {
  const token = generateSecureToken(32)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  
  return { token, expiresAt }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate username format
 */
export function validateUsername(username: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long')
  }
  
  if (username.length > 20) {
    errors.push('Username must be no more than 20 characters long')
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens')
  }
  
  if (/^[0-9_-]/.test(username)) {
    errors.push('Username cannot start with a number, underscore, or hyphen')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Enhanced JWT Functions

/**
 * Add token to blacklist (for logout)
 */
export function blacklistToken(token: string): void {
  tokenBlacklist.add(token)
  
  // Clean up old tokens periodically (in production, use TTL)
  if (tokenBlacklist.size > 1000) {
    const tokensArray = Array.from(tokenBlacklist)
    tokenBlacklist.clear()
    // Keep only recent tokens
    tokensArray.slice(-500).forEach(t => tokenBlacklist.add(t))
  }
}

/**
 * Check if token is blacklisted
 */
export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token)
}

/**
 * Rate limit check for token refresh
 */
export function checkRefreshRateLimit(userId: string): boolean {
  const now = Date.now()
  const userAttempts = refreshAttempts.get(userId)
  
  if (!userAttempts) {
    refreshAttempts.set(userId, { count: 1, lastAttempt: now })
    return true
  }
  
  // Reset if window has passed
  if (now - userAttempts.lastAttempt > REFRESH_WINDOW_MS) {
    refreshAttempts.set(userId, { count: 1, lastAttempt: now })
    return true
  }
  
  // Check if limit exceeded
  if (userAttempts.count >= MAX_REFRESH_ATTEMPTS) {
    return false
  }
  
  // Increment attempt count
  userAttempts.count++
  userAttempts.lastAttempt = now
  return true
}

/**
 * Reset refresh rate limit for user
 */
export function resetRefreshRateLimit(userId: string): void {
  refreshAttempts.delete(userId)
}

/**
 * Generate JWT with additional security claims
 */
export function generateSecureAccessToken(user: AuthUser, additionalClaims: Record<string, any> = {}): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
    iat: Math.floor(Date.now() / 1000),
    ...additionalClaims
  }

  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'sibi-app',
    audience: 'sibi-users'
  })
}

/**
 * Generate refresh token with fingerprint
 */
export function generateSecureRefreshToken(user: AuthUser, fingerprint?: string): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
    iat: Math.floor(Date.now() / 1000),
    type: 'refresh',
    fingerprint: fingerprint || 'default'
  }

  return jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'sibi-app',
    audience: 'sibi-users'
  })
}

/**
 * Verify access token with enhanced security
 */
export function verifySecureAccessToken(token: string): TokenPayload | null {
  try {
    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      return null
    }
    
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'sibi-app',
      audience: 'sibi-users'
    }) as TokenPayload
    
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * Verify refresh token with enhanced security
 */
export function verifySecureRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'sibi-app',
      audience: 'sibi-users'
    }) as TokenPayload
    
    // Check if it's actually a refresh token
    if (decoded.type !== 'refresh') {
      return null
    }
    
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * Extract token from authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * Validate token format (basic check)
 */
export function validateTokenFormat(token: string): boolean {
  // JWT tokens have 3 parts separated by dots
  const parts = token.split('.')
  return parts.length === 3 && parts.every(part => part.length > 0)
}

/**
 * Get token metadata without verification
 */
export function getTokenMetadata(token: string): { header: any; payload: any } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString())
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    
    return { header, payload }
  } catch {
    return null
  }
}
