/**
 * Database Service Layer
 * Handles CRUD operations for users, sessions, and analyses
 */

// Import MongoDB complete reset system FIRST to ensure real MongoDB is available
import './mongodb-complete-reset'

// Get fresh MongoDB classes
const { MongoClient, Collection, ObjectId } = require('mongodb')

import { 
  COLLECTIONS, 
  INDEXES, 
  DatabaseResult, 
  PaginationOptions, 
  PaginatedResult,
  User,
  UserSession,
  Analysis
} from '../types/database'
import { getDatabase, getClient } from './database'

/**
 * Base Database Service
 */
export abstract class BaseDatabaseService<T> {
  protected collectionName: string
  protected indexes: readonly any[]

  constructor(collectionName: string, indexes: readonly any[] = []) {
    this.collectionName = collectionName
    this.indexes = [...indexes]
  }

  /**
   * Get collection instance
   */
  protected async getCollection(): Promise<any> {
    const db = await getDatabase()
    return db.collection(this.collectionName)
  }

  /**
   * Ensure indexes are created
   */
  protected async ensureIndexes(): Promise<void> {
    if (this.indexes.length === 0) return

    try {
      const collection = await this.getCollection()
      for (const index of this.indexes) {
        await collection.createIndex(index)
      }
    } catch (error) {
      console.error(`Failed to create indexes for ${this.collectionName}:`, error)
    }
  }

  /**
   * Create a new document
   */
  async create(data: Omit<T, '_id' | 'createdAt' | 'updatedAt'>): Promise<DatabaseResult<T>> {
    try {
      const collection = await this.getCollection()
      const now = new Date()
      
      const document = {
        ...data,
        createdAt: now,
        updatedAt: now
      } as unknown as T

      console.log(`🔧 Creating document in ${this.collectionName}:`, {
        collectionName: this.collectionName,
        documentKeys: Object.keys(document as any),
        hasAccessToken: 'accessToken' in (document as any),
        accessTokenLength: 'accessToken' in (document as any) ? (document as any).accessToken.length : 'N/A'
      })

      const result = await collection.insertOne(document as any)
      
      if (result.acknowledged) {
        console.log(`✅ Document created successfully in ${this.collectionName} with ID:`, result.insertedId)
        return {
          success: true,
          data: { ...document, _id: result.insertedId } as T,
          message: 'Document created successfully'
        }
      } else {
        console.error(`❌ Document creation failed in ${this.collectionName}`)
        return {
          success: false,
          error: 'Failed to create document'
        }
      }
    } catch (error) {
      console.error(`Failed to create document in ${this.collectionName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Find documents with pagination
   */
  async find(
    filter: any = {},
    options: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<PaginatedResult<T>> {
    try {
      const collection = await this.getCollection()
      
      const skip = (options.page - 1) * options.limit
      
      const findOptions: any = {
        skip,
        limit: options.limit
      }

      if (options.sortBy) {
        findOptions.sort = {
          [options.sortBy]: options.sortOrder === 'desc' ? -1 : 1
        }
      }

      const [data, total] = await Promise.all([
        collection.find(filter, findOptions).toArray(),
        collection.countDocuments(filter)
      ])

      const totalPages = Math.ceil(total / options.limit)
      
      return {
        data: data as unknown as T[],
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          totalPages,
          hasNext: options.page < totalPages,
          hasPrev: options.page > 1
        }
      }
    } catch (error) {
      console.error(`Failed to find documents in ${this.collectionName}:`, error)
      throw error
    }
  }

  /**
   * Find document by ID
   */
  async findById(id: string | any): Promise<DatabaseResult<T>> {
    try {
      const collection = await this.getCollection()
      const objectId = typeof id === 'string' ? new ObjectId(id) : id
      
      const document = await collection.findOne({ _id: objectId } as any)
      
      if (!document) {
        return {
          success: false,
          message: 'Document not found',
          error: 'NOT_FOUND'
        }
      }

      return {
        success: true,
        data: document as T,
        message: 'Document found successfully'
      }
    } catch (error) {
      console.error(`Failed to find document by ID in ${this.collectionName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Update document
   */
  async update(id: string | any, data: Partial<T>): Promise<DatabaseResult<T>> {
    try {
      const collection = await this.getCollection()
      const objectId = typeof id === 'string' ? new ObjectId(id) : id
      
      const updateData = {
        ...data,
        updatedAt: new Date()
      }

      const result = await collection.updateOne(
        { _id: objectId } as any,
        { $set: updateData } as any
      )

      if (result.modifiedCount > 0) {
        const updatedDoc = await collection.findOne({ _id: objectId })
        return {
          success: true,
          data: updatedDoc as T,
          message: 'Document updated successfully'
        }
      } else {
        return {
          success: false,
          error: 'Document not found or no changes made'
        }
      }
    } catch (error) {
      console.error(`Failed to update document in ${this.collectionName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Delete document
   */
  async delete(id: string | any): Promise<DatabaseResult<boolean>> {
    try {
      const collection = await this.getCollection()
      const objectId = typeof id === 'string' ? new ObjectId(id) : id
      
      const result = await collection.deleteOne({ _id: objectId } as any)

      if (result.deletedCount > 0) {
        return {
          success: true,
          data: true,
          message: 'Document deleted successfully'
        }
      } else {
        return {
          success: false,
          error: 'Document not found'
        }
      }
    } catch (error) {
      console.error(`Failed to delete document in ${this.collectionName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * User Service
 */
export class UserService extends BaseDatabaseService<User> {
  constructor() {
    super(COLLECTIONS.USERS, INDEXES.USERS)
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<DatabaseResult<User>> {
    try {
      const collection = await this.getCollection()
      const user = await collection.findOne({ email } as any)
      
      if (user) {
        return {
          success: true,
          data: user
        }
      } else {
        return {
          success: false,
          error: 'User not found'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<DatabaseResult<User>> {
    try {
      const collection = await this.getCollection()
      const user = await collection.findOne({ username } as any)
      
      if (user) {
        return {
          success: true,
          data: user
        }
      } else {
        return {
          success: false,
          error: 'User not found'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Update user last login
   */
  async updateLastLogin(userId: string | any): Promise<DatabaseResult<boolean>> {
    try {
      const collection = await this.getCollection()
      const objectId = typeof userId === 'string' ? new ObjectId(userId) : userId
      
      const result = await collection.updateOne(
        { _id: objectId } as any,
        { 
          $set: { 
            lastLogin: new Date(),
            updatedAt: new Date()
          }
        } as any
      )
      
      return {
        success: result.modifiedCount > 0,
        data: result.modifiedCount > 0,
        message: result.modifiedCount > 0 ? 'Last login updated' : 'User not found'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * User Session Service
 */
export class UserSessionService extends BaseDatabaseService<UserSession> {
  constructor() {
    super(COLLECTIONS.SESSIONS, INDEXES.SESSIONS)
  }

  /**
   * Find active session by session ID
   */
  async findBySessionId(sessionId: string): Promise<DatabaseResult<UserSession>> {
    try {
      const collection = await this.getCollection()
      const session = await collection.findOne({ 
        sessionId, 
        isActive: true,
        expiresAt: { $gt: new Date() }
      } as any)
      
      if (session) {
        return {
          success: true,
          data: session
        }
      } else {
        return {
          success: false,
          error: 'Session not found or expired'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Deactivate session
   */
  async deactivateSession(sessionId: string): Promise<DatabaseResult<boolean>> {
    try {
      const collection = await this.getCollection()
      
      const result = await collection.updateOne(
        { sessionId } as any,
        { 
          $set: { 
            isActive: false,
            updatedAt: new Date()
          }
        } as any
      )
      
      return {
        success: result.modifiedCount > 0,
        data: result.modifiedCount > 0,
        message: result.modifiedCount > 0 ? 'Session deactivated' : 'Session not found'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Find session by access token
   */
  async findSessionByAccessToken(accessToken: string): Promise<UserSession | null> {
    try {
      const collection = await this.getCollection()
      console.log('🔍 Searching for session with access token:', {
        tokenLength: accessToken.length,
        tokenPreview: accessToken.substring(0, 20) + '...',
        collectionName: this.collectionName
      })
      
      const query = { 
        accessToken, 
        isActive: true,
        expiresAt: { $gt: new Date() }
      }
      console.log('🔍 Query:', JSON.stringify(query, null, 2))
      
      const session = await collection.findOne(query as any)
      
      console.log('🔍 Session search result:', session ? 'Found' : 'Not found')
      if (session) {
        console.log('🔍 Found session:', {
          sessionId: session.sessionId,
          userId: session.userId,
          isActive: session.isActive,
          expiresAt: session.expiresAt
        })
      }
      
      // If not found with strict query, try flexible search
      if (!session) {
        console.log('🔍 Trying flexible session search...')
        const flexibleQuery = { 
          accessToken, 
          isActive: true
        }
        console.log('🔍 Flexible query:', JSON.stringify(flexibleQuery, null, 2))
        
        const flexibleSession = await collection.findOne(flexibleQuery as any)
        console.log('🔍 Flexible search result:', flexibleSession ? 'Found' : 'Still not found')
        
        if (flexibleSession) {
          console.log('🔍 Found session with flexible search:', {
            sessionId: flexibleSession.sessionId,
            userId: flexibleSession.userId,
            isActive: flexibleSession.isActive,
            expiresAt: flexibleSession.expiresAt
          })
          return flexibleSession
        }
      }
      
      return session
    } catch (error) {
      console.error('Error finding session by access token:', error)
      return null
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<DatabaseResult<boolean>> {
    try {
      const collection = await this.getCollection()
      
      const result = await collection.updateOne(
        { sessionId } as any,
        { 
          $set: { 
            updatedAt: new Date()
          }
        } as any
      )
      
      return {
        success: result.modifiedCount > 0,
        data: result.modifiedCount > 0,
        message: result.modifiedCount > 0 ? 'Session activity updated' : 'Session not found'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Analysis Service
 */
export class AnalysisService extends BaseDatabaseService<Analysis> {
  constructor() {
    super(COLLECTIONS.ANALYSES, INDEXES.ANALYSES)
  }

  /**
   * Find analyses by user ID
   */
  async findByUserId(
    userId: string | any,
    options: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<PaginatedResult<Analysis>> {
    // Try both string and ObjectId formats since database stores userId as string
    const query = {
      $or: [
        { userId: userId }, // String format (as stored in DB)
        { userId: userId.toString() }, // Ensure string format
        { userId: new ObjectId(userId) } // ObjectId format (fallback)
      ]
    }
    return this.find(query as any, options)
  }

  /**
   * Find public analyses
   */
  async findPublic(
    options: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<PaginatedResult<Analysis>> {
    return this.find({ isPublic: true } as any, options)
  }

  /**
   * Update analysis status
   */
  async updateStatus(
    analysisId: string | any,
    status: Analysis['status']
  ): Promise<DatabaseResult<Analysis>> {
    return this.update(analysisId, { status } as any)
  }

  /**
   * Delete all analyses by user ID
   */
  async deleteByUserId(userId: string | any): Promise<DatabaseResult<{ deletedCount: number }>> {
    try {
      const collection = await this.getCollection()
      
      // Try both string and ObjectId formats since database stores userId as string
      const query = {
        $or: [
          { userId: userId }, // String format (as stored in DB)
          { userId: userId.toString() }, // Ensure string format
          { userId: new ObjectId(userId) } // ObjectId format (fallback)
        ]
      }

      console.log(`🗑️ Deleting all analyses for user: ${userId}`)
      
      const result = await collection.deleteMany(query)
      
      if (result.acknowledged) {
        console.log(`✅ Successfully deleted ${result.deletedCount} analyses for user: ${userId}`)
        return {
          success: true,
          data: { deletedCount: result.deletedCount },
          message: `Successfully deleted ${result.deletedCount} analyses`
        }
      } else {
        console.error(`❌ Failed to delete analyses for user: ${userId}`)
        return {
          success: false,
          error: 'Failed to delete analyses'
        }
      }
    } catch (error) {
      console.error(`Failed to delete analyses for user ${userId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Export service instances
export const userService = new UserService()
export const userSessionService = new UserSessionService()
export const analysisService = new AnalysisService()
