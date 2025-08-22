import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display home page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sibi|lot.*analyzer/i })).toBeVisible()
  })

  test('should show navigation links', async ({ page }) => {
    await expect(page.getByRole('link', { name: /analyze|dashboard|auth/i })).toBeVisible()
  })
})
