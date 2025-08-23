'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react'
import { User, AuthResponse, AuthRequest, RegisterRequest } from '../types/auth'

// Auth state interface
interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// Auth action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: AuthResponse }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_INIT_COMPLETE' }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'REFRESH_TOKEN'; payload: { accessToken: string; refreshToken: string } }

// Initial state
const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
}

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null
      }
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }
    
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      }
    
    case 'AUTH_INIT_COMPLETE':
      return {
        ...state,
        isLoading: false,
        error: null
      }
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      }
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      }
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null
      }
    
    case 'REFRESH_TOKEN':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        // Preserve user object and authentication state
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isLoading: false
      }
    
    default:
      return state
  }
}

// Auth context interface
interface AuthContextType extends AuthState {
  login: (credentials: AuthRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => void
  clearError: () => void
  updateUser: (updates: Partial<User>) => void
  refreshAccessToken: () => Promise<void>
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth provider component
interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Logout function - defined before refreshAccessToken
  const logout = useCallback(() => {
    console.log('🚪 Logging out user, clearing all stored data')
    
    // Clear all stored tokens and data
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    
    // Clear any session storage
    sessionStorage.clear()
    
    // Reset state
    dispatch({ type: 'LOGOUT' })
    
    console.log('✅ Logout complete, all data cleared')
  }, [])

  // Refresh access token function - defined after logout
  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      
      if (!refreshToken) {
        throw new Error('No refresh token available')
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Token refresh failed')
      }

      // Update tokens in localStorage
      localStorage.setItem('accessToken', data.data.accessToken)
      localStorage.setItem('refreshToken', data.data.refreshToken)

      dispatch({ 
        type: 'REFRESH_TOKEN', 
        payload: { 
          accessToken: data.data.accessToken, 
          refreshToken: data.data.refreshToken 
        } 
      })
    } catch (error) {
      // If refresh fails, logout the user
      logout()
      throw error
    }
  }, [logout])

  // Check for existing tokens on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken')
        const refreshToken = localStorage.getItem('refreshToken')
        
        console.log('🔐 Initializing auth with tokens:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          accessTokenLength: accessToken?.length || 0
        })
        
        if (accessToken && refreshToken) {
          // Try to verify the current access token first
          try {
            // Verify if current access token is still valid
            const verifyResponse = await fetch('/api/auth/verify', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            })
            
            if (verifyResponse.ok) {
              // Current token is still valid, restore session
              const userData = await verifyResponse.json()
              console.log('✅ Current access token is valid, restoring session')
              dispatch({ 
                type: 'AUTH_SUCCESS', 
                payload: {
                  user: userData.user,
                  accessToken,
                  refreshToken,
                  expiresIn: 3600 // Default 1 hour expiration
                }
              })
              return
            }
          } catch (verifyError) {
            console.log('⚠️ Token verification failed, trying refresh:', verifyError)
          }
          
          // If verification failed, try to refresh the token
          try {
            console.log('🔄 Attempting to refresh access token...')
            await refreshAccessToken()
            console.log('✅ Token refresh successful')
          } catch (refreshError) {
            console.log('❌ Token refresh failed:', refreshError)
            // Don't immediately logout - just mark as unauthenticated
            // This allows the user to try logging in again
            dispatch({ type: 'AUTH_INIT_COMPLETE' })
          }
        } else {
          // No tokens found - this is normal for new visitors
          console.log('ℹ️ No tokens found, user is not authenticated')
          dispatch({ type: 'AUTH_INIT_COMPLETE' })
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
        // Don't fail completely - just mark as unauthenticated
        dispatch({ type: 'AUTH_INIT_COMPLETE' })
      }
    }

    initializeAuth()
    
    // Add page focus listener to check auth status when user returns to tab
    const handlePageFocus = async () => {
      const accessToken = localStorage.getItem('accessToken')
      if (accessToken && !state.isAuthenticated) {
        console.log('🔄 Page focused, checking authentication status...')
        try {
          const verifyResponse = await fetch('/api/auth/verify', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          })
          
          if (verifyResponse.ok) {
            const userData = await verifyResponse.json()
            const refreshToken = localStorage.getItem('refreshToken')
            if (refreshToken) {
              console.log('✅ Restoring session on page focus')
              dispatch({ 
                type: 'AUTH_SUCCESS', 
                payload: {
                  user: userData.user,
                  accessToken,
                  refreshToken,
                  expiresIn: 3600
                }
              })
            }
          }
        } catch (error) {
          console.log('⚠️ Auth check on page focus failed:', error)
        }
      }
    }
    
    window.addEventListener('focus', handlePageFocus)
    
    return () => {
      window.removeEventListener('focus', handlePageFocus)
    }
  }, [refreshAccessToken, state.isAuthenticated])

  // Login function
  const login = useCallback(async (credentials: AuthRequest) => {
    dispatch({ type: 'AUTH_START' })
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      // Store tokens in localStorage
      localStorage.setItem('accessToken', data.data.accessToken)
      localStorage.setItem('refreshToken', data.data.refreshToken)

      dispatch({ type: 'AUTH_SUCCESS', payload: data.data })
    } catch (error) {
      dispatch({ 
        type: 'AUTH_FAILURE', 
        payload: error instanceof Error ? error.message : 'Login failed' 
      })
    }
  }, [])

  // Register function
  const register = useCallback(async (userData: RegisterRequest) => {
    dispatch({ type: 'AUTH_START' })
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed')
      }

      // Store tokens in localStorage
      localStorage.setItem('accessToken', data.data.accessToken)
      localStorage.setItem('refreshToken', data.data.refreshToken)

      dispatch({ type: 'AUTH_SUCCESS', payload: data.data })
    } catch (error) {
      dispatch({ 
        type: 'AUTH_FAILURE', 
        payload: error instanceof Error ? error.message : 'Registration failed' 
      })
    }
  }, [])

  // Clear error function
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  // Update user function
  const updateUser = useCallback((updates: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: updates })
  }, [])

  // Context value
  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    updateUser,
    refreshAccessToken
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook to check if user is authenticated
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth()
  return isAuthenticated
}

// Hook to get current user
export function useCurrentUser(): User | null {
  const { user } = useAuth()
  return user
}
