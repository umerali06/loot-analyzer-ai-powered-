import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to auth page before each test
    await page.goto('/auth')
  })

  test('should display login form by default', async ({ page }) => {
    // Check that login form is visible
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible()
  })

  test('should switch to register form', async ({ page }) => {
    // Click on switch to register link
    await page.getByRole('link', { name: 'Create an account' }).click()
    
    // Check that register form is visible
    await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible()
    await expect(page.getByLabel('Username')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByLabel('Confirm Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Register' })).toBeVisible()
  })

  test('should switch back to login form', async ({ page }) => {
    // First switch to register
    await page.getByRole('link', { name: 'Create an account' }).click()
    
    // Then switch back to login
    await page.getByRole('link', { name: 'Already have an account?' }).click()
    
    // Check that login form is visible again
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
  })

  test('should show validation errors for empty fields on login', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: 'Login' }).click()
    
    // Check for validation errors
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('should show validation errors for empty fields on register', async ({ page }) => {
    // Switch to register form
    await page.getByRole('link', { name: 'Create an account' }).click()
    
    // Try to submit empty form
    await page.getByRole('button', { name: 'Register' }).click()
    
    // Check for validation errors
    await expect(page.getByText('Username is required')).toBeVisible()
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('should show validation errors for invalid email', async ({ page }) => {
    // Enter invalid email
    await page.getByLabel('Email').fill('invalid-email')
    await page.getByLabel('Password').fill('password123')
    
    // Try to submit
    await page.getByRole('button', { name: 'Login' }).click()
    
    // Check for email validation error
    await expect(page.getByText('Please enter a valid email address')).toBeVisible()
  })

  test('should show password strength indicator on register', async ({ page }) => {
    // Switch to register form
    await page.getByRole('link', { name: 'Create an account' }).click()
    
    // Enter a weak password
    await page.getByLabel('Password').fill('weak')
    
    // Check that password strength indicator is visible
    await expect(page.getByText('Password Strength')).toBeVisible()
    await expect(page.getByText('Very Weak')).toBeVisible()
  })

  test('should show password strength indicator for strong password', async ({ page }) => {
    // Switch to register form
    await page.getByRole('link', { name: 'Create an account' }).click()
    
    // Enter a strong password
    await page.getByLabel('Password').fill('StrongPass123!')
    
    // Check that password strength indicator shows strong
    await expect(page.getByText('Strong')).toBeVisible()
  })

  test('should show password mismatch error on register', async ({ page }) => {
    // Switch to register form
    await page.getByRole('link', { name: 'Create an account' }).click()
    
    // Enter different passwords
    await page.getByLabel('Password').fill('password123')
    await page.getByLabel('Confirm Password').fill('different123')
    
    // Try to submit
    await page.getByRole('button', { name: 'Register' }).click()
    
    // Check for password mismatch error
    await expect(page.getByText('Passwords do not match')).toBeVisible()
  })

  test('should toggle password visibility', async ({ page }) => {
    // Enter password
    await page.getByLabel('Password').fill('password123')
    
    // Check that password is hidden by default
    await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password')
    
    // Click toggle button
    await page.getByRole('button', { name: 'Toggle password visibility' }).click()
    
    // Check that password is now visible
    await expect(page.getByLabel('Password')).toHaveAttribute('type', 'text')
    
    // Click toggle button again
    await page.getByRole('button', { name: 'Toggle password visibility' }).click()
    
    // Check that password is hidden again
    await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password')
  })

  test('should handle successful login', async ({ page }) => {
    // Mock successful login response
    await page.route('/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { id: '1', username: 'testuser', email: 'test@example.com' },
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token'
          }
        })
      })
    })
    
    // Fill login form
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('password123')
    
    // Submit form
    await page.getByRole('button', { name: 'Login' }).click()
    
    // Check that user is redirected to dashboard
    await expect(page).toHaveURL('/dashboard')
  })

  test('should handle login error', async ({ page }) => {
    // Mock failed login response
    await page.route('/api/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        })
      })
    })
    
    // Fill login form
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    
    // Submit form
    await page.getByRole('button', { name: 'Login' }).click()
    
    // Check for error message
    await expect(page.getByText('Invalid credentials')).toBeVisible()
  })

  test('should handle successful registration', async ({ page }) => {
    // Mock successful registration response
    await page.route('/api/auth/register', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { id: '1', username: 'newuser', email: 'new@example.com' },
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token'
          }
        })
      })
    })
    
    // Switch to register form
    await page.getByRole('link', { name: 'Create an account' }).click()
    
    // Fill register form
    await page.getByLabel('Username').fill('newuser')
    await page.getByLabel('Email').fill('new@example.com')
    await page.getByLabel('Password').fill('StrongPass123!')
    await page.getByLabel('Confirm Password').fill('StrongPass123!')
    
    // Submit form
    await page.getByRole('button', { name: 'Register' }).click()
    
    // Check that user is redirected to dashboard
    await expect(page).toHaveURL('/dashboard')
  })

  test('should handle registration error', async ({ page }) => {
    // Mock failed registration response
    await page.route('/api/auth/register', async route => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'User already exists'
        })
      })
    })
    
    // Switch to register form
    await page.getByRole('link', { name: 'Create an account' }).click()
    
    // Fill register form
    await page.getByLabel('Username').fill('existinguser')
    await page.getByLabel('Email').fill('existing@example.com')
    await page.getByLabel('Password').fill('StrongPass123!')
    await page.getByLabel('Confirm Password').fill('StrongPass123!')
    
    // Submit form
    await page.getByRole('button', { name: 'Register' }).click()
    
    // Check for error message
    await expect(page.getByText('User already exists')).toBeVisible()
  })

  test('should remember form data on form switch', async ({ page }) => {
    // Fill login form
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('password123')
    
    // Switch to register form
    await page.getByRole('link', { name: 'Create an account' }).click()
    
    // Switch back to login form
    await page.getByRole('link', { name: 'Already have an account?' }).click()
    
    // Check that form data is preserved
    await expect(page.getByLabel('Email')).toHaveValue('test@example.com')
    await expect(page.getByLabel('Password')).toHaveValue('password123')
  })

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('/api/auth/login', async route => {
      await route.abort('failed')
    })
    
    // Fill login form
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('password123')
    
    // Submit form
    await page.getByRole('button', { name: 'Login' }).click()
    
    // Check for network error message
    await expect(page.getByText(/network error|failed to fetch/i)).toBeVisible()
  })

  test('should show loading state during form submission', async ({ page }) => {
    // Mock slow response
    await page.route('/api/auth/login', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { user: { id: '1' } }
        })
      })
    })
    
    // Fill login form
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('password123')
    
    // Submit form
    await page.getByRole('button', { name: 'Login' }).click()
    
    // Check that button shows loading state
    await expect(page.getByRole('button', { name: 'Logging in...' })).toBeVisible()
  })
})
