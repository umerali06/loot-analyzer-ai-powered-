#!/usr/bin/env node

const { execSync } = require('child_process')
const path = require('path')

console.log('🚀 Starting test suite...')

try {
  // Run Jest tests
  console.log('📝 Running unit tests...')
  execSync('npx jest --coverage', { stdio: 'inherit' })
  
  console.log('✅ All tests completed successfully!')
} catch (error) {
  console.error('❌ Tests failed:', error.message)
  process.exit(1)
}
