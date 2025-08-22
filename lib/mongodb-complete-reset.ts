/**
 * Complete MongoDB Reset System
 * This file completely resets MongoDB by forcing a fresh driver
 */

console.log('🚨 COMPLETE MongoDB Reset...')

// Force clear everything
if (typeof global !== 'undefined') {
  delete (global as any).ObjectId
  delete (global as any).MongoClient
  delete (global as any).Db
  delete (global as any).Collection
  delete (global as any).mongodb
  delete (global as any).mongo
}

// Force clear module cache
if (typeof require !== 'undefined' && require.cache) {
  Object.keys(require.cache).forEach(key => {
    if (key.includes('mongodb') || key.includes('mongo')) {
      delete require.cache[key]
      console.log(`🔧 Cleared: ${key}`)
    }
  })
}

// Force fresh import
const freshMongo = require('mongodb')
console.log('✅ Fresh MongoDB loaded')

// Force set globals
if (typeof global !== 'undefined') {
  ;(global as any).ObjectId = freshMongo.ObjectId
  ;(global as any).MongoClient = freshMongo.MongoClient
  ;(global as any).Db = freshMongo.Db
  ;(global as any).Collection = freshMongo.Collection
  console.log('✅ Globals set')
}

export default freshMongo
