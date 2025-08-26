// Test environment variable loading
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing Environment Variables...\n');

// Check OpenAI API Key
const openaiKey = process.env.OPENAI_API_KEY;
if (openaiKey) {
  console.log('✅ OPENAI_API_KEY found');
  console.log(`   Preview: ${openaiKey.substring(0, 20)}...`);
} else {
  console.log('❌ OPENAI_API_KEY missing');
}

// Check ScraperAPI Key
const scraperKey = process.env.SCRAPER_API_KEY;
if (scraperKey) {
  console.log('✅ SCRAPER_API_KEY found');
  console.log(`   Preview: ${scraperKey.substring(0, 20)}...`);
} else {
  console.log('❌ SCRAPER_API_KEY missing');
}

// Check MongoDB URI
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
  console.log('✅ MONGODB_URI found');
  console.log(`   Preview: ${mongoUri.substring(0, 30)}...`);
} else {
  console.log('❌ MONGODB_URI missing');
}

// Check JWT Secrets
const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret) {
  console.log('✅ JWT_SECRET found');
  console.log(`   Preview: ${jwtSecret.substring(0, 20)}...`);
} else {
  console.log('❌ JWT_SECRET missing');
}

const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
if (jwtRefreshSecret) {
  console.log('✅ JWT_REFRESH_SECRET found');
  console.log(`   Preview: ${jwtRefreshSecret.substring(0, 20)}...`);
} else {
  console.log('❌ JWT_REFRESH_SECRET missing');
}

// Check eBay API Key (optional)
const ebayKey = process.env.EBAY_API_KEY;
if (ebayKey) {
  console.log('✅ EBAY_API_KEY found');
  console.log(`   Preview: ${ebayKey.substring(0, 20)}...`);
} else {
  console.log('⚠️  EBAY_API_KEY missing (optional)');
}

console.log('\n📋 Summary:');
console.log('Required variables:');
console.log('  - OPENAI_API_KEY:', openaiKey ? '✅' : '❌');
console.log('  - SCRAPER_API_KEY:', scraperKey ? '✅' : '❌');
console.log('  - MONGODB_URI:', mongoUri ? '✅' : '❌');
console.log('  - JWT_SECRET:', jwtSecret ? '✅' : '❌');
console.log('  - JWT_REFRESH_SECRET:', jwtRefreshSecret ? '✅' : '❌');

console.log('\nOptional variables:');
console.log('  - EBAY_API_KEY:', ebayKey ? '✅' : '⚠️');

if (!openaiKey || !scraperKey || !mongoUri || !jwtSecret || !jwtRefreshSecret) {
  console.log('\n🚨 CRITICAL: Missing required environment variables!');
  console.log('Please create a .env.local file with all required variables.');
  console.log('See env.example for the required format.');
  process.exit(1);
} else {
  console.log('\n🎉 All required environment variables are present!');
  console.log('The application should work correctly now.');
}
