/**
 * Structured Logging System
 * Comprehensive logging with different levels, formatting, and persistence
 */

import { ErrorSeverity, ErrorCategory, BaseError } from './errors'

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// Log level names for display
export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL'
}

// Log level colors for console output
export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[36m', // Cyan
  [LogLevel.INFO]: '\x1b[32m',  // Green
  [LogLevel.WARN]: '\x1b[33m',  // Yellow
  [LogLevel.ERROR]: '\x1b[31m', // Red
  [LogLevel.FATAL]: '\x1b[35m'  // Magenta
}

// Reset color code
const RESET_COLOR = '\x1b[0m'

// Log entry interface
export interface LogEntry {
  timestamp: Date
  level: LogLevel
  levelName: string
  message: string
  category?: string
  context?: Record<string, any>
  error?: BaseError | Error
  userId?: string
  sessionId?: string
  requestId?: string
  duration?: number
  tags?: string[]
}

// Logger configuration
export interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableFile: boolean
  enableRemote: boolean
  logDirectory?: string
  maxFileSize?: number
  maxFiles?: number
  format: 'json' | 'text' | 'both'
  includeTimestamp: boolean
  includeLevel: boolean
  includeCategory: boolean
  includeContext: boolean
  includeStack: boolean
  enableColors: boolean
  remoteEndpoint?: string
  remoteApiKey?: string
}

// Default logger configuration
const DEFAULT_CONFIG: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableFile: false,
  enableRemote: false,
  logDirectory: './logs',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  format: 'both',
  includeTimestamp: true,
  includeLevel: true,
  includeCategory: true,
  includeContext: true,
  includeStack: true,
  enableColors: process.env.NODE_ENV !== 'production'
}

/**
 * Main Logger Class
 */
export class Logger {
  private config: LoggerConfig
  private logBuffer: LogEntry[] = []
  private bufferSize: number = 100
  private flushInterval: NodeJS.Timeout | null = null

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.setupFlushInterval()
  }

  /**
   * Set up automatic log flushing
   */
  private setupFlushInterval(): void {
    if (this.config.enableFile || this.config.enableRemote) {
      this.flushInterval = setInterval(() => {
        this.flush()
      }, 5000) // Flush every 5 seconds
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.DEBUG, message, context, tags)
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.INFO, message, context, tags)
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.WARN, message, context, tags)
  }

  /**
   * Log an error message
   */
  error(message: string, error?: BaseError | Error, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.ERROR, message, context, tags, error)
  }

  /**
   * Log a fatal error message
   */
  fatal(message: string, error?: BaseError | Error, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.FATAL, message, context, tags, error)
  }

  /**
   * Log with specific level
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    tags?: string[],
    error?: BaseError | Error
  ): void {
    // Check if we should log at this level
    if (level < this.config.level) {
      return
    }

    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      levelName: LOG_LEVEL_NAMES[level],
      message,
      context,
      error,
      tags
    }

    // Add to buffer
    this.logBuffer.push(logEntry)

    // Console output
    if (this.config.enableConsole) {
      this.outputToConsole(logEntry)
    }

    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      this.flush()
    }
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = this.config.includeTimestamp ? `[${entry.timestamp.toISOString()}]` : ''
    const level = this.config.includeLevel ? `[${entry.levelName}]` : ''
    const category = this.config.includeCategory && entry.context?.category ? `[${entry.context.category}]` : ''
    
    let output = `${timestamp}${level}${category} ${entry.message}`

    // Add context if enabled
    if (this.config.includeContext && entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = JSON.stringify(entry.context, null, 2)
      output += `\nContext: ${contextStr}`
    }

    // Add error details if present
    if (entry.error && this.config.includeStack) {
      output += `\nError: ${entry.error.message}`
      if (entry.error.stack) {
        output += `\nStack: ${entry.error.stack}`
      }
    }

    // Add tags if present
    if (entry.tags && entry.tags.length > 0) {
      output += `\nTags: ${entry.tags.join(', ')}`
    }

    // Apply colors if enabled
    if (this.config.enableColors) {
      const color = LOG_LEVEL_COLORS[entry.level]
      output = `${color}${output}${RESET_COLOR}`
    }

    // Output to appropriate console method
    switch (entry.level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(output)
        break
      case LogLevel.WARN:
        console.warn(output)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output)
        break
    }
  }

  /**
   * Flush buffered logs
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return

    const logsToFlush = [...this.logBuffer]
    this.logBuffer = []

    try {
      // File logging
      if (this.config.enableFile) {
        await this.writeToFile(logsToFlush)
      }

      // Remote logging
      if (this.config.enableRemote) {
        await this.sendToRemote(logsToFlush)
      }
    } catch (error) {
      // Fallback to console if logging fails
      console.error('Failed to flush logs:', error)
      logsToFlush.forEach(entry => this.outputToConsole(entry))
    }
  }

  /**
   * Write logs to file
   */
  private async writeToFile(logs: LogEntry[]): Promise<void> {
    // This would be implemented with actual file writing logic
    // For now, we'll just simulate it
    if (process.env.NODE_ENV === 'development') {
      console.log(`[FILE LOG] Writing ${logs.length} log entries to file`)
    }
  }

  /**
   * Send logs to remote logging service
   */
  private async sendToRemote(logs: LogEntry[]): Promise<void> {
    // This would be implemented with actual remote logging logic
    // For now, we'll just simulate it
    if (process.env.NODE_ENV === 'development') {
      console.log(`[REMOTE LOG] Sending ${logs.length} log entries to remote service`)
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, any>): ChildLogger {
    return new ChildLogger(this, context)
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    this.flush()
  }
}

/**
 * Child Logger for additional context
 */
export class ChildLogger {
  constructor(
    private parent: Logger,
    private context: Record<string, any>
  ) {}

  debug(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.parent.debug(message, { ...this.context, ...context }, tags)
  }

  info(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.parent.info(message, { ...this.context, ...context }, tags)
  }

  warn(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.parent.warn(message, { ...this.context, ...context }, tags)
  }

  error(message: string, error?: BaseError | Error, context?: Record<string, any>, tags?: string[]): void {
    this.parent.error(message, error, { ...this.context, ...context }, tags)
  }

  fatal(message: string, error?: BaseError | Error, context?: Record<string, any>, tags?: string[]): void {
    this.parent.fatal(message, error, { ...this.context, ...context }, tags)
  }
}

/**
 * Request Logger for HTTP requests
 */
export class RequestLogger {
  constructor(
    private logger: Logger,
    private requestId: string,
    private userId?: string,
    private sessionId?: string
  ) {}

  logRequest(method: string, url: string, duration: number, statusCode: number): void {
    const message = `${method} ${url} - ${statusCode} (${duration}ms)`
    const context = {
      category: 'http',
      method,
      url,
      duration,
      statusCode,
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId
    }
    
    if (statusCode >= 400) {
      this.logger.warn(message, context)
    } else {
      this.logger.info(message, context)
    }
  }

  logError(error: BaseError | Error, context?: Record<string, any>): void {
    this.logger.error('Request error', error, {
      category: 'http',
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId,
      ...context
    })
  }
}

/**
 * Performance Logger for timing operations
 */
export class PerformanceLogger {
  private startTime: number

  constructor(private logger: Logger, private operation: string) {
    this.startTime = Date.now()
  }

  finish(context?: Record<string, any>): number {
    const duration = Date.now() - this.startTime
    this.logger.info(`${this.operation} completed in ${duration}ms`, {
      category: 'performance',
      operation: this.operation,
      duration,
      ...context
    })
    return duration
  }

  error(error: BaseError | Error, context?: Record<string, any>): void {
    const duration = Date.now() - this.startTime
    this.logger.error(`${this.operation} failed after ${duration}ms`, error, {
      category: 'performance',
      operation: this.operation,
      duration,
      ...context
    })
  }
}

/**
 * Create default logger instance
 */
export const logger = new Logger()

/**
 * Create logger for specific category
 */
export function createCategoryLogger(category: string): ChildLogger {
  return logger.child({ category })
}

/**
 * Create request logger
 */
export function createRequestLogger(requestId: string, userId?: string, sessionId?: string): RequestLogger {
  return new RequestLogger(logger, requestId, userId, sessionId)
}

/**
 * Create performance logger
 */
export function createPerformanceLogger(operation: string): PerformanceLogger {
  return new PerformanceLogger(logger, operation)
}

/**
 * Log function decorator for performance monitoring
 */
export function logPerformance(operation: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const perfLogger = createPerformanceLogger(operation)
      try {
        const result = await originalMethod.apply(this, args)
        perfLogger.finish()
        return result
      } catch (error) {
        perfLogger.error(error)
        throw error
      }
    }

    return descriptor
  }
}

/**
 * Log function decorator for error tracking
 */
export function logErrors(category?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const logger = createCategoryLogger(category || 'method')

    descriptor.value = async function (...args: any[]) {
      try {
        const result = await originalMethod.apply(this, args)
        return result
      } catch (error) {
        logger.error('Method execution failed', error, {
          method: propertyKey,
          args: args.map(arg => typeof arg === 'object' ? '[Object]' : String(arg))
        })
        throw error
      }
    }

    return descriptor
  }
}
