import { NextRequest, NextResponse } from 'next/server'
import { PRODUCTION_CONFIG } from './production-config'

export function productionSecurityMiddleware(request: NextRequest) {
  const response = NextResponse.next()

  // Add security headers
  Object.entries(PRODUCTION_CONFIG.security.headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Add CORS headers for production
  const origin = request.headers.get('origin')
  if (origin && origin === PRODUCTION_CONFIG.security.cors.origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  // Add additional security headers
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return response
}

export function validateProductionEnvironment() {
  const requiredEnvVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'MONGODB_URI',
    'MONGODB_DB_NAME',
    'OPENAI_API_KEY',
    'SCRAPER_API_KEY',
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }

  return true
}
