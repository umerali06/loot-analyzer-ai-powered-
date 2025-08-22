'use client'

import React, { useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Target,
  Smartphone,
  Monitor,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AnalysisItem {
  id: string
  name: string
  estimatedValue: {
    median: number
    currency: string
  }
  confidence: number
  category?: string
}

interface AnalysisResult {
  id: string
  items: AnalysisItem[]
  summary: {
    totalValue: number
    averageConfidence: number
  }
}

interface AnalysisChartsProps {
  analysisResults: AnalysisResult[]
}

// Memoized chart data calculations
const useChartData = (results: AnalysisResult[]) => {
  return useMemo(() => {
    if (results.length === 0) return null

    // Value distribution data
    const valueRanges = [
      { min: 0, max: 50, label: '$0-$50', count: 0, total: 0 },
      { min: 50, max: 100, label: '$50-$100', count: 0, total: 0 },
      { min: 100, max: 250, label: '$100-$250', count: 0, total: 0 },
      { min: 250, max: 500, label: '$250-$500', count: 0, total: 0 },
      { min: 500, max: 1000, label: '$500-$1000', count: 0, total: 0 },
      { min: 1000, max: Infinity, label: '$1000+', count: 0, total: 0 }
    ]

    // Confidence distribution data
    const confidenceRanges = [
      { min: 0, max: 0.6, label: '0-60%', count: 0, color: 'bg-red-500' },
      { min: 0.6, max: 0.8, label: '60-80%', count: 0, color: 'bg-yellow-500' },
      { min: 0.8, max: 1.0, label: '80-100%', count: 0, color: 'bg-green-500' }
    ]

    // Category distribution data
    const categoryData = new Map<string, { count: number; totalValue: number }>()

    // Process all items
    results.forEach(result => {
      result.items.forEach(item => {
        const value = item.estimatedValue.median
        const confidence = item.confidence
        const category = item.category || 'Unknown'

        // Update value ranges
        for (const range of valueRanges) {
          if (value >= range.min && value < range.max) {
            range.count++
            range.total += value
            break
          }
        }

        // Update confidence ranges
        for (const range of confidenceRanges) {
          if (confidence >= range.min && confidence < range.max) {
            range.count++
            break
          }
        }

        // Update category data
        if (!categoryData.has(category)) {
          categoryData.set(category, { count: 0, totalValue: 0 })
        }
        const catData = categoryData.get(category)!
        catData.count++
        catData.totalValue += value
      })
    })

    // Top items by value
    const allItems = results.flatMap(result => result.items)
    const topItems = allItems
      .sort((a, b) => b.estimatedValue.median - a.estimatedValue.median)
      .slice(0, 10)

    // Summary statistics
    const totalItems = allItems.length
    const totalValue = allItems.reduce((sum, item) => sum + item.estimatedValue.median, 0)
    const averageValue = totalItems > 0 ? totalValue / totalItems : 0
    const averageConfidence = allItems.reduce((sum, item) => sum + item.confidence, 0) / totalItems

    return {
      valueRanges,
      confidenceRanges,
      categoryData: Array.from(categoryData.entries()).map(([name, data]) => ({
        name,
        count: data.count,
        totalValue: data.totalValue,
        averageValue: data.count > 0 ? data.totalValue / data.count : 0
      })),
      topItems,
      summary: {
        totalItems,
        totalValue,
        averageValue,
        averageConfidence
      }
    }
  }, [results])
}

// Memoized value distribution chart
const ValueDistributionChart = React.memo<{
  data: Array<{ label: string; count: number; total: number }>
}>(({ data }) => {
  const maxCount = Math.max(...data.map(d => d.count))
  
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{item.label}</span>
            <span className="text-gray-900 font-medium">
              {item.count} items (${item.total.toFixed(0)})
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
})

ValueDistributionChart.displayName = 'ValueDistributionChart'

// Memoized confidence distribution chart
const ConfidenceDistributionChart = React.memo<{
  data: Array<{ label: string; count: number; color: string }>
}>(({ data }) => {
  const total = data.reduce((sum, item) => sum + item.count, 0)
  
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{item.label}</span>
            <span className="text-gray-900 font-medium">
              {item.count} items ({total > 0 ? ((item.count / total) * 100).toFixed(1) : 0}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${item.color}`}
              style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
})

ConfidenceDistributionChart.displayName = 'ConfidenceDistributionChart'

// Memoized category chart
const CategoryChart = React.memo<{
  data: Array<{ name: string; count: number; totalValue: number; averageValue: number }>
}>(({ data }) => {
  const sortedData = useMemo(() => 
    data.sort((a, b) => b.totalValue - a.totalValue), 
    [data]
  )
  
  const maxValue = Math.max(...sortedData.map(d => d.totalValue))
  
  return (
    <div className="space-y-3">
      {sortedData.slice(0, 8).map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 truncate">{item.name}</span>
            <span className="text-gray-900 font-medium">
              ${item.totalValue.toFixed(0)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${maxValue > 0 ? (item.totalValue / maxValue) * 100 : 0}%` }}
            />
          </div>
          <div className="text-xs text-gray-500">
            {item.count} items • Avg: ${item.averageValue.toFixed(0)}
          </div>
        </div>
      ))}
    </div>
  )
})

CategoryChart.displayName = 'CategoryChart'

// Memoized top items list
const TopItemsList = React.memo<{
  items: Array<{ name: string; estimatedValue: { median: number; currency: string }; confidence: number }>
}>(({ items }) => {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              #{index + 1}
            </Badge>
            <span className="font-medium text-gray-900 truncate">{item.name}</span>
          </div>
          <div className="text-right">
            <div className="font-medium text-green-600">
              {item.estimatedValue.currency}{item.estimatedValue.median.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">
              {(item.confidence * 100).toFixed(0)}% confidence
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})

TopItemsList.displayName = 'TopItemsList'

// Main component
export default function AnalysisCharts({ analysisResults }: AnalysisChartsProps) {
  const chartData = useChartData(analysisResults)

  const handleExportChartData = useCallback(() => {
    if (!chartData) return
    
    const exportData = {
      summary: chartData.summary,
      valueDistribution: chartData.valueRanges,
      confidenceDistribution: chartData.confidenceRanges,
      categoryData: chartData.categoryData,
      topItems: chartData.topItems,
      exportDate: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chart-data-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [chartData])

  if (!chartData) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">No data available for charts</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{chartData.summary.totalItems}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${chartData.summary.totalValue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Average Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${chartData.summary.averageValue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {(chartData.summary.averageConfidence * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Value Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Value Distribution
            </CardTitle>
            <CardDescription>Distribution of items by estimated value</CardDescription>
          </CardHeader>
          <CardContent>
            <ValueDistributionChart data={chartData.valueRanges} />
          </CardContent>
        </Card>

        {/* Confidence Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Confidence Distribution
            </CardTitle>
            <CardDescription>Distribution of items by confidence level</CardDescription>
          </CardHeader>
          <CardContent>
            <ConfidenceDistributionChart data={chartData.confidenceRanges} />
          </CardContent>
        </Card>

        {/* Category Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Category Analysis
            </CardTitle>
            <CardDescription>Total value by category</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryChart data={chartData.categoryData} />
          </CardContent>
        </Card>

        {/* Top Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Items by Value
            </CardTitle>
            <CardDescription>Highest value items</CardDescription>
          </CardHeader>
          <CardContent>
            <TopItemsList items={chartData.topItems} />
          </CardContent>
        </Card>
      </div>

      {/* Mobile Optimized Mini Charts */}
      <div className="lg:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Mobile Summary
            </CardTitle>
            <CardDescription>Optimized for mobile viewing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Simplified value distribution */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Value Ranges</h4>
              <div className="grid grid-cols-2 gap-2">
                {chartData.valueRanges.slice(0, 4).map((item, index) => (
                  <div key={index} className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-xs text-gray-500">{item.label}</div>
                    <div className="font-medium text-gray-900">{item.count}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Simplified confidence distribution */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Confidence Levels</h4>
              <div className="grid grid-cols-3 gap-2">
                {chartData.confidenceRanges.map((item, index) => (
                  <div key={index} className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-xs text-gray-500">{item.label}</div>
                    <div className="font-medium text-gray-900">{item.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="text-center">
        <Button onClick={handleExportChartData} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Chart Data
        </Button>
      </div>
    </div>
  )
}
