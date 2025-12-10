/**
 * Loading skeleton components for better perceived performance
 * Provides animated placeholders while content is loading
 */

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Base skeleton component with shimmer animation
 */
const SkeletonBase = ({ className = '', style }: SkeletonProps) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

/**
 * Card skeleton - for card-based layouts
 */
export const CardSkeleton = ({ className = '' }: SkeletonProps) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-start gap-4 mb-4">
        <SkeletonBase className="w-12 h-12 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <SkeletonBase className="h-6 w-3/4" />
          <SkeletonBase className="h-4 w-full" />
          <SkeletonBase className="h-4 w-5/6" />
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonBase className="h-4 w-full" />
        <SkeletonBase className="h-4 w-4/5" />
        <SkeletonBase className="h-4 w-3/4" />
      </div>
    </div>
  );
};

/**
 * Chart skeleton - for Plotly chart areas
 */
export const ChartSkeleton = ({ className = '', height = '500px' }: SkeletonProps & { height?: string }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      <div className="space-y-3 mb-4">
        <SkeletonBase className="h-6 w-1/3" />
        <SkeletonBase className="h-4 w-1/2" />
      </div>
      <SkeletonBase className="w-full" style={{ height }} />
      <div className="mt-4 flex justify-center gap-4">
        <SkeletonBase className="h-3 w-20" />
        <SkeletonBase className="h-3 w-20" />
        <SkeletonBase className="h-3 w-20" />
      </div>
    </div>
  );
};

/**
 * Table skeleton - for data tables
 */
export const TableSkeleton = ({ className = '', rows = 5 }: SkeletonProps & { rows?: number }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <div className="flex gap-4">
          <SkeletonBase className="h-4 w-32" />
          <SkeletonBase className="h-4 w-24" />
          <SkeletonBase className="h-4 w-40" />
          <SkeletonBase className="h-4 w-28" />
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={`table-row-${i}`} className="p-4">
            <div className="flex gap-4">
              <SkeletonBase className="h-4 w-32" />
              <SkeletonBase className="h-4 w-24" />
              <SkeletonBase className="h-4 w-40" />
              <SkeletonBase className="h-4 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Text skeleton - for text lines
 */
export const TextSkeleton = ({ className = '', lines = 3 }: SkeletonProps & { lines?: number }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase 
          key={i} 
          className="h-4"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
};

/**
 * Statistics card skeleton - for summary stats
 */
export const StatsSkeleton = ({ className = '' }: SkeletonProps) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <SkeletonBase className="w-10 h-10 rounded-full" />
        <SkeletonBase className="h-5 w-32" />
      </div>
      <div className="space-y-3">
        <div className="flex justify-between">
          <SkeletonBase className="h-4 w-24" />
          <SkeletonBase className="h-4 w-16" />
        </div>
        <div className="flex justify-between">
          <SkeletonBase className="h-4 w-28" />
          <SkeletonBase className="h-4 w-20" />
        </div>
        <div className="flex justify-between">
          <SkeletonBase className="h-4 w-20" />
          <SkeletonBase className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
};

/**
 * Page skeleton - full page with header and content
 */
export const PageSkeleton = ({ className = '' }: SkeletonProps) => {
  return (
    <div className={`min-h-screen bg-gray-50 py-8 ${className}`}>
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <SkeletonBase className="w-16 h-16 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <SkeletonBase className="h-8 w-2/3" />
              <SkeletonBase className="h-5 w-full" />
            </div>
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="space-y-6">
          <CardSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
};
