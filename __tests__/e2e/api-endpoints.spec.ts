import { test, expect } from '@playwright/test'

test.describe('API Endpoints', () => {
  test('should return health check', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('status')
  })

  test('should handle auth endpoints', async ({ request }) => {
    // Test login endpoint
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: 'test@example.com', password: 'password123' }
    })
    expect(loginResponse.status()).toBe(401) // Should fail without valid user
  })
})
