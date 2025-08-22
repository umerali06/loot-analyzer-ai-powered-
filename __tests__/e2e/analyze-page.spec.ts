import { test, expect } from '@playwright/test'

test.describe('Analyze Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to analyze page before each test
    await page.goto('/analyze')
  })

  test('should display analyze page', async ({ page }) => {
    // Check that analyze page is visible
    await expect(page.getByRole('heading', { name: /analyze|upload/i })).toBeVisible()
  })

  test('should show upload instructions', async ({ page }) => {
    // Check for upload instructions
    await expect(page.getByText(/drag.*drop|click.*browse/i)).toBeVisible()
  })
})
