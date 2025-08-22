#!/usr/bin/env node

/**
 * Environment Variables Test Script
 * Quick test to verify environment variables are loaded correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Environment Variables Loading\n');

// Load environment variables from .env.local
function loadEnvFile() {
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
    console.log('✅ Loaded environment variables from .env.local');
    return true;
  } else {
    console.log('❌ .env.local not found');
    return false;
  }
}

// Test loading
const loaded = loadEnvFile();

if (loaded) {
  console.log('\n📋 Environment Variables Status:');
  
  const requiredVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET', 
    'JWT_ACCESS_EXPIRES_IN',
    'JWT_REFRESH_EXPIRES_IN'
  ];
  
  for (const envVar of requiredVars) {
    const value = process.env[envVar];
    if (value) {
      if (envVar.includes('SECRET')) {
        // Show first 8 characters for secrets
        const displayValue = value.substring(0, 8) + '...';
        console.log(`   ✅ ${envVar}: ${displayValue}`);
      } else {
        console.log(`   ✅ ${envVar}: ${value}`);
      }
    } else {
      console.log(`   ❌ ${envVar}: Not set`);
    }
  }
  
  console.log('\n🔍 File Contents Preview:');
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n').slice(0, 10); // Show first 10 lines
  
  for (const line of lines) {
    if (line.trim() && !line.trim().startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (key.includes('SECRET')) {
          console.log(`   ${key}=${value.substring(0, 8)}...`);
        } else {
          console.log(`   ${key}=${value}`);
        }
      }
    }
  }
  
  if (envContent.split('\n').length > 10) {
    console.log('   ... (more lines)');
  }
}

console.log('\n✨ Environment test completed!\n');
