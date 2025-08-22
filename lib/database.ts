/**
 * Simple Database Connection Manager
 * Handles MongoDB Atlas connection for Lot Analyzer
 */

// Import MongoDB complete reset system FIRST to ensure real MongoDB is available
import './mongodb-complete-reset'

// Get fresh MongoDB classes
const { MongoClient, Db, ObjectId } = require('mongodb')

// Database configuration
interface DatabaseConfig {
  uri: string
  dbName: string
  options: {
    maxPoolSize: number
    serverSelectionTimeoutMS: number
    socketTimeoutMS: number
    connectTimeoutMS: number
    retryWrites?: boolean
    retryReads?: boolean
    w?: string
  }
}

// Default configuration
const DEFAULT_CONFIG: DatabaseConfig = {
  uri: process.env.MONGODB_URI || '',
  dbName: process.env.MONGODB_DB_NAME || 'sibi_analyzer',
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000, // Increased from 10s to 30s
    socketTimeoutMS: 60000, // Increased from 45s to 60s
    connectTimeoutMS: 30000, // Increased from 10s to 30s
    retryWrites: true,
    retryReads: true,
    w: 'majority'
  }
}

// Connection state
let client: any = null
let db: any = null

/**
 * Get database configuration
 */
function getDatabaseConfig(): DatabaseConfig {
  return {
    ...DEFAULT_CONFIG,
    uri: process.env.MONGODB_URI || DEFAULT_CONFIG.uri,
    dbName: process.env.MONGODB_DB_NAME || DEFAULT_CONFIG.dbName
  }
}

/**
 * Connect to MongoDB Atlas with retry logic
 */
export async function connectToDatabase(): Promise<any> {
  // Initialize MongoDB classes first
  // await initializeMongoDB() // This line is removed as per the edit hint
  
  // Return existing connection if available
  if (db && client) {
    try {
      await client.db(db.databaseName).admin().ping()
      return db
    } catch (error) {
      console.log('Database connection lost, reconnecting...')
      await disconnectFromDatabase()
    }
  }

  const config = getDatabaseConfig()
  
  if (!config.uri) {
    throw new Error('MONGODB_URI environment variable is not set')
  }

  // Retry connection up to 3 times
  let lastError: any
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔌 Connecting to MongoDB Atlas... (Attempt ${attempt}/3)`)
      
      client = new MongoClient(config.uri, config.options)
      await client.connect()
      
      db = client.db(config.dbName)
      
      // Test connection
      await db.admin().ping()
      console.log(`✅ Connected to MongoDB Atlas: ${config.dbName}`)
      
      // Set up connection event handlers
      client.on('close', () => {
        console.log('🔌 MongoDB connection closed')
      })
      
      client.on('error', (error: any) => {
        console.error('❌ MongoDB connection error:', error)
      })
      
      return db
      
    } catch (error) {
      lastError = error
      console.error(`❌ Connection attempt ${attempt} failed:`, error)
      
      if (attempt < 3) {
        console.log(`🔄 Retrying in ${attempt * 2} seconds...`)
        await new Promise(resolve => setTimeout(resolve, attempt * 2000))
      }
      
      // Clean up failed connection
      if (client) {
        try {
          await client.close()
        } catch (closeError) {
          console.error('Error closing failed connection:', closeError)
        }
        client = null
        db = null
      }
    }
  }
  
  console.error('❌ All connection attempts failed')
  throw lastError
}

/**
 * Disconnect from database
 */
export async function disconnectFromDatabase(): Promise<void> {
  if (client) {
    try {
      await client.close()
      console.log('🔌 Disconnected from MongoDB Atlas')
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error)
    } finally {
      client = null
      db = null
    }
  }
}

/**
 * Get database instance (creates connection if needed)
 */
export async function getDatabase(): Promise<any> {
  if (!db) {
    db = await connectToDatabase()
  }
  return db
}

/**
 * Get database client
 */
export async function getClient(): Promise<any> {
  if (!client) {
    await connectToDatabase()
  }
  return client!
}

/**
 * Check database connection status
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const database = await getDatabase()
    await database.admin().ping()
    return true
  } catch (error) {
    console.error('Database connection check failed:', error)
    return false
  }
}

// Handle process termination
process.on('SIGINT', disconnectFromDatabase)
process.on('SIGTERM', disconnectFromDatabase)
process.on('exit', disconnectFromDatabase)
