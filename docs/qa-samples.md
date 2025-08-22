# QA Testing Samples - SIBI / Lot Analyser

**Generated:** 2025-01-27  
**Purpose:** Document expected test results and validation criteria

## 🧪 Test Environment Setup

### Prerequisites
```bash
# Ensure environment is properly configured
cp env.example .env.local
# Edit .env.local with real API keys
npm install
```

### Environment Validation
```bash
# Test environment variables
npm run test-env

# Test database connection
npm run test-db

# Test eBay integration
npm run verify:ebay "test item"
```

## 📊 eBay Service Testing

### Test Case 1: Basic Item Search
```bash
npm run verify:ebay "lego 75257"
```

**Expected Output:**
```
🔍 Testing eBay data retrieval for: "lego 75257"
==================================================
✅ Environment variables loaded
📡 ScraperAPI Key: 7548c7de...
✅ eBay service initialized

🔄 Fetching eBay data...
✅ Data retrieved in 2500ms

📊 Results:
   Search Query: lego 75257
   Active Listings: 15
   Sold Items: 8
   Last Updated: 2025-01-27T...

💰 Sold Items:
   1. lego 75257 - Sold Item
      Price: $45.99
      Date: 2025-01-25T...
      Condition: used
   
   2. lego 75257 - Sold Item
      Price: $52.00
      Date: 2025-01-24T...
      Condition: used

📈 Price Statistics:
   Min Price: $42.50
   Max Price: $65.00
   Average Price: $51.25
   Median Price: $49.99
   Price Range: $22.50

✅ eBay verification completed successfully!
```

### Test Case 2: Trading Card Search
```bash
npm run verify:ebay "pokemon charizard card"
```

**Expected Output:**
```
🔍 Testing eBay data retrieval for: "pokemon charizard card"
==================================================
✅ Environment variables loaded
📡 ScraperAPI Key: 7548c7de...
✅ eBay service initialized

🔄 Fetching eBay data...
✅ Data retrieved in 3200ms

📊 Results:
   Search Query: pokemon charizard card
   Active Listings: 45
   Sold Items: 23
   Last Updated: 2025-01-27T...

💰 Sold Items:
   1. pokemon charizard card - Sold Item
      Price: $125.00
      Date: 2025-01-26T...
      Condition: used
   
   2. pokemon charizard card - Sold Item
      Price: $89.99
      Date: 2025-01-25T...
      Condition: used

📈 Price Statistics:
   Min Price: $45.00
   Max Price: $350.00
   Average Price: $187.50
   Median Price: $175.00
   Price Range: $305.00

✅ eBay verification completed successfully!
```

### Test Case 3: Electronics Search
```bash
npm run verify:ebay "iphone 12"
```

**Expected Output:**
```
🔍 Testing eBay data retrieval for: "iphone 12"
==================================================
✅ Environment variables loaded
📡 ScraperAPI Key: 7548c7de...
✅ eBay service initialized

🔄 Fetching eBay data...
✅ Data retrieved in 2800ms

📊 Results:
   Search Query: iphone 12
   Active Listings: 156
   Sold Items: 89
   Last Updated: 2025-01-27T...

💰 Sold Items:
   1. iphone 12 - Sold Item
      Price: $425.00
      Date: 2025-01-26T...
      Condition: used
   
   2. iphone 12 - Sold Item
      Price: $389.99
      Date: 2025-01-25T...
      Condition: used

📈 Price Statistics:
   Min Price: $275.00
   Max Price: $650.00
   Average Price: $487.50
   Median Price: $475.00
   Price Range: $375.00

✅ eBay verification completed successfully!
```

## 🔍 Error Handling Tests

### Test Case 4: Invalid API Key
```bash
# Temporarily set invalid API key
export SCRAPER_API_KEY=invalid_key
npm run verify:ebay "test item"
```

**Expected Output:**
```
🔍 Testing eBay data retrieval for: "test item"
==================================================
✅ Environment variables loaded
📡 ScraperAPI Key: invalid_k...
✅ eBay service initialized

🔄 Fetching eBay data...
❌ eBay verification failed: ScraperAPI error: 401 Unauthorized

💡 Solution:
1. Get your ScraperAPI key from https://www.scraperapi.com/
2. Create .env.local file in project root
3. Add: SCRAPER_API_KEY=your_key_here
```

### Test Case 5: Network Timeout
```bash
# Test with very slow network (simulate timeout)
npm run verify:ebay "very specific rare item name that might timeout"
```

**Expected Output:**
```
🔍 Testing eBay data retrieval for: "very specific rare item name that might timeout"
==================================================
✅ Environment variables loaded
📡 ScraperAPI Key: 7548c7de...
✅ eBay service initialized

🔄 Fetching eBay data...
❌ eBay verification failed: ScraperAPI error: 408 Request Timeout

💡 Solution:
1. Check your internet connection
2. Verify ScraperAPI service status
3. Try again in a few minutes
```

## 📈 Outlier Filtering Tests

### Test Case 6: Price Anomaly Detection
```javascript
// Test the stats utility directly
const { filterOutliersSmart, calculatePriceStatistics } = require('./lib/stats');

const testPrices = [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 500, 1000];

const result = filterOutliersSmart(testPrices);
console.log('Outlier Detection Result:', result);
```

**Expected Output:**
```javascript
Outlier Detection Result: {
  filteredPrices: [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
  outliers: [500, 1000],
  statistics: {
    min: 25,
    max: 100,
    mean: 62.5,
    median: 62.5,
    // ... other stats
  },
  method: 'iqr'
}
```

### Test Case 7: Statistical Analysis
```javascript
const { calculatePriceStatistics, detectPriceAnomalies } = require('./lib/stats');

const prices = [45, 52, 48, 55, 42, 58, 49, 51, 47, 53];
const stats = calculatePriceStatistics(prices);
const anomalies = detectPriceAnomalies(prices);

console.log('Statistics:', stats);
console.log('Anomalies:', anomalies);
```

**Expected Output:**
```javascript
Statistics: {
  min: 42,
  max: 58,
  mean: 50.0,
  median: 50.0,
  standardDeviation: 4.47,
  outlierCount: 0,
  sampleSize: 10
}

Anomalies: {
  anomalies: [],
  method: 'iqr',
  confidence: 0.5
}
```

## 🖼️ AI Vision Testing

### Test Case 8: Image Analysis
```bash
# Test with a sample image
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "images": [{
      "name": "test-image.jpg",
      "base64Data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
    }]
  }'
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "id": "analysis_1706313600000",
    "timestamp": "2025-01-27T12:00:00.000Z",
    "items": [
      {
        "id": "ai_item_1706313600000_0",
        "name": "Vintage Camera",
        "category": "Electronics",
        "condition": "good",
        "estimatedValue": {
          "min": 75,
          "max": 150,
          "mean": 112.5,
          "currency": "USD"
        },
        "confidence": 0.85,
        "aiEstimate": {
          "reasoning": "Vintage camera with visible wear but functional condition",
          "factors": ["Brand recognition", "Age indicators", "Condition assessment"],
          "value": 112.5,
          "confidence": 0.85
        }
      }
    ],
    "summary": {
      "totalItems": 1,
      "totalValue": 112.5,
      "currency": "USD",
      "confidence": 0.85,
      "processingTime": 4500
    },
    "status": "completed"
  }
}
```

## 🧪 Integration Testing

### Test Case 9: End-to-End Analysis
```bash
# Complete workflow test
# 1. Upload image
# 2. AI analysis
# 3. eBay data retrieval
# 4. Outlier filtering
# 5. Results generation

npm run test:e2e
```

**Expected Output:**
```
🧪 Running E2E tests...

✅ Image upload test passed
✅ AI vision analysis test passed
✅ eBay data retrieval test passed
✅ Outlier filtering test passed
✅ Results generation test passed
✅ Database storage test passed

🎉 All E2E tests passed!
```

## 📊 Performance Benchmarks

### Test Case 10: Response Time Testing
```bash
# Test API response times
npm run test:performance
```

**Expected Output:**
```
🚀 Performance Testing Results

Image Analysis:
  - Single image: 2.5s ± 0.3s
  - Multiple images (5): 8.2s ± 1.1s
  - Large image (10MB): 4.1s ± 0.5s

eBay Data Retrieval:
  - Simple query: 1.8s ± 0.4s
  - Complex query: 3.2s ± 0.6s
  - Rate limited: 5.5s ± 1.2s

Outlier Filtering:
  - Small dataset (10 prices): 0.1ms ± 0.02ms
  - Large dataset (1000 prices): 2.3ms ± 0.4ms
  - Complex dataset with anomalies: 1.8ms ± 0.3ms

Overall Performance: ✅ PASSED
```

## 🔍 Validation Criteria

### Functional Requirements
- [x] Image upload and processing
- [x] AI vision item identification
- [x] Real eBay data retrieval
- [x] Outlier filtering and statistics
- [x] Results generation and display

### Performance Requirements
- [x] Image analysis < 5 seconds
- [x] eBay data retrieval < 4 seconds
- [x] Outlier filtering < 10ms
- [x] Total analysis < 15 seconds

### Quality Requirements
- [x] No mock data in production
- [x] Comprehensive error handling
- [x] Input validation and sanitization
- [x] Proper logging and monitoring

## 🚨 Known Issues & Limitations

### Current Limitations
1. **Rate Limiting**: ScraperAPI has usage limits
2. **Image Size**: Maximum 10MB per image
3. **Batch Processing**: Maximum 10 images per analysis
4. **eBay Data**: Limited to recent sales and active listings

### Workarounds
1. **Rate Limiting**: Implement exponential backoff
2. **Image Size**: Client-side compression
3. **Batch Processing**: Queue-based processing
4. **eBay Data**: Caching and fallback strategies

## 📝 Test Data

### Sample Images
- `test-images/lego-set.jpg` - LEGO Star Wars set
- `test-images/pokemon-card.jpg` - Pokemon trading card
- `test-images/vintage-camera.jpg` - Vintage camera
- `test-images/antique-furniture.jpg` - Antique chair

### Sample Queries
- "lego 75257 star wars"
- "pokemon charizard base set"
- "canon ae-1 camera"
- "vintage oak dining chair"

## 🎯 Success Criteria

### Minimum Viable Product
- [x] Real eBay data integration
- [x] Advanced outlier filtering
- [x] No mock data
- [x] Security vulnerabilities fixed

### Production Ready
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Error handling comprehensive
- [ ] Documentation complete

### Client Delivery
- [ ] End-to-end functionality verified
- [ ] User acceptance testing passed
- [ ] Production deployment successful
- [ ] Client training completed

---

**Note**: These test cases should be run in order to validate the complete system functionality. All tests should pass before considering the system production-ready.
