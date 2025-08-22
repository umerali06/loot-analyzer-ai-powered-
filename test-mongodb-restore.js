#!/usr/bin/env node

/**
 * Test MongoDB Restoration System
 * This script tests if the MongoDB restoration system is working correctly
 */

console.log('🧪 Testing MongoDB Restoration System...')
console.log('==========================================')

try {
  // Test 1: Check if ObjectId is working correctly
  console.log('\n📋 Test 1: ObjectId Functionality')
  console.log('-----------------------------------')
  
  const { ObjectId } = require('mongodb')
  
  // Create a new ObjectId
  const testId = new ObjectId()
  console.log('✅ ObjectId created:', testId)
  console.log('✅ ObjectId type:', typeof testId)
  console.log('✅ ObjectId constructor:', testId.constructor.name)
  
  // Check the ID string
  const idString = testId.toString()
  console.log('✅ ID string:', idString)
  console.log('✅ ID length:', idString.length)
  
  // Check if it's a mock ID
  if (idString.startsWith('mock_id_')) {
    console.log('❌ FAILED: ObjectId is still returning mock IDs!')
    process.exit(1)
  }
  
  // Check if it's a valid MongoDB ObjectId (24 hex characters)
  if (!/^[0-9a-fA-F]{24}$/.test(idString)) {
    console.log('❌ FAILED: ObjectId is not returning valid hex IDs!')
    console.log('❌ Expected: 24 hex characters')
    console.log('❌ Got:', idString)
    process.exit(1)
  }
  
  console.log('✅ SUCCESS: ObjectId is working correctly!')
  
  // Test 2: Check if we can create ObjectIds from strings
  console.log('\n📋 Test 2: ObjectId from String')
  console.log('--------------------------------')
  
  const fromStringId = new ObjectId(idString)
  console.log('✅ ObjectId from string created:', fromStringId)
  console.log('✅ String representation:', fromStringId.toString())
  
  if (fromStringId.toString() !== idString) {
    console.log('❌ FAILED: ObjectId from string does not match original!')
    process.exit(1)
  }
  
  console.log('✅ SUCCESS: ObjectId from string is working correctly!')
  
  // Test 3: Check if we can create multiple unique ObjectIds
  console.log('\n📋 Test 3: Multiple Unique ObjectIds')
  console.log('--------------------------------------')
  
  const ids = []
  for (let i = 0; i < 5; i++) {
    ids.push(new ObjectId().toString())
  }
  
  console.log('✅ Created 5 ObjectIds:')
  ids.forEach((id, index) => {
    console.log(`   ${index + 1}. ${id}`)
  })
  
  // Check if all IDs are unique
  const uniqueIds = new Set(ids)
  if (uniqueIds.size !== ids.length) {
    console.log('❌ FAILED: ObjectIds are not unique!')
    process.exit(1)
  }
  
  console.log('✅ SUCCESS: All ObjectIds are unique!')
  
  // Test 4: Check if we can validate ObjectIds
  console.log('\n📋 Test 4: ObjectId Validation')
  console.log('--------------------------------')
  
  const validId = '507f1f77bcf86cd799439011'
  const invalidId = 'invalid-id'
  
  try {
    const validObjectId = new ObjectId(validId)
    console.log('✅ Valid ID accepted:', validObjectId.toString())
  } catch (error) {
    console.log('❌ FAILED: Valid ID was rejected:', error.message)
    process.exit(1)
  }
  
  try {
    const invalidObjectId = new ObjectId(invalidId)
    console.log('❌ FAILED: Invalid ID was accepted:', invalidObjectId.toString())
    process.exit(1)
  } catch (error) {
    console.log('✅ Invalid ID correctly rejected:', error.message)
  }
  
  console.log('✅ SUCCESS: ObjectId validation is working correctly!')
  
  // Final summary
  console.log('\n🎉 ALL TESTS PASSED!')
  console.log('✅ MongoDB ObjectId is working correctly')
  console.log('✅ No mock IDs detected')
  console.log('✅ Real MongoDB functionality restored')
  
} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message)
  console.error('Stack trace:', error.stack)
  process.exit(1)
}
