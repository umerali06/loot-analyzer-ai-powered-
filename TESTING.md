# Testing Guide

This document provides comprehensive information about the testing setup and how to run tests for the Lot Analyzer application.

## 🧪 Testing Overview

The application uses a multi-layered testing approach:

- **Unit Tests**: Jest + React Testing Library for component and utility testing
- **Integration Tests**: API endpoint testing with supertest
- **End-to-End Tests**: Playwright for complete user workflow testing
- **Performance Tests**: Built-in benchmarking and load testing
- **Security Tests**: Authentication and authorization validation

## 🚀 Quick Start

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:coverage

# End-to-end tests
npm run test:e2e

# All tests in CI mode
npm run test:ci
```

## 📁 Test Structure

```
__tests__/
├── components/          # Component unit tests
├── lib/                 # Utility function tests
├── api/                 # API integration tests
├── e2e/                 # End-to-end tests
├── mocks/               # Mock data and handlers
└── utils/               # Test utilities and helpers
```

## 🧩 Unit Testing

### Component Testing

Components are tested using React Testing Library with custom render functions that include necessary providers.

```typescript
import { render, screen } from '@/__tests__/utils/test-utils'
import { LoginForm } from '@/components/auth/LoginForm'

describe('LoginForm', () => {
  it('renders login form correctly', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })
})
```

### Utility Testing

Utility functions are tested with mocked dependencies and edge cases.

```typescript
import { validatePassword } from '@/lib/auth-utils'

describe('validatePassword', () => {
  it('validates strong passwords correctly', () => {
    const result = validatePassword('StrongPass123!')
    expect(result.isValid).toBe(true)
    expect(result.score).toBeGreaterThan(3)
  })
})
```

## 🔌 Integration Testing

### API Testing

API endpoints are tested using supertest with mocked database and cache services.

```typescript
import request from 'supertest'
import { app } from '@/app'

describe('POST /api/auth/login', () => {
  it('authenticates valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      })
    
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.accessToken).toBeDefined()
  })
})
```

## 🌐 End-to-End Testing

### Playwright Setup

End-to-end tests use Playwright for cross-browser testing with realistic user interactions.

```typescript
import { test, expect } from '@playwright/test'

test('complete analysis workflow', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Get Started')
  
  // Upload image
  await page.setInputFiles('input[type="file"]', 'test-image.jpg')
  await page.click('button:has-text("Analyze")')
  
  // Wait for results
  await expect(page.locator('.analysis-results')).toBeVisible()
  await expect(page.locator('text=Estimated Value')).toBeVisible()
})
```

## 📊 Test Coverage

### Coverage Requirements

- **Overall Coverage**: ≥80%
- **Component Coverage**: ≥90%
- **Utility Coverage**: ≥85%
- **API Coverage**: ≥80%

### Coverage Reports

Coverage reports are generated automatically and can be viewed:

```bash
npm run test:coverage
```

Reports are available in the `coverage/` directory.

## 🔧 Test Configuration

### Jest Configuration

Jest is configured in `jest.config.js` with:

- Next.js integration
- TypeScript support
- Coverage thresholds
- Custom test environment

### Playwright Configuration

Playwright configuration in `playwright.config.ts` includes:

- Multiple browser support
- Mobile device testing
- Screenshot and video capture
- Global setup/teardown

## 🚦 CI/CD Integration

### GitHub Actions

Automated testing runs on:

- Push to main/develop branches
- Pull requests
- Multiple Node.js versions
- Parallel test execution

### Quality Gates

Tests must pass:

- All unit tests
- All integration tests
- All end-to-end tests
- Coverage thresholds
- Security checks
- Linting and type checking

## 🧪 Running Tests Locally

### Development Mode

```bash
# Watch mode for development
npm run test:watch

# Single test file
npm test -- --testPathPattern=LoginForm

# Specific test
npm test -- --testNamePattern="should validate email"
```

### Production Mode

```bash
# CI mode (no watch, with coverage)
npm run test:ci

# Coverage only
npm run test:coverage
```

## 🎭 Mocking Strategy

### API Mocking

- **MSW (Mock Service Worker)** for browser tests
- **Jest mocks** for unit tests
- **Supertest** for API integration tests

### Database Mocking

- **In-memory MongoDB** for testing
- **Mock collections** for isolated tests
- **Test data factories** for consistent test data

## 🐛 Debugging Tests

### Debug Mode

```bash
# Debug Jest tests
npm test -- --detectOpenHandles --forceExit

# Debug Playwright tests
npm run test:e2e -- --debug
```

### Test Isolation

- Each test runs in isolation
- Database is cleaned between tests
- Mocks are reset automatically
- No shared state between tests

## 📝 Writing Tests

### Test Naming Convention

```typescript
describe('ComponentName', () => {
  describe('when condition', () => {
    it('should expected behavior', () => {
      // test implementation
    })
  })
})
```

### Test Structure

```typescript
describe('FunctionName', () => {
  it('should handle valid input correctly', () => {
    // Arrange
    const input = 'valid input'
    
    // Act
    const result = functionName(input)
    
    // Assert
    expect(result).toBe('expected output')
  })
  
  it('should handle invalid input gracefully', () => {
    // Test error cases
  })
  
  it('should handle edge cases', () => {
    // Test boundary conditions
  })
})
```

## 🔍 Performance Testing

### Built-in Benchmarks

The application includes performance benchmarking:

```bash
# Run performance tests
npm run test:optimization

# Run load tests
npm run test:load
```

### Metrics Collected

- Response times
- Memory usage
- CPU utilization
- Cache hit rates
- Database query performance

## 🛡️ Security Testing

### Authentication Tests

- JWT token validation
- Password strength validation
- Session management
- Role-based access control

### Security Checks

```bash
# Run security validation
npm run security-check

# Test authentication flows
npm run test-auth
```

## 📈 Continuous Improvement

### Test Metrics

- Test execution time
- Coverage trends
- Flaky test detection
- Performance regression detection

### Best Practices

- Write tests before implementation (TDD)
- Keep tests focused and isolated
- Use descriptive test names
- Mock external dependencies
- Test error conditions
- Maintain high coverage

## 🆘 Troubleshooting

### Common Issues

1. **Test Environment**: Ensure `.env.local` exists with test values
2. **Database Connection**: MongoDB must be running for integration tests
3. **Redis Connection**: Redis must be running for cache tests
4. **Browser Dependencies**: Install Playwright browsers with `npx playwright install`

### Getting Help

- Check test logs for detailed error messages
- Review coverage reports for untested code
- Use debug mode for step-by-step execution
- Consult Playwright and Jest documentation

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [MSW Documentation](https://mswjs.io/docs/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
