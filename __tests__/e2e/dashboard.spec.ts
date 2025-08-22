import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard page before each test
    await page.goto('/dashboard')
  })

  test('should display dashboard content', async ({ page }) => {
    // Check that dashboard is visible
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('should show welcome message', async ({ page }) => {
    // Check for welcome message
    await expect(page.getByText(/welcome|hello/i)).toBeVisible()
  })
})
