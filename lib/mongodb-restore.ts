/**
 * MongoDB Mock Detection and Restoration System
 * This file detects and removes any global MongoDB mocks that might be interfering with real operations
 */

import { MongoClient, Db, ObjectId, Collection } from 'mongodb'

/**
 * Check if MongoDB has been mocked globally
 */
function detectMongoDBMocks(): boolean {
  // Check if ObjectId is returning mock IDs
  try {
    const testId = new ObjectId()
    const idString = testId.toString()
    
    // Check if the ID looks like a mock ID
    if (idString.startsWith('mock_id_')) {
      console.log('🚨 DETECTED: MongoDB ObjectId is returning mock IDs!')
      return true
    }
    
    // Check if the ID looks like a real MongoDB ObjectId (24 hex characters)
    if (!/^[0-9a-fA-F]{24}$/.test(idString)) {
      console.log('🚨 DETECTED: MongoDB ObjectId is not returning valid hex IDs!')
      return true
    }
    
    return false
  } catch (error) {
    console.log('🚨 DETECTED: Error creating ObjectId:', error)
    return true
  }
}

/**
 * Force restore real MongoDB functionality
 */
function restoreMongoDB(): void {
  console.log('🔧 Restoring real MongoDB functionality...')
  
  try {
    // Force restore ObjectId constructor
    if (typeof global !== 'undefined') {
      // Import fresh ObjectId from mongodb
      const { ObjectId: FreshObjectId } = require('mongodb')
      
      // Check if current ObjectId is different from fresh one
      if ((global as any).ObjectId !== FreshObjectId) {
        console.log('🔧 Restoring global ObjectId constructor...')
        ;(global as any).ObjectId = FreshObjectId
      }
      
      // Also check if there are any other MongoDB mocks
      if ((global as any).MongoClient !== MongoClient) {
        console.log('🔧 Restoring global MongoClient constructor...')
        ;(global as any).MongoClient = MongoClient
      }
      
      if ((global as any).Db !== Db) {
        console.log('🔧 Restoring global Db constructor...')
        ;(global as any).Db = Db
      }
      
      if ((global as any).Collection !== Collection) {
        console.log('🔧 Restoring global Collection constructor...')
        ;(global as any).Collection = Collection
      }
    }
    
    // Test if restoration worked
    const testId = new ObjectId()
    const idString = testId.toString()
    
    if (idString.startsWith('mock_id_')) {
      console.log('❌ FAILED: ObjectId still returning mock IDs after restoration')
      throw new Error('ObjectId restoration failed')
    }
    
    if (!/^[0-9a-fA-F]{24}$/.test(idString)) {
      console.log('❌ FAILED: ObjectId not returning valid hex IDs after restoration')
      throw new Error('ObjectId restoration failed')
    }
    
    console.log('✅ SUCCESS: MongoDB functionality restored successfully!')
    console.log(`✅ Test ObjectId: ${idString}`)
    
  } catch (error) {
    console.error('❌ FAILED: Could not restore MongoDB functionality:', error)
    throw error
  }
}

/**
 * Initialize MongoDB restoration
 */
export function initializeMongoDBRestoration(): void {
  console.log('🔍 Checking MongoDB for mocks...')
  
  if (detectMongoDBMocks()) {
    console.log('🚨 MongoDB mocks detected! Attempting restoration...')
    restoreMongoDB()
  } else {
    console.log('✅ MongoDB appears to be working correctly')
  }
}

/**
 * Get a guaranteed real ObjectId constructor
 */
export function getRealObjectId(): typeof ObjectId {
  // Force a fresh import to ensure we get the real constructor
  const { ObjectId: FreshObjectId } = require('mongodb')
  return FreshObjectId
}

/**
 * Create a real ObjectId
 */
export function createRealObjectId(id?: string): ObjectId {
  const RealObjectId = getRealObjectId()
  return id ? new RealObjectId(id) : new RealObjectId()
}

// Auto-initialize when this module is imported
initializeMongoDBRestoration()
