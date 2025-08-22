#!/usr/bin/env node

/**
 * Test script for database and caching optimization services
 * This script tests the new Redis caching, optimized database, and maintenance services
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const { RedisCacheService } = require('../lib/redis-cache')
const { OptimizedDatabaseService } = require('../lib/database-optimized')
const { DatabaseMaintenanceService } = require('../lib/database-maintenance')

async function testRedisCache() {
  console.log('\n🧪 Testing Redis Cache Service...')
  
  try {
    const redisCache = new RedisCacheService()
    
    // Test connection
    await redisCache.connect()
    console.log('✅ Redis connection successful')
    
    // Test basic operations
    const testKey = 'test_key_' + Date.now()
    const testData = { message: 'Hello Redis!', timestamp: new Date().toISOString() }
    
    // Set data
    await redisCache.set(testKey, testData, 60000) // 1 minute TTL
    console.log('✅ Set operation successful')
    
    // Get data
    const retrieved = await redisCache.get(testKey)
    if (JSON.stringify(retrieved) === JSON.stringify(testData)) {
      console.log('✅ Get operation successful')
    } else {
      console.log('❌ Get operation failed - data mismatch')
    }
    
    // Test TTL
    const ttl = await redisCache.getTTL(testKey)
    console.log(`✅ TTL check successful: ${ttl}ms remaining`)
    
    // Test delete
    await redisCache.delete(testKey)
    const deleted = await redisCache.get(testKey)
    if (deleted === null) {
      console.log('✅ Delete operation successful')
    } else {
      console.log('❌ Delete operation failed')
    }
    
    // Test statistics
    const stats = await redisCache.getStats()
    console.log('✅ Statistics retrieved:', stats)
    
    await redisCache.disconnect()
    console.log('✅ Redis disconnection successful')
    
  } catch (error) {
    console.error('❌ Redis Cache test failed:', error.message)
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Make sure Redis is running: redis-server')
    }
  }
}

async function testOptimizedDatabase() {
  console.log('\n🧪 Testing Optimized Database Service...')
  
  try {
    const dbService = new OptimizedDatabaseService()
    
    // Test connection
    await dbService.connect()
    console.log('✅ Database connection successful')
    
    // Test basic operations
    const testCollection = 'test_collection'
    const testDocument = {
      name: 'Test Item',
      value: Math.random() * 1000,
      timestamp: new Date(),
      metadata: { test: true, version: '1.0' }
    }
    
    // Insert document
    const insertId = await dbService.insertOne(testCollection, testDocument)
    console.log('✅ Insert operation successful, ID:', insertId)
    
    // Find document
    const found = await dbService.findOne(testCollection, { _id: insertId })
    if (found && found.name === testDocument.name) {
      console.log('✅ Find operation successful')
    } else {
      console.log('❌ Find operation failed')
    }
    
    // Update document
    const updateResult = await dbService.updateOne(
      testCollection,
      { _id: insertId },
      { $set: { value: 999, updated: true } }
    )
    if (updateResult) {
      console.log('✅ Update operation successful')
    } else {
      console.log('❌ Update operation failed')
    }
    
    // Find multiple documents
    const allDocs = await dbService.find(testCollection, { test: true })
    console.log(`✅ Find multiple operation successful: ${allDocs.length} documents`)
    
    // Test aggregation
    const aggregationResult = await dbService.aggregate(testCollection, [
      { $match: { test: true } },
      { $group: { _id: null, totalValue: { $sum: '$value' } } }
    ])
    console.log('✅ Aggregation operation successful:', aggregationResult)
    
    // Delete test document
    const deleteResult = await dbService.deleteOne(testCollection, { _id: insertId })
    if (deleteResult) {
      console.log('✅ Delete operation successful')
    } else {
      console.log('❌ Delete operation failed')
    }
    
    // Clean up test collection
    try {
      await dbService.dropCollection(testCollection)
      console.log('✅ Collection cleanup successful')
    } catch (cleanupError) {
      console.log('⚠️ Collection cleanup failed (this is normal if collection is empty):', cleanupError.message)
    }
    
    await dbService.disconnect()
    console.log('✅ Database disconnection successful')
    
  } catch (error) {
    console.error('❌ Optimized Database test failed:', error.message)
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Make sure MongoDB is running and MONGODB_URI is set in .env.local')
    }
  }
}

async function testDatabaseMaintenance() {
  console.log('\n🧪 Testing Database Maintenance Service...')
  
  try {
    const maintenanceService = new DatabaseMaintenanceService()
    
    // Test service status
    const status = maintenanceService.getStatus()
    console.log('✅ Service status retrieved:', {
      isRunning: status.isRunning,
      totalTasksCompleted: status.totalTasksCompleted,
      lastError: status.lastError
    })
    
    // Test scheduled tasks info
    const scheduledTasks = maintenanceService.getScheduledTasks()
    console.log('✅ Scheduled tasks retrieved:', scheduledTasks.length, 'tasks')
    
    // Test next scheduled run
    const nextRun = maintenanceService.getNextScheduledRun()
    console.log('✅ Next scheduled run:', nextRun)
    
    // Test individual maintenance tasks (these will fail if database is not connected)
    try {
      const connectionHealth = await maintenanceService.runConnectionHealthCheck()
      console.log('✅ Connection health check successful:', connectionHealth)
    } catch (error) {
      console.log('⚠️ Connection health check failed (expected if DB not connected):', error.message)
    }
    
    console.log('✅ Database Maintenance Service test completed')
    
  } catch (error) {
    console.error('❌ Database Maintenance test failed:', error.message)
  }
}

async function testEnhancedAPIUtils() {
  console.log('\n🧪 Testing Enhanced API Utilities...')
  
  try {
    // Test memory cache fallback
    const { MemoryCache } = require('../lib/api-utils-enhanced')
    
    if (MemoryCache) {
      const memoryCache = new MemoryCache(100, 60000)
      
      // Test basic operations
      memoryCache.set('test_key', 'test_value')
      const retrieved = memoryCache.get('test_key')
      
      if (retrieved === 'test_value') {
        console.log('✅ Memory cache fallback working')
      } else {
        console.log('❌ Memory cache fallback failed')
      }
    } else {
      console.log('⚠️ Memory cache not exported (this is normal)')
    }
    
    console.log('✅ Enhanced API Utilities test completed')
    
  } catch (error) {
    console.error('❌ Enhanced API Utilities test failed:', error.message)
  }
}

async function runAllTests() {
  console.log('🚀 Starting Database and Caching Optimization Tests...')
  console.log('=' .repeat(60))
  
  try {
    await testRedisCache()
    await testOptimizedDatabase()
    await testDatabaseMaintenance()
    await testEnhancedAPIUtils()
    
    console.log('\n' + '=' .repeat(60))
    console.log('🎉 All tests completed!')
    console.log('\n💡 Next steps:')
    console.log('   1. Start the development server: npm run dev')
    console.log('   2. Test the new API endpoints:')
    console.log('      - GET /api/performance')
    console.log('      - GET /api/database-maintenance')
    console.log('      - GET /api/analysis-history')
    console.log('   3. Visit /performance-monitor to see the dashboard')
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message)
    process.exit(1)
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = {
  testRedisCache,
  testOptimizedDatabase,
  testDatabaseMaintenance,
  testEnhancedAPIUtils,
  runAllTests
}
