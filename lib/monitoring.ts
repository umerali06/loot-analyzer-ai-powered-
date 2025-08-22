/**
 * Error Tracking and Monitoring System
 * Performance monitoring, alerting, and metrics collection
 */

import { BaseError, ErrorSeverity, ErrorCategory } from './errors'
import { logger, createCategoryLogger } from './logger'

// Monitoring configuration
export interface MonitoringConfig {
  enableMetrics: boolean
  enableAlerts: boolean
  enableHealthChecks: boolean
  metricsInterval: number
  alertThresholds: {
    errorRate: number
    responseTime: number
    memoryUsage: number
    cpuUsage: number
  }
  healthCheckEndpoints: string[]
  alertChannels: AlertChannel[]
}

// Alert channel types
export interface AlertChannel {
  type: 'console' | 'email' | 'webhook' | 'slack'
  config: Record<string, any>
  enabled: boolean
}

// Metric types
export interface Metric {
  name: string
  value: number
  timestamp: Date
  tags: Record<string, string>
  type: 'counter' | 'gauge' | 'histogram'
}

// Health check result
export interface HealthCheckResult {
  service: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime: number
  lastCheck: Date
  details?: Record<string, any>
}

// Performance metrics
export interface PerformanceMetrics {
  requestCount: number
  errorCount: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  memoryUsage: number
  cpuUsage: number
  activeConnections: number
}

// Default monitoring configuration
const DEFAULT_CONFIG: MonitoringConfig = {
  enableMetrics: true,
  enableAlerts: true,
  enableHealthChecks: true,
  metricsInterval: 60000, // 1 minute
  alertThresholds: {
    errorRate: 0.05, // 5%
    responseTime: 5000, // 5 seconds
    memoryUsage: 0.9, // 90%
    cpuUsage: 0.8 // 80%
  },
  healthCheckEndpoints: ['/api/health'],
  alertChannels: [
    {
      type: 'console',
      config: {},
      enabled: true
    }
  ]
}

/**
 * Main Monitoring Class
 */
export class MonitoringSystem {
  private config: MonitoringConfig
  private metrics: Map<string, Metric[]> = new Map()
  private healthChecks: Map<string, HealthCheckResult> = new Map()
  private alertHistory: any[] = []
  private metricsInterval: NodeJS.Timeout | null = null
  private logger = createCategoryLogger('monitoring')

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeMonitoring()
  }

  /**
   * Initialize monitoring system
   */
  private initializeMonitoring(): void {
    if (this.config.enableMetrics) {
      this.startMetricsCollection()
    }

    if (this.config.enableHealthChecks) {
      this.startHealthChecks()
    }

    this.logger.info('Monitoring system initialized', { config: this.config })
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics()
      this.analyzeMetrics()
    }, this.config.metricsInterval)
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    try {
      // Memory usage
      const memoryUsage = process.memoryUsage()
      this.recordMetric('memory_usage', memoryUsage.heapUsed / 1024 / 1024, { type: 'heap_used' })
      this.recordMetric('memory_usage', memoryUsage.heapTotal / 1024 / 1024, { type: 'heap_total' })
      this.recordMetric('memory_usage', memoryUsage.rss / 1024 / 1024, { type: 'rss' })

      // CPU usage (simplified - in production you'd use a more sophisticated approach)
      this.recordMetric('cpu_usage', process.cpuUsage().user / 1000000, { type: 'user' })
      this.recordMetric('cpu_usage', process.cpuUsage().system / 1000000, { type: 'system' })

      // Process uptime
      this.recordMetric('uptime', process.uptime(), { type: 'seconds' })

      // Event loop lag
      const start = Date.now()
      setImmediate(() => {
        const lag = Date.now() - start
        this.recordMetric('event_loop_lag', lag, { type: 'milliseconds' })
      })

    } catch (error) {
      this.logger.error('Failed to collect system metrics', error)
    }
  }

  /**
   * Record a metric
   */
  recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    const metric: Metric = {
      name,
      value,
      timestamp: new Date(),
      tags,
      type: 'gauge'
    }

    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }

    const metricList = this.metrics.get(name)!
    metricList.push(metric)

    // Keep only last 1000 metrics per name
    if (metricList.length > 1000) {
      metricList.splice(0, metricList.length - 1000)
    }
  }

  /**
   * Record request metrics
   */
  recordRequest(method: string, url: string, statusCode: number, duration: number): void {
    this.recordMetric('request_count', 1, { method, url, status: statusCode.toString() })
    this.recordMetric('request_duration', duration, { method, url, status: statusCode.toString() })

    if (statusCode >= 400) {
      this.recordMetric('error_count', 1, { method, url, status: statusCode.toString() })
    }
  }

  /**
   * Record error metrics
   */
  recordError(error: BaseError | Error, context?: Record<string, any>): void {
    const errorCode = 'error' in error ? error.code : 'UNKNOWN_ERROR'
    const errorCategory = 'category' in error ? error.category : 'unknown'
    const errorSeverity = 'severity' in error ? error.severity : 'medium'

    this.recordMetric('error_count', 1, {
      code: errorCode,
      category: errorCategory,
      severity: errorSeverity
    })

    // Check if we should alert
    if (this.config.enableAlerts && this.shouldAlert(error)) {
      this.triggerAlert(error, context)
    }
  }

  /**
   * Analyze collected metrics
   */
  private analyzeMetrics(): void {
    try {
      const currentMetrics = this.getCurrentMetrics()
      
      // Check error rate
      if (currentMetrics.requestCount > 0) {
        const errorRate = currentMetrics.errorCount / currentMetrics.requestCount
        if (errorRate > this.config.alertThresholds.errorRate) {
          this.triggerAlert(new Error(`High error rate: ${(errorRate * 100).toFixed(2)}%`), {
            metric: 'error_rate',
            value: errorRate,
            threshold: this.config.alertThresholds.errorRate
          })
        }
      }

      // Check response time
      if (currentMetrics.averageResponseTime > this.config.alertThresholds.responseTime) {
        this.triggerAlert(new Error(`High response time: ${currentMetrics.averageResponseTime}ms`), {
          metric: 'response_time',
          value: currentMetrics.averageResponseTime,
          threshold: this.config.alertThresholds.responseTime
        })
      }

      // Check memory usage
      if (currentMetrics.memoryUsage > this.config.alertThresholds.memoryUsage) {
        this.triggerAlert(new Error(`High memory usage: ${(currentMetrics.memoryUsage * 100).toFixed(2)}%`), {
          metric: 'memory_usage',
          value: currentMetrics.memoryUsage,
          threshold: this.config.alertThresholds.memoryUsage
        })
      }

    } catch (error) {
      this.logger.error('Failed to analyze metrics', error)
    }
  }

  /**
   * Get current metrics summary
   */
  getCurrentMetrics(): PerformanceMetrics {
    const requestMetrics = this.metrics.get('request_count') || []
    const errorMetrics = this.metrics.get('error_count') || []
    const durationMetrics = this.metrics.get('request_duration') || []
    const memoryMetrics = this.metrics.get('memory_usage') || []

    const requestCount = requestMetrics.reduce((sum, m) => sum + m.value, 0)
    const errorCount = errorMetrics.reduce((sum, m) => sum + m.value, 0)
    const durations = durationMetrics.map(m => m.value).sort((a, b) => a - b)

    const averageResponseTime = durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0
    const p95ResponseTime = durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0
    const p99ResponseTime = durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0

    const latestMemoryMetric = memoryMetrics[memoryMetrics.length - 1]
    const memoryUsage = latestMemoryMetric ? latestMemoryMetric.value / 1024 / 1024 : 0

    return {
      requestCount,
      errorCount,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      memoryUsage,
      cpuUsage: 0, // Would be calculated from actual CPU metrics
      activeConnections: 0 // Would be tracked from connection pool
    }
  }

  /**
   * Check if error should trigger alert
   */
  private shouldAlert(error: BaseError | Error): boolean {
    if (error instanceof BaseError) {
      return error.shouldAlert()
    }
    return false
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(error: BaseError | Error, context?: Record<string, any>): void {
    const alert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      error: error.message,
      context,
      severity: error instanceof BaseError ? error.severity : 'medium'
    }

    this.alertHistory.push(alert)
    this.logger.warn('Alert triggered', { alert })

    // Send to alert channels
    this.sendAlerts(alert)

    // Keep only last 100 alerts
    if (this.alertHistory.length > 100) {
      this.alertHistory.splice(0, this.alertHistory.length - 100)
    }
  }

  /**
   * Send alerts to configured channels
   */
  private sendAlerts(alert: any): void {
    for (const channel of this.config.alertChannels) {
      if (!channel.enabled) continue

      try {
        switch (channel.type) {
          case 'console':
            this.sendConsoleAlert(alert)
            break
          case 'email':
            this.sendEmailAlert(alert, channel.config)
            break
          case 'webhook':
            this.sendWebhookAlert(alert, channel.config)
            break
          case 'slack':
            this.sendSlackAlert(alert, channel.config)
            break
        }
      } catch (error) {
        this.logger.error(`Failed to send alert to ${channel.type}`, error)
      }
    }
  }

  /**
   * Send console alert
   */
  private sendConsoleAlert(alert: any): void {
    console.error('\n🚨 ALERT TRIGGERED 🚨')
    console.error(`Time: ${alert.timestamp.toISOString()}`)
    console.error(`Error: ${alert.error}`)
    console.error(`Severity: ${alert.severity}`)
    if (alert.context) {
      console.error(`Context: ${JSON.stringify(alert.context, null, 2)}`)
    }
    console.error('')
  }

  /**
   * Send email alert (placeholder)
   */
  private sendEmailAlert(alert: any, config: Record<string, any>): void {
    // Implementation would use nodemailer or similar
    this.logger.info('Email alert sent', { alert, config })
  }

  /**
   * Send webhook alert (placeholder)
   */
  private sendWebhookAlert(alert: any, config: Record<string, any>): void {
    // Implementation would use fetch or axios
    this.logger.info('Webhook alert sent', { alert, config })
  }

  /**
   * Send Slack alert (placeholder)
   */
  private sendSlackAlert(alert: any, config: Record<string, any>): void {
    // Implementation would use Slack webhook
    this.logger.info('Slack alert sent', { alert, config })
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    setInterval(() => {
      this.runHealthChecks()
    }, 30000) // Every 30 seconds
  }

  /**
   * Run health checks
   */
  private async runHealthChecks(): Promise<void> {
    for (const endpoint of this.config.healthCheckEndpoints) {
      try {
        const startTime = Date.now()
        const response = await fetch(`http://localhost:3000${endpoint}`)
        const duration = Date.now() - startTime

        const result: HealthCheckResult = {
          service: endpoint,
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime: duration,
          lastCheck: new Date(),
          details: {
            statusCode: response.status,
            statusText: response.statusText
          }
        }

        this.healthChecks.set(endpoint, result)

        if (result.status !== 'healthy') {
          this.logger.warn('Health check failed', { result })
        }

      } catch (error) {
        const result: HealthCheckResult = {
          service: endpoint,
          status: 'unhealthy',
          responseTime: 0,
          lastCheck: new Date(),
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        }

        this.healthChecks.set(endpoint, result)
        this.logger.error('Health check error', { result, error })
      }
    }
  }

  /**
   * Get health check results
   */
  getHealthChecks(): HealthCheckResult[] {
    return Array.from(this.healthChecks.values())
  }

  /**
   * Get alert history
   */
  getAlertHistory(): any[] {
    return [...this.alertHistory]
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get monitoring status
   */
  getStatus(): Record<string, any> {
    return {
      enabled: this.config.enableMetrics,
      metricsCount: Array.from(this.metrics.values()).reduce((sum, m) => sum + m.length, 0),
      healthChecks: this.getHealthChecks(),
      alertCount: this.alertHistory.length,
      currentMetrics: this.getCurrentMetrics()
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = null
    }
    this.logger.info('Monitoring system destroyed')
  }
}

/**
 * Create default monitoring instance
 */
export const monitoring = new MonitoringSystem()

/**
 * Performance monitoring decorator
 */
export function monitorPerformance(operation: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now()
      try {
        const result = await originalMethod.apply(this, args)
        const duration = Date.now() - startTime
        
        monitoring.recordMetric('method_duration', duration, {
          method: propertyKey,
          operation,
          status: 'success'
        })
        
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        
        monitoring.recordMetric('method_duration', duration, {
          method: propertyKey,
          operation,
          status: 'error'
        })
        
        monitoring.recordError(error instanceof Error ? error : new Error(String(error)))
        throw error
      }
    }

    return descriptor
  }
}

/**
 * Error monitoring decorator
 */
export function monitorErrors(category?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      try {
        const result = await originalMethod.apply(this, args)
        return result
      } catch (error) {
        monitoring.recordError(error instanceof Error ? error : new Error(String(error)), {
          method: propertyKey,
          category: category || 'method',
          args: args.map(arg => typeof arg === 'object' ? '[Object]' : String(arg))
        })
        throw error
      }
    }

    return descriptor
  }
}
