console.log('🔍 Checking Environment Variables...\n');

// Check for required environment variables
const requiredVars = [
  'OPENAI_API_KEY',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'MONGODB_URI',
  'SCRAPER_API_KEY',
  'NEXTAUTH_SECRET'
];

console.log('📋 Required Environment Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
});

console.log('\n🔧 Optional Environment Variables:');
const optionalVars = [
  'EBAY_API_KEY',
  'REDIS_URL',
  'NODE_ENV',
  'NEXT_PUBLIC_APP_ENV'
];

optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`⚠️  ${varName}: NOT SET (optional)`);
  }
});

console.log('\n📁 Environment File Status:');
console.log('You need to create a .env.local file in your project root with:');
console.log('OPENAI_API_KEY=your-actual-api-key-here');
console.log('JWT_SECRET=your-jwt-secret-here');
console.log('MONGODB_URI=your-mongodb-connection-string');
console.log('SCRAPER_API_KEY=your-scraper-api-key');
console.log('NEXTAUTH_SECRET=your-nextauth-secret');
