import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware-simple'
import { createSuccessResponse, createErrorResponse, addPerformanceHeaders } from '@/lib/api-utils-enhanced'
import { getDatabase } from '@/lib/database'

// Get ObjectId from mongodb like database.ts does
const { ObjectId } = require('mongodb')

async function handler(req: NextRequest, user?: any, session?: any): Promise<NextResponse> {
  try {
    console.log('🔐 Profile API - User from JWT:', user)
    console.log('🔐 Profile API - Session from DB:', session)
    console.log('🔐 Profile API - Headers:', Object.fromEntries(req.headers.entries()))
    
    if (req.method === 'GET') {
      // Get user ID from JWT user parameter
      const userId = user?.userId
      console.log('🔐 Profile API - JWT userId:', userId)
      
      if (!userId) {
        console.log('❌ Profile API - No user ID found in JWT')
        return createErrorResponse('User ID not found', 400)
      }
      
      console.log('🔐 Profile API - Final userId to use:', userId)
      
      console.log('🔐 Profile API - Attempting database connection...')
      let db
      try {
        db = await getDatabase()
        console.log('🔐 Profile API - Database connected successfully')
      } catch (dbError) {
        console.error('❌ Profile API - Database connection failed:', dbError)
        return createErrorResponse('Database connection failed', 500)
      }
      
      let usersCollection
      try {
        usersCollection = db.collection('users')
        console.log('🔐 Profile API - Users collection accessed successfully')
      } catch (collectionError) {
        console.error('❌ Profile API - Collection access failed:', collectionError)
        return createErrorResponse('Database collection access failed', 500)
      }
      
      // Convert string userId to ObjectId for MongoDB query
      let userObjectId
      try {
        userObjectId = new ObjectId(userId)
        console.log('🔐 Profile API - Converting userId to ObjectId:', userId, '->', userObjectId)
      } catch (objectIdError) {
        console.error('❌ Profile API - ObjectId conversion failed:', objectIdError)
        return createErrorResponse('Invalid user ID format', 400)
      }
      
      console.log('🔐 Profile API - Executing database query...')
      let userDoc
      try {
        userDoc = await usersCollection.findOne(
          { _id: userObjectId },
          { projection: { password: 0, __v: 0 } }
        )
        console.log('🔐 Profile API - Database query executed successfully')
      } catch (queryError) {
        console.error('❌ Profile API - Database query failed:', queryError)
        return createErrorResponse('Database query failed', 500)
      }
      
      console.log('🔐 Profile API - Database query result:', userDoc)
      console.log('🔐 Profile API - Query filter used:', { _id: userObjectId })

      if (!userDoc) {
        console.log('❌ Profile API - User not found in database')
        return createErrorResponse('User not found', 404)
      }

      return createSuccessResponse({
        user: {
          _id: userDoc._id,
          firstName: userDoc.firstName || '',
          lastName: userDoc.lastName || '',
          username: userDoc.username || '',
          email: userDoc.email || '',
          createdAt: userDoc.createdAt
        }
      })

    } else if (req.method === 'PUT') {
      // Update user profile data
      const userId = user?.userId
      console.log('🔐 Profile API PUT - JWT userId:', userId)
      
      if (!userId) {
        console.log('❌ Profile API PUT - No user ID found in JWT')
        return createErrorResponse('User ID not found', 400)
      }

      const body = await req.json()
      const { firstName, lastName, username, email } = body

      // Validate required fields
      if (!firstName || !lastName || !username || !email) {
        return createErrorResponse('All fields are required', 400)
      }

      const db = await getDatabase()
      const usersCollection = db.collection('users')
      
      // Convert string userId to ObjectId for MongoDB query
      const userObjectId = new ObjectId(userId)
      
      // Check if username or email already exists (excluding current user)
      const existingUser = await usersCollection.findOne({
        $and: [
          { _id: { $ne: userObjectId } },
          { $or: [{ username }, { email }] }
        ]
      })

      if (existingUser) {
        if (existingUser.username === username) {
          return createErrorResponse('Username already exists', 400)
        }
        if (existingUser.email === email) {
          return createErrorResponse('Email already exists', 400)
        }
      }

      // Update user
      const result = await usersCollection.updateOne(
        { _id: userObjectId },
        {
          $set: {
            firstName,
            lastName,
            username,
            email,
            updatedAt: new Date()
          }
        }
      )

      if (result.matchedCount === 0) {
        return createErrorResponse('User not found', 404)
      }

      // Get updated user data
      const updatedUser = await usersCollection.findOne(
        { _id: userObjectId },
        { projection: { password: 0, __v: 0 } }
      )

      return createSuccessResponse({
        user: {
          _id: updatedUser._id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          username: updatedUser.username,
          email: updatedUser.email,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      })

    } else {
      return createErrorResponse('Method not allowed', 405)
    }

  } catch (error) {
    console.error('❌ Profile API error:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('❌ Error message:', error instanceof Error ? error.message : 'No message')
    
    // Return more specific error messages for debugging
    if (error instanceof Error) {
      if (error.message.includes('MongoNetworkTimeoutError')) {
        return createErrorResponse('Database connection timeout. Please try again.', 500)
      } else if (error.message.includes('ObjectId')) {
        return createErrorResponse('Invalid user ID format', 400)
      } else if (error.message.includes('collection')) {
        return createErrorResponse('Database collection error', 500)
      }
    }
    
    return createErrorResponse('Internal server error', 500)
  }
}

export const GET = withAuth(handler)
export const PUT = withAuth(handler)
