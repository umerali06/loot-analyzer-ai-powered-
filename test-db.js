// Simple Database Test
// Run this with: node test-db.js

require('dotenv').config({ path: '.env.local' })

async function testDatabase() {
  console.log('🔍 Testing New Database Structure...')
  console.log('=====================================')
  
  if (!process.env.MONGODB_URI) {
    console.log('❌ MONGODB_URI not set!')
    return
  }
  
  try {
    const { MongoClient } = require('mongodb')
    
    console.log('🔌 Connecting to MongoDB Atlas...')
    const client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
    console.log('✅ Connected')
    
    const db = client.db('sibi_analyzer')
    console.log('✅ Database created:', db.databaseName)
    
    // Test collections
    const collections = ['users', 'user_sessions', 'analyses']
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName)
        const count = await collection.countDocuments({})
        console.log(`✅ Collection '${collectionName}': ${count} documents`)
      } catch (error) {
        console.log(`❌ Collection '${collectionName}': Error - ${error.message}`)
      }
    }
    
    // Test basic operations
    const testCollection = db.collection('test_connection')
    await testCollection.insertOne({ test: true, timestamp: new Date() })
    console.log('✅ Insert operation successful')
    
    const testDoc = await testCollection.findOne({ test: true })
    console.log('✅ Find operation successful')
    
    await testCollection.deleteOne({ test: true })
    console.log('✅ Delete operation successful')
    
    await client.close()
    console.log('✅ Database test completed successfully')
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
  }
}

testDatabase()
