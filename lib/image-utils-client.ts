/**
 * Client-Safe Image Utilities
 * 
 * This file provides the same interfaces as image-utils.ts but without Sharp dependencies.
 * It's safe to import on the client side and provides mock/stub implementations.
 */

// Image optimization configuration (same as server-side)
export const IMAGE_CONFIG = {
  // Quality settings
  jpeg: { quality: 85, progressive: true, mozjpeg: true },
  webp: { quality: 80, effort: 4 },
  png: { compressionLevel: 9, progressive: true },
  
  // Size limits
  maxWidth: 1920,
  maxHeight: 1080,
  thumbnailSize: 200,
  
  // Cache settings
  cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
  
  // Progressive loading
  progressiveSteps: [0.25, 0.5, 0.75, 1.0],
  
  // Supported formats
  supportedFormats: ['jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp']
}

// Enhanced image metadata interface (same as server-side)
export interface OptimizedImage {
  original: Buffer
  optimized: Buffer
  thumbnail: Buffer
  metadata: {
    width: number
    height: number
    format: string
    size: number
    optimizedSize: number
    compressionRatio: number
    processingTime: number
  }
  progressive?: Buffer[]
  webp?: Buffer
}

// Performance metrics (same as server-side)
export interface PerformanceMetrics {
  startTime: number
  endTime: number
  processingTime: number
  memoryUsage: number
  compressionRatio: number
}

/**
 * Client-side image validation
 */
export function validateImageForOptimization(
  file: File,
  maxSize: number = 50 * 1024 * 1024 // 50MB
): { isValid: boolean; error?: string } {
  console.log('Validating file:', file.name, file.type, file.size)
  
  try {
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `Image size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${maxSize / 1024 / 1024}MB)`
      }
    }
    
    // Check file type - be more flexible with type checking
    const validTypes = IMAGE_CONFIG.supportedFormats.map(format => `image/${format}`)
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    
    console.log('File type check:', {
      fileType: file.type,
      fileExtension,
      validTypes,
      supportedFormats: IMAGE_CONFIG.supportedFormats
    })
    
    // Check if file type is in valid types OR if file extension is supported
    const isValidType = validTypes.includes(file.type) || 
                       (fileExtension && IMAGE_CONFIG.supportedFormats.includes(fileExtension))
    
    if (!isValidType) {
      return {
        isValid: false,
        error: `File type ${file.type} (extension: .${fileExtension}) is not supported. Supported types: ${IMAGE_CONFIG.supportedFormats.join(', ')}`
      }
    }
    
    console.log('File validation passed')
    return { isValid: true }
  } catch (error) {
    console.error('Validation error:', error)
    return {
      isValid: false,
      error: `Image validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get image dimensions from File object (client-side)
 */
export function getImageDimensionsFromFile(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }
    img.onerror = () => {
      reject(new Error('Failed to load image for dimension extraction'))
    }
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Convert File to base64 data URL
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert file to base64'))
      }
    }
    reader.onerror = () => reject(new Error('File reading failed'))
    reader.readAsDataURL(file)
  })
}

/**
 * Create thumbnail from File (client-side, using canvas)
 */
export function createThumbnailFromFile(
  file: File, 
  size: number = IMAGE_CONFIG.thumbnailSize
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Calculate dimensions maintaining aspect ratio
      const { width, height } = img
      const aspectRatio = width / height
      
      let newWidth = size
      let newHeight = size
      
      if (aspectRatio > 1) {
        // Landscape
        newHeight = size / aspectRatio
      } else {
        // Portrait
        newWidth = size * aspectRatio
      }
      
      canvas.width = newWidth
      canvas.height = newHeight
      
      // Draw and resize image
      ctx?.drawImage(img, 0, 0, newWidth, newHeight)
      
      // Convert to base64
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7)
      resolve(thumbnail)
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image for thumbnail creation'))
    }
    
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Batch process files (client-side, creates thumbnails and metadata)
 */
export async function processBatchFiles(
  files: File[],
  onProgress?: (completed: number, total: number) => void
): Promise<Array<{
  file: File
  thumbnail: string
  base64Data: string
  dimensions: { width: number; height: number }
  metadata: { size: number; type: string }
}>> {
  console.log('processBatchFiles called with files:', files)
  const results = []
  const total = files.length
  
  for (let i = 0; i < total; i++) {
    try {
      const file = files[i]
      console.log(`Processing file ${i + 1}/${total}:`, file.name, file.type, file.size)
      
      // Validate file
      const validation = validateImageForOptimization(file)
      console.log('Validation result:', validation)
      if (!validation.isValid) {
        console.warn(`Skipping invalid file: ${validation.error}`)
        continue
      }
      
      // Process file
      console.log('Creating thumbnail, getting dimensions, and converting to base64...')
      const [thumbnail, dimensions, base64Data] = await Promise.all([
        createThumbnailFromFile(file),
        getImageDimensionsFromFile(file),
        fileToBase64(file)
      ])
      
      console.log('File processed successfully:', { 
        thumbnail: thumbnail.substring(0, 50) + '...', 
        dimensions,
        base64Data: base64Data.substring(0, 50) + '...'
      })
      
      results.push({
        file,
        thumbnail,
        base64Data,
        dimensions,
        metadata: {
          size: file.size,
          type: file.type
        }
      })
      
      if (onProgress) {
        onProgress(i + 1, total)
      }
    } catch (error) {
      console.error(`Failed to process file ${i + 1}:`, error)
      // Continue with next file
    }
  }
  
  console.log('processBatchFiles completed, returning results:', results)
  return results
}

// Export the same interfaces as the server-side version for compatibility
// Note: These are already exported above, so no need to re-export
