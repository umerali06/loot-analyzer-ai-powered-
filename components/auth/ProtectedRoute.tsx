'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
  fallback?: React.ReactNode
}

export default function ProtectedRoute({ 
  children, 
  redirectTo = '/auth',
  fallback = (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Checking authentication...</p>
      </div>
    </div>
  )
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, isLoading, router, redirectTo])

  // Show loading state while checking authentication
  if (isLoading) {
    return <>{fallback}</>
  }

  // If not authenticated, don't render children (will redirect)
  if (!isAuthenticated) {
    return <>{fallback}</>
  }

  // If authenticated, render children
  return <>{children}</>
}
