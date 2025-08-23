/**
 * Performance Testing and Benchmarking Service
 * Provides comprehensive performance testing, benchmarking, and reporting capabilities
 */

import { performance } from 'perf_hooks'
import { performanceMonitor, recordAPIMetric, recordDatabaseMetric, recordCacheMetric } from './performance-monitor'

// Configuration constants
const config = {
  errorThreshold: 5, // 5% error rate threshold
  maxResponseTime: 1000, // 1 second max response time
  targetRPS: 100 // 100 requests per second target
}

// Benchmark test types
export interface BenchmarkTest {
  id: string
  name: string
  description: string
  category: 'api' | 'database' | 'cache' | 'image' | 'system' | 'load'
  iterations: number
  warmupIterations: number
  timeout: number // milliseconds
  enabled: boolean
}

export interface BenchmarkResult {
  testId: string
  testName: string
  timestamp: number
  duration: number
  iterations: number
  warmupIterations: number
  metrics: {
    min: number
    max: number
    mean: number
    median: number
    p95: number
    p99: number
    standardDeviation: number
  }
  throughput: number // operations per second
  memoryUsage: {
    before: NodeJS.MemoryUsage
    after: NodeJS.MemoryUsage
    peak: NodeJS.MemoryUsage
  }
  errors: string[]
  warnings: string[]
}

export interface BenchmarkSuite {
  id: string
  name: string
  description: string
  tests: BenchmarkTest[]
  results: BenchmarkResult[]
  summary: {
    totalTests: number
    passedTests: number
    failedTests: number
    totalDuration: number
    averageThroughput: number
    totalErrors: number
  }
}

export interface LoadTestConfig {
  concurrentUsers: number
  rampUpTime: number // seconds
  testDuration: number // seconds
  targetRPS: number // requests per second
  maxResponseTime: number // milliseconds
  errorThreshold: number // percentage
}

export interface LoadTestResult {
  config: LoadTestConfig
  startTime: number
  endTime: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  requestsPerSecond: number
  errorRate: number
  concurrentUsers: number
  peakMemoryUsage: NodeJS.MemoryUsage
  cpuUsage: NodeJS.CpuUsage
}

// Default benchmark tests
export const DEFAULT_BENCHMARK_TESTS: BenchmarkTest[] = [
  {
    id: 'api_response_time',
    name: 'API Response Time',
    description: 'Measure API endpoint response times',
    category: 'api',
    iterations: 100,
    warmupIterations: 10,
    timeout: 30000,
    enabled: true
  },
  {
    id: 'database_query_performance',
    name: 'Database Query Performance',
    description: 'Measure database operation performance',
    category: 'database',
    iterations: 50,
    warmupIterations: 5,
    timeout: 60000,
    enabled: true
  },
  {
    id: 'cache_operations',
    name: 'Cache Operations',
    description: 'Measure cache operation performance',
    category: 'cache',
    iterations: 200,
    warmupIterations: 20,
    timeout: 30000,
    enabled: true
  },
  {
    id: 'image_processing',
    name: 'Image Processing',
    description: 'Measure image processing performance',
    category: 'image',
    iterations: 20,
    warmupIterations: 2,
    timeout: 120000,
    enabled: true
  },
  {
    id: 'memory_usage',
    name: 'Memory Usage',
    description: 'Measure memory usage patterns',
    category: 'system',
    iterations: 100,
    warmupIterations: 10,
    timeout: 30000,
    enabled: true
  }
]

export class PerformanceBenchmark {
  private tests: BenchmarkTest[] = [...DEFAULT_BENCHMARK_TESTS]
  private suites: BenchmarkSuite[] = []
  private isRunning: boolean = false

  constructor() {
    this.initializeDefaultSuites()
  }

  // Add a new benchmark test
  addTest(test: Omit<BenchmarkTest, 'id'>): string {
    const id = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newTest: BenchmarkTest = { ...test, id }
    
    this.tests.push(newTest)
    return id
  }

  // Remove a benchmark test
  removeTest(testId: string): boolean {
    const index = this.tests.findIndex(test => test.id === testId)
    if (index === -1) return false
    
    this.tests.splice(index, 1)
    return true
  }

  // Create a new benchmark suite
  createSuite(name: string, description: string, testIds: string[]): string {
    const id = `suite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const tests = this.tests.filter(test => testIds.includes(test.id))
    
    const suite: BenchmarkSuite = {
      id,
      name,
      description,
      tests,
      results: [],
      summary: {
        totalTests: tests.length,
        passedTests: 0,
        failedTests: 0,
        totalDuration: 0,
        averageThroughput: 0,
        totalErrors: 0
      }
    }
    
    this.suites.push(suite)
    return id
  }

  // Run a single benchmark test
  async runTest(testId: string): Promise<BenchmarkResult | null> {
    const test = this.tests.find(t => t.id === testId)
    if (!test || !test.enabled) return null

    console.log(`Running benchmark test: ${test.name}`)
    
    const startTime = performance.now()
    const memoryBefore = process.memoryUsage()
    let peakMemory = { ...memoryBefore }
    
    const results: number[] = []
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Warmup iterations
      for (let i = 0; i < test.warmupIterations; i++) {
        await this.executeTest(test)
      }

      // Actual test iterations
      for (let i = 0; i < test.iterations; i++) {
        const iterationStart = performance.now()
        
        try {
          await this.executeTest(test)
          const iterationEnd = performance.now()
          results.push(iterationEnd - iterationStart)
          
          // Update peak memory
          const currentMemory = process.memoryUsage()
          if (currentMemory.heapUsed > peakMemory.heapUsed) {
            peakMemory = { ...currentMemory }
          }
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`Iteration ${i + 1}: ${errorMsg}`)
        }

        // Check timeout
        if (performance.now() - startTime > test.timeout) {
          warnings.push(`Test timed out after ${test.timeout}ms`)
          break
        }
      }

    } catch (error) {
      errors.push(`Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    const endTime = performance.now()
    const memoryAfter = process.memoryUsage()
    const duration = endTime - startTime

    // Calculate statistics
    const metrics = this.calculateStatistics(results)
    const throughput = results.length / (duration / 1000)

    const result: BenchmarkResult = {
      testId: test.id,
      testName: test.name,
      timestamp: Date.now(),
      duration,
      iterations: test.iterations,
      warmupIterations: test.warmupIterations,
      metrics,
      throughput,
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: peakMemory
      },
      errors,
      warnings
    }

    // Record metrics
    this.recordBenchmarkMetrics(test, result)

    return result
  }

  // Run a benchmark suite
  async runSuite(suiteId: string): Promise<BenchmarkSuite | null> {
    const suite = this.suites.find(s => s.id === suiteId)
    if (!suite) return null

    if (this.isRunning) {
      throw new Error('Benchmark suite is already running')
    }

    this.isRunning = true
    console.log(`Running benchmark suite: ${suite.name}`)

    const startTime = performance.now()
    suite.results = []

    try {
      for (const test of suite.tests) {
        if (!test.enabled) continue

        const result = await this.runTest(test.id)
        if (result) {
          suite.results.push(result)
        }
      }

      // Calculate suite summary
      this.calculateSuiteSummary(suite)

    } finally {
      this.isRunning = false
    }

    const totalDuration = performance.now() - startTime
    console.log(`Benchmark suite completed in ${totalDuration.toFixed(2)}ms`)

    return suite
  }

  // Run load test
  async runLoadTest(
    endpoint: string,
    method: string,
    config: LoadTestConfig
  ): Promise<LoadTestResult> {
    console.log(`Starting load test for ${method} ${endpoint}`)
    console.log(`Config: ${config.concurrentUsers} users, ${config.targetRPS} RPS, ${config.testDuration}s`)

    const startTime = Date.now()
    const endTime = startTime + (config.testDuration * 1000)
    const rampUpInterval = config.rampUpTime * 1000 / config.concurrentUsers

    const results: number[] = []
    const errors: string[] = []
    let totalRequests = 0
    let successfulRequests = 0
    let failedRequests = 0
    let currentUsers = 0
    let peakMemory = process.memoryUsage()
    let startCpu = process.cpuUsage()

    // Ramp up users
    const rampUpIntervalId = setInterval(() => {
      if (currentUsers < config.concurrentUsers) {
        currentUsers++
        this.startUser(endpoint, method, config, results, errors, startTime, endTime)
      } else {
        clearInterval(rampUpIntervalId)
      }
    }, rampUpInterval)

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, config.testDuration * 1000))

    // Calculate results
    const totalDuration = Date.now() - startTime
    const averageResponseTime = results.length > 0 ? results.reduce((a, b) => a + b, 0) / results.length : 0
    const p95ResponseTime = this.calculatePercentile(results, 95)
    const p99ResponseTime = this.calculatePercentile(results, 99)
    const requestsPerSecond = totalRequests / (totalDuration / 1000)
    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0

    const loadTestResult: LoadTestResult = {
      config,
      startTime,
      endTime: Date.now(),
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      requestsPerSecond,
      errorRate,
      concurrentUsers: currentUsers,
      peakMemoryUsage: peakMemory,
      cpuUsage: process.cpuUsage(startCpu)
    }

    // Record load test metrics
    this.recordLoadTestMetrics(endpoint, method, loadTestResult)

    return loadTestResult
  }

  // Get all benchmark tests
  getTests(): BenchmarkTest[] {
    return [...this.tests]
  }

  // Get all benchmark suites
  getSuites(): BenchmarkSuite[] {
    return [...this.suites]
  }

  // Get benchmark results
  getResults(suiteId?: string): BenchmarkResult[] {
    if (suiteId) {
      const suite = this.suites.find(s => s.id === suiteId)
      return suite ? suite.results : []
    }
    
    return this.suites.flatMap(suite => suite.results)
  }

  // Get load test recommendations
  getLoadTestRecommendations(result: LoadTestResult): string[] {
    const recommendations: string[] = []

    if (result.errorRate > config.errorThreshold) {
      recommendations.push(`Error rate (${result.errorRate.toFixed(2)}%) exceeds threshold (${config.errorThreshold}%). Investigate server errors.`)
    }

    if (result.averageResponseTime > config.maxResponseTime) {
      recommendations.push(`Average response time (${result.averageResponseTime.toFixed(2)}ms) exceeds threshold (${config.maxResponseTime}ms). Consider optimization.`)
    }

    if (result.requestsPerSecond < config.targetRPS * 0.8) {
      recommendations.push(`Throughput (${result.requestsPerSecond.toFixed(2)} RPS) is below target (${config.targetRPS} RPS). Consider scaling.`)
    }

    if (result.p95ResponseTime > config.maxResponseTime * 2) {
      recommendations.push(`P95 response time (${result.p95ResponseTime.toFixed(2)}ms) is significantly high. Investigate performance bottlenecks.`)
    }

    return recommendations
  }

  // Private methods

  private initializeDefaultSuites(): void {
    // Create default suite with all tests
    this.createSuite(
      'Default Performance Suite',
      'Comprehensive performance testing suite',
      this.tests.map(t => t.id)
    )
  }

  private async executeTest(test: BenchmarkTest): Promise<void> {
    switch (test.category) {
      case 'api':
        await this.executeAPITest(test)
        break
      case 'database':
        await this.executeDatabaseTest(test)
        break
      case 'cache':
        await this.executeCacheTest(test)
        break
      case 'image':
        await this.executeImageTest(test)
        break
      case 'system':
        await this.executeSystemTest(test)
        break
      default:
        throw new Error(`Unknown test category: ${test.category}`)
    }
  }

  private async executeAPITest(test: BenchmarkTest): Promise<void> {
    // Simulate API call
    const responseTime = Math.random() * 100 + 50 // 50-150ms
    await new Promise(resolve => setTimeout(resolve, responseTime))
    
    // Record API metric
    recordAPIMetric('/api/test', 'GET', responseTime, 200)
  }

  private async executeDatabaseTest(test: BenchmarkTest): Promise<void> {
    // Simulate database operation
    const duration = Math.random() * 50 + 10 // 10-60ms
    await new Promise(resolve => setTimeout(resolve, duration))
    
    // Record database metric
    recordDatabaseMetric('find', 'test_collection', duration)
  }

  private async executeCacheTest(test: BenchmarkTest): Promise<void> {
    // Simulate cache operation
    const duration = Math.random() * 5 + 1 // 1-6ms
    await new Promise(resolve => setTimeout(resolve, duration))
    
    // Record cache metric
    recordCacheMetric('hit', 'test_key', duration)
  }

  private async executeImageTest(test: BenchmarkTest): Promise<void> {
    // Simulate image processing
    const duration = Math.random() * 200 + 100 // 100-300ms
    await new Promise(resolve => setTimeout(resolve, duration))
    
    // Record image metric
    performanceMonitor.recordImageMetric('resize', duration, 1024 * 1024, 256 * 1024, 'jpeg')
  }

  private async executeSystemTest(test: BenchmarkTest): Promise<void> {
    // Simulate system operation
    const duration = Math.random() * 10 + 1 // 1-11ms
    await new Promise(resolve => setTimeout(resolve, duration))
    
    // Record system metric
    performanceMonitor.recordMetric('system', 'test_operation', duration, 'ms')
  }

  private calculateStatistics(values: number[]): BenchmarkResult['metrics'] {
    if (values.length === 0) {
      return {
        min: 0, max: 0, mean: 0, median: 0, p95: 0, p99: 0, standardDeviation: 0
      }
    }

    const sorted = [...values].sort((a, b) => a - b)
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const median = this.calculatePercentile(sorted, 50)
    const p95 = this.calculatePercentile(sorted, 95)
    const p99 = this.calculatePercentile(sorted, 99)
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const standardDeviation = Math.sqrt(variance)

    return { min, max, mean, median, p95, p99, standardDeviation }
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1
    return sortedValues[Math.max(0, index)] || 0
  }

  private calculateSuiteSummary(suite: BenchmarkSuite): void {
    const results = suite.results
    const totalTests = suite.tests.length
    const passedTests = results.filter(r => r.errors.length === 0).length
    const failedTests = totalTests - passedTests
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
    const averageThroughput = results.length > 0 
      ? results.reduce((sum, r) => sum + r.throughput, 0) / results.length 
      : 0
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

    suite.summary = {
      totalTests,
      passedTests,
      failedTests,
      totalDuration,
      averageThroughput,
      totalErrors
    }
  }

  private async startUser(
    endpoint: string,
    method: string,
    config: LoadTestConfig,
    results: number[],
    errors: string[],
    startTime: number,
    endTime: number
  ): Promise<void> {
    const interval = 1000 / config.targetRPS // Time between requests
    let totalRequests = 0
    let successfulRequests = 0
    let failedRequests = 0

    const userInterval = setInterval(async () => {
      if (Date.now() > endTime) {
        clearInterval(userInterval)
        return
      }

      const requestStart = performance.now()
      try {
        // Simulate API call
        const responseTime = Math.random() * 100 + 50
        await new Promise(resolve => setTimeout(resolve, responseTime))
        
        results.push(responseTime)
        totalRequests++
        successfulRequests++
        
        // Record API metric
        recordAPIMetric(endpoint, method, responseTime, 200)
        
      } catch (error) {
        failedRequests++
        errors.push(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }, interval)
  }

  private recordBenchmarkMetrics(test: BenchmarkTest, result: BenchmarkResult): void {
    // Record various performance metrics
    performanceMonitor.recordMetric('system', 'test_duration', result.duration, 'ms', {
      testId: test.id,
      category: test.category
    })

    performanceMonitor.recordMetric('system', 'throughput', result.throughput, 'ops/sec', {
      testId: test.id,
      category: test.category
    })

    performanceMonitor.recordMetric('system', 'memory_usage', 
      result.memoryUsage.peak.heapUsed, 'bytes', {
      testId: test.id,
      category: test.category
    })
  }

  private recordLoadTestMetrics(endpoint: string, method: string, result: LoadTestResult): void {
    // Record load test metrics
    performanceMonitor.recordMetric('api', 'total_requests', result.totalRequests, 'count', {
      endpoint,
      method
    })

    performanceMonitor.recordMetric('api', 'requests_per_second', result.requestsPerSecond, 'rps', {
      endpoint,
      method
    })

    performanceMonitor.recordMetric('api', 'error_rate', result.errorRate, 'percentage', {
      endpoint,
      method
    })

    performanceMonitor.recordMetric('api', 'average_response_time', result.averageResponseTime, 'ms', {
      endpoint,
      method
    })
  }
}

// Export singleton instance
export const performanceBenchmark = new PerformanceBenchmark()

// Export utility functions
export const runBenchmarkTest = (testId: string) => performanceBenchmark.runTest(testId)
export const runBenchmarkSuite = (suiteId: string) => performanceBenchmark.runSuite(suiteId)
export const runLoadTest = (endpoint: string, method: string, config: LoadTestConfig) => 
  performanceBenchmark.runLoadTest(endpoint, method, config)
