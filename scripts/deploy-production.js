#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Starting production deployment...')

try {
  // Check if we're in the right directory
  if (!fs.existsSync('vercel.json')) {
    console.error('❌ vercel.json not found! Please run this from the project root.')
    process.exit(1)
  }

  // Check if production environment file exists
  const envFile = path.join(process.cwd(), '.env.production.local')
  if (!fs.existsSync(envFile)) {
    console.error('❌ .env.production.local file not found!')
    console.log('📝 Please create it from env.production.template')
    process.exit(1)
  }

  // Run production build
  console.log('🏗️  Running production build...')
  execSync('npm run build:prod', { stdio: 'inherit' })

  // Deploy to Vercel
  console.log('📤 Deploying to Vercel...')
  execSync('vercel --prod', { stdio: 'inherit' })

  console.log('✅ Production deployment completed successfully!')
  console.log('🌐 Your app is now live on Vercel!')
} catch (error) {
  console.error('❌ Production deployment failed:', error.message)
  process.exit(1)
}
