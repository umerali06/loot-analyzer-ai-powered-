import '@testing-library/jest-dom'

// Mock undici globally to avoid ES module parsing issues
jest.mock('undici', () => ({
  fetch: jest.fn(),
  request: jest.fn(),
  stream: jest.fn(() => ({
    on: jest.fn(),
    pipe: jest.fn()
  }))
}))

// Mock node-fetch globally
jest.mock('node-fetch', () => jest.fn())

console.log('✅ Jest setup completed with module mocks')
