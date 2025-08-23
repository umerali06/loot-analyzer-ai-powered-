import OpenAI from 'openai'
import { Item } from '../types'

// Rate limiting configuration
const RATE_LIMIT_DELAY = 1000 // 1 second between requests
const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2 seconds

// Image validation constants
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const SUPPORTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_IMAGES_PER_BATCH = 10

// OpenAI API Configuration
class OpenAIConfig {
  private static instance: OpenAI | null = null

  static getInstance(): OpenAI {
    if (!this.instance) {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set')
      }
      
      this.instance = new OpenAI({
        apiKey,
        timeout: 30000, // 30 second timeout
      })
    }
    return this.instance
  }
}

// Image validation utilities
class ImageValidator {
  static validateImageUrl(imageUrl: string): boolean {
    try {
      new URL(imageUrl)
      return true
    } catch {
      return false
    }
  }

  static validateImageFormat(imageType: string): boolean {
    return SUPPORTED_FORMATS.includes(imageType.toLowerCase())
  }

  static validateImageSize(size: number): boolean {
    return size <= MAX_IMAGE_SIZE
  }

  static async validateImageFile(file: File): Promise<void> {
    if (!this.validateImageFormat(file.type)) {
      throw new Error(`Unsupported image format: ${file.type}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`)
    }

    if (!this.validateImageSize(file.size)) {
      throw new Error(`Image size too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`)
    }
  }

  static validateBatchSize(images: string[]): void {
    if (images.length > MAX_IMAGES_PER_BATCH) {
      throw new Error(`Too many images: ${images.length}. Maximum allowed: ${MAX_IMAGES_PER_BATCH}`)
    }
  }
}

// Rate limiting utilities
class RateLimiter {
  private static lastRequestTime = 0

  static async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequestTime = Date.now()
  }
}

export class AIVisionService {
  private openai: OpenAI
  private maxRetries: number = 3
  private timeoutMs: number = 30000 // Increased timeout to 30 seconds

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }
    
    this.openai = new OpenAI({
      apiKey,
      timeout: this.timeoutMs,
      maxRetries: this.maxRetries
    })
  }

  async analyzeImage(imageUrl: string): Promise<Item[]> {
    try {
      // Handle both string URLs and base64 data
      if (!imageUrl) {
        console.error('No image data provided to AI Vision service')
        throw new Error('No image data provided')
      }

      // Log the image data safely
      if (typeof imageUrl === 'string') {
        if (imageUrl.startsWith('data:')) {
          console.log('Starting AI Vision analysis for base64 image data...')
        } else {
          console.log('Starting AI Vision analysis for image URL:', imageUrl.substring(0, 100) + '...')
        }
      } else {
        console.log('Starting AI Vision analysis for image data...')
      }
      
      // Enhanced system prompt with advanced NLP/ML techniques for maximum extraction
      const enhancedPrompt = `You are an expert AI analyst specializing in lot analysis, auction evaluation, and market research with ADVANCED COMPUTER VISION and NLP capabilities.

CRITICAL MISSION: EXTRACT MAXIMUM DATA - IDENTIFY EVERY SINGLE ITEM
- 🎯 **PRIMARY GOAL**: Identify EVERY visible item, no matter how small or partially visible
- 🔍 **DEEP SCAN**: Look at titles, spines, labels, text, logos, patterns, shapes, colors
- 📚 **BOOK COLLECTIONS**: For book sets, identify individual titles and series information
- 🏷️ **TEXT EXTRACTION**: Read all visible text, titles, author names, series information
- 📖 **SERIES DETECTION**: Identify complete sets, series names, volume numbers

NEVER RETURN GENERIC NAMES - ALWAYS BE SPECIFIC:
- ❌ FORBIDDEN: "Item", "Object", "Piece", "Book", "Books", "Collection"
- ✅ REQUIRED: Exact titles, series names, author names, edition information
- ✅ EXAMPLE: "Harry Potter Complete 7-Book Series Hardcover Set" not "Book Collection"
- ✅ EXAMPLE: "Encyclopedia Britannica Volume 1-24 Complete Set" not "Books"

ADVANCED ANALYSIS TECHNIQUES:
1. **OCR-Level Text Reading**: Read spine text, titles, author names, publisher info
2. **Pattern Recognition**: Identify series by visual patterns, colors, design consistency
3. **Context Clues**: Use box design, layout, numbering to identify complete sets
4. **Multi-Scale Analysis**: 
   - Macro level: Overall collection/set identification
   - Micro level: Individual item identification
   - Detail level: Edition, condition, completeness assessment

FOR BOOK COLLECTIONS SPECIFICALLY:
- Read every visible spine and title
- Identify the series name and publisher
- Count visible volumes/books
- Note if it's a complete set or partial
- Identify any special editions (hardcover, limited, anniversary)
- Look for box set information and publisher details

EXAMPLES OF MAXIMUM EXTRACTION:
Instead of: "Book Collection" ❌
Return: 
- "The Chronicles of Narnia Complete 7-Book Box Set"
- "Narnia Book 1: The Lion, the Witch and the Wardrobe"
- "Narnia Book 2: Prince Caspian"
- "Narnia Book 3: The Voyage of the Dawn Treader"
- (etc. for each visible book)

ENHANCED VALUATION FOR COLLECTIONS:
- Individual book values within sets
- Complete set premium pricing
- Condition-based adjustments for each item
- Rarity assessment for editions
- Market demand for series/authors

OUTPUT FORMAT - STRUCTURED JSON WITH EBAY-OPTIMIZED DATA:
You MUST return a valid JSON object with this exact structure:
{
  "items": [
    {
      "id": "item_1",
      "title": "EXACT product name for eBay search",
      "name": "Complete descriptive name for display", 
      "category": "Books & Literature",
      "condition": "excellent|good|fair|poor",
      "estimatedValue": { "min": 100, "max": 200, "mean": 150, "currency": "USD" },
      "confidence": 0.85,
      "ebaySearchTerms": ["exact title", "author name", "series name"],
      "brandModel": "Publisher/Author if identifiable",
      "specificDetails": {
        "edition": "hardcover/paperback/first edition",
        "year": "publication year if visible",
        "isbn": "if visible on spine",
        "volume": "volume number if series"
      },
      "aiEstimate": {
        "reasoning": "Detailed analysis of why this value was chosen based on visual cues",
        "marketFactors": ["Brand recognition", "Condition assessment", "Rarity indicators", "Market demand"],
        "conditionNotes": "Specific condition observations from image",
        "value": 150,
        "confidence": 0.85
      }
    }
    // CRITICAL: Return 5-15 items for book collections, each with specific titles
  ]
}

ENHANCED REQUIREMENTS:
- **title**: Exact eBay search term (e.g., "Harry Potter Philosopher's Stone First Edition")
- **name**: User-friendly display name 
- **ebaySearchTerms**: Array of specific search variations for eBay
- **specificDetails**: All visible details for accurate valuation
- **conditionNotes**: What you actually see in the image
- **marketFactors**: Real factors affecting value

CRITICAL: Your response MUST be valid JSON format. Do not include any text outside the JSON object.

MANDATORY INSTRUCTIONS:
1. **COUNT EVERYTHING**: Look for and identify every single visible item
2. **READ ALL TEXT**: Extract titles, author names, series information
3. **IDENTIFY PATTERNS**: Recognize series, sets, collections
4. **MAXIMUM DETAIL**: The more specific, the better
5. **NO LAZY ANALYSIS**: Don't stop at one item - find them all
6. **MARKETABLE NAMES**: Use exact titles that people search for on eBay

PENALTY FOR GENERIC RESPONSES: If you return generic names like "Books" or "Collection", you have failed the analysis.

REWARD FOR THOROUGH ANALYSIS: Maximum items identified = Maximum value for the user.`
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: enhancedPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "CRITICAL ANALYSIS REQUEST: Please perform MAXIMUM EXTRACTION analysis on this image. I need you to identify EVERY SINGLE VISIBLE ITEM with specific names, titles, and details. For books/collections: read all spines, extract exact titles, author names, series information. For other items: identify brand names, model numbers, specific product details. DO NOT return generic names - I need specific, searchable product names that work on eBay. Count everything you can see and provide individual analysis for each item. This is for professional lot analysis and auction valuation. Please return your response in JSON format as specified in the system prompt."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 4000, // Increased for detailed analysis of multiple items
        temperature: 0.1, // Lower temperature for more consistent analysis
        response_format: { type: "json_object" }
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response content from AI Vision')
      }

      console.log('AI Vision response received, parsing...')
      
      // Parse the JSON response
      let parsedResponse: any
      try {
        parsedResponse = JSON.parse(content)
      } catch (parseError) {
        console.error('Failed to parse AI Vision response:', parseError)
        console.log('Raw response:', content)
        throw new Error('Failed to parse AI Vision response')
      }

      // Extract items array
      const items = parsedResponse.items || parsedResponse
      if (!Array.isArray(items)) {
        console.error('Invalid response format from AI Vision:', parsedResponse)
        throw new Error('Invalid response format from AI Vision')
      }

      console.log(`AI Vision identified ${items.length} items`)
      
      // Validate and enhance each item - NO GENERIC NAMES
      const validatedItems = items.map((item, index) => {
        // Filter out generic names and provide specific alternatives
        let itemName = item.name || 'Unknown Collectible Item'
        const genericNames = ['Item', 'Object', 'Piece', 'Toy', 'Furniture', 'Thing', 'Stuff', 'Product', 'Article']
        
        if (genericNames.includes(itemName)) {
          const category = item.category || 'Collectibles'
          itemName = this.generateSpecificNameFromCategory(category)
        }
        
        return {
          id: item.id || `ai_item_${Date.now()}_${index}`,
          name: itemName,
          category: item.category || 'Collectibles',
          condition: item.condition || 'unknown',
          estimatedValue: {
            min: parseFloat(item.estimatedValue?.min) || 0,
            max: parseFloat(item.estimatedValue?.max) || 0,
            mean: parseFloat(item.estimatedValue?.mean) || 0,
            currency: item.estimatedValue?.currency || 'USD'
          },
          confidence: parseFloat(item.confidence) || 0.5,
          aiEstimate: {
            reasoning: item.aiEstimate?.reasoning || 'AI analysis provided',
            factors: Array.isArray(item.aiEstimate?.factors) ? item.aiEstimate.factors : [],
            value: parseFloat(item.aiEstimate?.value) || 0,
            confidence: parseFloat(item.aiEstimate?.confidence) || 0.5
          }
        }
      })

      return validatedItems

    } catch (error) {
      console.error('AI Vision analysis failed:', error)
      
      // Return a fallback item with basic analysis
      return [{
        id: `fallback_${Date.now()}`,
        name: 'Collectible Item - Analysis Failed',
        category: 'Collectibles',
        condition: 'unknown',
        estimatedValue: {
          min: 0,
          max: 0,
          mean: 0,
          currency: 'USD'
        },
        confidence: 0.1,
        aiEstimate: {
          reasoning: 'AI Vision service unavailable, using fallback',
          factors: ['Service error', 'Fallback mode'],
          value: 0,
          confidence: 0.1
        }
      }]
    }
  }

  /**
   * Generate specific names from category to avoid generic terms
   */
  private generateSpecificNameFromCategory(category: string): string {
    const categoryNames: Record<string, string> = {
      'Trading Cards': 'Trading Card Collection',
      'Toys & Games': 'Collectible Game Item',
      'Media': 'Media Collection Item',
      'Electronics': 'Electronic Device',
      'Furniture': 'Vintage Furniture Piece',
      'Jewelry': 'Jewelry Collection Item',
      'Clothing': 'Vintage Clothing Item',
      'Collectibles': 'Vintage Collectible Item',
      'Antiques': 'Antique Collection Item',
      'Art': 'Art Collection Piece',
      'Books': 'Book Collection Item',
      'Sports': 'Sports Memorabilia',
      'Music': 'Music Collectible',
      'Unknown': 'Collectible Item',
      'Other': 'Collectible Item'
    }
    
    return categoryNames[category] || 'Collectible Item'
  }

  /**
   * Get GPT estimate for item value
   */
  static async getGptEstimate(itemName: string, context?: string): Promise<number> {
    if (!itemName || itemName.trim().length === 0) {
      return 25.0 // Default for empty names
    }

    // Apply rate limiting
    await RateLimiter.waitForRateLimit()

    try {
      return await this.executeWithRetry(async () => {
        const openai = OpenAIConfig.getInstance()
        const prompt = `Estimate the potential resale value of this item on eBay: "${itemName}"
        ${context ? `Context: ${context}` : ''}
        
        Consider:
        - Item rarity and demand
        - Current market trends
        - Condition factors
        - Historical pricing data
        
        Return only a number representing the estimated value in USD. 
        If you're unsure, provide a conservative estimate.`

        const response = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 50,
          temperature: 0.3,
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
          throw new Error('No response from GPT for value estimation')
        }

        // Extract the number from the response
        const match = content.match(/\$?(\d+(?:\.\d{2})?)/)
        if (match) {
          const value = parseFloat(match[1])
          return Math.max(1, Math.min(10000, value)) // Clamp between $1 and $10,000
        }

        // Fallback to a default estimate
        return 25.0
      })
    } catch (error) {
      console.error('Error getting GPT estimate:', error)
      // Return a conservative default estimate
      return 25.0
    }
  }

  /**
   * Batch analyze multiple images
   */
  static async analyzeMultipleImages(imageUrls: string[]): Promise<Item[]> {
    // Validate batch size
    ImageValidator.validateBatchSize(imageUrls)

    const allItems: Item[] = []
    const service = new AIVisionService()
    
    for (const imageUrl of imageUrls) {
      try {
        const items = await service.analyzeImage(imageUrl)
        allItems.push(...items)
      } catch (error) {
        console.error(`Failed to analyze image ${imageUrl}:`, error)
        // Continue with other images but add a fallback item
        allItems.push({
          id: `failed_${Date.now()}`,
          name: 'Collectible Item - Image Analysis Failed',
          confidence: 0.1,
          boundingBox: { x: 0, y: 0, width: 1, height: 1 }
        })
      }
    }

    // Remove duplicates based on name similarity
    const uniqueItems = this.removeDuplicateItems(allItems)
    return uniqueItems
  }

  /**
   * Remove duplicate items based on name similarity
   */
  private static removeDuplicateItems(items: Item[]): Item[] {
    const uniqueItems: Item[] = []
    const seenNames = new Set<string>()

    for (const item of items) {
      const normalizedName = item.name.toLowerCase().trim()
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName)
        uniqueItems.push(item)
      }
    }

    return uniqueItems
  }

  /**
   * Execute a function with retry logic
   */
  private static async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt === MAX_RETRIES) {
          break
        }

        console.warn(`API call failed (attempt ${attempt}/${MAX_RETRIES}):`, lastError.message)
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt))
      }
    }

    throw new Error(`AI Vision analysis failed after ${MAX_RETRIES} attempts: ${lastError!.message}`)
  }

  /**
   * Parse and validate OpenAI response for items
   */
  private static parseAndValidateItems(content: string): Item[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      const jsonString = jsonMatch ? jsonMatch[0] : content

      const items = JSON.parse(jsonString) as Item[]

      if (!Array.isArray(items)) {
        throw new Error('Response is not an array')
      }

      // Validate each item
      return items.filter(item => {
        if (!item.name || typeof item.name !== 'string') {
          console.warn('Skipping item with invalid name:', item)
          return false
        }

        if (typeof item.confidence !== 'number' || item.confidence < 0 || item.confidence > 1) {
          console.warn('Fixing invalid confidence for item:', item.name)
          item.confidence = 0.8 // Default confidence
        }

        return true
      })
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error)
      console.error('Response content:', content)
      
      // Return fallback mock data for development
      return [
        {
          id: `fallback_${Date.now()}`,
          name: 'Collectible Item - Parse Failed',
          confidence: 0.5,
          boundingBox: { x: 0, y: 0, width: 1, height: 1 }
        }
      ]
    }
  }

  /**
   * Validate uploaded image files
   */
  static async validateImageFiles(files: File[]): Promise<void> {
    ImageValidator.validateBatchSize(files.map(f => f.name))
    
    for (const file of files) {
      await ImageValidator.validateImageFile(file)
    }
  }
}

