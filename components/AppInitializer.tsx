'use client'

import { useEffect, useState } from 'react'

interface AppInitializerProps {
  children: React.ReactNode
}

export default function AppInitializer({ children }: AppInitializerProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)

  useEffect(() => {
    const initializeAppOnStartup = async () => {
      try {
        setIsInitializing(true)
        console.log('🚀 AppInitializer: Starting database initialization...')
        
        // Call the health check API to trigger initialization
        const response = await fetch('/api/health')
        const data = await response.json()
        
        if (data.success) {
          console.log('✅ AppInitializer: Database initialization completed successfully')
        } else {
          console.warn('⚠️ AppInitializer: Database initialization had issues:', data.message || 'Unknown error')
        }

        // Always mark as initialized to not block the app
        setIsInitialized(true)

      } catch (err) {
        console.warn('⚠️ AppInitializer: Database initialization failed, continuing anyway:', err)
        // Don't block the app if initialization fails
        setIsInitialized(true)
      } finally {
        setIsInitializing(false)
      }
    }

    // Initialize on component mount
    initializeAppOnStartup()
  }, [])

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
        </div>
      </div>
    )
  }

  // Render children when ready
  return <>{children}</>
}
