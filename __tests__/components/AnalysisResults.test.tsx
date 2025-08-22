import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import AnalysisResults from '@/components/AnalysisResults'
import { createMockAnalysisResult } from '@/__tests__/utils/test-utils'

describe('AnalysisResults', () => {
  const mockAnalysisResult = createMockAnalysisResult()

  it('renders analysis results correctly', () => {
    render(<AnalysisResults result={mockAnalysisResult} />)

    expect(screen.getByText(/analysis results/i)).toBeInTheDocument()
    expect(screen.getByText(/test-image.jpg/i)).toBeInTheDocument()
    expect(screen.getByText(/test item/i)).toBeInTheDocument()
    expect(screen.getByText(/electronics/i)).toBeInTheDocument()
    expect(screen.getByText(/good/i)).toBeInTheDocument()
  })

  it('displays item details correctly', () => {
    render(<AnalysisResults result={mockAnalysisResult} />)

    expect(screen.getByText(/estimated value/i)).toBeInTheDocument()
    expect(screen.getByText(/\$50 - \$100/i)).toBeInTheDocument()
    expect(screen.getByText(/confidence: 85%/i)).toBeInTheDocument()
    expect(screen.getByText(/processing time: 1.5s/i)).toBeInTheDocument()
  })

  it('shows summary information', () => {
    render(<AnalysisResults result={mockAnalysisResult} />)

    expect(screen.getByText(/summary/i)).toBeInTheDocument()
    expect(screen.getByText(/total images: 1/i)).toBeInTheDocument()
    expect(screen.getByText(/total items: 1/i)).toBeInTheDocument()
    expect(screen.getByText(/total value: \$50 - \$100/i)).toBeInTheDocument()
    expect(screen.getByText(/average confidence: 85%/i)).toBeInTheDocument()
  })

  it('handles multiple items in results', () => {
    const multiItemResult = createMockAnalysisResult({
      results: [
        {
          imageId: 'img-1',
          filename: 'test-image.jpg',
          items: [
            {
              id: 'item-1',
              name: 'Test Item 1',
              description: 'First test item',
              category: 'Electronics',
              condition: 'Good',
              estimatedValue: {
                min: 50,
                max: 100,
                median: 75,
                mean: 75,
                currency: 'USD',
              },
              confidence: 0.85,
            },
            {
              id: 'item-2',
              name: 'Test Item 2',
              description: 'Second test item',
              category: 'Books',
              condition: 'Excellent',
              estimatedValue: {
                min: 20,
                max: 40,
                median: 30,
                mean: 30,
                currency: 'USD',
              },
              confidence: 0.92,
            },
          ],
          processingTime: 2000,
        },
      ],
      summary: {
        totalImages: 1,
        totalItems: 2,
        totalValue: {
          min: 70,
          max: 140,
          median: 105,
          mean: 105,
          currency: 'USD',
        },
        averageConfidence: 0.885,
        processingTime: 2000,
      },
    })

    render(<AnalysisResults result={multiItemResult} />)

    expect(screen.getByText(/test item 1/i)).toBeInTheDocument()
    expect(screen.getByText(/test item 2/i)).toBeInTheDocument()
    expect(screen.getByText(/total items: 2/i)).toBeInTheDocument()
    expect(screen.getByText(/total value: \$70 - \$140/i)).toBeInTheDocument()
  })

  it('displays confidence levels with appropriate styling', () => {
    render(<AnalysisResults result={mockAnalysisResult} />)

    const confidenceElement = screen.getByText(/confidence: 85%/i)
    expect(confidenceElement).toHaveClass('text-green-600')
  })

  it('shows processing time in appropriate format', () => {
    const longProcessingResult = createMockAnalysisResult({
      results: [
        {
          imageId: 'img-1',
          filename: 'test-image.jpg',
          items: mockAnalysisResult.results[0].items,
          processingTime: 5000, // 5 seconds
        },
      ],
    })

    render(<AnalysisResults result={longProcessingResult} />)

    expect(screen.getByText(/processing time: 5.0s/i)).toBeInTheDocument()
  })

  it('handles different currency formats', () => {
    const eurResult = createMockAnalysisResult({
      results: [
        {
          imageId: 'img-1',
          filename: 'test-image.jpg',
          items: [
            {
              ...mockAnalysisResult.results[0].items[0],
              estimatedValue: {
                min: 45,
                max: 90,
                median: 67.5,
                mean: 67.5,
                currency: 'EUR',
              },
            },
          ],
          processingTime: 1500,
        },
      ],
      summary: {
        totalImages: 1,
        totalItems: 1,
        totalValue: {
          min: 45,
          max: 90,
          median: 67.5,
          mean: 67.5,
          currency: 'EUR',
        },
        averageConfidence: 0.85,
        processingTime: 1500,
      },
    })

    render(<AnalysisResults result={eurResult} />)

    expect(screen.getByText(/€45 - €90/i)).toBeInTheDocument()
    expect(screen.getByText(/total value: €45 - €90/i)).toBeInTheDocument()
  })

  it('displays condition with appropriate styling', () => {
    render(<AnalysisResults result={mockAnalysisResult} />)

    const conditionElement = screen.getByText(/good/i)
    expect(conditionElement).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('shows category information', () => {
    render(<AnalysisResults result={mockAnalysisResult} />)

    expect(screen.getByText(/category/i)).toBeInTheDocument()
    expect(screen.getByText(/electronics/i)).toBeInTheDocument()
  })

  it('handles empty results gracefully', () => {
    const emptyResult = createMockAnalysisResult({
      results: [],
      summary: {
        totalImages: 0,
        totalItems: 0,
        totalValue: {
          min: 0,
          max: 0,
          median: 0,
          mean: 0,
          currency: 'USD',
        },
        averageConfidence: 0,
        processingTime: 0,
      },
    })

    render(<AnalysisResults result={emptyResult} />)

    expect(screen.getByText(/no items found/i)).toBeInTheDocument()
    expect(screen.getByText(/total images: 0/i)).toBeInTheDocument()
    expect(screen.getByText(/total items: 0/i)).toBeInTheDocument()
  })

  it('displays metadata when available', () => {
    const resultWithMetadata = createMockAnalysisResult({
      metadata: {
        timestamp: '2024-01-15T10:30:00Z',
        version: '1.2.0',
        options: {
          includeMarketData: true,
          confidenceThreshold: 0.7,
          maxItemsPerImage: 15,
        },
      },
    })

    render(<AnalysisResults result={resultWithMetadata} />)

    expect(screen.getByText(/analysis metadata/i)).toBeInTheDocument()
    expect(screen.getByText(/version: 1.2.0/i)).toBeInTheDocument()
    expect(screen.getByText(/confidence threshold: 70%/i)).toBeInTheDocument()
    expect(screen.getByText(/max items per image: 15/i)).toBeInTheDocument()
  })

  it('formats large numbers correctly', () => {
    const largeValueResult = createMockAnalysisResult({
      results: [
        {
          imageId: 'img-1',
          filename: 'test-image.jpg',
          items: [
            {
              ...mockAnalysisResult.results[0].items[0],
              estimatedValue: {
                min: 15000,
                max: 25000,
                median: 20000,
                mean: 20000,
                currency: 'USD',
              },
            },
          ],
          processingTime: 1500,
        },
      ],
      summary: {
        totalImages: 1,
        totalItems: 1,
        totalValue: {
          min: 15000,
          max: 25000,
          median: 20000,
          mean: 20000,
          currency: 'USD',
        },
        averageConfidence: 0.85,
        processingTime: 1500,
      },
    })

    render(<AnalysisResults result={largeValueResult} />)

    expect(screen.getByText(/\$15,000 - \$25,000/i)).toBeInTheDocument()
    expect(screen.getByText(/total value: \$15,000 - \$25,000/i)).toBeInTheDocument()
  })

  it('handles different confidence levels with appropriate colors', () => {
    const lowConfidenceResult = createMockAnalysisResult({
      results: [
        {
          imageId: 'img-1',
          filename: 'test-image.jpg',
          items: [
            {
              ...mockAnalysisResult.results[0].items[0],
              confidence: 0.45, // Low confidence
            },
          ],
          processingTime: 1500,
        },
      ],
    })

    render(<AnalysisResults result={lowConfidenceResult} />)

    const confidenceElement = screen.getByText(/confidence: 45%/i)
    expect(confidenceElement).toHaveClass('text-red-600')
  })
})
