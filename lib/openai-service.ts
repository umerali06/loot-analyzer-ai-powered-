/**
 * OpenAI Service for Image Analysis
 * Provides AI-powered analysis for loot/item identification from images
 */

import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface AnalysisItem {
  name: string
  description: string
  category: string
  estimatedValue: {
    min: number
    max: number
    currency: string
  }
  condition: string
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary'
  confidence: number
  tags: string[]
  searchKeywords: string[]
}

export interface ImageAnalysisResult {
  items: AnalysisItem[]
  summary: {
    totalItems: number
    totalValueMin: number
    totalValueMax: number
    currency: string
    confidence: number
    processingTime: number
  }
  metadata: {
    imageAnalyzed: boolean
    textExtracted: string
    categories: string[]
  }
}

/**
 * Analyze images using OpenAI Vision API to identify valuable items
 */
export async function analyzeImagesWithAI(
  imageUrls: string[],
  userContext?: {
    preferences?: any
    previousAnalyses?: any[]
  }
): Promise<ImageAnalysisResult> {
  const startTime = Date.now()
  
  try {
    console.log('🤖 Starting OpenAI image analysis for', imageUrls.length, 'images')
    
    // Prepare the system prompt for loot/item analysis
    const systemPrompt = `You are an expert antique and collectible appraiser specializing in identifying valuable items from magazine listings, auction catalogs, and collection photos.

Your task is to analyze images and identify potentially valuable items such as:
- Antiques and vintage items
- Collectibles (coins, stamps, toys, etc.)
- Art and prints
- Jewelry and watches
- Books and magazines
- Electronics and gadgets
- Musical instruments
- Sports memorabilia
- Trading cards
- Comic books
- Any other potentially valuable items

For each item you identify, provide:
1. Name and detailed description
2. Category (antiques, collectibles, electronics, etc.)
3. Estimated value range in USD
4. Condition assessment
5. Rarity level
6. Confidence in identification (0-100%)
7. Relevant tags and search keywords for further research

Be thorough but realistic. Focus on items that actually have potential value. If an image shows a magazine or catalog page, identify the specific items being advertised or featured.

Return your analysis as a structured JSON response.`

    const userPrompt = `Please analyze these images and identify any valuable or interesting items. Look carefully for:
- Individual items and their details
- Price listings if visible
- Brand names and model numbers
- Condition indicators
- Any text or descriptions visible

Focus on items that could have resale value or collector interest. Be specific about what you see and provide realistic value estimates based on current market conditions.`

    // Process images with OpenAI Vision API
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userPrompt
          },
          ...imageUrls.map(url => ({
            type: 'image_url' as const,
            image_url: {
              url: url,
              detail: 'high' as const
            }
          }))
        ]
      }
    ]

    console.log('🤖 Calling OpenAI API...')
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages,
      max_tokens: 2000,
      temperature: 0.1, // Low temperature for consistent, factual responses
      response_format: { type: 'json_object' }
    })

    const aiResponse = response.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    console.log('🤖 OpenAI response received, parsing...')
    
    // Parse the AI response
    let parsedResponse: any
    try {
      parsedResponse = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError)
      throw new Error('Invalid JSON response from AI')
    }

    // Transform the response into our expected format
    const items: AnalysisItem[] = parsedResponse.items?.map((item: any) => ({
      name: item.name || 'Unknown Item',
      description: item.description || '',
      category: item.category || 'miscellaneous',
      estimatedValue: {
        min: Math.max(0, parseFloat(item.estimatedValue?.min) || 0),
        max: Math.max(0, parseFloat(item.estimatedValue?.max) || 0),
        currency: 'USD'
      },
      condition: item.condition || 'unknown',
      rarity: item.rarity || 'common',
      confidence: Math.min(100, Math.max(0, parseInt(item.confidence) || 0)),
      tags: Array.isArray(item.tags) ? item.tags : [],
      searchKeywords: Array.isArray(item.searchKeywords) ? item.searchKeywords : []
    })) || []

    const processingTime = Date.now() - startTime

    // Calculate summary
    const totalValueMin = items.reduce((sum, item) => sum + item.estimatedValue.min, 0)
    const totalValueMax = items.reduce((sum, item) => sum + item.estimatedValue.max, 0)
    const avgConfidence = items.length > 0 
      ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length 
      : 0

    const result: ImageAnalysisResult = {
      items,
      summary: {
        totalItems: items.length,
        totalValueMin,
        totalValueMax,
        currency: 'USD',
        confidence: Math.round(avgConfidence),
        processingTime
      },
      metadata: {
        imageAnalyzed: true,
        textExtracted: parsedResponse.textExtracted || '',
        categories: [...new Set(items.map(item => item.category))]
      }
    }

    console.log('✅ OpenAI analysis completed:', {
      itemsFound: items.length,
      totalValueRange: `$${totalValueMin}-$${totalValueMax}`,
      processingTime: `${processingTime}ms`
    })

    return result

  } catch (error) {
    console.error('❌ OpenAI analysis failed:', error)
    
    // Return a fallback result
    return {
      items: [],
      summary: {
        totalItems: 0,
        totalValueMin: 0,
        totalValueMax: 0,
        currency: 'USD',
        confidence: 0,
        processingTime: Date.now() - startTime
      },
      metadata: {
        imageAnalyzed: false,
        textExtracted: '',
        categories: []
      }
    }
  }
}

/**
 * Enhance item analysis with additional context and market research
 */
export async function enhanceItemAnalysis(
  items: AnalysisItem[],
  additionalContext?: string
): Promise<AnalysisItem[]> {
  if (items.length === 0) return items

  try {
    console.log('🔍 Enhancing analysis for', items.length, 'items')

    const enhancementPrompt = `You are an expert appraiser. Review and enhance these item analyses:

${JSON.stringify(items, null, 2)}

${additionalContext ? `Additional context: ${additionalContext}` : ''}

Please:
1. Refine value estimates based on current market conditions
2. Improve search keywords for better marketplace research
3. Add or correct category classifications
4. Suggest specific marketplaces where these items might sell well
5. Identify any items that might need professional appraisal

Return the enhanced items array in the same JSON format.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert antique and collectible appraiser. Provide accurate, market-based value estimates and practical selling advice.'
        },
        {
          role: 'user',
          content: enhancementPrompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    const enhancedResponse = response.choices[0]?.message?.content
    if (!enhancedResponse) {
      console.warn('⚠️ No enhancement response from OpenAI, returning original items')
      return items
    }

    const parsed = JSON.parse(enhancedResponse)
    const enhancedItems = parsed.items || parsed

    console.log('✅ Item analysis enhanced')
    return Array.isArray(enhancedItems) ? enhancedItems : items

  } catch (error) {
    console.error('❌ Enhancement failed:', error)
    return items
  }
}

/**
 * Check if OpenAI service is properly configured
 */
export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

/**
 * Get estimated cost for analysis (approximate)
 */
export function getEstimatedCost(imageCount: number): number {
  // GPT-4 Vision pricing (approximate): $0.01 per image for high detail
  // Plus text generation costs
  const imageCost = imageCount * 0.01
  const textCost = 0.005 // Estimated for text generation
  return imageCost + textCost
}
