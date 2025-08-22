import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PerformanceMonitor from '@/components/PerformanceMonitor'

// Mock the performance monitoring hooks and API calls
const mockUsePerformanceData = jest.fn()
const mockUseMaintenanceData = jest.fn()

jest.mock('@/hooks/usePerformanceData', () => ({
  usePerformanceData: () => mockUsePerformanceData(),
}))

jest.mock('@/hooks/useMaintenanceData', () => ({
  useMaintenanceData: () => mockUseMaintenanceData(),
}))

describe('PerformanceMonitor', () => {
  const mockPerformanceData = {
    summary: {
      totalRequests: 1000,
      averageResponseTime: '150ms',
      cacheHitRate: '75%',
      totalCacheOperations: 1500,
      totalDatabaseQueries: 500,
    },
    system: {
      timestamp: '2024-01-15T10:30:00Z',
      uptime: 3600,
      memory: {
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 80 * 1024 * 1024,
      },
      cpu: {
        user: 1000000,
        system: 500000,
      },
      platform: 'development',
      nodeVersion: '18.0.0',
      environment: 'development',
    },
  }

  const mockMaintenanceData = {
    status: {
      isRunning: false,
      lastRun: '2024-01-15T09:00:00Z',
      nextScheduledRun: '2024-01-15T15:00:00Z',
      totalTasksCompleted: 25,
      lastError: null,
    },
    scheduledTasks: [
      {
        name: 'Index Optimization',
        schedule: '0 2 * * *',
        lastRun: '2024-01-15T02:00:00Z',
        nextRun: '2024-01-16T02:00:00Z',
        status: 'scheduled',
      },
      {
        name: 'Cache Cleanup',
        schedule: '0 4 * * *',
        lastRun: '2024-01-15T04:00:00Z',
        nextRun: '2024-01-16T04:00:00Z',
        status: 'completed',
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePerformanceData.mockReturnValue({
      data: mockPerformanceData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })
    mockUseMaintenanceData.mockReturnValue({
      data: mockMaintenanceData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })
  })

  it('renders performance monitor correctly', () => {
    render(<PerformanceMonitor />)

    expect(screen.getByText(/performance monitor/i)).toBeInTheDocument()
    expect(screen.getByText(/system overview/i)).toBeInTheDocument()
    expect(screen.getByText(/maintenance status/i)).toBeInTheDocument()
  })

  it('displays performance summary data', () => {
    render(<PerformanceMonitor />)

    expect(screen.getByText(/total requests/i)).toBeInTheDocument()
    expect(screen.getByText('1,000')).toBeInTheDocument()
    expect(screen.getByText(/average response time/i)).toBeInTheDocument()
    expect(screen.getByText('150ms')).toBeInTheDocument()
    expect(screen.getByText(/cache hit rate/i)).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('displays system metrics', () => {
    render(<PerformanceMonitor />)

    expect(screen.getByText(/memory usage/i)).toBeInTheDocument()
    expect(screen.getByText(/50 MB \/ 100 MB/i)).toBeInTheDocument()
    expect(screen.getByText(/uptime/i)).toBeInTheDocument()
    expect(screen.getByText(/1 hour/i)).toBeInTheDocument()
    expect(screen.getByText(/node version/i)).toBeInTheDocument()
    expect(screen.getByText('18.0.0')).toBeInTheDocument()
  })

  it('displays maintenance status', () => {
    render(<PerformanceMonitor />)

    expect(screen.getByText(/maintenance status/i)).toBeInTheDocument()
    expect(screen.getByText(/not running/i)).toBeInTheDocument()
    expect(screen.getByText(/last run/i)).toBeInTheDocument()
    expect(screen.getByText(/next scheduled run/i)).toBeInTheDocument()
    expect(screen.getByText(/total tasks completed/i)).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('displays scheduled tasks', () => {
    render(<PerformanceMonitor />)

    expect(screen.getByText(/scheduled tasks/i)).toBeInTheDocument()
    expect(screen.getByText(/index optimization/i)).toBeInTheDocument()
    expect(screen.getByText(/cache cleanup/i)).toBeInTheDocument()
    expect(screen.getByText(/0 2 \* \* \*/i)).toBeInTheDocument() // Cron schedule
    expect(screen.getByText(/0 4 \* \* \*/i)).toBeInTheDocument()
  })

  it('shows loading state when data is loading', () => {
    mockUsePerformanceData.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    })

    render(<PerformanceMonitor />)

    expect(screen.getByText(/loading performance data/i)).toBeInTheDocument()
  })

  it('shows error state when there is an error', () => {
    mockUsePerformanceData.mockReturnValue({
      data: null,
      isLoading: false,
      error: 'Failed to fetch performance data',
      refetch: jest.fn(),
    })

    render(<PerformanceMonitor />)

    expect(screen.getByText(/error loading performance data/i)).toBeInTheDocument()
    expect(screen.getByText(/failed to fetch performance data/i)).toBeInTheDocument()
  })

  it('displays memory usage with appropriate formatting', () => {
    render(<PerformanceMonitor />)

    const memoryUsage = screen.getByText(/50 MB \/ 100 MB/i)
    expect(memoryUsage).toBeInTheDocument()
  })

  it('displays uptime in human readable format', () => {
    const longUptimeData = {
      ...mockPerformanceData,
      system: {
        ...mockPerformanceData.system,
        uptime: 86400, // 24 hours
      },
    }

    mockUsePerformanceData.mockReturnValue({
      data: longUptimeData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<PerformanceMonitor />)

    expect(screen.getByText(/24 hours/i)).toBeInTheDocument()
  })

  it('displays CPU usage information', () => {
    render(<PerformanceMonitor />)

    expect(screen.getByText(/cpu usage/i)).toBeInTheDocument()
    expect(screen.getByText(/user: 1.0s/i)).toBeInTheDocument()
    expect(screen.getByText(/system: 0.5s/i)).toBeInTheDocument()
  })

  it('shows maintenance task status with appropriate styling', () => {
    render(<PerformanceMonitor />)

    const scheduledTask = screen.getByText(/scheduled/i)
    expect(scheduledTask).toHaveClass('bg-yellow-100', 'text-yellow-800')

    const completedTask = screen.getByText(/completed/i)
    expect(completedTask).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('displays last error when maintenance fails', () => {
    const errorMaintenanceData = {
      ...mockMaintenanceData,
      status: {
        ...mockMaintenanceData.status,
        lastError: 'Database connection failed',
      },
    }

    mockUseMaintenanceData.mockReturnValue({
      data: errorMaintenanceData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<PerformanceMonitor />)

    expect(screen.getByText(/last error/i)).toBeInTheDocument()
    expect(screen.getByText(/database connection failed/i)).toBeInTheDocument()
  })

  it('handles empty maintenance data gracefully', () => {
    const emptyMaintenanceData = {
      status: {
        isRunning: false,
        lastRun: null,
        nextScheduledRun: null,
        totalTasksCompleted: 0,
        lastError: null,
      },
      scheduledTasks: [],
    }

    mockUseMaintenanceData.mockReturnValue({
      data: emptyMaintenanceData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<PerformanceMonitor />)

    expect(screen.getByText(/no scheduled tasks/i)).toBeInTheDocument()
    expect(screen.getByText(/no maintenance history/i)).toBeInTheDocument()
  })

  it('displays platform and environment information', () => {
    render(<PerformanceMonitor />)

    expect(screen.getByText(/platform/i)).toBeInTheDocument()
    expect(screen.getByText(/development/i)).toBeInTheDocument()
    expect(screen.getByText(/environment/i)).toBeInTheDocument()
    expect(screen.getByText(/development/i)).toBeInTheDocument()
  })

  it('formats large numbers correctly', () => {
    const largeData = {
      ...mockPerformanceData,
      summary: {
        ...mockPerformanceData.summary,
        totalRequests: 1000000,
        totalCacheOperations: 5000000,
        totalDatabaseQueries: 2500000,
      },
    }

    mockUsePerformanceData.mockReturnValue({
      data: largeData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<PerformanceMonitor />)

    expect(screen.getByText('1,000,000')).toBeInTheDocument()
    expect(screen.getByText('5,000,000')).toBeInTheDocument()
    expect(screen.getByText('2,500,000')).toBeInTheDocument()
  })

  it('handles different time formats', () => {
    const differentTimeData = {
      ...mockPerformanceData,
      system: {
        ...mockPerformanceData.system,
        uptime: 3661, // 1 hour, 1 minute, 1 second
      },
    }

    mockUsePerformanceData.mockReturnValue({
      data: differentTimeData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<PerformanceMonitor />)

    expect(screen.getByText(/1 hour, 1 minute, 1 second/i)).toBeInTheDocument()
  })
})
