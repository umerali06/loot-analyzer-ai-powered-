/**
 * Force MongoDB Driver Restoration
 * This file completely bypasses any mocked MongoDB and forces the real driver
 */

console.log('🚨 FORCE RESTORING MongoDB Driver...')

// Force clear any global MongoDB mocks
if (typeof global !== 'undefined') {
  // Clear any existing MongoDB-related globals
  delete (global as any).ObjectId
  delete (global as any).MongoClient
  delete (global as any).Db
  delete (global as any).Collection
  
  console.log('🔧 Cleared global MongoDB mocks')
}

// Force clear any process-level MongoDB mocks
if (typeof process !== 'undefined') {
  // Clear any MongoDB-related process properties
  delete (process as any).mongodb
  delete (process as any).mongo
  
  console.log('🔧 Cleared process MongoDB mocks')
}

// Force clear any module cache for MongoDB
if (require.cache) {
  const mongoCacheKeys = Object.keys(require.cache).filter(key => 
    key.includes('mongodb') || key.includes('mongo')
  )
  
  mongoCacheKeys.forEach(key => {
    delete require.cache[key]
    console.log(`🔧 Cleared module cache: ${key}`)
  })
}

// Force import fresh MongoDB
let RealMongoClient: any
let RealDb: any
let RealCollection: any
let RealObjectId: any

try {
  // Clear any existing MongoDB imports
  delete require.cache[require.resolve('mongodb')]
  
  // Force fresh import
  const freshMongo = require('mongodb')
  RealMongoClient = freshMongo.MongoClient
  RealDb = freshMongo.Db
  RealCollection = freshMongo.Collection
  RealObjectId = freshMongo.ObjectId
  
  console.log('✅ Fresh MongoDB driver imported successfully')
  
  // Test if ObjectId is working correctly
  const testId = new RealObjectId()
  const testString = testId.toString()
  
  if (testString.startsWith('mock_id_')) {
    throw new Error('ObjectId still returning mock IDs after fresh import')
  }
  
  if (!/^[0-9a-fA-F]{24}$/.test(testString)) {
    throw new Error('ObjectId not returning valid hex IDs after fresh import')
  }
  
  console.log(`✅ Test ObjectId working: ${testString}`)
  
} catch (error) {
  console.error('❌ FAILED to import fresh MongoDB:', error)
  throw error
}

// Force set global MongoDB constructors
if (typeof global !== 'undefined') {
  ;(global as any).MongoClient = RealMongoClient
  ;(global as any).Db = RealDb
  ;(global as any).Collection = RealCollection
  ;(global as any).ObjectId = RealObjectId
  
  console.log('✅ Global MongoDB constructors restored')
}

// Export the real MongoDB classes
export {
  RealMongoClient as MongoClient,
  RealDb as Db,
  RealCollection as Collection,
  RealObjectId as ObjectId
}

console.log('🎉 MongoDB Driver Force Restoration Complete!')
