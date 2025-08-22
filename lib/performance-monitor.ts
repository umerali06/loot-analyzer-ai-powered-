/**
 * Performance Monitoring Service
 * Provides comprehensive performance monitoring, metrics collection, and alerting
 */

import { EventEmitter } from 'events'

// Performance metric types
export interface PerformanceMetric {
  id: string
  timestamp: number
  type: 'api' | 'database' | 'cache' | 'image' | 'system'
  name: string
  value: number
  unit: string
  tags: Record<string, string>
  metadata?: Record<string, any>
}

export interface AlertRule {
  id: string
  name: string
  metric: string
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  threshold: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  cooldown: number // milliseconds
  lastTriggered?: number
}

export interface Alert {
  id: string
  ruleId: string
  timestamp: number
  severity: AlertRule['severity']
  message: string
  metric: PerformanceMetric
  resolved: boolean
  resolvedAt?: number
}

export interface PerformanceReport {
  summary: {
    totalMetrics: number
    totalAlerts: number
    averageResponseTime: number
    cacheHitRate: number
    errorRate: number
    uptime: number
  }
  metrics: PerformanceMetric[]
  alerts: Alert[]
  recommendations: string[]
}

export interface MonitoringConfig {
  enabled: boolean
  collectionInterval: number // milliseconds
  retentionPeriod: number // milliseconds
  maxMetrics: number
  alerting: {
    enabled: boolean
    webhookUrl?: string
    emailRecipients?: string[]
    slackWebhook?: string
  }
  externalServices: {
    sentry?: {
      dsn: string
      environment: string
    }
    datadog?: {
      apiKey: string
      appKey: string
      site: string
    }
  }
}

// Default configuration
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  collectionInterval: 5000, // 5 seconds
  retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
  maxMetrics: 10000,
  alerting: {
    enabled: true,
    webhookUrl: process.env.MONITORING_WEBHOOK_URL,
    emailRecipients: process.env.MONITORING_EMAIL_RECIPIENTS?.split(',') || [],
    slackWebhook: process.env.MONITORING_SLACK_WEBHOOK
  },
  externalServices: {
    sentry: process.env.SENTRY_DSN ? {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development'
    } : undefined,
    datadog: process.env.DATADOG_API_KEY ? {
      apiKey: process.env.DATADOG_API_KEY,
      appKey: process.env.DATADOG_APP_KEY,
      site: process.env.DATADOG_SITE || 'datadoghq.com'
    } : undefined
  }
}

export class PerformanceMonitor extends EventEmitter {
  private config: MonitoringConfig
  private metrics: PerformanceMetric[] = []
  private alertRules: AlertRule[] = []
  private alerts: Alert[] = []
  private collectionInterval?: NodeJS.Timeout
  private isRunning: boolean = false
  private startTime: number = Date.now()

  constructor(config: Partial<MonitoringConfig> = {}) {
    super()
    this.config = { ...DEFAULT_MONITORING_CONFIG, ...config }
    this.initializeDefaultAlertRules()
  }

  // Start monitoring
  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.startTime = Date.now()
    
    // Start collecting system metrics
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics()
    }, this.config.collectionInterval)

    this.emit('started')
    console.log('Performance monitoring started')
  }

  // Stop monitoring
  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval)
      this.collectionInterval = undefined
    }

    this.emit('stopped')
    console.log('Performance monitoring stopped')
  }

  // Record a performance metric
  recordMetric(
    type: PerformanceMetric['type'],
    name: string,
    value: number,
    unit: string,
    tags: Record<string, string> = {},
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enabled) return

    const metric: PerformanceMetric = {
      id: `${type}_${name}_${Date.now()}`,
      timestamp: Date.now(),
      type,
      name,
      value,
      unit,
      tags,
      metadata
    }

    this.metrics.push(metric)
    this.emit('metric', metric)

    // Check alert rules
    this.checkAlertRules(metric)

    // Cleanup old metrics
    this.cleanupOldMetrics()

    // Send to external services
    this.sendToExternalServices(metric)
  }

  // Record API performance
  recordAPIMetric(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    userId?: string
  ): void {
    this.recordMetric('api', 'response_time', responseTime, 'ms', {
      endpoint,
      method,
      statusCode: statusCode.toString(),
      ...(userId && { userId })
    })

    // Record status code distribution
    this.recordMetric('api', 'status_code', statusCode, 'count', {
      endpoint,
      method
    })
  }

  // Record database performance
  recordDatabaseMetric(
    operation: string,
    collection: string,
    duration: number,
    documentsAffected?: number
  ): void {
    this.recordMetric('database', 'operation_duration', duration, 'ms', {
      operation,
      collection,
      ...(documentsAffected && { documentsAffected: documentsAffected.toString() })
    })
  }

  // Record cache performance
  recordCacheMetric(
    operation: 'hit' | 'miss' | 'set' | 'delete',
    key: string,
    duration: number,
    size?: number
  ): void {
    this.recordMetric('cache', 'operation_duration', duration, 'ms', {
      operation,
      key: key.substring(0, 50), // Truncate long keys
      ...(size && { size: size.toString() })
    })
  }

  // Record image processing performance
  recordImageMetric(
    operation: string,
    duration: number,
    originalSize: number,
    processedSize: number,
    format: string
  ): void {
    this.recordMetric('image', 'processing_duration', duration, 'ms', {
      operation,
      format,
      originalSize: originalSize.toString(),
      processedSize: processedSize.toString(),
      compressionRatio: ((1 - processedSize / originalSize) * 100).toFixed(2)
    })
  }

  // Add alert rule
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newRule: AlertRule = { ...rule, id }
    
    this.alertRules.push(newRule)
    this.emit('alertRuleAdded', newRule)
    
    return id
  }

  // Remove alert rule
  removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === ruleId)
    if (index === -1) return false
    
    this.alertRules.splice(index, 1)
    this.emit('alertRuleRemoved', ruleId)
    
    return true
  }

  // Get performance report
  getPerformanceReport(): PerformanceReport {
    const now = Date.now()
    const recentMetrics = this.metrics.filter(
      m => now - m.timestamp < this.config.retentionPeriod
    )

    const apiMetrics = recentMetrics.filter(m => m.type === 'api')
    const cacheMetrics = recentMetrics.filter(m => m.type === 'cache')
    const errorMetrics = recentMetrics.filter(m => 
      m.type === 'api' && m.tags.statusCode && parseInt(m.tags.statusCode) >= 400
    )

    const averageResponseTime = apiMetrics.length > 0
      ? apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length
      : 0

    const cacheHitRate = cacheMetrics.length > 0
      ? cacheMetrics.filter(m => m.tags.operation === 'hit').length / cacheMetrics.length
      : 0

    const errorRate = apiMetrics.length > 0
      ? errorMetrics.length / apiMetrics.length
      : 0

    const uptime = now - this.startTime

    // Generate recommendations
    const recommendations: string[] = []
    
    if (averageResponseTime > 1000) {
      recommendations.push('API response time is high. Consider optimizing database queries or adding caching.')
    }
    
    if (cacheHitRate < 0.7) {
      recommendations.push('Cache hit rate is low. Consider expanding cache coverage or adjusting TTL.')
    }
    
    if (errorRate > 0.05) {
      recommendations.push('Error rate is high. Investigate and fix failing endpoints.')
    }

    return {
      summary: {
        totalMetrics: recentMetrics.length,
        totalAlerts: this.alerts.filter(a => !a.resolved).length,
        averageResponseTime,
        cacheHitRate,
        errorRate,
        uptime
      },
      metrics: recentMetrics,
      alerts: this.alerts.filter(a => !a.resolved),
      recommendations
    }
  }

  // Get metrics by type and time range
  getMetrics(
    type?: PerformanceMetric['type'],
    startTime?: number,
    endTime?: number
  ): PerformanceMetric[] {
    let filtered = this.metrics

    if (type) {
      filtered = filtered.filter(m => m.type === type)
    }

    if (startTime) {
      filtered = filtered.filter(m => m.timestamp >= startTime)
    }

    if (endTime) {
      filtered = filtered.filter(m => m.timestamp <= endTime)
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp)
  }

  // Get alerts
  getAlerts(resolved?: boolean): Alert[] {
    if (resolved === undefined) return this.alerts
    
    return this.alerts.filter(a => a.resolved === resolved)
  }

  // Resolve alert
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (!alert) return false

    alert.resolved = true
    alert.resolvedAt = Date.now()
    this.emit('alertResolved', alert)

    return true
  }

  // Private methods

  private initializeDefaultAlertRules(): void {
    // API response time alerts
    this.addAlertRule({
      name: 'High API Response Time',
      metric: 'response_time',
      condition: 'gt',
      threshold: 2000, // 2 seconds
      severity: 'medium',
      enabled: true,
      cooldown: 5 * 60 * 1000 // 5 minutes
    })

    this.addAlertRule({
      name: 'Critical API Response Time',
      metric: 'response_time',
      condition: 'gt',
      threshold: 5000, // 5 seconds
      severity: 'critical',
      enabled: true,
      cooldown: 2 * 60 * 1000 // 2 minutes
    })

    // Error rate alerts
    this.addAlertRule({
      name: 'High Error Rate',
      metric: 'status_code',
      condition: 'gt',
      threshold: 0.1, // 10% error rate
      severity: 'high',
      enabled: true,
      cooldown: 5 * 60 * 1000 // 5 minutes
    })

    // Cache hit rate alerts
    this.addAlertRule({
      name: 'Low Cache Hit Rate',
      metric: 'operation_duration',
      condition: 'lt',
      threshold: 0.6, // 60% cache hit rate
      severity: 'low',
      enabled: true,
      cooldown: 10 * 60 * 1000 // 10 minutes
    })
  }

  private checkAlertRules(metric: PerformanceMetric): void {
    const now = Date.now()

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue

      // Check cooldown
      if (rule.lastTriggered && now - rule.lastTriggered < rule.cooldown) {
        continue
      }

      // Check if metric matches rule
      if (metric.name !== rule.metric) continue

      let shouldTrigger = false
      const value = metric.value

      switch (rule.condition) {
        case 'gt':
          shouldTrigger = value > rule.threshold
          break
        case 'gte':
          shouldTrigger = value >= rule.threshold
          break
        case 'lt':
          shouldTrigger = value < rule.threshold
          break
        case 'lte':
          shouldTrigger = value <= rule.threshold
          break
        case 'eq':
          shouldTrigger = value === rule.threshold
          break
      }

      if (shouldTrigger) {
        this.triggerAlert(rule, metric)
        rule.lastTriggered = now
      }
    }
  }

  private triggerAlert(rule: AlertRule, metric: PerformanceMetric): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      timestamp: Date.now(),
      severity: rule.severity,
      message: `${rule.name}: ${metric.name} = ${metric.value} ${metric.unit}`,
      metric,
      resolved: false
    }

    this.alerts.push(alert)
    this.emit('alert', alert)

    // Send alert notifications
    this.sendAlertNotifications(alert)
  }

  private sendAlertNotifications(alert: Alert): void {
    if (!this.config.alerting.enabled) return

    // Webhook notification
    if (this.config.alerting.webhookUrl) {
      this.sendWebhookNotification(alert)
    }

    // Email notification
    if (this.config.alerting.emailRecipients.length > 0) {
      this.sendEmailNotification(alert)
    }

    // Slack notification
    if (this.config.alerting.slackWebhook) {
      this.sendSlackNotification(alert)
    }
  }

  private async sendWebhookNotification(alert: Alert): Promise<void> {
    try {
      await fetch(this.config.alerting.webhookUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString(),
          service: 'lot-analyzer'
        })
      })
    } catch (error) {
      console.error('Failed to send webhook notification:', error)
    }
  }

  private async sendEmailNotification(alert: Alert): Promise<void> {
    // In a real implementation, you would integrate with an email service
    // like SendGrid, AWS SES, or similar
    console.log(`Email alert would be sent to: ${this.config.alerting.emailRecipients.join(', ')}`)
    console.log(`Subject: [${alert.severity.toUpperCase()}] ${alert.message}`)
  }

  private async sendSlackNotification(alert: Alert): Promise<void> {
    try {
      const color = {
        low: '#36a64f',
        medium: '#ffa500',
        high: '#ff8c00',
        critical: '#ff0000'
      }[alert.severity]

      await fetch(this.config.alerting.slackWebhook!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachments: [{
            color,
            title: `🚨 ${alert.message}`,
            fields: [
              { title: 'Severity', value: alert.severity, short: true },
              { title: 'Metric', value: alert.metric.name, short: true },
              { title: 'Value', value: `${alert.metric.value} ${alert.metric.unit}`, short: true },
              { title: 'Timestamp', value: new Date(alert.timestamp).toLocaleString(), short: true }
            ],
            footer: 'Lot Analyzer Performance Monitor'
          }]
        })
      })
    } catch (error) {
      console.error('Failed to send Slack notification:', error)
    }
  }

  private sendToExternalServices(metric: PerformanceMetric): void {
    // Send to Sentry
    if (this.config.externalServices.sentry) {
      this.sendToSentry(metric)
    }

    // Send to DataDog
    if (this.config.externalServices.datadog) {
      this.sendToDataDog(metric)
    }
  }

  private sendToSentry(metric: PerformanceMetric): void {
    // In a real implementation, you would use the Sentry SDK
    // This is a placeholder for the concept
    if (metric.value > 1000 && metric.type === 'api') {
      console.log(`Sentry: High response time detected: ${metric.value}ms for ${metric.name}`)
    }
  }

  private sendToDataDog(metric: PerformanceMetric): void {
    // In a real implementation, you would use the DataDog API
    // This is a placeholder for the concept
    console.log(`DataDog: Metric ${metric.name} = ${metric.value} ${metric.unit}`)
  }

  private collectSystemMetrics(): void {
    const now = Date.now()
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    // Memory metrics
    this.recordMetric('system', 'memory_usage', memUsage.heapUsed, 'bytes', {
      type: 'heap_used'
    })

    this.recordMetric('system', 'memory_usage', memUsage.heapTotal, 'bytes', {
      type: 'heap_total'
    })

    this.recordMetric('system', 'memory_usage', memUsage.rss, 'bytes', {
      type: 'rss'
    })

    // CPU metrics
    this.recordMetric('system', 'cpu_usage', cpuUsage.user, 'microseconds', {
      type: 'user'
    })

    this.recordMetric('system', 'cpu_usage', cpuUsage.system, 'microseconds', {
      type: 'system'
    })

    // Uptime
    this.recordMetric('system', 'uptime', now - this.startTime, 'ms', {
      type: 'process'
    })
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.config.retentionPeriod
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff)

    // Limit total metrics
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics)
    }
  }

  // Get monitoring status
  getStatus(): {
    isRunning: boolean
    uptime: number
    totalMetrics: number
    totalAlerts: number
    activeAlertRules: number
  } {
    return {
      isRunning: this.isRunning,
      uptime: Date.now() - this.startTime,
      totalMetrics: this.metrics.length,
      totalAlerts: this.alerts.length,
      activeAlertRules: this.alertRules.filter(r => r.enabled).length
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Restart collection interval if interval changed
    if (this.isRunning && this.collectionInterval) {
      clearInterval(this.collectionInterval)
      this.collectionInterval = setInterval(() => {
        this.collectSystemMetrics()
      }, this.config.collectionInterval)
    }

    this.emit('configUpdated', this.config)
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Export utility functions
export const recordAPIMetric = (
  endpoint: string,
  method: string,
  responseTime: number,
  statusCode: number,
  userId?: string
) => performanceMonitor.recordAPIMetric(endpoint, method, responseTime, statusCode, userId)

export const recordDatabaseMetric = (
  operation: string,
  collection: string,
  duration: number,
  documentsAffected?: number
) => performanceMonitor.recordDatabaseMetric(operation, collection, duration, documentsAffected)

export const recordCacheMetric = (
  operation: 'hit' | 'miss' | 'set' | 'delete',
  key: string,
  duration: number,
  size?: number
) => performanceMonitor.recordCacheMetric(operation, key, duration, size)

export const recordImageMetric = (
  operation: string,
  duration: number,
  originalSize: number,
  processedSize: number,
  format: string
) => performanceMonitor.recordImageMetric(operation, duration, originalSize, processedSize, format)
