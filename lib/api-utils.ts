import { NextRequest, NextResponse } from 'next/server'

// Common HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const

// Response wrapper interface
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
  metadata?: {
    timestamp: string
    requestId?: string
    processingTime?: number
  }
}

// Success response helper
export function successResponse<T>(
  data: T,
  message: string = 'Success',
  status: number = HTTP_STATUS.OK,
  metadata?: Partial<ApiResponse['metadata']>
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  }

  return NextResponse.json(response, { status })
}

// Error response helper
export function errorResponse(
  message: string,
  status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  error?: string,
  metadata?: Partial<ApiResponse['metadata']>
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    message,
    error,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  }

  return NextResponse.json(response, { status })
}

// Validation error response
export function validationErrorResponse(
  message: string,
  errors: Record<string, string[]> | string[],
  status: number = HTTP_STATUS.BAD_REQUEST
): NextResponse<ApiResponse> {
  return errorResponse(
    message,
    status,
    'Validation failed'
  )
}

// Rate limiting helper
export function rateLimitExceededResponse(
  retryAfter?: number
): NextResponse<ApiResponse> {
  const headers: Record<string, string> = {}
  
  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString()
  }

  return NextResponse.json(
    {
      success: false,
      message: 'Rate limit exceeded',
      error: 'Too many requests',
      metadata: {
        timestamp: new Date().toISOString(),
        retryAfter
      }
    },
    { 
      status: HTTP_STATUS.TOO_MANY_REQUESTS,
      headers
    }
  )
}

// CORS headers helper
export function corsHeaders(origin: string = '*'): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
  }
}

// Request validation helper
export async function validateRequest(
  request: NextRequest,
  requiredFields: string[],
  optionalFields: string[] = []
): Promise<{ isValid: boolean; errors: string[]; data: any }> {
  const errors: string[] = []
  let data: any = {}

  try {
    // Check content type for JSON requests
    const contentType = request.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = request.json ? await request.json() : {}
    } else if (contentType && contentType.includes('multipart/form-data')) {
      data = request.formData ? await request.formData() : {}
    }

    // Validate required fields
    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`Missing required field: ${field}`)
      }
    }

    // Check for unexpected fields (optional)
    const allowedFields = [...requiredFields, ...optionalFields]
    const unexpectedFields = Object.keys(data).filter(key => !allowedFields.includes(key))
    
    if (unexpectedFields.length > 0) {
      errors.push(`Unexpected fields: ${unexpectedFields.join(', ')}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      data
    }

  } catch (error) {
    errors.push('Invalid request format')
    return {
      isValid: false,
      errors,
      data: {}
    }
  }
}

// Authentication helper (placeholder for future implementation)
export function requireAuth(request: NextRequest): { isAuthenticated: boolean; userId?: string; error?: string } {
  // This is a placeholder - implement actual JWT validation here
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      isAuthenticated: false,
      error: 'Missing or invalid authorization header'
    }
  }

  // Mock authentication - replace with actual JWT validation
  const token = authHeader.substring(7)
  
  // For now, accept any non-empty token
  if (token && token.length > 0) {
    return {
      isAuthenticated: true,
      userId: 'mock-user-id' // Replace with actual user ID from JWT
    }
  }

  return {
    isAuthenticated: false,
    error: 'Invalid token'
  }
}

// Request logging helper
export function logRequest(request: NextRequest, metadata?: Record<string, any>) {
  const logData = {
    method: request.method,
    url: request.nextUrl?.href || 'unknown',
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString(),
    ...metadata
  }

  console.log('API Request:', JSON.stringify(logData, null, 2))
}

// Response logging helper
export function logResponse(response: NextResponse, metadata?: Record<string, any>) {
  const logData = {
    status: response.status,
    statusText: response.statusText,
    timestamp: new Date().toISOString(),
    ...metadata
  }

  console.log('API Response:', JSON.stringify(logData, null, 2))
}

// Generate request ID
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Sanitize error messages for production
export function sanitizeError(error: any, isProduction: boolean = false): string {
  if (isProduction) {
    return 'An internal error occurred'
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return String(error)
}

// Parse pagination parameters
export function parsePaginationParams(request: NextRequest) {
  const { searchParams } = request.nextUrl
  
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit
  
  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)), // Cap at 100 items per page
    offset: Math.max(0, offset)
  }
}
