'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { 
  Menu, 
  X, 
  Home, 
  BarChart3, 
  Camera, 
  History, 
  User, 
  LogOut, 
  Bell,
  ChevronDown
} from 'lucide-react'
import AdvancedSearch from './AdvancedSearch'

export default function Navigation() {
  const { isAuthenticated, user, logout, isLoading } = useAuth()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/')
    setIsUserMenuOpen(false)
  }

  const handleProtectedRoute = (route: string) => {
    if (!isAuthenticated) {
      router.push('/auth?redirect=' + encodeURIComponent(route))
    } else {
      router.push(route)
    }
    setIsMobileMenuOpen(false)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">🔍</span>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-slate-900">SIBI</h1>
                <span className="text-xs text-slate-500 font-medium tracking-wide">Should I Buy It</span>
              </div>
            </div>
            
            {/* Loading state for right side */}
            <div className="flex items-center space-x-3">
              <div className="h-9 w-20 bg-slate-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center group" onClick={closeMobileMenu}>
              <div className="relative">
                <div className="h-10 w-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <span className="text-white font-bold text-lg">🔍</span>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm"></div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-slate-900">SIBI</h1>
                <span className="text-xs text-slate-500 font-medium tracking-wide">Should I Buy It</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            <Link 
              href="/" 
              className="group relative px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors duration-200"
              onClick={closeMobileMenu}
            >
              <span className="relative z-10">Home</span>
              <div className="absolute inset-0 bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </Link>
            
            <button
              onClick={() => handleProtectedRoute('/dashboard')}
              className="group relative px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors duration-200"
              title={!isAuthenticated ? "Login required to access Dashboard" : "Go to Dashboard"}
            >
              <span className="relative z-10">Dashboard</span>
              <div className="absolute inset-0 bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              {!isAuthenticated && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-400 rounded-full"></span>
              )}
            </button>

            <button
              onClick={() => handleProtectedRoute('/analyze')}
              className="group relative px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors duration-200"
              title={!isAuthenticated ? "Login required to analyze lots" : "Analyze lots"}
            >
              <span className="relative z-10">Analyze</span>
              <div className="absolute inset-0 bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              {!isAuthenticated && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-400 rounded-full"></span>
              )}
            </button>

            <button
              onClick={() => handleProtectedRoute('/history')}
              className="group relative px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors duration-200"
              title={!isAuthenticated ? "Login required to view history" : "View analysis history"}
            >
              <span className="relative z-10">History</span>
              <div className="absolute inset-0 bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              {!isAuthenticated && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-400 rounded-full"></span>
              )}
            </button>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Advanced Search Bar */}
            <div className="hidden md:flex items-center">
              <AdvancedSearch />
            </div>

            {/* Notifications */}
            {isAuthenticated && (
              <button className="hidden md:flex items-center justify-center h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200 relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
            )}

            {/* User Menu */}
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      onClick={toggleUserMenu}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-100 transition-all duration-200 group"
                    >
                      <div className="h-8 w-8 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg group-hover:shadow-xl transition-all duration-200">
                        {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                      </div>
                      <div className="hidden xl:block text-left">
                        <p className="text-sm font-medium text-slate-900">
                          {user?.firstName || user?.username}
                        </p>
                        <p className="text-xs text-slate-500">
                          {user?.email}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors duration-200" />
                    </button>

                    {/* User Dropdown */}
                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200/60 py-2 z-50 backdrop-blur-sm">
                        <div className="px-4 py-3 border-b border-slate-100">
                          <p className="text-sm font-semibold text-slate-900">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{user?.email}</p>
                        </div>
                        
                        <Link
                          href="/dashboard"
                          className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors duration-200"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <BarChart3 className="h-4 w-4 mr-3 text-slate-500" />
                          Dashboard
                        </Link>
                        
                        <Link
                          href="/profile"
                          className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors duration-200"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <User className="h-4 w-4 mr-3 text-slate-500" />
                          Profile
                        </Link>
                        
                        
                        
                        <div className="border-t border-slate-100 my-1"></div>
                        
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href="/auth"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-5 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    Sign In
                  </Link>
                )}
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200/60 py-4">
            {/* Mobile Search Bar */}
            <div className="px-4 mb-4">
              <AdvancedSearch />
            </div>
            
            <div className="space-y-1">
              <Link
                href="/"
                className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                onClick={closeMobileMenu}
              >
                <Home className="h-5 w-5 mr-3 text-slate-500" />
                Home
              </Link>
              
              <button
                onClick={() => handleProtectedRoute('/dashboard')}
                className="flex items-center w-full px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
              >
                <BarChart3 className="h-5 w-5 mr-3 text-slate-500" />
                Dashboard
                {!isAuthenticated && (
                  <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                    Login Required
                  </span>
                )}
              </button>

              <button
                onClick={() => handleProtectedRoute('/analyze')}
                className="flex items-center w-full px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
              >
                <Camera className="h-5 w-5 mr-3 text-slate-500" />
                Analyze
                {!isAuthenticated && (
                  <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                    Login Required
                  </span>
                )}
              </button>

              <button
                onClick={() => handleProtectedRoute('/history')}
                className="flex items-center w-full px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
              >
                <BarChart3 className="h-5 w-5 mr-3 text-slate-500" />
                History
                {!isAuthenticated && (
                  <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                    Login Required
                  </span>
                )}
              </button>
              
              {!isAuthenticated && (
                <Link
                  href="/auth"
                  className="flex items-center px-4 py-3 text-slate-900 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                  onClick={closeMobileMenu}
                >
                  <User className="h-5 w-5 mr-3 text-slate-500" />
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
