#!/usr/bin/env node

/**
 * Manual Startup Script
 * Run this script to manually initialize the database and services
 * 
 * Usage:
 *   node scripts/startup.js
 *   npm run startup
 */

const { MongoClient } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

async function manualStartup() {
  console.log('🚀 Manual Startup Script')
  console.log('========================')
  
  try {
    // Check environment variables
    console.log('\n📋 Environment Check:')
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`)
    console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Not set'}`)
    console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set'}`)
    console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Not set'}`)

    if (!process.env.MONGODB_URI) {
      console.error('\n❌ MONGODB_URI is required. Please check your .env.local file.')
      process.exit(1)
    }

    // Test database connection
    console.log('\n🗄️ Testing Database Connection:')
    const client = new MongoClient(process.env.MONGODB_URI)
    
    try {
      await client.connect()
      console.log('✅ MongoDB connection successful')
      
      const db = client.db()
      const collections = await db.listCollections().toArray()
      console.log(`📊 Found ${collections.length} collections:`)
      collections.forEach(col => console.log(`   - ${col.name}`))
      
      // Check if required collections exist
      const requiredCollections = ['users', 'sessions', 'analyses']
      const existingCollections = collections.map(col => col.name)
      
      console.log('\n🔍 Collection Status:')
      requiredCollections.forEach(collection => {
        if (existingCollections.includes(collection)) {
          console.log(`   ✅ ${collection}: exists`)
        } else {
          console.log(`   ❌ ${collection}: missing`)
        }
      })

      // Initialize collections if missing
      if (!existingCollections.includes('users')) {
        console.log('\n📝 Creating users collection...')
        await db.createCollection('users')
        await db.collection('users').createIndex({ email: 1 }, { unique: true })
        console.log('✅ Users collection created with email index')
      }

      if (!existingCollections.includes('sessions')) {
        console.log('\n📝 Creating sessions collection...')
        await db.createCollection('sessions')
        await db.collection('sessions').createIndex({ accessToken: 1 }, { unique: true })
        await db.collection('sessions').createIndex({ userId: 1 })
        console.log('✅ Sessions collection created with indexes')
      }

      if (!existingCollections.includes('analyses')) {
        console.log('\n📝 Creating analyses collection...')
        await db.createCollection('analyses')
        await db.collection('analyses').createIndex({ userId: 1 })
        await db.collection('analyses').createIndex({ status: 1 })
        console.log('✅ Analyses collection created with indexes')
      }

      // Create admin user if none exists
      const userCount = await db.collection('users').countDocuments()
      if (userCount === 0) {
        console.log('\n👤 Creating initial admin user...')
        const bcrypt = require('bcryptjs')
        const hashedPassword = await bcrypt.hash('admin123', 10)
        
        await db.collection('users').insertOne({
          email: 'admin@example.com',
          username: 'admin',
          password: hashedPassword,
          role: 'admin',
          permissions: ['read', 'write', 'admin'],
          createdAt: new Date(),
          updatedAt: new Date()
        })
        
        console.log('✅ Admin user created: admin@example.com / admin123')
        console.log('⚠️  Please change the password after first login!')
      }

    } finally {
      await client.close()
    }

    console.log('\n✅ Manual startup completed successfully!')
    console.log('\n🎯 Next steps:')
    console.log('   1. Start your Next.js app: npm run dev')
    console.log('   2. Visit http://localhost:3000/api/health to check status')
    console.log('   3. Login with admin@example.com / admin123')
    console.log('   4. Start analyzing images!')

  } catch (error) {
    console.error('\n❌ Manual startup failed:', error.message)
    console.error('\n🔧 Troubleshooting:')
    console.error('   1. Check if MongoDB is running')
    console.error('   2. Verify your .env.local file has correct MONGODB_URI')
    console.error('   3. Ensure you have network access to MongoDB')
    process.exit(1)
  }
}

// Run startup if this script is executed directly
if (require.main === module) {
  manualStartup()
}

module.exports = { manualStartup }
