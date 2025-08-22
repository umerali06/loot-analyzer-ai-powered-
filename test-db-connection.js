// Test Database Connection
// Run this with: node test-db-connection.js

require('dotenv').config({ path: '.env.local' })

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...')
  console.log('=====================================')
  
  // Check environment variables
  console.log('Environment Variables:')
  console.log('  MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET')
  console.log('  MONGODB_DB_NAME:', process.env.MONGODB_DB_NAME || 'DEFAULT: sibi_analyzer')
  
  if (!process.env.MONGODB_URI) {
    console.log('❌ MONGODB_URI is not set!')
    console.log('Please create a .env.local file with your MongoDB Atlas connection string.')
    return
  }
  
  if (process.env.MONGODB_URI.includes('localhost')) {
    console.log('❌ MONGODB_URI is set to localhost!')
    console.log('Please use your MongoDB Atlas connection string instead.')
    return
  }
  
  console.log('✅ Environment variables look good')
  
  try {
    // Test MongoDB connection
    const { MongoClient } = require('mongodb')
    console.log('🔍 Creating MongoClient...')
    
    const client = new MongoClient(process.env.MONGODB_URI, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000
    })
    
    console.log('🔍 Connecting to MongoDB...')
    await client.connect()
    console.log('✅ Connected to MongoDB!')
    
    // Test database access
    const db = client.db(process.env.MONGODB_DB_NAME || 'sibi_analyzer')
    console.log('✅ Database object created:', db.databaseName)
    
    // Test collection access
    const usersCollection = db.collection('users')
    console.log('✅ Users collection created:', usersCollection.collectionName)
    
    // Test basic query
    const userCount = await usersCollection.countDocuments()
    console.log('✅ User count query successful:', userCount, 'users found')
    
    // Test ping
    await db.admin().ping()
    console.log('✅ Database ping successful')
    
    console.log('🎉 All database tests passed!')
    
    await client.close()
    console.log('✅ Connection closed')
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    console.error('Full error:', error)
  }
}

// Run the test
testDatabaseConnection().catch(console.error)
