'use client'

import React, { Suspense, lazy, memo, useMemo, useCallback, useEffect } from 'react'
import { ComponentOptimizer, PerformanceMonitor } from '@/lib/performance-optimizer'

interface PerformanceWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  enableLazyLoading?: boolean
  enableMemoization?: boolean
  enableVirtualScrolling?: boolean
  cacheKey?: string
}

/**
 * Performance wrapper component that optimizes rendering and performance
 */
const PerformanceWrapper: React.FC<PerformanceWrapperProps> = ({
  children,
  fallback = <div>Loading...</div>,
  enableLazyLoading = false,
  enableMemoization = false,
  enableVirtualScrolling = false,
  cacheKey
}) => {
  // Track component mount for performance monitoring
  useEffect(() => {
    PerformanceMonitor.trackPageLoad()
  }, [])

  // Memoize children if enabled
  const memoizedChildren = useMemo(() => {
    if (enableMemoization && cacheKey) {
      return ComponentOptimizer.memoize(cacheKey, () => children)
    }
    return children
  }, [children, enableMemoization, cacheKey])

  // Optimize re-renders with useCallback
  const renderChildren = useCallback(() => {
    return memoizedChildren
  }, [memoizedChildren])

  if (enableLazyLoading) {
    return (
      <Suspense fallback={fallback}>
        {renderChildren()}
      </Suspense>
    )
  }

  return <>{renderChildren()}</>
}

/**
 * Lazy load component with performance optimization
 */
export function lazyLoadComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc)
  
  return memo((props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback || <div>Loading...</div>}>
      <LazyComponent {...props} />
    </Suspense>
  ))
}

/**
 * Memoized component wrapper
 */
export function memoizedComponent<T extends React.ComponentType<any>>(
  Component: T,
  propsAreEqual?: (prevProps: Readonly<React.ComponentProps<T>>, nextProps: Readonly<React.ComponentProps<T>>) => boolean
) {
  return memo(Component, propsAreEqual)
}

/**
 * Virtual scrolling wrapper for large lists
 */
export function VirtualScrollWrapper<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  fallback = <div>Loading...</div>
}: {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  fallback?: React.ReactNode
}) {
  const virtualScroller = useMemo(() => {
    return ComponentOptimizer.createVirtualScroller(
      items,
      itemHeight,
      containerHeight,
      renderItem
    )
  }, [items, itemHeight, containerHeight, renderItem])

  return (
    <div style={{ height: containerHeight, overflow: 'auto' }}>
      <div style={{ height: virtualScroller.totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${virtualScroller.offsetY}px)` }}>
          {virtualScroller.visibleItems.map((item, index) => 
            renderItem(item, virtualScroller.startIndex + index)
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(PerformanceWrapper)
