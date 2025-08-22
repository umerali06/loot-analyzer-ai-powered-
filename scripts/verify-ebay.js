#!/usr/bin/env node

/**
 * CLI script to verify eBay data retrieval
 * Usage: npm run verify:ebay "lego 75257"
 */

require('dotenv').config({ path: '.env.local' })

async function verifyEbayData() {
  const query = process.argv[2]
  
  if (!query) {
    console.error('❌ Please provide a search query')
    console.log('Usage: npm run verify:ebay "lego 75257"')
    process.exit(1)
  }

  console.log(`🔍 Testing eBay data retrieval for: "${query}"`)
  console.log('=' .repeat(50))

  try {
    // Check environment variables
    if (!process.env.SCRAPER_API_KEY) {
      console.error('❌ SCRAPER_API_KEY not found in environment variables')
      console.log('Please create .env.local file with your ScraperAPI key')
      process.exit(1)
    }

    console.log('✅ Environment variables loaded')
    console.log(`📡 ScraperAPI Key: ${process.env.SCRAPER_API_KEY.substring(0, 8)}...`)

    // Test ScraperAPI connection directly
    console.log('\n🔄 Testing ScraperAPI connection...')
    
    const testUrl = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_BIN=1`
    
    const startTime = Date.now()
    
    // Use fetch (available in Node.js 18+)
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    console.log(`📊 Response Time: ${responseTime}ms`)
    console.log(`📊 Response Status: ${response.status}`)
    console.log(`📊 Response Size: ${response.headers.get('content-length') || 'Unknown'}`)
    
    if (response.ok) {
      const contentType = response.headers.get('content-type')
      console.log(`📊 Content Type: ${contentType}`)
      
      if (contentType && contentType.includes('text/html')) {
        const htmlContent = await response.text()
        const htmlSize = htmlContent.length
        
        console.log(`✅ Received HTML content (${htmlSize} characters)`)
        
        // Simple HTML parsing test
        const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (titleMatch) {
          console.log(`📄 Page Title: ${titleMatch[1].trim()}`)
        }
        
        // Check for eBay search results indicators
        const hasResults = htmlContent.includes('srp-results') || htmlContent.includes('s-item')
        console.log(`🔍 Contains eBay Results: ${hasResults ? 'Yes' : 'No'}`)
        
        if (hasResults) {
          console.log('✅ eBay search page successfully retrieved!')
          console.log('✅ ScraperAPI integration is working correctly')
        } else {
          console.log('⚠️ eBay page retrieved but search results format may have changed')
        }
        
      } else {
        console.log('⚠️ Unexpected content type received')
      }
    } else {
      console.log(`❌ HTTP Error: ${response.status}`)
      const errorText = await response.text()
      console.log(`❌ Error Details: ${errorText.substring(0, 200)}`)
    }
    
    console.log('\n✅ eBay verification completed!')
    console.log('\n💡 Next steps:')
    console.log('1. ScraperAPI connection test complete')
    console.log('2. Start the development server: npm run dev')
    console.log('3. Upload images to test the full AI Vision + eBay integration')
    
  } catch (error) {
    console.error('❌ eBay verification failed:', error.message)
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Solution:')
      console.log('1. Make sure you have Node.js 18+ (for fetch support)')
      console.log('2. Or install node-fetch: npm install node-fetch')
    } else if (error.message.includes('SCRAPER_API_KEY')) {
      console.log('\n💡 Solution:')
      console.log('1. Get your ScraperAPI key from https://www.scraperapi.com/')
      console.log('2. Create .env.local file in project root')
      console.log('3. Add: SCRAPER_API_KEY=your_key_here')
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Solution:')
      console.log('1. Check your internet connection')
      console.log('2. Verify ScraperAPI service status')
      console.log('3. Try again in a few minutes')
    } else if (error.message.includes('blocked')) {
      console.log('\n💡 Solution:')
      console.log('1. eBay may be blocking the request')
      console.log('2. Try a different search query')
      console.log('3. Check ScraperAPI account limits')
    }
    
    process.exit(1)
  }
}

// Run the verification
if (require.main === module) {
  verifyEbayData()
}

module.exports = { verifyEbayData }
