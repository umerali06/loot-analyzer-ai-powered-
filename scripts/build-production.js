#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🏗️  Starting production build...')

try {
  // Check if production environment file exists
  const envFile = path.join(process.cwd(), '.env.production.local')
  if (!fs.existsSync(envFile)) {
    console.error('❌ .env.production.local file not found!')
    console.log('📝 Please create it from env.production.template')
    process.exit(1)
  }

  // Run type checking
  console.log('🔍 Running type check...')
  execSync('npm run type-check', { stdio: 'inherit' })

  // Run linting
  console.log('🧹 Running linting...')
  execSync('npm run lint', { stdio: 'inherit' })

  // Run tests
  console.log('🧪 Running tests...')
  execSync('npm run test:ci', { stdio: 'inherit' })

  // Build the application
  console.log('📦 Building application...')
  execSync('npm run build', { stdio: 'inherit' })

  console.log('✅ Production build completed successfully!')
  console.log('🚀 Ready for deployment to Vercel')
} catch (error) {
  console.error('❌ Production build failed:', error.message)
  process.exit(1)
}
