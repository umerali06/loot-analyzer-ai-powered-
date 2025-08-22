import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware-simple'
import { createSuccessResponse, createErrorResponse, addPerformanceHeaders } from '@/lib/api-utils-enhanced'
import { analysisService } from '@/lib/database-service'
import { getDatabase } from '@/lib/database'

async function handler(req: NextRequest): Promise<NextResponse> {
  console.log('🚀 Dashboard overview API called with method:', req.method)
  console.log('🔍 Request URL:', req.url)
  console.log('📋 Request headers:', Object.fromEntries(req.headers.entries()))
  
  // Simple test response for debugging
  if (req.nextUrl?.searchParams.get('test') === 'true') {
    console.log('🧪 Test mode activated')
    return createSuccessResponse({
      message: 'Dashboard API is working!',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    })
  }
  
  try {
    if (req.method === 'GET') {
      const userId = req.headers.get('x-user-id')
      console.log('👤 User ID from headers:', userId)

      if (!userId) {
        console.log('❌ No user ID provided')
        return createErrorResponse('User authentication required', 401)
      }

      console.log('📊 Fetching dashboard overview for user:', userId)

      try {
        // Fetch analyses from database
        console.log('🔍 Querying database for user:', userId)
        console.log('🔍 Using analysisService.findByUserId with options:', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
        
        let result = await analysisService.findByUserId(
          userId,
          { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }
        )
        console.log('🗄️ Database result:', result)
        console.log('🗄️ Result type:', typeof result)
        console.log('🗄️ Result keys:', Object.keys(result || {}))
        console.log('🗄️ Result.data type:', typeof result?.data)
        console.log('🗄️ Result.data length:', Array.isArray(result?.data) ? result?.data.length : 'Not an array')
        
        if (result?.data && Array.isArray(result.data)) {
          console.log('🗄️ First analysis sample:', result.data[0])
        }
        
        // Direct database check to debug the issue
        try {
          const db = await getDatabase()
          console.log('🔍 Connected to database:', db.databaseName)
          
          // Check all collections to find where analysis data is stored
          const collections = await db.listCollections().toArray()
          console.log('🔍 Available collections:', collections.map((c: any) => c.name))
          
          // Try multiple possible collection names
          const possibleCollections = ['analyses', 'analysis', 'analysis_results', 'lot_analyses']
          
          for (const collectionName of possibleCollections) {
            try {
              const collection = db.collection(collectionName)
              const count = await collection.countDocuments({})
              console.log(`🔍 Collection '${collectionName}' has ${count} documents`)
              
              if (count > 0) {
                const sampleDoc = await collection.findOne({})
                console.log(`🔍 Sample document from '${collectionName}':`, {
                  _id: sampleDoc._id,
                  keys: Object.keys(sampleDoc),
                  hasUserId: 'userId' in sampleDoc,
                  hasItems: 'items' in sampleDoc,
                  hasSummary: 'summary' in sampleDoc
                })
                
                // If this collection has analysis data, use it
                                 if (sampleDoc && ('items' in sampleDoc || 'summary' in sampleDoc)) {
                   console.log(`✅ Found analysis data in collection '${collectionName}'`)
                   console.log('🔍 Sample document userId:', {
                     value: sampleDoc.userId,
                     type: typeof sampleDoc.userId,
                     isObjectId: sampleDoc.userId && typeof sampleDoc.userId === 'object' && sampleDoc.userId._bsontype === 'ObjectID'
                   })
                  
                                     // Query this collection for user's analyses
                   console.log('🔍 Querying for userId:', userId)
                   console.log('🔍 Converting to ObjectId:', new (require('mongodb').ObjectId)(userId))
                   
                   // Try multiple userId field formats
                   const userAnalyses = await collection.find({ 
                     $or: [
                       { userId: new (require('mongodb').ObjectId)(userId) },
                       { userId: userId },
                       { userId: userId.toString() }
                     ]
                   }).toArray()
                   
                   console.log('🔍 Query result count:', userAnalyses.length)
                   if (userAnalyses.length > 0) {
                     console.log('🔍 First analysis userId type:', typeof userAnalyses[0].userId)
                     console.log('🔍 First analysis userId value:', userAnalyses[0].userId)
                   }
                  
                                     console.log(`✅ Found ${userAnalyses.length} analyses for user in '${collectionName}'`)
                   
                   if (userAnalyses.length > 0) {
                     console.log('✅ Direct query found analyses, but AnalysisService should work now')
                   } else {
                     console.log('⚠️ No user-specific analyses found with direct query')
                   }
                   
                   break
                }
              }
                         } catch (colError) {
               console.log(`❌ Error checking collection '${collectionName}':`, colError instanceof Error ? colError.message : 'Unknown error')
             }
          }
        } catch (directDbError) {
          console.log('❌ Direct database query failed:', directDbError)
        }

        if (result && result.data) {
          const analyses = result.data || []
          console.log('✅ Found analyses for dashboard:', analyses.length)

          // Calculate comprehensive statistics
          const totalAnalyses = analyses.length
          const totalItems = analyses.reduce((sum: number, analysis: any) => 
            sum + (analysis.items?.length || 0), 0)
          
          const totalValue = analyses.reduce((sum: number, analysis: any) => 
            sum + (analysis.summary?.totalValue || 0), 0)
          
          const allValues = analyses.flatMap((analysis: any) => 
            analysis.items?.map((item: any) => item.estimatedValue?.mean || 0) || []
          ).filter((value: number) => value > 0)
          
          const averageValue = allValues.length > 0 ? 
            allValues.reduce((sum: number, val: number) => sum + val, 0) / allValues.length : 0
          const highestValue = allValues.length > 0 ? Math.max(...allValues) : 0
          const lowestValue = allValues.length > 0 ? Math.min(...allValues) : 0
          
          const successfulAnalyses = analyses.filter((analysis: any) => 
            analysis.status === 'completed' && analysis.items?.length > 0
          ).length
          const successRate = totalAnalyses > 0 ? (successfulAnalyses / totalAnalyses) * 100 : 0
          
          const lastAnalysis = analyses
            .filter((analysis: any) => analysis.status === 'completed')
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
          
          const lastAnalysisDate = lastAnalysis ? new Date(lastAnalysis.createdAt).toISOString() : null

          // Get recent analyses for display
          const recentAnalyses = analyses
            .filter((analysis: any) => analysis.status === 'completed')
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
            .map((analysis: any) => ({
              id: analysis._id?.toString() || analysis.id,
              title: analysis.title || `Analysis ${(analysis._id?.toString() || analysis.id).slice(-6)}`,
              itemCount: analysis.items?.length || 0,
              totalValue: analysis.summary?.totalValue || 0,
              status: analysis.status,
              createdAt: new Date(analysis.createdAt).toISOString(),
              category: analysis.items?.[0]?.category || 'Unknown'
            }))

          // Calculate category distribution
          const categoryStats = analyses.reduce((acc: any, analysis: any) => {
            analysis.items?.forEach((item: any) => {
              const category = item.category || 'Unknown'
              if (!acc[category]) {
                acc[category] = { count: 0, totalValue: 0 }
              }
              acc[category].count++
              acc[category].totalValue += item.estimatedValue?.mean || 0
            })
            return acc
          }, {})

          // Convert to array format for easier frontend consumption
          const categoryDistribution = Object.entries(categoryStats).map(([category, stats]: [string, any]) => ({
            category,
            count: stats.count,
            totalValue: stats.totalValue,
            percentage: totalItems > 0 ? (stats.count / totalItems) * 100 : 0
          })).sort((a, b) => b.count - a.count)

          const dashboardData = {
            stats: {
              totalAnalyses,
              totalItems,
              totalValue: Math.round(totalValue * 100) / 100, // Round to 2 decimal places
              averageValue: Math.round(averageValue * 100) / 100,
              highestValue: Math.round(highestValue * 100) / 100,
              lowestValue: Math.round(lowestValue * 100) / 100,
              successRate: Math.round(successRate * 100) / 100,
              lastAnalysisDate
            },
            recentAnalyses,
            categoryDistribution,
            performance: {
              averageProcessingTime: analyses.length > 0 ? 
                analyses.reduce((sum: number, a: any) => sum + (a.metadata?.analysisDuration || 0), 0) / analyses.length : 0,
              totalProcessingTime: analyses.reduce((sum: number, a: any) => sum + (a.metadata?.analysisDuration || 0), 0)
            }
          }

          console.log('📈 Dashboard data calculated successfully:', dashboardData)
          const response = createSuccessResponse(dashboardData)
          return addPerformanceHeaders(response)

        } else {
          console.log('⚠️ No analyses found for user, returning empty dashboard')
          const emptyDashboard = {
            stats: {
              totalAnalyses: 0,
              totalItems: 0,
              totalValue: 0,
              averageValue: 0,
              highestValue: 0,
              lowestValue: 0,
              successRate: 0,
              lastAnalysisDate: null
            },
            recentAnalyses: [],
            categoryDistribution: [],
            performance: {
              averageProcessingTime: 0,
              totalProcessingTime: 0
            }
          }
          
          const response = createSuccessResponse(emptyDashboard)
          return addPerformanceHeaders(response)
        }

      } catch (dbError) {
        console.error('❌ Database error while fetching dashboard data:', dbError)
        return createErrorResponse('Failed to fetch dashboard data from database', 500, dbError)
      }

    } else if (req.method === 'OPTIONS') {
      console.log('✅ OPTIONS request handled')
      return new NextResponse(null, { status: 200 })
    }

    console.log('❌ Method not allowed:', req.method)
    return createErrorResponse('Method not allowed', 405)

  } catch (error) {
    console.error('❌ Dashboard overview API error:', error)
    return createErrorResponse('Internal server error', 500, error)
  }
}

// Export the handler wrapped with authentication middleware
export const GET = withAuth(handler)
export const OPTIONS = handler
