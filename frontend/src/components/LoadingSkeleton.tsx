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
    <div className={`card p-6 ${className}`}>
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
    <div className={`card p-4 ${className}`}>
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
