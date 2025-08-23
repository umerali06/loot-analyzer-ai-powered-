'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import ImageUpload, { UploadedImage } from '@/components/ImageUpload'

interface AnalysisItem {
  id: string
  name: string
  category: string
  condition: string
  estimatedValue: {
    min: number
    max: number
    mean: number
    currency: string
  }
  confidence: number
  aiEstimate: {
    value: number
    confidence: number
    reasoning: string
  }
  marketData: {
    soldPrices: number[]
    activeListings: number
    lastUpdated: string
  }
}

interface AnalysisResult {
  id: string
  timestamp: string
  items: AnalysisItem[]
  summary: {
    totalItems: number
    totalValue: number
    currency: string
    confidence: number
    processingTime: number
  }
  status: string
  metadata: {
    totalImages: number
    totalItems: number
    successfulItems: number
    failedItems: number
    aiConfidence: number
  }
}

export default function AnalyzePage() {
  const { user, accessToken } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Load persistent data on component mount
    useEffect(() => {
    if (accessToken) {
      loadCachedAnalysisData()
    }
  }, [accessToken])

  // Load cached analysis data from localStorage and latest from database
  const loadCachedAnalysisData = async () => {
    // Check if user is authenticated
    if (!accessToken) {
      console.log('🔒 User not authenticated, skipping cache load')
      return
    }

    // Extract userId from token if user object is not available
    let userId = user?.id
    if (!userId && accessToken) {
      try {
        const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]))
        userId = tokenPayload.userId
        console.log('🔍 Using userId from token for loading data:', userId)
      } catch (e) {
        console.warn('Could not extract userId from token for loading data:', e)
        return
      }
    }

    if (!userId) {
      console.warn('No userId available for loading cached data')
      return
    }

    // Load analysis results from localStorage (browser cache)
    const savedResults = localStorage.getItem(`analysis_results_${userId}`)
    if (savedResults) {
      try {
        const parsed = JSON.parse(savedResults)
        // Ensure the data structure is consistent
        const validatedResults = validateAnalysisResult(parsed)
        setAnalysisResult(validatedResults)
        console.log('📱 Loaded cached analysis results from localStorage')
      } catch (e) {
        console.warn('Failed to parse saved analysis results:', e)
      }
    } else {
      // No cached results, try to load the latest from database
      await loadLatestAnalysisFromDatabase(userId)
    }

    // Load uploaded images from sessionStorage
    const savedImages = sessionStorage.getItem(`uploaded_images_${userId}`)
    if (savedImages) {
      try {
        const parsed = JSON.parse(savedImages)
        setUploadedImages(parsed)
        console.log('📱 Loaded cached uploaded images from sessionStorage')
      } catch (e) {
        console.warn('Failed to parse saved images:', e)
      }
    }

    // Debug: Log current token state
    console.log('🔐 Analyze page mounted with token:', {
      hasUser: !!user,
      hasToken: !!accessToken,
      tokenLength: accessToken?.length || 0,
      tokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'No token',
      extractedUserId: userId
    })
  }

  // Load latest analysis from database if no cache exists
  const loadLatestAnalysisFromDatabase = async (userId: string) => {
    try {
      console.log('🔍 No cached results found, fetching latest from database...')
      
      const response = await fetch('/api/analyses', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': userId
        }
      })

      if (!response.ok) {
        console.warn('Failed to fetch latest analysis from database:', response.statusText)
        return
      }

      const data = await response.json()
      
      if (data.success && data.data && data.data.analyses && data.data.analyses.length > 0) {
        const latestAnalysis = data.data.analyses[0] // Most recent analysis
        
        // Convert database format to frontend format
        const frontendResult = {
          id: latestAnalysis._id,
          timestamp: latestAnalysis.createdAt,
          items: latestAnalysis.items.map((item: any) => ({
            id: item._id,
            name: item.name,
            category: item.category,
            condition: item.condition,
            estimatedValue: item.estimatedValue,
            confidence: item.aiEstimate?.confidence || 0,
            aiEstimate: {
              reasoning: item.aiEstimate?.notes || 'Database analysis',
              factors: item.aiEstimate?.factors || [],
              value: item.estimatedValue?.mean || 0,
              confidence: item.aiEstimate?.confidence || 0
            },
            marketData: item.ebayData ? {
              activeListings: item.ebayData.similarItems || 0,
              soldPrices: [],
              trend: item.ebayData.marketTrend || 'stable'
            } : {
              activeListings: 0,
              soldPrices: [],
              trend: 'unknown'
            }
          })),
          summary: {
            totalValue: latestAnalysis.summary.totalValue,
            totalItems: latestAnalysis.summary.itemCount,
            confidence: latestAnalysis.items.reduce((sum: number, item: any) => 
              sum + (item.aiEstimate?.confidence || 0), 0) / Math.max(latestAnalysis.items.length, 1)
          },
          status: 'completed'
        }

        const validatedResults = validateAnalysisResult(frontendResult)
        setAnalysisResult(validatedResults)
        
        // Cache it for future visits
        localStorage.setItem(`analysis_results_${userId}`, JSON.stringify(validatedResults))
        console.log('✅ Loaded latest analysis from database and cached it')
      } else {
        console.log('ℹ️ No analysis history found in database')
      }
    } catch (error) {
      console.error('Failed to load latest analysis from database:', error)
    }
  }

  // Validate and ensure consistent data structure
  const validateAnalysisResult = (data: any): AnalysisResult => {
    console.log('🔍 Validating analysis result data:', data)
    
    const validated = {
      id: data.id || `analysis_${Date.now()}`,
      timestamp: data.timestamp || new Date().toISOString(),
      items: Array.isArray(data.items) ? data.items.map(validateAnalysisItem) : [],
      summary: {
        totalItems: data.summary?.totalItems || 0,
        totalValue: data.summary?.totalValue || 0,
        currency: data.summary?.currency || 'USD',
        confidence: data.summary?.confidence || 0,
        processingTime: data.summary?.processingTime || 0
      },
      status: data.status || 'completed',
      metadata: {
        totalImages: data.metadata?.totalImages || 0,
        totalItems: data.metadata?.totalItems || 0,
        successfulItems: data.metadata?.successfulItems || 0,
        failedItems: data.metadata?.failedItems || 0,
        aiConfidence: data.metadata?.aiConfidence || 0
      }
    }
    
    console.log('✅ Validation result:', validated)
    return validated
  }

  // Validate individual analysis item
  const validateAnalysisItem = (item: any): AnalysisItem => {
    console.log('Validating item:', item)
    
    // Ensure estimatedValue exists and has required properties
    const estimatedValue = item.estimatedValue || {}
    if (!estimatedValue.mean && estimatedValue.mean !== 0) {
      console.warn('Item missing estimatedValue.mean:', item.name)
    }
    
    return {
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: item.name || 'Unknown Item',
      category: item.category || 'Uncategorized',
      condition: item.condition || 'Unknown',
      estimatedValue: {
        min: typeof estimatedValue.min === 'number' ? estimatedValue.min : 0,
        max: typeof estimatedValue.max === 'number' ? estimatedValue.max : 0,
        mean: typeof estimatedValue.mean === 'number' ? estimatedValue.mean : 0,
        currency: estimatedValue.currency || 'USD'
      },
      confidence: typeof item.confidence === 'number' ? item.confidence : 0,
      aiEstimate: {
        value: item.aiEstimate?.value || 0,
        confidence: item.aiEstimate?.confidence || 0,
        reasoning: item.aiEstimate?.reasoning || 'No reasoning available'
      },
      marketData: {
        soldPrices: Array.isArray(item.marketData?.soldPrices) ? item.marketData.soldPrices : [],
        activeListings: item.marketData?.activeListings || 0,
        lastUpdated: item.marketData?.lastUpdated || new Date().toISOString()
      }
    }
  }

  // Save analysis results to localStorage
  const saveAnalysisResults = (results: AnalysisResult) => {
    console.log('💾 Saving analysis results:', results)
    
    // Extract userId from token if user object is not available
    let userId = user?.id
    if (!userId && accessToken) {
      try {
        const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]))
        userId = tokenPayload.userId
        console.log('🔍 Using userId from token for saving results:', userId)
      } catch (e) {
        console.warn('Could not extract userId from token for saving:', e)
      }
    }
    
    if (userId) {
      // Validate the results before saving
      const validatedResults = validateAnalysisResult(results)
      console.log('✅ Validated results:', validatedResults)
      
      localStorage.setItem(`analysis_results_${userId}`, JSON.stringify(validatedResults))
      console.log('💾 Results saved to localStorage')
      
      setAnalysisResult(validatedResults)
      console.log('🔄 State updated with results')
    } else {
      console.warn('⚠️ No user ID available, cannot save results')
    }
  }

  // Save uploaded images to sessionStorage
  const saveUploadedImages = (images: UploadedImage[]) => {
    // Extract userId from token if user object is not available
    let userId = user?.id
    if (!userId && accessToken) {
      try {
        const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]))
        userId = tokenPayload.userId
        console.log('🔍 Using userId from token for saving images:', userId)
      } catch (e) {
        console.warn('Could not extract userId from token for saving images:', e)
      }
    }
    
    if (userId) {
      sessionStorage.setItem(`uploaded_images_${userId}`, JSON.stringify(images))
      setUploadedImages(images)
    }
  }

  // Clear saved data with options
  const clearSavedData = async (clearDatabase = false) => {
    // Extract userId from token if user object is not available
    let userId = user?.id
    if (!userId && accessToken) {
      try {
        const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]))
        userId = tokenPayload.userId
        console.log('🔍 Using userId from token for clearing data:', userId)
      } catch (e) {
        console.warn('Could not extract userId from token for clearing data:', e)
      }
    }

    if (userId) {
      // Always clear browser cache (localStorage and sessionStorage)
      localStorage.removeItem(`analysis_results_${userId}`)
      sessionStorage.removeItem(`uploaded_images_${userId}`)
      setAnalysisResult(null)
      setUploadedImages([])
      console.log('🗑️ Cleared browser cache (localStorage + sessionStorage)')

      // Clear database if requested
      if (clearDatabase) {
        try {
          const response = await fetch('/api/analyses', {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'x-user-id': userId,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            console.log('🗑️ Cleared database history')
            setError(null)
          } else {
            console.warn('Failed to clear database:', response.statusText)
            setError('Failed to clear database history')
          }
        } catch (error) {
          console.error('Error clearing database:', error)
          setError('Error clearing database history')
        }
      } else {
        console.log('💾 Database history preserved for dashboard/history pages')
      }
    }
  }

  // Export analysis results
  const exportResults = () => {
    if (!analysisResult) return
    
    const dataStr = JSON.stringify(analysisResult, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analysis_results_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // File input reference
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newImages: UploadedImage[] = Array.from(files).map((file, index) => ({
        id: `upload_${Date.now()}_${index}`,
        file,
        preview: URL.createObjectURL(file),
        thumbnail: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type,
        base64Data: '',
        status: 'uploading' as const,
        progress: 0
      }))
      setUploadedImages(newImages)
    }
  }

  // Remove image
  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index)
    setUploadedImages(newImages)
  }

  // Clear all data
  const clearData = () => {
    setUploadedImages([])
    setAnalysisResult(null)
    setError(null)
    setProgress(0)
    setCurrentStep('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Start analysis
  const startAnalysis = async () => {
    if (uploadedImages.length === 0) {
      setError('Please upload at least one image')
      return
    }

    setIsAnalyzing(true)
    setProgress(0)
    setCurrentStep('Preparing images...')
    setError(null)

    try {
      // Convert images to base64
      const processedImages = await Promise.all(
        uploadedImages.map(async (image) => {
          const base64Data = await convertFileToBase64(image.file)
          return {
            ...image,
            base64Data
          }
        })
      )

      setCurrentStep('Starting AI analysis...')
      setProgress(20)

      // Start real analysis
      await startRealAnalysis(processedImages)

    } catch (error: any) {
      console.error('Analysis failed:', error)
      setError(error.message || 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
      setProgress(0)
      setCurrentStep('')
    }
  }

  // Convert file to base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleImagesProcessed = async (images: UploadedImage[]) => {
    setUploadedImages(prev => [...prev, ...images])
    setError(null)
    
    // Start real analysis immediately
    await startRealAnalysis(images)
  }

  // Start real analysis with backend API
  const startRealAnalysis = async (images: UploadedImage[]) => {
    if (!accessToken) {
      setError('Authentication required. Please log in again.')
      return
    }

    // Check if token is about to expire and refresh if needed
    try {
      const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      const tokenExpiry = tokenPayload.exp
      const timeUntilExpiry = tokenExpiry - currentTime
      
      // If token expires in less than 5 minutes, warn user
      if (timeUntilExpiry < 300) { // 5 minutes = 300 seconds
        console.log('⚠️ Token expires soon, consider refreshing session')
      }
    } catch (e) {
      console.warn('Could not check token expiry, proceeding with current token:', e)
    }

    // Extract userId from token if user object is not available
    let userId = user?.id
    if (!userId && accessToken) {
      try {
        const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]))
        userId = tokenPayload.userId
        console.log('🔍 Using userId from token payload:', userId)
      } catch (e) {
        setError('Could not extract user ID from token. Please log in again.')
        return
      }
    }

    if (!userId) {
      setError('User ID not available. Please log in again.')
      return
    }

    setIsAnalyzing(true)
    setCurrentStep('Initializing analysis...')
    setProgress(5)
    
    let aiProgressInterval: NodeJS.Timeout | null = null
    let progressStage = 'vision' // 'vision', 'ebay', 'processing', 'complete'
    
    try {
      // Step 1: Image Processing
      setCurrentStep('Processing image data...')
      setProgress(10)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Step 2: AI Recognition (This is where most time is spent)
      setCurrentStep('AI Vision analyzing image - this may take 1-2 minutes...')
      setProgress(15)
      
      // Show smooth incremental progress during AI analysis
      let aiProgress = 15
      let analysisStartTime = Date.now() // Track how long analysis takes
      
      aiProgressInterval = setInterval(() => {
        const elapsed = Date.now() - analysisStartTime
        
        // Acceleration factor based on elapsed time (speeds up if taking too long)
        let speedMultiplier = 1.0
        if (elapsed > 30000) speedMultiplier = 1.5 // 30s+ = 50% faster
        if (elapsed > 60000) speedMultiplier = 2.0 // 60s+ = 100% faster
        
        // Dynamic progression without artificial limits
        if (progressStage === 'vision') {
          // AI Vision stage: slow but steady progress
          const baseIncrement = 1.0 + (Math.random() * 0.5) // 1.0-1.5%
          aiProgress += baseIncrement * speedMultiplier
          setProgress(Math.floor(aiProgress))
          if (aiProgress <= 25) setCurrentStep('AI reading image content...')
          else if (aiProgress <= 35) setCurrentStep('AI identifying individual items...')
          else if (aiProgress <= 45) setCurrentStep('AI analyzing item details...')
          else if (aiProgress <= 55) setCurrentStep('AI extracting product information...')
          else setCurrentStep('AI processing image data...')
        } else if (progressStage === 'ebay') {
          // eBay analysis stage: moderate progress
          const baseIncrement = 1.5 + (Math.random() * 0.8) // 1.5-2.3%
          aiProgress += baseIncrement * speedMultiplier
          setProgress(Math.floor(aiProgress))
          if (aiProgress <= 65) setCurrentStep('Searching eBay marketplace...')
          else if (aiProgress <= 75) setCurrentStep('Analyzing market prices...')
          else if (aiProgress <= 85) setCurrentStep('Calculating valuations...')
          else setCurrentStep('Processing market data...')
        } else if (progressStage === 'processing') {
          // Final processing: faster progress  
          const baseIncrement = 2.0 + (Math.random() * 1.0) // 2.0-3.0%
          aiProgress += baseIncrement * speedMultiplier
          setProgress(Math.floor(aiProgress))
          setCurrentStep('Finalizing analysis results...')
        }
        
        // Only cap at absolute maximum to prevent overflow
        if (aiProgress >= 98) {
          aiProgress = 97 + (Math.random() * 0.5) // Stay just under 98%
        }
      }, 1000) // Update every 1 second for smoother feel
      
      // The actual API call happens here - this will take 30-90 seconds
      
      // Debug: Log the token being sent
      console.log('🔐 Frontend sending token:', {
        hasToken: !!accessToken,
        tokenLength: accessToken?.length || 0,
        tokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'No token',
        userId: userId
      })

      // Continue progressing while API call is being made
      // Don't change stage yet - let it continue vision progress
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': userId || ''
        },
        body: JSON.stringify({
          images: images.map(img => ({
            url: img.preview, // Keep for compatibility
            base64Data: img.base64Data, // Add base64 data for OpenAI
            name: img.file.name,
            size: img.file.size,
            type: img.file.type
          }))
        })
      })

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`)
      }

      // Switch to eBay analysis stage when we get a response
      if (progressStage === 'vision') {
        progressStage = 'ebay'
        setCurrentStep('API responded - processing items...')
        // Ensure we're at least at 50% when switching to eBay stage
        if (aiProgress < 50) {
          aiProgress = 50
          setProgress(50)
        }
      }
      
      const result = await response.json()
      
      console.log('🔍 Raw API response:', result)
      console.log('🔍 Response success:', result.success)
      console.log('🔍 Response data:', result.data)
      
      if (result.success) {
        // Switch to final processing stage
        progressStage = 'processing'
        // Ensure we're at least at 80% when switching to processing
        if (aiProgress < 80) {
          aiProgress = 80
          setProgress(80)
        }
        setCurrentStep('Organizing analysis results...')
        console.log('✅ Analysis successful, processing data...')
        console.log('📊 Data structure:', {
          hasItems: !!result.data?.items,
          itemsLength: result.data?.items?.length,
          hasSummary: !!result.data?.summary,
          summaryData: result.data?.summary
        })
        
        setCurrentStep('Saving results...')
        setProgress(95)
        
        saveAnalysisResults(result.data) // Save results
        
        // Stop the progress interval and complete
        if (aiProgressInterval) clearInterval(aiProgressInterval)
        progressStage = 'complete'
        
        setCurrentStep('Analysis complete!')
        setProgress(100)
        
        // Update image status
        const updatedImages = uploadedImages.map(img => ({ ...img, status: 'completed' as const }))
        saveUploadedImages(updatedImages)
      } else {
        throw new Error(result.error || 'Analysis failed')
      }
      
    } catch (error) {
      console.error('Analysis error:', error)
      if (aiProgressInterval) clearInterval(aiProgressInterval) // Clean up progress interval
      setError(error instanceof Error ? error.message : 'Analysis failed')
      setCurrentStep('Analysis failed')
      setProgress(0)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: return '📸'
      case 2: return '🧠'
      case 3: return '🔍'
      case 4: return '📈'
      case 5: return '📊'
      case 6: return '✅'
      default: return '⬆️'
    }
  }

  const getStepColor = (step: number) => {
    if (step <= (analysisResult?.metadata?.totalItems || 0) || step <= (analysisResult?.metadata?.totalItems || 0)) return 'bg-slate-900 text-white'
    return 'bg-slate-100 text-slate-400'
  }

  const getStepName = (step: number) => {
    switch (step) {
      case 1: return 'Image Processing'
      case 2: return 'AI Recognition'
      case 3: return 'Market Research'
      case 4: return 'Profit Analysis'
      case 5: return 'Generating Report'
      case 6: return 'Analysis Complete'
      default: return 'Ready to Start'
    }
  }

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 bg-slate-200 rounded-2xl animate-pulse mx-auto mb-4"></div>
          <div className="h-8 w-32 bg-slate-200 rounded animate-pulse mx-auto"></div>
        </div>
      </div>
    )
  }

  // Remove debug panel and test API button
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">AI-Powered Image Analysis</h1>
          <p className="text-slate-600 text-lg">
            Upload images to get instant AI analysis, market insights, and valuation estimates
          </p>
        </div>

        {/* File Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">Upload Images</h2>
          
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*"
              className="hidden"
            />
            
            <div className="space-y-4">
              <div className="text-6xl">📸</div>
              <div>
                <p className="text-lg text-slate-600 mb-2">
                  Drag and drop images here, or click to browse
                </p>
                <p className="text-sm text-slate-500">
                  Supports JPG, PNG, GIF up to 10MB each
                </p>
              </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors duration-200 font-medium"
              >
                Choose Images
              </button>
            </div>
          </div>

          {/* Uploaded Images Preview */}
          {uploadedImages.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">
                Selected Images ({uploadedImages.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.preview}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 flex gap-3">
                <button
                  onClick={startAnalysis}
                  disabled={isAnalyzing}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors duration-200 font-medium flex items-center space-x-2"
                >
                  {isAnalyzing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span>Start Analysis</span>
                    </>
                  )}
                </button>
                
                {/* Clear Data Options */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => clearSavedData(false)}
                    className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors duration-200 text-sm"
                    title="Clear browser cache only. Dashboard/history will still show data."
                  >
                    🗑️ Clear Session
                  </button>
                  <button
                    onClick={() => clearSavedData(true)}
                    className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 text-sm"
                    title="Clear ALL data including database. This will remove data from dashboard and history."
                  >
                    🗑️ Clear All Data
                  </button>
                </div>

                {/* Export Results Button */}
                {analysisResult && (
                  <button
                    onClick={exportResults}
                    className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 text-sm"
                  >
                    📊 Export Results
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Analysis Progress */}
        {isAnalyzing && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Analysis Progress</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Processing images...</span>
                <span className="text-slate-500">{progress}%</span>
              </div>
              
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              
              <p className="text-sm text-slate-500">{currentStep}</p>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && analysisResult.summary && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-slate-800">Analysis Results</h2>
              <div className="flex gap-2">
                {/* Export Results Button */}
                {analysisResult && (
                  <button
                    onClick={exportResults}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 text-sm"
                  >
                    📊 Export Results
                  </button>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-800">
                  ${analysisResult.summary.totalValue?.toFixed(2) || '0.00'}
                </div>
                <div className="text-sm text-blue-600">Total Value</div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-800">
                  {analysisResult.items?.length || 0}
                </div>
                <div className="text-sm text-green-600">Items Found</div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-800">
                  {((analysisResult.summary.confidence || 0) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-purple-600">AI Confidence</div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                <div className="text-2xl font-bold text-orange-800">
                  {analysisResult.summary.processingTime || 0}ms
                </div>
                <div className="text-sm text-orange-600">Processing Time</div>
              </div>
            </div>

            {/* Items List */}
            {analysisResult.items && analysisResult.items.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-slate-800">Identified Items</h3>
                
                {analysisResult.items.map((item, index) => (
                  <div key={item.id || index} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-slate-800 mb-2">{item.name}</h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Category:</span>
                            <span className="ml-2 text-slate-700">{item.category}</span>
                          </div>
                          
                          <div>
                            <span className="text-slate-500">Condition:</span>
                            <span className="ml-2 text-slate-700">{item.condition}</span>
                          </div>
                          
                          <div>
                            <span className="text-slate-500">Confidence:</span>
                            <span className="ml-2 text-slate-700">
                              {((item.confidence || 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-slate-500">Estimated Value:</span>
                            <span className="ml-2 text-slate-700 font-semibold">
                              ${item.estimatedValue?.mean?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </div>
                        
                        {item.aiEstimate && (
                          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                            <div className="text-sm text-slate-600 mb-1">
                              <strong>AI Analysis:</strong> {item.aiEstimate.reasoning}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center space-x-2">
              <span className="text-red-500 text-xl">⚠️</span>
              <div>
                <h3 className="text-red-800 font-semibold">Analysis Error</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}