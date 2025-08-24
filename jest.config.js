const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^undici$': '<rootDir>/__mocks__/undici.js',
    '^node-fetch$': '<rootDir>/__mocks__/node-fetch.js'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(parse5|domhandler|domutils|entities|nth-check|boolbase)/)',
  ],
  // Handle ES modules properly
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  // Mock problematic modules globally
  setupFiles: ['<rootDir>/jest.setup.js']
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
