#!/usr/bin/env node

/**
 * Database Test Script
 * Tests MongoDB Atlas connection and basic operations
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Database Connection Test Script\n');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key] = value;
        }
      }
    }
    return true;
  }
  return false;
}

// Test database connection
async function testDatabaseConnection() {
  try {
    // Dynamic import to avoid issues if MongoDB is not installed
    const { MongoClient } = await import('mongodb');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri || mongoUri === 'your-mongodb-connection-string-here') {
      throw new Error('MONGODB_URI not configured');
    }
    
    console.log('🔌 Testing MongoDB Atlas connection...');
    
    const client = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });
    
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas');
    
    // Test database operations
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections`);
    
    // Test basic operations
    const testCollection = db.collection('test_connection');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    console.log('✅ Insert operation successful');
    
    const result = await testCollection.findOne({ test: true });
    if (result) {
      console.log('✅ Read operation successful');
    }
    
    await testCollection.deleteOne({ test: true });
    console.log('✅ Delete operation successful');
    
    await client.close();
    console.log('🔌 Connection closed successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

// Test environment configuration
function testEnvironmentConfig() {
  console.log('🔍 Testing environment configuration...\n');
  
  const requiredVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ];
  
  let allConfigured = true;
  
  for (const envVar of requiredVars) {
    const value = process.env[envVar];
    if (value && value !== 'your-mongodb-connection-string-here') {
      if (envVar.includes('SECRET')) {
        console.log(`   ✅ ${envVar}: ${value.substring(0, 8)}...`);
      } else {
        console.log(`   ✅ ${envVar}: ${value}`);
      }
    } else {
      console.log(`   ❌ ${envVar}: Not configured`);
      allConfigured = false;
    }
  }
  
  return allConfigured;
}

// Show troubleshooting tips
function showTroubleshootingTips() {
  console.log('\n🔧 Troubleshooting Tips:');
  console.log('==========================');
  console.log('1. Check MongoDB Atlas status:');
  console.log('   - Ensure your cluster is running');
  console.log('   - Verify network access includes your IP');
  console.log('   - Check database user credentials');
  console.log('');
  console.log('2. Verify connection string:');
  console.log('   - Format: mongodb+srv://username:password@cluster.mongodb.net/database');
  console.log('   - Replace username, password, cluster, and database');
  console.log('   - Ensure no spaces or special characters');
  console.log('');
  console.log('3. Common issues:');
  console.log('   - Network timeout: Check firewall/network settings');
  console.log('   - Authentication failed: Verify username/password');
  console.log('   - Connection refused: Check IP whitelist');
  console.log('');
  console.log('4. Get help:');
  console.log('   - MongoDB Atlas documentation: https://docs.atlas.mongodb.com/');
  console.log('   - Connection string guide: https://docs.atlas.mongodb.com/connect-to-cluster/');
}

// Main execution
async function main() {
  console.log('🚀 Starting database tests...\n');
  
  // Load environment variables
  const envLoaded = loadEnvFile();
  if (!envLoaded) {
    console.log('❌ Failed to load environment variables');
    console.log('   Please run: npm run setup-env');
    return;
  }
  
  // Test environment configuration
  const envConfigured = testEnvironmentConfig();
  if (!envConfigured) {
    console.log('\n⚠️  Environment configuration incomplete');
    console.log('   Please complete the setup in .env.local');
    return;
  }
  
  console.log('\n✅ Environment configuration is complete');
  
  // Test database connection
  const dbConnected = await testDatabaseConnection();
  
  if (dbConnected) {
    console.log('\n🎉 All database tests passed!');
    console.log('   Your MongoDB Atlas setup is working correctly');
    console.log('\n🚀 You can now:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Test authentication: Visit /test-auth');
    console.log('   3. Continue with the next task');
  } else {
    console.log('\n❌ Database connection failed');
    showTroubleshootingTips();
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}

module.exports = { main, testDatabaseConnection, testEnvironmentConfig };
