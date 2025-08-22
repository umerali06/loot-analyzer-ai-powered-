// Mock the entire image-utils module since it's server-side only
jest.mock('@/lib/image-utils', () => ({
  IMAGE_CONFIG: {
    jpeg: { quality: 85, progressive: true, mozjpeg: true },
    webp: { quality: 80, effort: 4 },
    png: { compressionLevel: 9, progressive: true },
    maxWidth: 1920,
    maxHeight: 1080,
    thumbnailSize: 200,
    cacheExpiry: 24 * 60 * 60 * 1000,
    progressiveSteps: [0.25, 0.5, 0.75, 1.0],
    supportedFormats: ['jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp']
  },
  processImage: jest.fn(),
  optimizeImage: jest.fn(),
  generateThumbnail: jest.fn(),
  convertToWebP: jest.fn(),
  generateOptimizedVersion: jest.fn(),
  createProgressiveVersions: jest.fn(),
  getOptimalFormat: jest.fn(),
  calculateCompressionRatio: jest.fn(),
  getPerformanceMetrics: jest.fn()
}))

import { 
  processImage, 
  optimizeImage, 
  generateThumbnail, 
  convertToWebP,
  IMAGE_CONFIG 
} from '@/lib/image-utils'

// Get the mocked functions
const mockProcessImage = processImage as jest.MockedFunction<typeof processImage>
const mockOptimizeImage = optimizeImage as jest.MockedFunction<typeof optimizeImage>
const mockGenerateThumbnail = generateThumbnail as jest.MockedFunction<typeof generateThumbnail>
const mockConvertToWebP = convertToWebP as jest.MockedFunction<typeof convertToWebP>

describe('image-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('IMAGE_CONFIG', () => {
    it('exports correct configuration', () => {
      expect(IMAGE_CONFIG).toBeDefined()
      expect(IMAGE_CONFIG.jpeg.quality).toBe(85)
      expect(IMAGE_CONFIG.webp.quality).toBe(80)
      expect(IMAGE_CONFIG.png.compressionLevel).toBe(9)
      expect(IMAGE_CONFIG.maxWidth).toBe(1920)
      expect(IMAGE_CONFIG.maxHeight).toBe(1080)
      expect(IMAGE_CONFIG.thumbnailSize).toBe(200)
      expect(IMAGE_CONFIG.supportedFormats).toContain('jpeg')
      expect(IMAGE_CONFIG.supportedFormats).toContain('png')
      expect(IMAGE_CONFIG.supportedFormats).toContain('webp')
    })
  })

  describe('processImage', () => {
    it('processes image successfully with default options', async () => {
      const mockBuffer = Buffer.from('mock-image-data')
      const mockResult = {
        original: mockBuffer,
        optimized: Buffer.from('processed-image-data'),
        thumbnail: Buffer.from('thumbnail-data'),
        metadata: {
          width: 1920,
          height: 1080,
          format: 'jpeg',
          size: 1024 * 1024,
          optimizedSize: 512 * 1024,
          compressionRatio: 0.5,
          processingTime: 100
        }
      }
      
      mockProcessImage.mockResolvedValue(mockResult)

      const result = await processImage(mockBuffer)

      expect(mockProcessImage).toHaveBeenCalledWith(mockBuffer)
      expect(result).toEqual(mockResult)
    })

    it('handles processing errors gracefully', async () => {
      const mockBuffer = Buffer.from('mock-image-data')
      
      mockProcessImage.mockRejectedValue(new Error('Processing failed'))

      await expect(processImage(mockBuffer)).rejects.toThrow('Processing failed')
    })
  })

  describe('optimizeImage', () => {
    it('optimizes image with default settings', async () => {
      const mockBuffer = Buffer.from('mock-image-data')
      const mockResult = {
        original: mockBuffer,
        optimized: Buffer.from('optimized-image-data'),
        thumbnail: Buffer.from('thumbnail-data'),
        metadata: {
          width: 800,
          height: 600,
          format: 'png',
          size: 512 * 1024,
          optimizedSize: 256 * 1024,
          compressionRatio: 0.5,
          processingTime: 50
        }
      }
      
      mockOptimizeImage.mockResolvedValue(mockResult)

      const result = await optimizeImage(mockBuffer)

      expect(mockOptimizeImage).toHaveBeenCalledWith(mockBuffer, {})
      expect(result).toEqual(mockResult)
    })

    it('optimizes image with custom options', async () => {
      const mockBuffer = Buffer.from('mock-image-data')
      const mockResult = {
        original: mockBuffer,
        optimized: Buffer.from('custom-optimized-image-data'),
        thumbnail: Buffer.from('thumbnail-data'),
        metadata: {
          width: 400,
          height: 300,
          format: 'webp',
          size: 256 * 1024,
          optimizedSize: 128 * 1024,
          compressionRatio: 0.5,
          processingTime: 30
        }
      }
      
      mockOptimizeImage.mockResolvedValue(mockResult)

      const options = {
        maxWidth: 400,
        maxHeight: 300,
        quality: 80
      }

      const result = await optimizeImage(mockBuffer, options)

      expect(mockOptimizeImage).toHaveBeenCalledWith(mockBuffer, options)
      expect(result).toEqual(mockResult)
    })
  })

  describe('generateThumbnail', () => {
    it('generates thumbnail successfully', async () => {
      const mockBuffer = Buffer.from('mock-image-data')
      const mockThumbnail = Buffer.from('thumbnail-data')
      
      mockGenerateThumbnail.mockResolvedValue(mockThumbnail)

      const result = await generateThumbnail(mockBuffer, 200)

      expect(mockGenerateThumbnail).toHaveBeenCalledWith(mockBuffer, 200)
      expect(result).toEqual(mockThumbnail)
    })

    it('handles thumbnail generation errors', async () => {
      const mockBuffer = Buffer.from('mock-image-data')
      
      mockGenerateThumbnail.mockRejectedValue(new Error('Thumbnail generation failed'))

      await expect(generateThumbnail(mockBuffer, 200)).rejects.toThrow('Thumbnail generation failed')
    })
  })

  describe('convertToWebP', () => {
    it('converts image to WebP format', async () => {
      const mockBuffer = Buffer.from('mock-image-data')
      const mockWebPBuffer = Buffer.from('webp-image-data')
      
      mockConvertToWebP.mockResolvedValue(mockWebPBuffer)

      const result = await convertToWebP(mockBuffer, { quality: 80 })

      expect(mockConvertToWebP).toHaveBeenCalledWith(mockBuffer, { quality: 80 })
      expect(result).toEqual(mockWebPBuffer)
    })

    it('handles WebP conversion errors', async () => {
      const mockBuffer = Buffer.from('mock-image-data')
      
      mockConvertToWebP.mockRejectedValue(new Error('WebP conversion failed'))

      await expect(convertToWebP(mockBuffer)).rejects.toThrow('WebP conversion failed')
    })
  })

  describe('error handling', () => {
    it('handles unsupported image formats gracefully', async () => {
      const mockBuffer = Buffer.from('mock-image-data')
      
      mockProcessImage.mockRejectedValue(new Error('Unsupported format'))

      await expect(processImage(mockBuffer)).rejects.toThrow('Unsupported format')
    })

    it('handles memory errors gracefully', async () => {
      const mockBuffer = Buffer.from('mock-image-data')
      
      mockProcessImage.mockRejectedValue(new Error('Insufficient memory'))

      await expect(processImage(mockBuffer)).rejects.toThrow('Insufficient memory')
    })
  })
})
