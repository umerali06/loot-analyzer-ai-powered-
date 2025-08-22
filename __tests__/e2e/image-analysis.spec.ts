import { test, expect } from '@playwright/test'

test.describe('Image Analysis Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to analyze page before each test
    await page.goto('/analyze')
  })

  test('should display image upload area', async ({ page }) => {
    // Check that upload area is visible
    await expect(page.getByText('Drag & drop images here')).toBeVisible()
    await expect(page.getByText('or click to browse')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Browse Files' })).toBeVisible()
  })

  test('should handle single image upload', async ({ page }) => {
    // Mock file upload
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Browse Files' }).click()
    const fileChooser = await fileChooserPromise
    
    // Create a mock image file
    const mockImage = Buffer.from('fake-image-data')
    await fileChooser.setFiles([{
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: mockImage
    }])
    
    // Check that file is displayed
    await expect(page.getByText('test-image.jpg')).toBeVisible()
    await expect(page.getByText('Processing...')).toBeVisible()
  })

  test('should handle multiple image uploads', async ({ page }) => {
    // Mock multiple file uploads
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Browse Files' }).click()
    const fileChooser = await fileChooserPromise
    
    // Create mock image files
    const mockImage1 = Buffer.from('fake-image-data-1')
    const mockImage2 = Buffer.from('fake-image-data-2')
    await fileChooser.setFiles([
      {
        name: 'image1.jpg',
        mimeType: 'image/jpeg',
        buffer: mockImage1
      },
      {
        name: 'image2.png',
        mimeType: 'image/png',
        buffer: mockImage2
      }
    ])
    
    // Check that both files are displayed
    await expect(page.getByText('image1.jpg')).toBeVisible()
    await expect(page.getByText('image2.png')).toBeVisible()
    await expect(page.getByText('Processing 2 images...')).toBeVisible()
  })

  test('should show drag and drop state', async ({ page }) => {
    // Simulate drag enter
    const uploadArea = page.locator('[data-testid="upload-area"]')
    await uploadArea.dispatchEvent('dragenter')
    
    // Check that drag active state is shown
    await expect(page.getByText('Drop images here')).toBeVisible()
  })

  test('should validate file types', async ({ page }) => {
    // Mock invalid file upload
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Browse Files' }).click()
    const fileChooser = await fileChooserPromise
    
    // Try to upload a text file
    const mockTextFile = Buffer.from('This is a text file')
    await fileChooser.setFiles([{
      name: 'document.txt',
      mimeType: 'text/plain',
      buffer: mockTextFile
    }])
    
    // Check for file type validation error
    await expect(page.getByText(/invalid file type|unsupported format/i)).toBeVisible()
  })

  test('should validate file size', async ({ page }) => {
    // Mock large file upload
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Browse Files' }).click()
    const fileChooser = await fileChooserPromise
    
    // Create a large mock image (over 10MB)
    const largeImage = Buffer.alloc(11 * 1024 * 1024) // 11MB
    await fileChooser.setFiles([{
      name: 'large-image.jpg',
      mimeType: 'image/jpeg',
      buffer: largeImage
    }])
    
    // Check for file size validation error
    await expect(page.getByText(/file too large|exceeds size limit/i)).toBeVisible()
  })

  test('should show upload progress', async ({ page }) => {
    // Mock file upload with progress
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Browse Files' }).click()
    const fileChooser = await fileChooserPromise
    
    const mockImage = Buffer.from('fake-image-data')
    await fileChooser.setFiles([{
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: mockImage
    }])
    
    // Check that progress bar is visible
    await expect(page.getByRole('progressbar')).toBeVisible()
  })

  test('should handle successful image analysis', async ({ page }) => {
    // Mock successful analysis response
    await page.route('/api/analyze', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                name: 'Vintage Camera',
                estimatedValue: 150.00,
                confidence: 0.85,
                category: 'Electronics',
                condition: 'Good'
              }
            ],
            totalValue: 150.00,
            processingTime: 2.5
          }
        })
      })
    })
    
    // Upload an image
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Browse Files' }).click()
    const fileChooser = await fileChooserPromise
    
    const mockImage = Buffer.from('fake-image-data')
    await fileChooser.setFiles([{
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: mockImage
    }])
    
    // Wait for analysis to complete
    await expect(page.getByText('Analysis Complete')).toBeVisible()
    
    // Check that results are displayed
    await expect(page.getByText('Vintage Camera')).toBeVisible()
    await expect(page.getByText('$150.00')).toBeVisible()
    await expect(page.getByText('85% confidence')).toBeVisible()
  })

  test('should handle analysis errors', async ({ page }) => {
    // Mock failed analysis response
    await page.route('/api/analyze', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Analysis failed'
        })
      })
    })
    
    // Upload an image
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Browse Files' }).click()
    const fileChooser = await fileChooserPromise
    
    const mockImage = Buffer.from('fake-image-data')
    await fileChooser.setFiles([{
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: mockImage
    }])
    
    // Check for error message
    await expect(page.getByText('Analysis failed')).toBeVisible()
  })

  test('should display analysis charts', async ({ page }) => {
    // Mock successful analysis with multiple items
    await page.route('/api/analyze', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              { name: 'Item 1', estimatedValue: 100, confidence: 0.8, category: 'Electronics' },
              { name: 'Item 2', estimatedValue: 200, confidence: 0.9, category: 'Furniture' },
              { name: 'Item 3', estimatedValue: 150, confidence: 0.7, category: 'Electronics' }
            ],
            totalValue: 450.00,
            processingTime: 3.0
          }
        })
      })
    })
    
    // Upload an image
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Browse Files' }).click()
    const fileChooser = await fileChooserPromise
    
    const mockImage = Buffer.from('fake-image-data')
    await fileChooser.setFiles([{
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: mockImage
    }])
    
    // Wait for analysis to complete
    await expect(page.getByText('Analysis Complete')).toBeVisible()
    
    // Check that charts are displayed
    await expect(page.getByText('Value Distribution')).toBeVisible()
    await expect(page.getByText('Confidence Distribution')).toBeVisible()
    await expect(page.getByText('Category Breakdown')).toBeVisible()
    await expect(page.getByText('Top Items')).toBeVisible()
  })

  test('should allow file removal', async ({ page }) => {
    // Upload a file first
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Browse Files' }).click()
    const fileChooser = await fileChooserPromise
    
    const mockImage = Buffer.from('fake-image-data')
    await fileChooser.setFiles([{
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: mockImage
    }])
    
    // Check that file is displayed
    await expect(page.getByText('test-image.jpg')).toBeVisible()
    
    // Remove the file
    await page.getByRole('button', { name: 'Remove' }).click()
    
    // Check that file is no longer displayed
    await expect(page.getByText('test-image.jpg')).not.toBeVisible()
  })

  test('should handle network errors during upload', async ({ page }) => {
    // Mock network error for upload
    await page.route('/api/upload', async route => {
      await route.abort('failed')
    })
    
    // Try to upload an image
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Browse Files' }).click()
    const fileChooser = await fileChooserPromise
    
    const mockImage = Buffer.from('fake-image-data')
    await fileChooser.setFiles([{
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: mockImage
    }])
    
    // Check for network error message
    await expect(page.getByText(/network error|failed to upload/i)).toBeVisible()
  })

  test('should show processing state during analysis', async ({ page }) => {
    // Mock slow analysis response
    await page.route('/api/analyze', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [], totalValue: 0, processingTime: 2.0 }
        })
      })
    })
    
    // Upload an image
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Browse Files' }).click()
    const fileChooser = await fileChooserPromise
    
    const mockImage = Buffer.from('fake-image-data')
    await fileChooser.setFiles([{
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: mockImage
    }])
    
    // Check that processing state is shown
    await expect(page.getByText('Analyzing images...')).toBeVisible()
    await expect(page.getByText('This may take a few moments')).toBeVisible()
  })

  test('should handle empty analysis results', async ({ page }) => {
    // Mock analysis with no items detected
    await page.route('/api/analyze', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [],
            totalValue: 0.00,
            processingTime: 1.5
          }
        })
      })
    })
    
    // Upload an image
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Browse Files' }).click()
    const fileChooser = await fileChooserPromise
    
    const mockImage = Buffer.from('fake-image-data')
    await fileChooser.setFiles([{
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: mockImage
    }])
    
    // Wait for analysis to complete
    await expect(page.getByText('Analysis Complete')).toBeVisible()
    
    // Check that empty state is handled
    await expect(page.getByText('No items detected')).toBeVisible()
    await expect(page.getByText('Try uploading a different image')).toBeVisible()
  })
})
