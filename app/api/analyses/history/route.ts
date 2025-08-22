import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

export async function GET(req: NextRequest) {
  console.log('🚀 Analysis History API called')
  
  try {
    // Check environment variables first
    const mongoUri = process.env.MONGODB_URI
    console.log('🔍 MONGODB_URI exists:', !!mongoUri)
    console.log('🔍 MONGODB_URI length:', mongoUri ? mongoUri.length : 0)
    
    if (!mongoUri) {
      console.log('❌ MONGODB_URI environment variable is not set')
      return NextResponse.json({
        success: false,
        message: 'Database configuration missing - MONGODB_URI not set',
        error: 'Environment variable MONGODB_URI is required'
      }, { status: 500 })
    }
    
    const db = await getDatabase()
    if (!db) {
      console.log('⚠️ No database connection')
      return NextResponse.json({
        success: false,
        message: 'Database connection failed',
        error: 'No database connection'
      }, { status: 500 })
    }

    console.log('✅ Database connection successful')

    // Get analysis history from database
    const analysesCollection = db.collection('analyses')
    console.log('📊 Collection name:', analysesCollection.collectionName)
    
    // Get all analyses for the user (you can add user filtering later)
    const allAnalyses = await analysesCollection.find({}).sort({ timestamp: -1 }).toArray()
    console.log('📊 Raw analyses from database:', allAnalyses)
    console.log('📊 Number of analyses found:', allAnalyses.length)
    
    if (allAnalyses.length === 0) {
      console.log('📊 No analyses found - returning empty array')
      return NextResponse.json({
        success: true,
        message: 'No analyses found - showing empty history',
        data: []
      })
    }

    // Transform the data to match the frontend interface
    const transformedAnalyses = allAnalyses.map((analysis: any) => {
      console.log('🔄 Transforming analysis:', analysis._id)
      return {
        _id: analysis._id?.toString() || `analysis_${Date.now()}`,
        title: analysis.title || 'Untitled Analysis',
        status: analysis.status || 'unknown',
        timestamp: analysis.timestamp || new Date().toISOString(),
        images: analysis.images || [],
        items: analysis.items || [],
        summary: {
          totalItems: analysis.items ? analysis.items.length : 0,
          totalValue: analysis.items ? analysis.items.reduce((sum: number, item: any) => 
            sum + (item.estimatedValue?.mean || 0), 0) : 0,
          processingTime: analysis.processingTime || 0
        },
        userId: analysis.userId || 'unknown'
      }
    })
    
    console.log('📊 Transformed analyses:', transformedAnalyses)
    console.log('📊 Final response data length:', transformedAnalyses.length)
    
    return NextResponse.json({
      success: true,
      message: 'Analysis history loaded successfully',
      data: transformedAnalyses
    })
  } catch (error) {
    console.error('❌ Error fetching analysis history:', error)
    
    // Return more detailed error information
    return NextResponse.json({
      success: false,
      message: 'Failed to load analysis history',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : 'No stack trace available'
    }, { status: 500 })
  }
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { status: 200 })
}
