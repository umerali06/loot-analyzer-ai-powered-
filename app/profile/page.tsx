'use client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Mail, 
  Calendar, 
  Edit3, 
  Save, 
  X, 
  Shield, 
  Activity,
  Clock,
  BarChart3,
  Camera,
  History
} from 'lucide-react'

export default function ProfilePage() {
  const { isAuthenticated, user, accessToken, updateUser } = useAuth()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    totalItems: 0,
    totalValue: 0,
    lastAnalysis: null
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth?redirect=/profile')
    }
  }, [isAuthenticated, router])

  // Fetch user profile data from database
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchUserProfile()
      fetchUserStats()
    }
  }, [isAuthenticated, accessToken])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.user) {
          setUserData(data.data.user)
          setEditedUser({
            firstName: data.data.user.firstName || '',
            lastName: data.data.user.lastName || '',
            username: data.data.user.username || '',
            email: data.data.user.email || ''
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    }
  }

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/dashboard/overview', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setStats({
            totalAnalyses: data.data.stats.totalAnalyses || 0,
            totalItems: data.data.stats.totalItems || 0,
            totalValue: data.data.stats.totalValue || 0,
            lastAnalysis: data.data.stats.lastAnalysisDate
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setEditedUser({
      firstName: userData?.firstName || '',
      lastName: userData?.lastName || '',
      username: userData?.username || '',
      email: userData?.email || ''
    })
    setIsEditing(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(editedUser)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Update local state
          setUserData(data.data.user)
          // Update auth context if updateUser function exists
          if (updateUser) {
            await updateUser(data.data.user)
          }
          setIsEditing(false)
          // Refresh profile data
          fetchUserProfile()
        }
      } else {
        const errorData = await response.json()
        alert(`Failed to update profile: ${errorData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to update user:', error)
      alert('Failed to update profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setEditedUser((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-slate-300 border-t-slate-600 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-slate-300 border-t-slate-600 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
              <p className="text-slate-600 mt-1">Manage your account and view your activity</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-200"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-900">Personal Information</h2>
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center space-x-2 px-3 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors duration-200 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    First Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedUser.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      placeholder="Enter first name"
                    />
                  ) : (
                    <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                      <User className="h-4 w-4 text-slate-500" />
                      <span className="text-slate-900">{userData.firstName || 'Not set'}</span>
                    </div>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Last Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedUser.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      placeholder="Enter last name"
                    />
                  ) : (
                    <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                      <User className="h-4 w-4 text-slate-500" />
                      <span className="text-slate-900">{userData.lastName || 'Not set'}</span>
                    </div>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Username
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedUser.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      placeholder="Enter username"
                    />
                  ) : (
                    <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                      <User className="h-4 w-4 text-slate-500" />
                      <span className="text-slate-900">{userData.username || 'Not set'}</span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editedUser.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      placeholder="Enter email address"
                    />
                  ) : (
                    <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                      <Mail className="h-4 w-4 text-slate-500" />
                      <span className="text-slate-900">{userData.email || 'Not set'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Info */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Member Since</p>
                      <p className="text-slate-900 font-medium">
                        {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                    <Shield className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Account Status</p>
                      <p className="text-green-600 font-medium">Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Activity Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <Camera className="h-6 w-6 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold text-blue-900">{stats.totalAnalyses}</p>
                      <p className="text-sm text-blue-600">Total Analyses</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-900">{stats.totalItems}</p>
                      <p className="text-sm text-green-600">Items Analyzed</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <Activity className="h-6 w-6 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold text-purple-900">${stats.totalValue}</p>
                      <p className="text-sm text-purple-600">Total Value</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-6 w-6 text-amber-600" />
                    <div>
                      <p className="text-sm font-bold text-amber-900">
                        {stats.lastAnalysis ? new Date(stats.lastAnalysis).toLocaleDateString() : 'Never'}
                      </p>
                      <p className="text-xs text-amber-600">Last Analysis</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/analyze')}
                  className="w-full flex items-center space-x-3 p-3 text-left text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors duration-200"
                >
                  <Camera className="h-5 w-5 text-slate-500" />
                  <span>New Analysis</span>
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full flex items-center space-x-3 p-3 text-left text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors duration-200"
                >
                  <BarChart3 className="h-5 w-5 text-slate-500" />
                  <span>View Dashboard</span>
                </button>
                <button
                  onClick={() => router.push('/history')}
                  className="w-full flex items-center space-x-3 p-3 text-left text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors duration-200"
                >
                  <History className="h-5 w-5 text-slate-500" />
                  <span>Analysis History</span>
                </button>
              </div>
            </div>

            {/* Account Security */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">Account Security</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-slate-700">Two-Factor Auth</span>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Enabled</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-slate-700">Login Activity</span>
                  </div>
                  <button 
                    onClick={() => router.push('/login-activity')}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
