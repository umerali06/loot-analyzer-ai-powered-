import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '../../../lib/auth-middleware-simple'
import { createSuccessResponse, createErrorResponse } from '../../../lib/api-utils-enhanced'
import { analysisService } from '../../../lib/database-service'

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    if (req.method === 'GET') {
      const userId = req.headers.get('x-user-id')

      if (!userId) {
        return createErrorResponse('User authentication required', 401)
      }

      console.log('🔍 Fetching analyses for user:', userId)

      // Fetch analyses from database
      const result = await analysisService.findByUserId(
        userId,
        { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }
      )

      if (result) {
        console.log('✅ Found analyses:', result.data?.length || 0)
        return createSuccessResponse({
          analyses: result.data || [],
          total: result.pagination?.total || 0,
          page: result.pagination?.page || 1,
          limit: result.pagination?.limit || 100
        })
      } else {
        console.log('⚠️ No analyses found for user')
        return createSuccessResponse({
          analyses: [],
          total: 0,
          page: 1,
          limit: 100
        })
      }

    } else if (req.method === 'DELETE') {
      const userId = req.headers.get('x-user-id')

      if (!userId) {
        return createErrorResponse('User authentication required', 401)
      }

      console.log('🗑️ Deleting all analyses for user:', userId)

      // Delete all analyses for the user
      const result = await analysisService.deleteByUserId(userId)

      if (result.success) {
        console.log('✅ Deleted analyses:', result.data?.deletedCount || 0)
        return createSuccessResponse({
          message: 'All analysis data deleted successfully',
          deletedCount: result.data?.deletedCount || 0
        })
      } else {
        console.log('⚠️ Failed to delete analyses:', result.error)
        return createErrorResponse(result.error || 'Failed to delete analyses', 500)
      }

    } else if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200 })
    }

    return createErrorResponse('Method not allowed', 405)

  } catch (error) {
    console.error('Analyses API error:', error)
    return createErrorResponse('Internal server error', 500, error)
  }
}

// Export the handler wrapped with authentication middleware
export const GET = withAuth(handler)
export const DELETE = withAuth(handler)
export const OPTIONS = handler
