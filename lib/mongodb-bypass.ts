/**
 * MongoDB Mock Bypass System
 * This file completely bypasses any mocked MongoDB by using dynamic imports
 */

console.log('🚨 BYPASSING MongoDB Mock System...')

// Force clear any existing MongoDB imports
if (typeof require !== 'undefined' && require.cache) {
  const mongoCacheKeys = Object.keys(require.cache).filter(key => 
    key.includes('mongodb') || key.includes('mongo')
  )
  
  mongoCacheKeys.forEach(key => {
    delete require.cache[key]
    console.log(`🔧 Cleared module cache: ${key}`)
  })
}

// Force clear any global MongoDB mocks
if (typeof global !== 'undefined') {
  delete (global as any).ObjectId
  delete (global as any).MongoClient
  delete (global as any).Db
  delete (global as any).Collection
  console.log('🔧 Cleared global MongoDB mocks')
}

// Dynamic import function to get fresh MongoDB
async function getFreshMongoDB() {
  try {
    // Force clear the module cache for mongodb
    if (typeof require !== 'undefined' && require.cache) {
      delete require.cache[require.resolve('mongodb')]
    }
    
    // Dynamic import to get fresh MongoDB
    const freshMongo = await import('mongodb')
    
    console.log('✅ Fresh MongoDB imported successfully')
    
    // Test if ObjectId is working correctly
    const testId = new freshMongo.ObjectId()
    const testString = testId.toString()
    
    if (testString.startsWith('mock_id_')) {
      throw new Error('ObjectId still returning mock IDs after fresh import')
    }
    
    if (!/^[0-9a-fA-F]{24}$/.test(testString)) {
      throw new Error('ObjectId not returning valid hex IDs after fresh import')
    }
    
    console.log(`✅ Test ObjectId working: ${testString}`)
    
    return freshMongo
    
  } catch (error) {
    console.error('❌ FAILED to import fresh MongoDB:', error)
    throw error
  }
}

// Export the bypass function
export { getFreshMongoDB }

console.log('🎉 MongoDB Bypass System Ready!')
