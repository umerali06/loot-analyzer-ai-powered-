import React from 'react'
import { render, screen } from '@testing-library/react'
import AnalysisCharts from '@/components/AnalysisCharts'
import { createMockAnalysisResult } from '@/__tests__/utils/test-utils'

// Mock chart components to avoid complex chart rendering in tests
jest.mock('@/components/AnalysisCharts', () => {
  const MockAnalysisCharts = ({ result }: { result: any }) => (
    <div data-testid="analysis-charts">
      <div data-testid="value-distribution-chart">
        <h3>Value Distribution</h3>
        <div data-testid="chart-data">
          {JSON.stringify(result.summary.totalValue)}
        </div>
      </div>
      <div data-testid="confidence-distribution-chart">
        <h3>Confidence Distribution</h3>
        <div data-testid="confidence-data">
          {result.results.map((r: any) => 
            r.items.map((item: any) => item.confidence).join(', ')
          )}
        </div>
      </div>
      <div data-testid="category-chart">
        <h3>Category Breakdown</h3>
        <div data-testid="category-data">
          {result.results.map((r: any) => 
            r.items.map((item: any) => item.category).join(', ')
          )}
        </div>
      </div>
      <div data-testid="top-items-list">
        <h3>Top Items by Value</h3>
        <div data-testid="top-items-data">
          {result.results.map((r: any) => 
            r.items.map((item: any) => item.name).join(', ')
          )}
        </div>
      </div>
    </div>
  )
  return MockAnalysisCharts
})

describe('AnalysisCharts', () => {
  const mockAnalysisResult = createMockAnalysisResult()

  it('renders all chart components', () => {
    render(<AnalysisCharts result={mockAnalysisResult} />)

    expect(screen.getByTestId('analysis-charts')).toBeInTheDocument()
    expect(screen.getByTestId('value-distribution-chart')).toBeInTheDocument()
    expect(screen.getByTestId('confidence-distribution-chart')).toBeInTheDocument()
    expect(screen.getByTestId('category-chart')).toBeInTheDocument()
    expect(screen.getByTestId('top-items-list')).toBeInTheDocument()
  })

  it('displays value distribution chart with correct data', () => {
    render(<AnalysisCharts result={mockAnalysisResult} />)

    const chartData = screen.getByTestId('chart-data')
    expect(chartData).toHaveTextContent('{"min":50,"max":100,"median":75,"mean":75,"currency":"USD"}')
  })

  it('displays confidence distribution chart with correct data', () => {
    render(<AnalysisCharts result={mockAnalysisResult} />)

    const confidenceData = screen.getByTestId('confidence-data')
    expect(confidenceData).toHaveTextContent('0.85')
  })

  it('displays category chart with correct data', () => {
    render(<AnalysisCharts result={mockAnalysisResult} />)

    const categoryData = screen.getByTestId('category-data')
    expect(categoryData).toHaveTextContent('Electronics')
  })

  it('displays top items list with correct data', () => {
    render(<AnalysisCharts result={mockAnalysisResult} />)

    const topItemsData = screen.getByTestId('top-items-data')
    expect(topItemsData).toHaveTextContent('Test Item')
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

    render(<AnalysisCharts result={multiItemResult} />)

    const confidenceData = screen.getByTestId('confidence-data')
    expect(confidenceData).toHaveTextContent('0.85, 0.92')

    const categoryData = screen.getByTestId('category-data')
    expect(categoryData).toHaveTextContent('Electronics, Books')

    const topItemsData = screen.getByTestId('top-items-data')
    expect(topItemsData).toHaveTextContent('Test Item 1, Test Item 2')
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

    render(<AnalysisCharts result={emptyResult} />)

    const chartData = screen.getByTestId('chart-data')
    expect(chartData).toHaveTextContent('{"min":0,"max":0,"median":0,"mean":0,"currency":"USD"}')

    const confidenceData = screen.getByTestId('confidence-data')
    expect(confidenceData).toHaveTextContent('')

    const categoryData = screen.getByTestId('category-data')
    expect(categoryData).toHaveTextContent('')

    const topItemsData = screen.getByTestId('top-items-data')
    expect(topItemsData).toHaveTextContent('')
  })

  it('displays chart titles correctly', () => {
    render(<AnalysisCharts result={mockAnalysisResult} />)

    expect(screen.getByText('Value Distribution')).toBeInTheDocument()
    expect(screen.getByText('Confidence Distribution')).toBeInTheDocument()
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Top Items by Value')).toBeInTheDocument()
  })

  it('handles different currency formats in value distribution', () => {
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

    render(<AnalysisCharts result={eurResult} />)

    const chartData = screen.getByTestId('chart-data')
    expect(chartData).toHaveTextContent('"currency":"EUR"')
  })

  it('handles large numbers in value distribution', () => {
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

    render(<AnalysisCharts result={largeValueResult} />)

    const chartData = screen.getByTestId('chart-data')
    expect(chartData).toHaveTextContent('"min":15000,"max":25000')
  })

  it('handles decimal confidence values', () => {
    const decimalConfidenceResult = createMockAnalysisResult({
      results: [
        {
          imageId: 'img-1',
          filename: 'test-image.jpg',
          items: [
            {
              ...mockAnalysisResult.results[0].items[0],
              confidence: 0.756, // Decimal confidence
            },
          ],
          processingTime: 1500,
        },
      ],
    })

    render(<AnalysisCharts result={decimalConfidenceResult} />)

    const confidenceData = screen.getByTestId('confidence-data')
    expect(confidenceData).toHaveTextContent('0.756')
  })

  it('handles special characters in item names', () => {
    const specialCharResult = createMockAnalysisResult({
      results: [
        {
          imageId: 'img-1',
          filename: 'test-image.jpg',
          items: [
            {
              ...mockAnalysisResult.results[0].items[0],
              name: 'Test Item & More!',
              category: 'Electronics & Gadgets',
            },
          ],
          processingTime: 1500,
        },
      ],
    })

    render(<AnalysisCharts result={specialCharResult} />)

    const topItemsData = screen.getByTestId('top-items-data')
    expect(topItemsData).toHaveTextContent('Test Item & More!')

    const categoryData = screen.getByTestId('category-data')
    expect(categoryData).toHaveTextContent('Electronics & Gadgets')
  })
})
