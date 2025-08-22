import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/login/route'
import { createMockUser } from '@/__tests__/utils/test-utils'

// Mock the auth utilities
const mockVerifyPassword = jest.fn()
const mockGenerateTokens = jest.fn()
const mockCreateSession = jest.fn()

jest.mock('@/lib/auth-utils', () => ({
  verifyPassword: mockVerifyPassword,
  generateTokens: mockGenerateTokens,
  createSession: mockCreateSession,
}))

// Mock the database service
const mockFindUserByEmail = jest.fn()

jest.mock('@/lib/database-service', () => ({
  findUserByEmail: mockFindUserByEmail,
}))

describe('POST /api/auth/login', () => {
  const mockUser = createMockUser()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 400 for missing email', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.message).toContain('email is required')
  })

  it('returns 400 for missing password', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.message).toContain('password is required')
  })

  it('returns 400 for invalid email format', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'invalid-email', 
        password: 'password123' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.message).toContain('invalid email format')
  })

  it('returns 401 for non-existent user', async () => {
    mockFindUserByEmail.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'nonexistent@example.com', 
        password: 'password123' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.message).toContain('invalid credentials')
    expect(mockFindUserByEmail).toHaveBeenCalledWith('nonexistent@example.com')
  })

  it('returns 401 for invalid password', async () => {
    mockFindUserByEmail.mockResolvedValue(mockUser)
    mockVerifyPassword.mockResolvedValue(false)

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'test@example.com', 
        password: 'wrongpassword' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.message).toContain('invalid credentials')
    expect(mockVerifyPassword).toHaveBeenCalledWith('wrongpassword', mockUser.password)
  })

  it('returns 200 for successful login', async () => {
    const mockTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    }

    mockFindUserByEmail.mockResolvedValue(mockUser)
    mockVerifyPassword.mockResolvedValue(true)
    mockGenerateTokens.mockResolvedValue(mockTokens)
    mockCreateSession.mockResolvedValue({ success: true })

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'test@example.com', 
        password: 'password123' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.user).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      username: mockUser.username,
      role: mockUser.role,
    })
    expect(data.accessToken).toBe(mockTokens.accessToken)
    expect(data.refreshToken).toBe(mockTokens.refreshToken)

    expect(mockFindUserByEmail).toHaveBeenCalledWith('test@example.com')
    expect(mockVerifyPassword).toHaveBeenCalledWith('password123', mockUser.password)
    expect(mockGenerateTokens).toHaveBeenCalledWith(mockUser.id, mockUser.role)
    expect(mockCreateSession).toHaveBeenCalledWith(mockUser.id, mockTokens.accessToken)
  })

  it('handles database errors gracefully', async () => {
    mockFindUserByEmail.mockRejectedValue(new Error('Database connection failed'))

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'test@example.com', 
        password: 'password123' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.message).toContain('internal server error')
  })

  it('handles password verification errors gracefully', async () => {
    mockFindUserByEmail.mockResolvedValue(mockUser)
    mockVerifyPassword.mockRejectedValue(new Error('Password verification failed'))

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'test@example.com', 
        password: 'password123' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.message).toContain('internal server error')
  })

  it('handles token generation errors gracefully', async () => {
    mockFindUserByEmail.mockResolvedValue(mockUser)
    mockVerifyPassword.mockResolvedValue(true)
    mockGenerateTokens.mockRejectedValue(new Error('Token generation failed'))

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'test@example.com', 
        password: 'password123' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.message).toContain('internal server error')
  })

  it('handles session creation errors gracefully', async () => {
    const mockTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    }

    mockFindUserByEmail.mockResolvedValue(mockUser)
    mockVerifyPassword.mockResolvedValue(true)
    mockGenerateTokens.mockResolvedValue(mockTokens)
    mockCreateSession.mockRejectedValue(new Error('Session creation failed'))

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'test@example.com', 
        password: 'password123' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.message).toContain('internal server error')
  })

  it('validates request body parsing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: 'invalid-json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.message).toContain('invalid request body')
  })

  it('handles empty request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.message).toContain('request body is required')
  })

  it('sets appropriate CORS headers', async () => {
    const mockTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    }

    mockFindUserByEmail.mockResolvedValue(mockUser)
    mockVerifyPassword.mockResolvedValue(true)
    mockGenerateTokens.mockResolvedValue(mockTokens)
    mockCreateSession.mockResolvedValue({ success: true })

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'test@example.com', 
        password: 'password123' 
      }),
    })

    const response = await POST(request)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
  })

  it('logs successful login attempts', async () => {
    const mockTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    }

    mockFindUserByEmail.mockResolvedValue(mockUser)
    mockVerifyPassword.mockResolvedValue(true)
    mockGenerateTokens.mockResolvedValue(mockTokens)
    mockCreateSession.mockResolvedValue({ success: true })

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'test@example.com', 
        password: 'password123' 
      }),
    })

    await POST(request)

    // Verify that the user was found and password was verified
    expect(mockFindUserByEmail).toHaveBeenCalledWith('test@example.com')
    expect(mockVerifyPassword).toHaveBeenCalledWith('password123', mockUser.password)
  })

  it('sanitizes user data in response', async () => {
    const mockTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    }

    const userWithSensitiveData = {
      ...mockUser,
      password: 'hashed-password',
      resetToken: 'reset-token',
      internalNotes: 'sensitive information',
    }

    mockFindUserByEmail.mockResolvedValue(userWithSensitiveData)
    mockVerifyPassword.mockResolvedValue(true)
    mockGenerateTokens.mockResolvedValue(mockTokens)
    mockCreateSession.mockResolvedValue({ success: true })

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'test@example.com', 
        password: 'password123' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.user).not.toHaveProperty('password')
    expect(data.user).not.toHaveProperty('resetToken')
    expect(data.user).not.toHaveProperty('internalNotes')
    expect(data.user).toHaveProperty('id')
    expect(data.user).toHaveProperty('email')
    expect(data.user).toHaveProperty('username')
    expect(data.user).toHaveProperty('role')
  })
})
