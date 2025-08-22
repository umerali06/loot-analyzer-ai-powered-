import { NextRequest } from 'next/server'
import { POST } from '@/app/api/upload/route'
import { createMockFile } from '@/__tests__/utils/test-utils'

// Mock the authentication middleware
const mockWithAuth = jest.fn()
jest.mock('@/lib/auth-middleware-simple', () => ({
  withAuth: mockWithAuth,
}))

// Mock the image processing utilities
const mockProcessImage = jest.fn()
jest.mock('@/lib/image-utils', () => ({
  processImage: mockProcessImage,
}))

// Mock the API utilities
const mockCreateSuccessResponse = jest.fn()
const mockCreateErrorResponse = jest.fn()
const mockAddPerformanceHeaders = jest.fn()

jest.mock('@/lib/api-utils-enhanced', () => ({
  createSuccessResponse: mockCreateSuccessResponse,
  createErrorResponse: mockCreateErrorResponse,
  addPerformanceHeaders: mockAddPerformanceHeaders,
}))

describe('POST /api/upload', () => {
  const mockFile = createMockFile()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock implementations
    mockWithAuth.mockImplementation((handler) => handler)
    mockCreateSuccessResponse.mockImplementation((data) => 
      new Response(JSON.stringify(data), { status: 200 })
    )
    mockCreateErrorResponse.mockImplementation((message, status) => 
      new Response(JSON.stringify({ success: false, message }), { status })
    )
    mockAddPerformanceHeaders.mockImplementation((response) => response)
  })

  it('returns 401 when user is not authenticated', async () => {
    mockWithAuth.mockImplementation(() => {
      throw new Error('Unauthorized')
    })

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.message).toContain('unauthorized')
  })

  it('returns 400 for missing files', async () => {
    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.message).toContain('no files provided')
  })

  it('returns 400 for empty files array', async () => {
    const formData = new FormData()
    formData.append('files', '')

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.message).toContain('no files provided')
  })

  it('returns 400 for invalid file types', async () => {
    const invalidFile = createMockFile({ 
      name: 'test.txt', 
      type: 'text/plain' 
    })
    
    const formData = new FormData()
    formData.append('files', invalidFile)

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.message).toContain('invalid file type')
  })

  it('returns 400 for files that are too large', async () => {
    const largeFile = createMockFile({ 
      name: 'large-image.jpg', 
      size: 25 * 1024 * 1024 // 25MB
    })
    
    const formData = new FormData()
    formData.append('files', largeFile)

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.message).toContain('file too large')
  })

  it('processes valid image files successfully', async () => {
    const mockProcessedImage = {
      id: 'img-123',
      filename: 'test-image.jpg',
      size: 1024 * 1024,
      type: 'image/jpeg',
      url: 'https://example.com/test-image.jpg',
      optimizedSize: 512 * 1024,
      format: 'webp',
      dimensions: { width: 800, height: 600 },
    }

    mockProcessImage.mockResolvedValue(mockProcessedImage)

    const formData = new FormData()
    formData.append('files', mockFile)

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.images).toHaveLength(1)
    expect(data.images[0]).toEqual(mockProcessedImage)
    expect(data.totalProcessed).toBe(1)

    expect(mockProcessImage).toHaveBeenCalledWith(mockFile)
    expect(mockAddPerformanceHeaders).toHaveBeenCalled()
  })

  it('processes multiple image files successfully', async () => {
    const mockFile2 = createMockFile({ name: 'test2.png', type: 'image/png' })
    
    const mockProcessedImage1 = {
      id: 'img-123',
      filename: 'test-image.jpg',
      size: 1024 * 1024,
      type: 'image/jpeg',
      url: 'https://example.com/test-image.jpg',
      optimizedSize: 512 * 1024,
      format: 'webp',
      dimensions: { width: 800, height: 600 },
    }

    const mockProcessedImage2 = {
      id: 'img-124',
      filename: 'test2.png',
      size: 2048 * 1024,
      type: 'image/png',
      url: 'https://example.com/test2.png',
      optimizedSize: 1024 * 1024,
      format: 'webp',
      dimensions: { width: 1200, height: 800 },
    }

    mockProcessImage
      .mockResolvedValueOnce(mockProcessedImage1)
      .mockResolvedValueOnce(mockProcessedImage2)

    const formData = new FormData()
    formData.append('files', mockFile)
    formData.append('files', mockFile2)

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.images).toHaveLength(2)
    expect(data.totalProcessed).toBe(2)

    expect(mockProcessImage).toHaveBeenCalledTimes(2)
    expect(mockProcessImage).toHaveBeenCalledWith(mockFile)
    expect(mockProcessImage).toHaveBeenCalledWith(mockFile2)
  })

  it('handles image processing errors gracefully', async () => {
    mockProcessImage.mockRejectedValue(new Error('Image processing failed'))

    const formData = new FormData()
    formData.append('files', mockFile)

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.message).toContain('failed to process image')
  })

  it('handles partial processing failures', async () => {
    const mockFile2 = createMockFile({ name: 'test2.png', type: 'image/png' })
    
    const mockProcessedImage1 = {
      id: 'img-123',
      filename: 'test-image.jpg',
      size: 1024 * 1024,
      type: 'image/jpeg',
      url: 'https://example.com/test-image.jpg',
      optimizedSize: 512 * 1024,
      format: 'webp',
      dimensions: { width: 800, height: 600 },
    }

    mockProcessImage
      .mockResolvedValueOnce(mockProcessedImage1)
      .mockRejectedValueOnce(new Error('Processing failed for second image'))

    const formData = new FormData()
    formData.append('files', mockFile)
    formData.append('files', mockFile2)

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(207) // Multi-status
    expect(data.success).toBe(true)
    expect(data.images).toHaveLength(1)
    expect(data.failed).toHaveLength(1)
    expect(data.totalProcessed).toBe(1)
    expect(data.totalFailed).toBe(1)
  })

  it('validates file size limits correctly', async () => {
    const maxFileSize = 20 * 1024 * 1024 // 20MB
    
    const validFile = createMockFile({ 
      name: 'valid-image.jpg', 
      size: maxFileSize 
    })
    
    const formData = new FormData()
    formData.append('files', validFile)

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    // Should not return an error for files at the size limit
    expect(response.status).not.toBe(400)
  })

  it('accepts various valid image formats', async () => {
    const validFormats = [
      { name: 'test.jpg', type: 'image/jpeg' },
      { name: 'test.png', type: 'image/png' },
      { name: 'test.webp', type: 'image/webp' },
      { name: 'test.gif', type: 'image/gif' },
      { name: 'test.bmp', type: 'image/bmp' },
    ]

    for (const format of validFormats) {
      const validFile = createMockFile(format)
      const formData = new FormData()
      formData.append('files', validFile)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)

      // Should not return an error for valid image formats
      expect(response.status).not.toBe(400)
    }
  })

  it('rejects non-image file types', async () => {
    const invalidTypes = [
      { name: 'test.txt', type: 'text/plain' },
      { name: 'test.pdf', type: 'application/pdf' },
      { name: 'test.doc', type: 'application/msword' },
      { name: 'test.zip', type: 'application/zip' },
    ]

    for (const fileType of invalidTypes) {
      const invalidFile = createMockFile(fileType)
      const formData = new FormData()
      formData.append('files', invalidFile)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toContain('invalid file type')
    }
  })

  it('handles malformed form data', async () => {
    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: 'invalid-form-data',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.message).toContain('invalid form data')
  })

  it('sets appropriate CORS headers', async () => {
    const mockProcessedImage = {
      id: 'img-123',
      filename: 'test-image.jpg',
      size: 1024 * 1024,
      type: 'image/jpeg',
      url: 'https://example.com/test-image.jpg',
      optimizedSize: 512 * 1024,
      format: 'webp',
      dimensions: { width: 800, height: 600 },
    }

    mockProcessImage.mockResolvedValue(mockProcessedImage)

    const formData = new FormData()
    formData.append('files', mockFile)

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
  })

  it('includes timestamp in successful response', async () => {
    const mockProcessedImage = {
      id: 'img-123',
      filename: 'test-image.jpg',
      size: 1024 * 1024,
      type: 'image/jpeg',
      url: 'https://example.com/test-image.jpg',
      optimizedSize: 512 * 1024,
      format: 'webp',
      dimensions: { width: 800, height: 600 },
    }

    mockProcessImage.mockResolvedValue(mockProcessedImage)

    const formData = new FormData()
    formData.append('files', mockFile)

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.timestamp).toBeDefined()
    expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0)
  })

  it('handles files with special characters in names', async () => {
    const specialNameFile = createMockFile({ 
      name: 'test-image-&_special@chars.jpg',
      type: 'image/jpeg'
    })
    
    const mockProcessedImage = {
      id: 'img-123',
      filename: 'test-image-&_special@chars.jpg',
      size: 1024 * 1024,
      type: 'image/jpeg',
      url: 'https://example.com/test-image-&_special@chars.jpg',
      optimizedSize: 512 * 1024,
      format: 'webp',
      dimensions: { width: 800, height: 600 },
    }

    mockProcessImage.mockResolvedValue(mockProcessedImage)

    const formData = new FormData()
    formData.append('files', specialNameFile)

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.images[0].filename).toBe('test-image-&_special@chars.jpg')
  })
})
