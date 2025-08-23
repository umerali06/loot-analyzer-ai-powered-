'use client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import PasswordStrengthIndicator from '../../components/auth/PasswordStrengthIndicator'
import { Eye, EyeOff, Lock, Mail, User, Shield, Zap, ArrowRight, Star, Camera, BarChart3, TrendingUp } from 'lucide-react'

export default function AuthPage() {
  const { login, register, isAuthenticated, error, clearError } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  
  const [isLogin, setIsLogin] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    firstName: '',
    lastName: '',
    confirmPassword: ''
  })

  // Password validation function
  const validatePassword = (password: string) => {
    const errors: string[] = []
    const warnings: string[] = []
    let score = 0

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    } else {
      score += 1
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    } else {
      score += 1
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    } else {
      score += 1
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    } else {
      score += 1
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      warnings.push('Consider adding special characters for stronger security')
    } else {
      score += 1
    }

    const isValid = errors.length === 0
    return { isValid, score, errors, warnings }
  }

  // Prevent hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, router, redirectTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setIsSubmitting(true)

    try {
      if (isLogin) {
        await login({
          email: formData.email,
          password: formData.password
        })
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match')
        }
        await register({
          email: formData.email,
          password: formData.password,
          username: formData.username,
          firstName: formData.firstName,
          lastName: formData.lastName
        })
      }
    } catch (err: any) {
      console.error('Authentication error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // const handleForgotPassword = () => {
  //   // TODO: Implement forgot password functionality
  //   alert('Forgot password functionality coming soon!')
  // }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      username: '',
      firstName: '',
      lastName: '',
      confirmPassword: ''
    })
    setShowPassword(false)
    setShowConfirmPassword(false)
    setRememberMe(false)
    clearError()
  }

  // Show loading state until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 bg-slate-200 rounded-2xl animate-pulse mx-auto mb-4"></div>
          <div className="h-8 w-32 bg-slate-200 rounded animate-pulse mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="flex min-h-screen">
        {/* Left Side - Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-md w-full">
            {/* Enhanced Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-6">
                <div className="h-12 w-12 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center shadow-lg mr-4">
                  <span className="text-white font-bold text-xl">🔍</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">SIBI</h1>
                  <span className="text-sm text-slate-500 font-medium">Should I Buy It</span>
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-slate-600">
                {isLogin 
                  ? 'Sign in to continue analyzing lots' 
                  : 'Join thousands of professional resellers'
                }
              </p>
              
              {redirectTo !== '/dashboard' && (
                <div className="mt-4 inline-flex items-center px-3 py-2 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-200">
                  <Shield className="h-4 w-4 mr-2" />
                  Redirecting to {redirectTo === '/analyze' ? 'Analyze' : redirectTo === '/history' ? 'History' : 'Dashboard'} after login
                </div>
              )}
            </div>

            {/* Enhanced Form */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Registration Fields */}
                {!isLogin && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-semibold text-slate-700 mb-2">
                          First Name
                        </label>
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          required={!isLogin}
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-semibold text-slate-700 mb-2">
                          Last Name
                        </label>
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          required={!isLogin}
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-2">
                        Username
                      </label>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        required={!isLogin}
                        value={formData.username}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
                        placeholder="johndoe"
                      />
                    </div>
                  </div>
                )}

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {!isLogin && formData.password && (
                    <PasswordStrengthIndicator validation={validatePassword(formData.password)} />
                  )}
                </div>

                {/* Confirm Password Field */}
                {!isLogin && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required={!isLogin}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Remember Me & Forgot Password */}
                {isLogin && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-slate-900 focus:ring-slate-900 border-slate-300 rounded"
                      />
                      <span className="ml-2 text-sm text-slate-700">Remember me</span>
                    </label>
                    {/* <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors duration-200"
                    >
                      Forgot password?
                    </button> */}
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center">
                      <div className="h-5 w-5 bg-red-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-red-600 text-xs">!</span>
                      </div>
                      <span className="text-sm text-red-600 font-medium">{error}</span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none shadow-lg hover:shadow-xl disabled:shadow-none"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {isLogin ? 'Signing In...' : 'Creating Account...'}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      {isLogin ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </div>
                  )}
                </button>
              </form>

              {/* Switch Mode */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin)
                    resetForm()
                  }}
                  className="text-slate-600 hover:text-slate-800 font-medium transition-colors duration-200"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 text-center">
              <div className="flex items-center justify-center space-x-6 text-slate-500">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  <span className="text-sm">Secure</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-2" />
                  <span className="text-sm">Trusted</span>
                </div>
                <div className="flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  <span className="text-sm">Premium</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Features Preview */}
        <div className="hidden lg:flex flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 items-center justify-center">
          <div className="max-w-lg text-white">
            <h3 className="text-3xl font-bold mb-6">
              Professional Lot Analysis
            </h3>
            <p className="text-slate-300 text-lg mb-8">
              Join thousands of resellers who trust SIBI for intelligent lot evaluation and profit optimization.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="h-10 w-10 bg-slate-700 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">AI-Powered Recognition</h4>
                  <p className="text-slate-400">Advanced computer vision identifies items with 94% accuracy</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-10 w-10 bg-slate-700 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Market Intelligence</h4>
                  <p className="text-slate-400">Real-time eBay data and trend analysis for informed decisions</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-10 w-10 bg-slate-700 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Profit Optimization</h4>
                  <p className="text-slate-400">Smart pricing recommendations and profit potential analysis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
