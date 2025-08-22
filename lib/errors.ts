/**
 * Centralized Error Handling System
 * Custom error classes, error codes, and user-friendly error messages
 */

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  NETWORK = 'network',
  SYSTEM = 'system',
  USER_INPUT = 'user_input'
}

// Base error class
export abstract class BaseError extends Error {
  public readonly code: string
  public readonly category: ErrorCategory
  public readonly severity: ErrorSeverity
  public readonly timestamp: Date
  public readonly context?: Record<string, any>
  public readonly originalError?: Error

  constructor(
    message: string,
    code: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.category = category
    this.severity = severity
    this.timestamp = new Date()
    this.context = context
    this.originalError = originalError

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.message
  }

  /**
   * Get developer-friendly error details
   */
  getDeveloperDetails(): Record<string, any> {
    return {
      code: this.code,
      category: this.category,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
      originalError: this.originalError?.message
    }
  }

  /**
   * Check if error should be logged
   */
  shouldLog(): boolean {
    return this.severity !== ErrorSeverity.LOW
  }

  /**
   * Check if error should trigger alerts
   */
  shouldAlert(): boolean {
    return this.severity === ErrorSeverity.CRITICAL || this.severity === ErrorSeverity.HIGH
  }
}

// Authentication errors
export class AuthenticationError extends BaseError {
  constructor(
    message: string = 'Authentication failed',
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'AUTH_001', ErrorCategory.AUTHENTICATION, ErrorSeverity.MEDIUM, context, originalError)
  }

  getUserMessage(): string {
    return 'Please log in again to continue'
  }
}

export class AuthorizationError extends BaseError {
  constructor(
    message: string = 'Access denied',
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'AUTH_002', ErrorCategory.AUTHORIZATION, ErrorSeverity.MEDIUM, context, originalError)
  }

  getUserMessage(): string {
    return 'You do not have permission to perform this action'
  }
}

export class TokenExpiredError extends BaseError {
  constructor(
    message: string = 'Token has expired',
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'AUTH_003', ErrorCategory.AUTHENTICATION, ErrorSeverity.LOW, context, originalError)
  }

  getUserMessage(): string {
    return 'Your session has expired. Please log in again'
  }
}

export class InvalidTokenError extends BaseError {
  constructor(
    message: string = 'Invalid token',
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'AUTH_004', ErrorCategory.AUTHENTICATION, ErrorSeverity.MEDIUM, context, originalError)
  }

  getUserMessage(): string {
    return 'Invalid session. Please log in again'
  }
}

// Validation errors
export class ValidationError extends BaseError {
  constructor(
    message: string = 'Validation failed',
    public readonly field?: string,
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'VAL_001', ErrorCategory.VALIDATION, ErrorSeverity.LOW, context, originalError)
  }

  getUserMessage(): string {
    if (this.field) {
      return `Please check the ${this.field} field and try again`
    }
    return 'Please check your input and try again'
  }
}

export class ImageValidationError extends BaseError {
  constructor(
    message: string = 'Image validation failed',
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'VAL_002', ErrorCategory.VALIDATION, ErrorSeverity.LOW, context, originalError)
  }

  getUserMessage(): string {
    return 'Please upload a valid image file (JPG, PNG, or WebP) under 10MB'
  }
}

export class PasswordValidationError extends BaseError {
  constructor(
    message: string = 'Password validation failed',
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'VAL_003', ErrorCategory.VALIDATION, ErrorSeverity.LOW, context, originalError)
  }

  getUserMessage(): string {
    return 'Password must meet security requirements. Please check the password strength indicator'
  }
}

// Database errors
export class DatabaseError extends BaseError {
  constructor(
    message: string = 'Database operation failed',
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'DB_001', ErrorCategory.DATABASE, ErrorSeverity.HIGH, context, originalError)
  }

  getUserMessage(): string {
    return 'A database error occurred. Please try again later'
  }
}

export class DatabaseConnectionError extends BaseError {
  constructor(
    message: string = 'Database connection failed',
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'DB_002', ErrorCategory.DATABASE, ErrorSeverity.CRITICAL, context, originalError)
  }

  getUserMessage(): string {
    return 'Service temporarily unavailable. Please try again later'
  }
}

export class DocumentNotFoundError extends BaseError {
  constructor(
    message: string = 'Document not found',
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'DB_003', ErrorCategory.DATABASE, ErrorSeverity.LOW, context, originalError)
  }

  getUserMessage(): string {
    return 'The requested information could not be found'
  }
}

// External API errors
export class ExternalAPIError extends BaseError {
  constructor(
    message: string = 'External API call failed',
    public readonly service: string,
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'API_001', ErrorCategory.EXTERNAL_API, ErrorSeverity.MEDIUM, context, originalError)
  }

  getUserMessage(): string {
    return `Unable to connect to ${this.service}. Please try again later`
  }
}

export class OpenAIApiError extends BaseError {
  constructor(
    message: string = 'OpenAI API call failed',
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'API_002', ErrorCategory.EXTERNAL_API, ErrorSeverity.MEDIUM, context, originalError)
  }

  getUserMessage(): string {
    return 'AI analysis service is temporarily unavailable. Please try again later'
  }
}

export class ScraperApiError extends BaseError {
  constructor(
    message: string = 'ScraperAPI call failed',
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'API_003', ErrorCategory.EXTERNAL_API, ErrorSeverity.MEDIUM, context, originalError)
  }

  getUserMessage(): string {
    return 'Market data service is temporarily unavailable. Please try again later'
  }
}

export class RateLimitError extends BaseError {
  constructor(
    message: string = 'Rate limit exceeded',
    public readonly retryAfter?: number,
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'API_004', ErrorCategory.EXTERNAL_API, ErrorSeverity.MEDIUM, context, originalError)
  }

  getUserMessage(): string {
    if (this.retryAfter) {
      return `Too many requests. Please wait ${this.retryAfter} seconds before trying again`
    }
    return 'Too many requests. Please wait a moment before trying again'
  }
}

// Network errors
export class NetworkError extends BaseError {
  constructor(
    message: string = 'Network error occurred',
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'NET_001', ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, context, originalError)
  }

  getUserMessage(): string {
    return 'Network connection issue. Please check your internet connection and try again'
  }
}

export class TimeoutError extends BaseError {
  constructor(
    message: string = 'Request timeout',
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'NET_002', ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, context, originalError)
  }

  getUserMessage(): string {
    return 'Request timed out. Please try again'
  }
}

// System errors
export class SystemError extends BaseError {
  constructor(
    message: string = 'System error occurred',
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'SYS_001', ErrorCategory.SYSTEM, ErrorSeverity.HIGH, context, originalError)
  }

  getUserMessage(): string {
    return 'A system error occurred. Please try again later or contact support'
  }
}

export class ConfigurationError extends BaseError {
  constructor(
    message: string = 'Configuration error',
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'SYS_002', ErrorCategory.SYSTEM, ErrorSeverity.CRITICAL, context, originalError)
  }

  getUserMessage(): string {
    return 'System configuration error. Please contact support'
  }
}

// User input errors
export class UserInputError extends BaseError {
  constructor(
    message: string = 'Invalid user input',
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message, 'USER_001', ErrorCategory.USER_INPUT, ErrorSeverity.LOW, context, originalError)
  }

  getUserMessage(): string {
    return 'Please check your input and try again'
  }
}

// Error factory functions
export const createError = {
  authentication: (message?: string, context?: Record<string, any>, originalError?: Error) =>
    new AuthenticationError(message, context, originalError),
  
  authorization: (message?: string, context?: Record<string, any>, originalError?: Error) =>
    new AuthorizationError(message, context, originalError),
  
  validation: (message?: string, field?: string, context?: Record<string, any>, originalError?: Error) =>
    new ValidationError(message, field, context, originalError),
  
  database: (message?: string, context?: Record<string, any>, originalError?: Error) =>
    new DatabaseError(message, context, originalError),
  
  externalAPI: (message: string, service: string, context?: Record<string, any>, originalError?: Error) =>
    new ExternalAPIError(message, service, context, originalError),
  
  network: (message?: string, context?: Record<string, any>, originalError?: Error) =>
    new NetworkError(message, context, originalError),
  
  system: (message?: string, context?: Record<string, any>, originalError?: Error) =>
    new SystemError(message, context, originalError),
  
  userInput: (message?: string, context?: Record<string, any>, originalError?: Error) =>
    new UserInputError(message, context, originalError)
}

// Error utility functions
export function isBaseError(error: any): error is BaseError {
  return error instanceof BaseError
}

export function getErrorCode(error: any): string {
  if (isBaseError(error)) {
    return error.code
  }
  return 'UNKNOWN_ERROR'
}

export function getErrorCategory(error: any): ErrorCategory {
  if (isBaseError(error)) {
    return error.category
  }
  return ErrorCategory.SYSTEM
}

export function getErrorSeverity(error: any): ErrorSeverity {
  if (isBaseError(error)) {
    return error.severity
  }
  return ErrorSeverity.MEDIUM
}

export function shouldLogError(error: any): boolean {
  if (isBaseError(error)) {
    return error.shouldLog()
  }
  return true // Log unknown errors by default
}

export function shouldAlertError(error: any): boolean {
  if (isBaseError(error)) {
    return error.shouldAlert()
  }
  return false // Don't alert unknown errors by default
}

// Error response formatter
export function formatErrorResponse(error: any, includeDetails: boolean = false) {
  if (isBaseError(error)) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.getUserMessage(),
        category: error.category,
        ...(includeDetails && { details: error.getDeveloperDetails() })
      }
    }
  }

  // Handle unknown errors
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      category: ErrorCategory.SYSTEM,
      ...(includeDetails && { details: { message: error.message, stack: error.stack } })
    }
  }
}
