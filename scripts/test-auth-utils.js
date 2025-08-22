#!/usr/bin/env node

const { execSync } = require('child_process')
const path = require('path')

console.log('🧪 Testing auth-utils in isolation...')

try {
  // Run just the auth-utils test
  const testPath = path.join(__dirname, '..', '__tests__', 'lib', 'auth-utils.test.ts')
  execSync(`npx jest "${testPath}" --verbose --no-cache`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  })
  
  console.log('✅ auth-utils test completed successfully!')
} catch (error) {
  console.error('❌ auth-utils test failed:', error.message)
  process.exit(1)
}
