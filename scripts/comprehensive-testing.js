#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🧪 Starting comprehensive feature testing...')

async function runComprehensiveTests() {
  try {
    // Step 1: Run all unit tests
    console.log('\n📝 Step 1: Running unit tests...')
    execSync('npm run test:ci', { stdio: 'inherit' })

    // Step 2: Run end-to-end tests
    console.log('\n🔄 Step 2: Running end-to-end tests...')
    execSync('npm run test:e2e', { stdio: 'inherit' })

    // Step 3: Run type checking
    console.log('\n🔍 Step 3: Running type checking...')
    execSync('npm run type-check', { stdio: 'inherit' })

    // Step 4: Run linting
    console.log('\n🧹 Step 4: Running linting...')
    execSync('npm run lint', { stdio: 'inherit' })

    // Step 5: Run security checks
    console.log('\n🔒 Step 5: Running security checks...')
    execSync('npm run security-check', { stdio: 'inherit' })

    // Step 6: Test database connection
    console.log('\n🗄️  Step 6: Testing database connection...')
    execSync('npm run test-db', { stdio: 'inherit' })

    // Step 7: Test optimization features
    console.log('\n⚡ Step 7: Testing optimization features...')
    execSync('npm run test-optimization', { stdio: 'inherit' })

    console.log('\n✅ Comprehensive testing completed successfully!')
    console.log('🎯 All features are working as expected')
    
  } catch (error) {
    console.error('\n❌ Comprehensive testing failed:', error.message)
    console.log('🔧 Please fix the issues before proceeding')
    process.exit(1)
  }
}

// Run the tests
runComprehensiveTests()
