'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  TrendingUp, 
  Eye,
  ExternalLink,
  RefreshCw
} from 'lucide-react'

interface AnalysisItem {
  name: string
  description: string
  category: string
  estimatedValue: {
    min: number
    max: number
    currency: string
  }
  condition: string
  rarity: string
  confidence: number
  tags: string[]
  searchKeywords: string[]
  marketData?: {
    averagePrice: number
    priceRange: { min: number; max: number }
    recentSales: any[]
    activeListings: any[]
    marketTrend: 'rising' | 'falling' | 'stable'
    demandLevel: 'low' | 'medium' | 'high'
  }
  recommendations?: {
    suggestedPlatforms: string[]
    optimalPrice: number
    sellingTips: string[]
  }
}

interface AnalysisResult {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  items: AnalysisItem[]
  summary: {
    totalItems: number
    totalValueMin: number
    totalValueMax: number
    currency: string
    confidence: number
    processingTime: number
  }
  processingStats?: {
    aiAnalysisCompleted: boolean
    enhancementCompleted: boolean
    marketResearchCompleted: boolean
    totalProcessingTime: number
  }
}

interface RealTimeAnalysisProps {
  images: Array<{ id: string; preview: string; file: File }>
  onComplete?: (result: AnalysisResult) => void
  onError?: (error: string) => void
}

export default function RealTimeAnalysis({ images, onComplete, onError }: RealTimeAnalysisProps) {
  const { accessToken } = useAuth()
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [error, setError] = useState<string | null>(null)

  const startAnalysis = useCallback(async () => {
    if (!accessToken || images.length === 0) return

    setIsProcessing(true)
    setProgress(0)
    setError(null)
    setCurrentStep('Preparing analysis...')

    try {
      // Step 1: Create analysis record
      setCurrentStep('Creating analysis record...')
      setProgress(10)

      const analysisData = {
        title: `AI Analysis ${new Date().toLocaleString()}`,
        description: 'Real-time AI-powered analysis with market research',
        images: images.map(img => ({
          url: img.preview,
          name: img.file.name,
          size: img.file.size,
          type: img.file.type
        })),
        tags: ['ai-analysis', 'real-time', 'market-research'],
        isPublic: false
      }

      console.log('🚀 Creating analysis record...')
      const createResponse = await fetch('/api/analyses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(analysisData)
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(errorData.message || 'Failed to create analysis')
      }

      const createResult = await createResponse.json()
      const analysisId = createResult.data.analysis._id

      console.log('✅ Analysis record created:', analysisId)
      setProgress(20)

      // Step 2: Start AI processing
      setCurrentStep('Running AI image analysis...')
      setProgress(30)

      console.log('🤖 Starting AI processing...')
      const processResponse = await fetch('/api/analyses/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          analysisId,
          imageUrls: images.map(img => img.preview),
          options: {
            enhanceAnalysis: true,
            includeMarketResearch: true,
            includeEbay: true,
            includeMercari: true,
            includeWorthPoint: true,
            maxResultsPerPlatform: 5
          }
        })
      })

      if (!processResponse.ok) {
        const errorData = await processResponse.json()
        throw new Error(errorData.message || 'Failed to process analysis')
      }

      const processResult = await processResponse.json()
      console.log('✅ AI processing completed:', processResult)

      setCurrentStep('Analysis completed!')
      setProgress(100)

      // Transform results
      const analysisResult = processResult.data.analysis
      const result: AnalysisResult = {
        id: analysisResult._id,
        status: 'completed',
        items: analysisResult.items || [],
        summary: analysisResult.summary || {
          totalItems: 0,
          totalValueMin: 0,
          totalValueMax: 0,
          currency: 'USD',
          confidence: 0,
          processingTime: 0
        },
        processingStats: processResult.data.processingStats
      }

      setAnalysis(result)
      onComplete?.(result)

    } catch (err) {
      console.error('❌ Analysis failed:', err)
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [accessToken, images, onComplete, onError])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'falling': return <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />
      default: return <div className="h-4 w-4 bg-gray-400 rounded-full" />
    }
  }

  const getDemandColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Processing Status */}
      {isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing Analysis</span>
            </CardTitle>
            <CardDescription>{currentStep}</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-600 mt-2">{progress}% complete</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>Analysis Failed</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <Button 
              onClick={startAnalysis} 
              className="mt-4"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Start Analysis Button */}
      {!isProcessing && !analysis && !error && (
        <Card>
          <CardHeader>
            <CardTitle>Ready to Analyze</CardTitle>
            <CardDescription>
              {images.length} image{images.length !== 1 ? 's' : ''} ready for AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={startAnalysis} 
              size="lg" 
              className="w-full"
              disabled={!accessToken}
            >
              <Eye className="h-5 w-5 mr-2" />
              Start AI Analysis
            </Button>
            {!accessToken && (
              <p className="text-sm text-red-600 mt-2">Please login to use AI analysis</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Analysis Complete</span>
              </CardTitle>
              <CardDescription>
                Found {analysis.summary.totalItems} items in {analysis.summary.processingTime}ms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analysis.summary.totalItems}
                  </div>
                  <div className="text-sm text-gray-600">Items Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(analysis.summary.totalValueMin)} - {formatCurrency(analysis.summary.totalValueMax)}
                  </div>
                  <div className="text-sm text-gray-600">Est. Value Range</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysis.summary.confidence}%
                  </div>
                  <div className="text-sm text-gray-600">Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.round(analysis.summary.processingTime / 1000)}s
                  </div>
                  <div className="text-sm text-gray-600">Processing Time</div>
                </div>
              </div>

              {/* Processing Stats */}
              {analysis.processingStats && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Processing Details</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      {analysis.processingStats.aiAnalysisCompleted ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span>AI Analysis</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {analysis.processingStats.enhancementCompleted ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span>Enhancement</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {analysis.processingStats.marketResearchCompleted ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span>Market Research</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items List */}
          {analysis.items.map((item, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(item.estimatedValue.min)} - {formatCurrency(item.estimatedValue.max)}
                    </div>
                    <div className="text-sm text-gray-600">{item.confidence}% confidence</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Category:</span>
                    <Badge variant="secondary" className="ml-2">{item.category}</Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Condition:</span>
                    <Badge variant="outline" className="ml-2">{item.condition}</Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Rarity:</span>
                    <Badge variant="outline" className="ml-2">{item.rarity}</Badge>
                  </div>
                  {item.marketData && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Trend:</span>
                      {getTrendIcon(item.marketData.marketTrend)}
                      <Badge className={getDemandColor(item.marketData.demandLevel)}>
                        {item.marketData.demandLevel} demand
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Market Data */}
                {item.marketData && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Market Data
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Average Price:</span>
                        <span className="ml-2 font-medium">{formatCurrency(item.marketData.averagePrice)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Recent Sales:</span>
                        <span className="ml-2 font-medium">{item.marketData.recentSales.length}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {item.recommendations && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Selling Recommendations</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-600">Suggested Platforms:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.recommendations.suggestedPlatforms.map((platform, i) => (
                            <Badge key={i} variant="outline">{platform}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Optimal Price:</span>
                        <span className="ml-2 font-medium text-green-600">
                          {formatCurrency(item.recommendations.optimalPrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Tips:</span>
                        <ul className="mt-1 text-sm text-gray-700 list-disc list-inside">
                          {item.recommendations.sellingTips.slice(0, 3).map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="mt-4">
                    <span className="text-sm font-medium text-gray-700">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
