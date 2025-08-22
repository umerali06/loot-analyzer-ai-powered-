export interface User {
  id: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  isActive: boolean
  preferences: UserPreferences
}

export interface UserPreferences {
  defaultAnalysisOptions: {
    filterOutliers: boolean
    includeGptEstimate: boolean
    maxEbayResults: number
  }
  notifications: {
    email: boolean
    push: boolean
  }
  theme: 'light' | 'dark' | 'system'
}

export interface AuthRequest {
  email: string
  password: string
}

export interface RegisterRequest extends AuthRequest {
  username: string
  firstName?: string
  lastName?: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface TokenPayload {
  userId: string
  email: string
  username: string
  iat: number
  exp?: number // Made optional since it's auto-added by jwt.sign with expiresIn
  type?: 'access' | 'refresh' // Added for enhanced JWT
  fingerprint?: string // Added for enhanced JWT
  [key: string]: any // Allow additional claims
}

export interface PasswordValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  strength: 'weak' | 'medium' | 'strong'
  score: number
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  newPassword: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface UpdateProfileRequest {
  firstName?: string
  lastName?: string
  preferences?: Partial<UserPreferences>
}
