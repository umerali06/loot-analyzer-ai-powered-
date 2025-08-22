import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Simple test API working',
    timestamp: new Date().toISOString()
  })
}
