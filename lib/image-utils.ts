/**
 * Enhanced Image Utilities with Performance Optimizations
 * SERVER-SIDE ONLY - Do not import on client side
 * 
 * This file contains server-side image processing using Sharp library.
 * For client-side image handling, use the ImageUpload component directly.
 */

// This file should only be imported in API routes or server-side code
// The runtime check prevents client-side usage but the import still happens during build

// Image optimization configuration (safe to export)
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

// Enhanced image metadata interface
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

// Performance metrics
export interface PerformanceMetrics {
  startTime: number
  endTime: number
  processingTime: number
  memoryUsage: number
  compressionRatio: number
}

// Server-side only functions - these will throw if called on client
let sharpModule: any = null

/**
 * Get sharp instance - only available on server side
 */
async function getSharp() {
  if (typeof window !== 'undefined') {
    throw new Error('Image processing utilities can only be used on the server side')
  }
  
  if (!sharpModule) {
    try {
      sharpModule = await import('sharp')
    } catch (error) {
      throw new Error(`Failed to load Sharp library: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  return sharpModule.default
}

/**
 * Enhanced image optimization with performance tracking
 */
export async function optimizeImage(
  input: Buffer | string,
  options: Partial<typeof IMAGE_CONFIG> = {}
): Promise<OptimizedImage> {
  const startTime = performance.now()
  const config = { ...IMAGE_CONFIG, ...options }
  
  try {
    const sharp = await getSharp()
    let image = sharp(input)
    const metadata = await image.metadata()
    
    // Determine optimal format based on input
    const optimalFormat = getOptimalFormat(metadata.format)
    
    // Resize if needed
    if (metadata.width && metadata.width > config.maxWidth) {
      image = image.resize(config.maxWidth, null, { 
        withoutEnlargement: true,
        kernel: 'lanczos3'
      })
    }
    
    // Generate optimized versions
    const [optimized, thumbnail, webp] = await Promise.all([
      generateOptimizedVersion(image, optimalFormat, config),
      generateThumbnail(image, config),
      generateWebPVersion(image, config)
    ])
    
    // Generate progressive versions for JPEG
    const progressive = optimalFormat === 'jpeg' ? 
      await generateProgressiveVersions(image, config) : undefined
    
    const endTime = performance.now()
    const processingTime = endTime - startTime
    
    return {
      original: Buffer.isBuffer(input) ? input : Buffer.from(input),
      optimized,
      thumbnail,
      metadata: {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: optimalFormat,
        size: Buffer.isBuffer(input) ? input.length : Buffer.from(input).length,
        optimizedSize: optimized.length,
        compressionRatio: (1 - (optimized.length / (Buffer.isBuffer(input) ? input.length : Buffer.from(input).length))) * 100,
        processingTime
      },
      progressive,
      webp
    }
  } catch (error) {
    console.error('Image optimization failed:', error)
    throw new Error(`Image optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate optimized version in optimal format
 */
async function generateOptimizedVersion(
  image: any,
  format: string,
  config: typeof IMAGE_CONFIG
): Promise<Buffer> {
  switch (format) {
    case 'jpeg':
      return image.jpeg(config.jpeg).toBuffer()
    case 'png':
      return image.png(config.png).toBuffer()
    case 'webp':
      return image.webp(config.webp).toBuffer()
    default:
      return image.jpeg(config.jpeg).toBuffer()
  }
}

/**
 * Generate WebP version for better compression
 */
async function generateWebPVersion(
  image: any,
  config: typeof IMAGE_CONFIG
): Promise<Buffer> {
  return image.webp(config.webp).toBuffer()
}

/**
 * Generate thumbnail with optimal settings
 */
async function generateThumbnail(
  image: any,
  config: typeof IMAGE_CONFIG
): Promise<Buffer> {
  return image
    .resize(config.thumbnailSize, config.thumbnailSize, {
      fit: 'cover',
      position: 'center',
      kernel: 'lanczos3'
    })
    .jpeg({ quality: 70, progressive: true })
    .toBuffer()
}

/**
 * Generate progressive JPEG versions for better perceived performance
 */
async function generateProgressiveVersions(
  image: any,
  config: typeof IMAGE_CONFIG
): Promise<Buffer[]> {
  const versions: Buffer[] = []
  
  for (const step of config.progressiveSteps) {
    const width = Math.floor((config.maxWidth || 1920) * step)
    const height = Math.floor((config.maxHeight || 1080) * step)
    
    const progressiveVersion = await image
      .resize(width, height, { withoutEnlargement: true })
      .jpeg({ quality: 60, progressive: true })
      .toBuffer()
    
    versions.push(progressiveVersion)
  }
  
  return versions
}

/**
 * Determine optimal format based on input and requirements
 */
function getOptimalFormat(inputFormat?: string): string {
  if (!inputFormat) return 'jpeg'
  
  const format = inputFormat.toLowerCase()
  
  // Prefer WebP for better compression
  if (['jpeg', 'jpg', 'png'].includes(format)) {
    return 'webp'
  }
  
  return format
}

/**
 * Enhanced batch processing with progress tracking
 */
export async function processBatchImages(
  images: (Buffer | string)[],
  options: Partial<typeof IMAGE_CONFIG> = {},
  onProgress?: (completed: number, total: number) => void
): Promise<OptimizedImage[]> {
  const results: OptimizedImage[] = []
  const total = images.length
  
  for (let i = 0; i < total; i++) {
    try {
      const result = await optimizeImage(images[i], options)
      results.push(result)
      
      if (onProgress) {
        onProgress(i + 1, total)
      }
    } catch (error) {
      console.error(`Failed to process image ${i + 1}:`, error)
      // Continue with next image
    }
  }
  
  return results
}

/**
 * Enhanced image validation with performance checks
 */
export function validateImageForOptimization(
  input: Buffer | string,
  maxSize: number = 50 * 1024 * 1024 // 50MB
): { isValid: boolean; error?: string } {
  try {
    const size = Buffer.isBuffer(input) ? input.length : Buffer.from(input).length
    
    if (size > maxSize) {
      return {
        isValid: false,
        error: `Image size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${maxSize / 1024 / 1024}MB)`
      }
    }
    
    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      error: `Image validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get image dimensions without full processing
 */
export async function getImageDimensions(input: Buffer | string): Promise<{ width: number; height: number }> {
  try {
    const sharp = await getSharp()
    const metadata = await sharp(input).metadata()
    return {
      width: metadata.width || 0,
      height: metadata.height || 0
    }
  } catch (error) {
    throw new Error(`Failed to get image dimensions: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Convert image to base64 with optimization
 */
export async function imageToBase64(
  input: Buffer | string,
  format: 'jpeg' | 'png' | 'webp' = 'webp'
): Promise<string> {
  try {
    const sharp = await getSharp()
    const buffer = await sharp(input)[format]().toBuffer()
    const base64 = buffer.toString('base64')
    const mimeType = `image/${format}`
    
    return `data:${mimeType};base64,${base64}`
  } catch (error) {
    throw new Error(`Failed to convert image to base64: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Create responsive image set
 */
export async function createResponsiveImages(
  input: Buffer | string,
  sizes: number[] = [320, 640, 960, 1280, 1920]
): Promise<{ [size: number]: Buffer }> {
  try {
    const sharp = await getSharp()
    const results: { [size: number]: Buffer } = {}
    
    for (const size of sizes) {
      const resized = await sharp(input)
        .resize(size, null, { withoutEnlargement: true })
        .webp(IMAGE_CONFIG.webp)
        .toBuffer()
      
      results[size] = resized
    }
    
    return results
  } catch (error) {
    throw new Error(`Failed to create responsive images: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Performance monitoring wrapper
 */
export function withPerformanceMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operationName: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = performance.now()
    const startMemory = process.memoryUsage()
    
    try {
      const result = await fn(...args)
      
      const endTime = performance.now()
      const endMemory = process.memoryUsage()
      
      const metrics: PerformanceMetrics = {
        startTime,
        endTime,
        processingTime: endTime - startTime,
        memoryUsage: endMemory.heapUsed - startMemory.heapUsed,
        compressionRatio: 0 // Will be calculated by calling function
      }
      
      // Log performance metrics
      console.log(`[PERFORMANCE] ${operationName}:`, {
        processingTime: `${metrics.processingTime.toFixed(2)}ms`,
        memoryUsage: `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        timestamp: new Date().toISOString()
      })
      
      return result
    } catch (error) {
      const endTime = performance.now()
      console.error(`[PERFORMANCE] ${operationName} failed after ${(endTime - startTime).toFixed(2)}ms:`, error)
      throw error
    }
  }
}

// Export performance monitoring wrapper
export const monitoredOptimizeImage = withPerformanceMonitoring(optimizeImage, 'Image Optimization')
export const monitoredBatchProcess = withPerformanceMonitoring(processBatchImages, 'Batch Image Processing')

// Export a simple function for basic image processing (used by API routes)
export async function processImage(input: Buffer | string): Promise<OptimizedImage> {
  return optimizeImage(input)
}
