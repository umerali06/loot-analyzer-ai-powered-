#!/usr/bin/env node

/**
 * Security Validation Script
 * Run basic security checks for the authentication system
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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
    console.log('📁 Loaded environment variables from .env.local');
  } else {
    console.log('⚠️  .env.local not found - using system environment variables');
  }
}

// Load environment variables before running checks
loadEnvFile();

console.log('🔒 SIBI Authentication System Security Check\n');

// Check 1: Environment Variables
console.log('1. Environment Variables Check');
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN'
];

let envCheckPassed = true;
for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(`   ✅ ${envVar} is set`);
  } else {
    console.log(`   ❌ ${envVar} is missing`);
    envCheckPassed = false;
  }
}

// Check 2: JWT Secret Strength
console.log('\n2. JWT Secret Strength Check');
const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret) {
  if (jwtSecret.length >= 32) {
    console.log('   ✅ JWT_SECRET is sufficiently long (32+ characters)');
  } else {
    console.log(`   ⚠️  JWT_SECRET is only ${jwtSecret.length} characters (recommend 32+)`);
  }
  
  // Check for common weak secrets
  const weakSecrets = ['secret', 'password', '123456', 'admin', 'test'];
  if (weakSecrets.some(weak => jwtSecret.toLowerCase().includes(weak))) {
    console.log('   ❌ JWT_SECRET contains common weak patterns');
    envCheckPassed = false;
  } else {
    console.log('   ✅ JWT_SECRET does not contain common weak patterns');
  }
} else {
  console.log('   ❌ JWT_SECRET not set');
  envCheckPassed = false;
}

// Check 3: File Permissions (basic check)
console.log('\n3. File Permissions Check');
const sensitiveFiles = [
  '.env',
  '.env.local',
  '.env.production'
];

for (const file of sensitiveFiles) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    try {
      const stats = fs.statSync(filePath);
      const mode = stats.mode.toString(8);
      const permissions = mode.slice(-3);
      
      if (permissions === '600' || permissions === '400') {
        console.log(`   ✅ ${file} has secure permissions (${permissions})`);
      } else {
        console.log(`   ⚠️  ${file} has permissions ${permissions} (recommend 600 or 400)`);
      }
    } catch (error) {
      console.log(`   ❌ Could not check permissions for ${file}`);
    }
  } else {
    console.log(`   ℹ️  ${file} not found (this is normal)`);
  }
}

// Check 4: Package Dependencies
console.log('\n4. Package Dependencies Check');
const packagePath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packagePath)) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const securityPackages = [
      'bcryptjs',
      'jsonwebtoken',
      'helmet',
      'cors'
    ];
    
    for (const pkg of securityPackages) {
      if (dependencies[pkg]) {
        console.log(`   ✅ ${pkg} is installed`);
      } else {
        console.log(`   ℹ️  ${pkg} is not installed (may not be needed)`);
      }
    }
  } catch (error) {
    console.log('   ❌ Could not read package.json');
  }
}

// Check 5: Basic Crypto Validation
console.log('\n5. Crypto Validation Check');
try {
  // Test basic crypto operations using modern APIs
  const testData = 'test-data';
  const testKey = crypto.randomBytes(32);
  const testIv = crypto.randomBytes(16);
  
  // Use createCipheriv and createDecipheriv (modern approach)
  const cipher = crypto.createCipheriv('aes-256-cbc', testKey, testIv);
  let encrypted = cipher.update(testData, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', testKey, testIv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  if (decrypted === testData) {
    console.log('   ✅ Basic crypto operations working correctly');
  } else {
    console.log('   ❌ Basic crypto operations failed');
    envCheckPassed = false;
  }
} catch (error) {
  console.log('   ❌ Crypto validation failed:', error.message);
  console.log('   ℹ️  This might be due to Node.js version compatibility');
  envCheckPassed = false;
}

// Check 6: Directory Structure
console.log('\n6. Directory Structure Check');
const requiredDirs = [
  'lib',
  'components/auth',
  'app/api/auth',
  'types',
  'contexts'
];

for (const dir of requiredDirs) {
  const dirPath = path.join(process.cwd(), dir);
  if (fs.existsSync(dirPath)) {
    console.log(`   ✅ ${dir}/ directory exists`);
  } else {
    console.log(`   ❌ ${dir}/ directory missing`);
    envCheckPassed = false;
  }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 SECURITY CHECK SUMMARY');
console.log('='.repeat(50));

if (envCheckPassed) {
  console.log('✅ Overall Security Status: PASSED');
  console.log('   The authentication system appears to have basic security measures in place.');
} else {
  console.log('❌ Overall Security Status: FAILED');
  console.log('   Some security issues were detected. Please review the warnings above.');
}

console.log('\n🔍 Recommendations:');
console.log('• Ensure all environment variables are properly set in production');
console.log('• Use strong, randomly generated JWT secrets');
console.log('• Regularly update dependencies for security patches');
console.log('• Consider implementing rate limiting and monitoring');
console.log('• Test authentication flows thoroughly before production');

console.log('\n✨ Security check completed!\n');
