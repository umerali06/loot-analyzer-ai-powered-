'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  Zap,
  Database,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Square,
  Settings
} from 'lucide-react'

interface PerformanceMetrics {
  timestamp: string
  endpoint: string
  processingTime: number
  memoryUsage: number
  cacheHit: boolean
  status: 'success' | 'error' | 'warning'
}

interface SystemMetrics {
  timestamp: string
  memory: {
    used: number
    total: number
    percentage: number
  }
  cpu: {
    usage: number
    load: number
  }
  database: {
    connections: number
    queries: number
    responseTime: number
  }
  cache: {
    hitRate: number
    size: number
    evictions: number
  }
}

interface PerformanceSummary {
  totalRequests: number
  averageResponseTime: string
  cacheHitRate: string
  totalCacheOperations: number
  totalDatabaseQueries: number
}

const PerformanceMonitor: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([])
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics[]>([])
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null)
  const [maintenanceStatus, setMaintenanceStatus] = useState<any>(null)
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5 seconds

  // Fetch performance metrics from API
  const fetchPerformanceMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/performance?detailed=true&limit=100')
      if (response.ok) {
        const data = await response.json()
        setPerformanceSummary(data.summary)
        
        // Convert API metrics to component format
        if (data.recentMetrics) {
          const convertedMetrics = data.recentMetrics.map((metric: any) => ({
            timestamp: metric.timestamp,
            endpoint: 'API',
            processingTime: metric.processingTime,
            memoryUsage: metric.memoryUsage,
            cacheHit: metric.cacheHit,
            status: 'success' as const
          }))
          setMetrics(convertedMetrics)
        }
      }
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error)
    }
  }, [])

  // Fetch maintenance status
  const fetchMaintenanceStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/database-maintenance')
      if (response.ok) {
        const data = await response.json()
        setMaintenanceStatus(data.status)
      }
    } catch (error) {
      console.error('Failed to fetch maintenance status:', error)
    }
  }, [])

  // Simulate system metrics (in production, these would come from the API)
  const generateSystemMetrics = useCallback(() => {
    const newMetric: SystemMetrics = {
      timestamp: new Date().toISOString(),
      memory: {
        used: Math.random() * 512 + 256, // 256-768 MB
        total: 1024,
        percentage: Math.random() * 50 + 25 // 25-75%
      },
      cpu: {
        usage: Math.random() * 30 + 10, // 10-40%
        load: Math.random() * 2 + 0.5 // 0.5-2.5
      },
      database: {
        connections: Math.floor(Math.random() * 10) + 5, // 5-15
        queries: Math.floor(Math.random() * 100) + 50, // 50-150
        responseTime: Math.random() * 50 + 10 // 10-60ms
      },
      cache: {
        hitRate: Math.random() * 0.3 + 0.7, // 70-100%
        size: Math.floor(Math.random() * 1000) + 500, // 500-1500 items
        evictions: Math.floor(Math.random() * 10) // 0-10
      }
    }
    
    setSystemMetrics(prev => [...prev.slice(-19), newMetric]) // Keep last 20
  }, [])

  // Start monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true)
    fetchPerformanceMetrics()
    fetchMaintenanceStatus()
    generateSystemMetrics()
  }, [fetchPerformanceMetrics, fetchMaintenanceStatus, generateSystemMetrics])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
  }, [])

  // Clear metrics
  const clearMetrics = useCallback(async () => {
    try {
      await fetch('/api/performance', { method: 'DELETE' })
      setMetrics([])
      setSystemMetrics([])
      setPerformanceSummary(null)
    } catch (error) {
      console.error('Failed to clear metrics:', error)
    }
  }, [])

  // Trigger maintenance task
  const triggerMaintenance = useCallback(async (action: string) => {
    try {
      const response = await fetch('/api/database-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      
      if (response.ok) {
        fetchMaintenanceStatus() // Refresh status
      }
    } catch (error) {
      console.error(`Failed to trigger maintenance action ${action}:`, error)
    }
  }, [fetchMaintenanceStatus])

  // Effect for monitoring interval
  useEffect(() => {
    if (!isMonitoring) return

    const interval = setInterval(() => {
      fetchPerformanceMetrics()
      generateSystemMetrics()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [isMonitoring, refreshInterval, fetchPerformanceMetrics, generateSystemMetrics])

  // Effect for maintenance status refresh
  useEffect(() => {
    if (!isMonitoring) return

    const interval = setInterval(() => {
      fetchMaintenanceStatus()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [isMonitoring, fetchMaintenanceStatus])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-8 w-8 text-blue-600" />
          Performance Monitor
        </h1>
        <div className="flex gap-2">
          <Button
            onClick={startMonitoring}
            disabled={isMonitoring}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="h-4 w-4 mr-2" />
            Start
          </Button>
          <Button
            onClick={stopMonitoring}
            disabled={!isMonitoring}
            variant="destructive"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
          <Button onClick={clearMetrics} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Performance Summary */}
      {performanceSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceSummary.totalRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceSummary.averageResponseTime}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceSummary.cacheHitRate}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">DB Queries</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceSummary.totalDatabaseQueries}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Metrics */}
      {systemMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>System Metrics</CardTitle>
            <CardDescription>Real-time system performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Memory Usage</span>
                  <span className="text-sm text-muted-foreground">
                    {systemMetrics[systemMetrics.length - 1]?.memory.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${systemMetrics[systemMetrics.length - 1]?.memory.percentage}%`
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">CPU Usage</span>
                  <span className="text-sm text-muted-foreground">
                    {systemMetrics[systemMetrics.length - 1]?.cpu.usage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${systemMetrics[systemMetrics.length - 1]?.cpu.usage}%`
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Cache Hit Rate</span>
                  <span className="text-sm text-muted-foreground">
                    {(systemMetrics[systemMetrics.length - 1]?.cache.hitRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{
                      width: `${systemMetrics[systemMetrics.length - 1]?.cache.hitRate * 100}%`
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">DB Response</span>
                  <span className="text-sm text-muted-foreground">
                    {systemMetrics[systemMetrics.length - 1]?.database.responseTime.toFixed(1)}ms
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full"
                    style={{
                      width: Math.min((systemMetrics[systemMetrics.length - 1]?.database.responseTime / 100) * 100, 100)
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Status */}
      {maintenanceStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Database Maintenance</CardTitle>
            <CardDescription>Automated database optimization and maintenance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={maintenanceStatus.isRunning ? "default" : "secondary"}>
                    {maintenanceStatus.isRunning ? "Running" : "Stopped"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Run</span>
                  <span className="text-sm text-muted-foreground">
                    {maintenanceStatus.lastRun ? new Date(maintenanceStatus.lastRun.timestamp).toLocaleString() : 'Never'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tasks Completed</span>
                  <span className="text-sm text-muted-foreground">
                    {maintenanceStatus.totalTasksCompleted || 0}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => triggerMaintenance('start')}
                  disabled={maintenanceStatus.isRunning}
                  size="sm"
                  className="w-full"
                >
                  Start Service
                </Button>
                <Button
                  onClick={() => triggerMaintenance('stop')}
                  disabled={!maintenanceStatus.isRunning}
                  size="sm"
                  variant="destructive"
                  className="w-full"
                >
                  Stop Service
                </Button>
                <Button
                  onClick={() => triggerMaintenance('run-all')}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  Run All Tasks
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Metrics Table */}
      {metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent API Calls</CardTitle>
            <CardDescription>Performance metrics for recent API requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Processing</th>
                    <th className="text-left p-2">Memory</th>
                    <th className="text-left p-2">Cache</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.slice(-10).reverse().map((metric, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 text-sm">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-2 text-sm">
                        {metric.processingTime.toFixed(2)}ms
                      </td>
                      <td className="p-2 text-sm">
                        {(metric.memoryUsage / 1024 / 1024).toFixed(2)}MB
                      </td>
                      <td className="p-2">
                        <Badge variant={metric.cacheHit ? "default" : "secondary"}>
                          {metric.cacheHit ? "Hit" : "Miss"}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {metric.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : metric.status === 'warning' ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Monitor Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Refresh Interval</label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value={1000}>1 second</option>
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
                <option value={30000}>30 seconds</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PerformanceMonitor
