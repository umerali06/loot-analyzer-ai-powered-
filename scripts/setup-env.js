#!/usr/bin/env node

/**
 * Environment Setup Script
 * Helps configure environment variables for the SIBI authentication system
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔧 SIBI Environment Setup Script\n');

// Load existing environment variables if .env.local exists
function loadExistingEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key] = value;
        }
      }
    }
  }
}

// Load existing environment variables
loadExistingEnv();

// Generate secure random secrets
function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

// Create .env.local file content
function createEnvContent() {
  const jwtSecret = generateSecureSecret(64);
  const jwtRefreshSecret = generateSecureSecret(64);
  const nextAuthSecret = generateSecureSecret(32);
  
  return `# JWT Authentication Configuration
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OpenAI API Configuration
OPENAI_API_KEY=your-openai-api-key-here

# ScraperAPI Configuration
SCRAPER_API_KEY=your-scraper-api-key-here

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sibi_analyzer
MONGODB_DB_NAME=sibi_analyzer

# Application Configuration
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${nextAuthSecret}

# Generated on: ${new Date().toISOString()}
# ⚠️  IMPORTANT: Replace placeholder values with your actual API keys
`;
}

// Check if .env.local already exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env.local already exists!');
  console.log('   Current file location:', envPath);
  console.log('\n📝 To manually configure your environment variables:');
  console.log('   1. Open .env.local in your editor');
  console.log('   2. Replace placeholder values with your actual API keys');
  console.log('   3. Ensure JWT_SECRET and JWT_REFRESH_SECRET are set');
  console.log('\n🔑 Required variables:');
  console.log('   • JWT_SECRET (for access tokens)');
  console.log('   • JWT_REFRESH_SECRET (for refresh tokens)');
  console.log('   • OPENAI_API_KEY (for AI vision service)');
  console.log('   • SCRAPER_API_KEY (for eBay data retrieval)');
} else {
  console.log('📝 Creating .env.local file...');
  try {
    const envContent = createEnvContent();
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env.local created successfully!');
    console.log('📍 File location:', envPath);
    console.log('\n🔑 Generated secure JWT secrets:');
    console.log('   • JWT_SECRET: 128-character random hex');
    console.log('   • JWT_REFRESH_SECRET: 128-character random hex');
    console.log('   • NEXTAUTH_SECRET: 64-character random hex');
    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('   1. Replace placeholder API keys with your actual keys');
    console.log('   2. Keep this file secure and never commit it to version control');
    console.log('   3. For production, use different secrets');
  } catch (error) {
    console.error('❌ Failed to create .env.local:', error.message);
    console.log('\n📝 Manual setup required:');
    console.log('   1. Create .env.local in your project root');
    console.log('   2. Add the required environment variables');
    console.log('   3. Use strong, random secrets for JWT keys');
  }
}

console.log('\n🔍 After setting up environment variables:');
console.log('   • Run: node scripts/security-check.js');
console.log('   • Visit: /test-auth in your browser');
console.log('   • Check: /auth for login/register functionality');

console.log('\n✨ Environment setup completed!\n');
