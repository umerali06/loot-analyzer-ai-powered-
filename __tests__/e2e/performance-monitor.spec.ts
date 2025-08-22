import { test, expect } from '@playwright/test'

test.describe('Performance Monitor', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to performance monitor page before each test
    await page.goto('/performance-monitor')
  })

  test('should display performance monitor', async ({ page }) => {
    // Check that performance monitor is visible
    await expect(page.getByRole('heading', { name: /performance|monitor/i })).toBeVisible()
  })

  test('should show system metrics', async ({ page }) => {
    // Check for system metrics
    await expect(page.getByText(/memory|cpu|uptime/i)).toBeVisible()
  })
})
