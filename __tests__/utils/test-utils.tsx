import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'
import { User } from '@/types/auth'

// Mock data factories
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  lastLoginAt: '2024-01-01T00:00:00.000Z',
  isActive: true,
  preferences: {
    defaultAnalysisOptions: {
      filterOutliers: true,
      includeGptEstimate: true,
      maxEbayResults: 10
    },
    notifications: {
      email: true,
      push: false
    },
    theme: 'system'
  },
  ...overrides,
})

export const createMockAnalysisResult = (overrides = {}) => ({
  analysisId: 'analysis-123',
  results: [
    {
      imageId: 'image-123',
      filename: 'test-image.jpg',
      items: [
        {
          id: 'item-1',
          name: 'Test Item',
          description: 'A test item for analysis',
          category: 'Electronics',
          condition: 'Good',
          estimatedValue: {
            min: 50,
            max: 100,
            median: 75,
            mean: 75,
            currency: 'USD',
          },
          confidence: 0.85,
        },
      ],
      processingTime: 1500,
    },
  ],
  totalValue: {
    min: 50,
    max: 100,
    median: 75,
    mean: 75,
    currency: 'USD',
  },
  averageConfidence: 0.85,
  totalProcessingTime: 1500,
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

export const createMockFile = (overrides = {}) => ({
  name: 'test-image.jpg',
  size: 1024 * 1024, // 1MB
  type: 'image/jpeg',
  lastModified: Date.now(),
  ...overrides,
})

// Custom render function that includes providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthProvider>{children}</AuthProvider>
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Export everything from testing library
export * from '@testing-library/react'

// Export custom render function
export { customRender as render, AllTheProviders }
