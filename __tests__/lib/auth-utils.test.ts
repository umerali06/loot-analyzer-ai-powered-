import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {
  validatePassword,
  validateEmail,
  validateUsername,
  generateSecureToken,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateSecurePassword,
} from '@/lib/auth-utils'
import { createMockUser } from '../utils/test-utils'

// Mock bcrypt and jsonwebtoken
jest.mock('bcryptjs')
jest.mock('jsonwebtoken')

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>
const mockJwt = jwt as jest.Mocked<typeof jwt>

describe('auth-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validatePassword', () => {
    it('validates strong password', () => {
      const password = 'StrongPass123!'
      const result = validatePassword(password)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('validates weak password - too short', () => {
      const password = 'weak'
      const result = validatePassword(password)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 12 characters long')
    })

    it('validates weak password - no uppercase', () => {
      const password = 'password123!'
      const result = validatePassword(password)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('validates weak password - no lowercase', () => {
      const password = 'PASSWORD123!'
      const result = validatePassword(password)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('validates weak password - no number', () => {
      const password = 'Password!'
      const result = validatePassword(password)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('validates weak password - no special character', () => {
      const password = 'Password123'
      const result = validatePassword(password)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character')
    })

    it('returns multiple errors for very weak password', () => {
      const password = 'abc'
      const result = validatePassword(password)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
      expect(result.errors).toContain('Password must be at least 12 characters long')
    })
  })

  describe('validateEmail', () => {
    it('validates correct email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ]
      
      validEmails.forEach(email => {
        const result = validateEmail(email)
        expect(result).toBe(true)
      })
    })

    it('validates incorrect email format', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com'
      ]
      
      invalidEmails.forEach(email => {
        const result = validateEmail(email)
        expect(result).toBe(false)
      })
    })

    it('handles empty email', () => {
      const result = validateEmail('')
      expect(result).toBe(false)
    })

    it('handles whitespace-only email', () => {
      const result = validateEmail('   ')
      expect(result).toBe(false)
    })
  })

  describe('validateUsername', () => {
    it('validates correct username format', () => {
      const validUsernames = [
        'user123',
        'user_name',
        'user-name',
        'User123'
      ]
      
      validUsernames.forEach(username => {
        const result = validateUsername(username)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    it('validates incorrect username format', () => {
      const invalidUsernames = [
        'us', // too short
        'user@name', // invalid character
        'user name', // space not allowed
      ]
      
      invalidUsernames.forEach(username => {
        const result = validateUsername(username)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })

    it('handles empty username', () => {
      const result = validateUsername('')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Username must be at least 3 characters long')
    })

    it('handles whitespace-only username', () => {
      const result = validateUsername('   ')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Username can only contain letters, numbers, underscores, and hyphens')
    })
  })

  describe('generateSecureToken', () => {
    it('generates token with specified length', () => {
      const length = 16
      const token = generateSecureToken(length)
      
      expect(token).toHaveLength(length)
      expect(typeof token).toBe('string')
    })

    it('generates token with default length', () => {
      const token = generateSecureToken()
      
      expect(token).toHaveLength(32)
      expect(typeof token).toBe('string')
    })

    it('generates unique tokens', () => {
      const token1 = generateSecureToken(16)
      const token2 = generateSecureToken(16)
      
      expect(token1).not.toBe(token2)
    })

    it('generates alphanumeric tokens', () => {
      const token = generateSecureToken(16)
      const alphanumericRegex = /^[a-zA-Z0-9]+$/
      
      expect(token).toMatch(alphanumericRegex)
    })
  })

  describe('generateAccessToken', () => {
    it('generates access token for user', () => {
      const user = createMockUser()
      const token = 'access_token_123'
      
      mockJwt.sign.mockReturnValue(token)
      
      const result = generateAccessToken(user)
      
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          email: user.email,
          username: user.username,
          type: 'access'
        }),
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '15m' }
      )
      expect(result).toBe(token)
    })
  })

  describe('generateRefreshToken', () => {
    it('generates refresh token for user', () => {
      const user = createMockUser()
      const token = 'refresh_token_123'
      
      mockJwt.sign.mockReturnValue(token)
      
      const result = generateRefreshToken(user)
      
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          email: user.email,
          username: user.username,
          type: 'refresh'
        }),
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
        { expiresIn: '7d' }
      )
      expect(result).toBe(token)
    })
  })

  describe('verifyAccessToken', () => {
    it('verifies valid access token', () => {
      const token = 'valid_access_token'
      const payload = {
        userId: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
        type: 'access'
      }
      
      mockJwt.verify.mockReturnValue(payload)
      
      const result = verifyAccessToken(token)
      
      expect(mockJwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production')
      expect(result).toEqual(payload)
    })

    it('returns null for invalid token', () => {
      const token = 'invalid_token'
      
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })
      
      const result = verifyAccessToken(token)
      
      expect(result).toBeNull()
    })
  })

  describe('verifyRefreshToken', () => {
    it('verifies valid refresh token', () => {
      const token = 'valid_refresh_token'
      const payload = {
        userId: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 604800,
        type: 'refresh'
      }
      
      mockJwt.verify.mockReturnValue(payload)
      
      const result = verifyRefreshToken(token)
      
      expect(mockJwt.verify).toHaveBeenCalledWith(token, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production')
      expect(result).toEqual(payload)
    })

    it('returns null for invalid token', () => {
      const token = 'invalid_token'
      
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })
      
      const result = verifyRefreshToken(token)
      
      expect(result).toBeNull()
    })
  })

  describe('generateSecurePassword', () => {
    it('generates password with default length', () => {
      const password = generateSecurePassword()
      
      expect(password).toHaveLength(16)
      expect(typeof password).toBe('string')
    })

    it('generates password with specified length', () => {
      const length = 20
      const password = generateSecurePassword(length)
      
      expect(password).toHaveLength(length)
      expect(typeof password).toBe('string')
    })

    it('generates unique passwords', () => {
      const password1 = generateSecurePassword()
      const password2 = generateSecurePassword()
      
      expect(password1).not.toBe(password2)
    })
  })

  describe('password strength calculation', () => {
    it('calculates strength for very weak password', () => {
      const password = 'abc'
      const result = validatePassword(password)
      
      expect(result.strength).toBe('weak')
      expect(result.score).toBeLessThan(3)
    })

    it('calculates strength for weak password', () => {
      const password = 'password'
      const result = validatePassword(password)
      
      expect(result.strength).toBe('weak')
      expect(result.score).toBeLessThan(6)
    })

    it('calculates strength for medium password', () => {
      const password = 'Password123'
      const result = validatePassword(password)
      
      expect(result.strength).toBe('medium')
      expect(result.score).toBeGreaterThanOrEqual(6)
    })

    it('calculates strength for strong password', () => {
      const password = 'Password123!'
      const result = validatePassword(password)
      
      expect(result.strength).toBe('strong')
      expect(result.score).toBeGreaterThanOrEqual(8)
    })

    it('calculates strength for very strong password', () => {
      const password = 'VeryStrongPassword123!@#$%^'
      const result = validatePassword(password)
      
      expect(result.strength).toBe('strong')
      expect(result.score).toBeGreaterThanOrEqual(8)
    })
  })
})
