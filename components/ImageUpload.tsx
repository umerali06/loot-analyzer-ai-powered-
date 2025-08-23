'use client'

import React, { useState, useCallback, useRef, DragEvent } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { processBatchFiles } from '../lib/image-utils-client'

export interface UploadedImage {
  id: string
  file: File
  preview: string
  thumbnail: string
  base64Data: string // Add base64 data for API calls
  status: 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
}

interface ImageUploadProps {
  onImagesProcessed: (images: UploadedImage[]) => void
  maxFiles?: number
  maxFileSize?: number
  acceptedFormats?: string[]
}

export default function ImageUpload({
  onImagesProcessed,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']
}: ImageUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxFileSize) {
      return {
        isValid: false,
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxFileSize / 1024 / 1024).toFixed(0)}MB)`
      }
    }

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const isValidType = acceptedFormats.some(format => {
      const formatExt = format.replace('image/', '')
      return fileExtension === formatExt || file.type === format
    })

    if (!isValidType) {
      return {
        isValid: false,
        error: `File type not supported. Supported types: ${acceptedFormats.join(', ')}`
      }
    }

    return { isValid: true }
  }, [maxFileSize, acceptedFormats])

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    // Filter and validate files
    const validFiles: File[] = []
    const invalidFiles: { file: File; error: string }[] = []

    files.forEach(file => {
      const validation = validateFile(file)
      if (validation.isValid) {
        validFiles.push(file)
      } else {
        invalidFiles.push({ file, error: validation.error! })
      }
    })

    if (validFiles.length === 0) {
      console.warn('No valid files to process')
      return
    }

    // Check max files limit
    if (uploadedImages.length + validFiles.length > maxFiles) {
      console.warn(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Create initial image objects
    const newImages: UploadedImage[] = validFiles.map((file, index) => ({
      id: `img-${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      thumbnail: '',
      base64Data: '', // Initialize base64Data
      status: 'uploading',
      progress: 0
    }))

    setUploadedImages(prev => [...prev, ...newImages])
    setIsProcessing(true)

    try {
      // Process images with client-side utilities
      const processedResults = await processBatchFiles(
        validFiles,
        (completed, total) => {
          setOverallProgress((completed / total) * 100)
        }
      )

      // Update images with processed results
      const updatedImages = newImages.map((img, index) => {
        const result = processedResults[index]
        if (result) {
          return {
            ...img,
            thumbnail: result.thumbnail,
            base64Data: result.base64Data, // Assign base64Data
            status: 'completed' as const,
            progress: 100
          }
        }
        return {
          ...img,
          status: 'error' as const,
          error: 'Processing failed'
        }
      })

      setUploadedImages(prev => 
        prev.map(img => {
          const updated = updatedImages.find(u => u.id === img.id)
          return updated || img
        })
      )

      // Call the callback with all completed images
      const completedImages = updatedImages.filter(img => img.status === 'completed')
      if (completedImages.length > 0) {
        onImagesProcessed(completedImages)
      }

    } catch (error) {
      console.error('Error processing images:', error)
      
      // Mark all images as failed
      setUploadedImages(prev => 
        prev.map(img => 
          newImages.some(n => n.id === img.id) 
            ? { ...img, status: 'error' as const, error: 'Processing failed' }
            : img
        )
      )
    } finally {
      setIsProcessing(false)
      setOverallProgress(0)
    }
  }, [onImagesProcessed, uploadedImages.length, maxFiles, validateFile])

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFiles(files)
    }
  }, [processFiles])

  // Click to browse files
  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      processFiles(files)
    }
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }, [processFiles])

  const removeImage = useCallback((id: string) => {
    setUploadedImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) {
        URL.revokeObjectURL(img.preview)
      }
      return prev.filter(i => i.id !== id)
    })
  }, [])

  const clearAllImages = useCallback(() => {
    uploadedImages.forEach(img => {
      URL.revokeObjectURL(img.preview)
    })
    setUploadedImages([])
  }, [uploadedImages])

  return (
    <div className="space-y-6">
      {/* Custom Dropzone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <Upload className="h-12 w-12 text-gray-400" />
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragActive ? 'Drop images here' : 'Drag & drop images here'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse files
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports: {acceptedFormats.join(', ')} • Max: {maxFiles} files • Size: {(maxFileSize / 1024 / 1024).toFixed(0)}MB
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Processing images...</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Uploaded Images */}
      {uploadedImages.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Uploaded Images ({uploadedImages.length})
            </h3>
            <button
              onClick={clearAllImages}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear All
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedImages.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={image.preview}
                    alt={image.file.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Status Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {image.status === 'completed' && (
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    )}
                    {image.status === 'error' && (
                      <AlertCircle className="h-8 w-8 text-red-400" />
                    )}
                    {image.status === 'uploading' && (
                      <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                    )}
                  </div>
                </div>
                
                {/* Remove Button */}
                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
                
                {/* File Info */}
                <div className="mt-2 text-xs text-gray-600">
                  <p className="font-medium truncate">{image.file.name}</p>
                  <p>{(image.file.size / 1024 / 1024).toFixed(2)} MB</p>
                  {image.error && (
                    <p className="text-red-500">{image.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
