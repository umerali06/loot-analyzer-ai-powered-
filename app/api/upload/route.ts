import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware-simple'
import { createSuccessResponse, createErrorResponse, addPerformanceHeaders } from '@/lib/api-utils-enhanced'
import { processImage } from '@/lib/image-utils'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return createErrorResponse('No files provided', 400)
    }

    if (files.length > 10) {
      return createErrorResponse('Maximum 10 files allowed', 400)
    }

    const processedImages = []
    const errors = []

    for (const file of files) {
      try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          errors.push(`File ${file.name} is not an image`)
          continue
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          errors.push(`File ${file.name} is too large (max 10MB)`)
          continue
        }

        // Process the image
        const processedImage = await processImage(file as any)
        
        // Create analysis record
        const analysisData = {
          title: `Image Analysis - ${file.name}`,
          description: 'Image uploaded for analysis',
          images: [{
            url: processedImage.optimized.toString('base64'),
            optimizedSize: processedImage.optimized.length,
            format: 'jpeg',
            dimensions: {
              width: processedImage.metadata.width || 0,
              height: processedImage.metadata.height || 0
            }
          }],
          tags: ['upload', 'image-analysis'],
          isPublic: false
        }

        processedImages.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          filename: file.name,
          size: file.size,
          type: file.type,
          url: processedImage.optimized.toString('base64'),
          optimizedSize: processedImage.optimized.length,
          format: processedImage.metadata.format,
          dimensions: {
            width: processedImage.metadata.width || 0,
            height: processedImage.metadata.height || 0
          }
        })

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        errors.push(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (processedImages.length === 0) {
      return createErrorResponse('No images were successfully processed', 400)
    }

    const result = {
      success: true,
      images: processedImages,
      totalProcessed: processedImages.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }

    const response = createSuccessResponse(result)
    return addPerformanceHeaders(response)

  } catch (error) {
    console.error('Upload API error:', error)
    return createErrorResponse('Internal server error', 500, error)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 })
}
