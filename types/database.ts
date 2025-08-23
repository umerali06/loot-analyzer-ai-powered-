/**
 * Database Types for Lot Analyzer
 * Clean, simplified types for users, sessions, and analysis storage
 */

import { ObjectId } from 'mongodb'

// User Management
export interface User {
  _id: ObjectId
  email: string
  username: string
  password: string
  firstName?: string
  lastName?: string
  role: 'user' | 'admin'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
}

// User Session Management
export interface UserSession {
  _id: ObjectId
  userId: ObjectId
  sessionId: string
  accessToken: string
  refreshToken: string
  isActive: boolean
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

// Analysis Results Storage
export interface Analysis {
  _id: ObjectId
  userId: ObjectId
  title: string
  description?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  items: AnalysisItem[]
  summary: {
    totalValue: number
    itemCount: number
    averageValue: number
    highestValue: number
    lowestValue: number
  }
  metadata: {
    originalFileName: string
    fileSize: number
    analysisDuration: number
    aiModel: string
  }
  createdAt: Date
  updatedAt: Date
}

// Individual Item Analysis
export interface AnalysisItem {
  _id: ObjectId
  name: string
  category: string
  condition: 'excellent' | 'good' | 'fair' | 'poor'
  estimatedValue: {
    min: number
    max: number
    mean: number
    currency: string
  }
  aiEstimate: {
    confidence: number
    factors: string[]
    notes: string
  }
  ebayData?: {
    similarItems: number
    averagePrice: number
    priceRange: {
      min: number
      max: number
    }
    marketTrend: 'rising' | 'stable' | 'falling'
  }
  imageUrl?: string
  createdAt: Date
}

// Database Collections
export const COLLECTIONS = {
  USERS: 'users',
  SESSIONS: 'user_sessions',
  ANALYSES: 'analyses'
} as const

// Database Indexes
export const INDEXES = {
  USERS: [
    { email: 1, unique: true },
    { username: 1, unique: true },
    { role: 1 },
    { isActive: 1 }
  ],
  SESSIONS: [
    { sessionId: 1, unique: true },
    { userId: 1 },
    { accessToken: 1 },
    { isActive: 1 },
    { expiresAt: 1 }
  ],
  ANALYSES: [
    { userId: 1 },
    { status: 1 },
    { createdAt: -1 },
    { 'summary.totalValue': -1 }
  ]
} as const

// Database Result Types
export interface DatabaseResult<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface PaginationOptions {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
