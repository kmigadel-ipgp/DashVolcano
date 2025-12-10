import React from 'react';

/**
 * Props for the ViewportControls component
 */
interface ViewportControlsProps {
  /** Current viewport state */
  viewport: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  /** Callback to zoom in */
  onZoomIn: () => void;
  /** Callback to zoom out */
  onZoomOut: () => void;
  /** Callback to reset view to initial state */
  onResetView: () => void;
}

/**
 * Viewport controls component for map navigation
 * 
 * Features:
 * - Zoom in/out buttons
 * - Reset view button
 * - Current coordinates display
 * - Current zoom level display
 */
export const ViewportControls: React.FC<ViewportControlsProps> = ({
  viewport,
  onZoomIn,
  onZoomOut,
  onResetView,
}) => {
  return (
    <div className="absolute bottom-4 right-4 z-10">
      {/* Coordinates display */}
      <div className="bg-white rounded-lg shadow-lg p-3 mb-2 text-xs text-gray-700">
        <div className="font-mono">
          <div>Lat: {viewport.latitude.toFixed(4)}°</div>
          <div>Lon: {viewport.longitude.toFixed(4)}°</div>
          <div>Zoom: {viewport.zoom.toFixed(1)}</div>
        </div>
      </div>

      {/* Control buttons */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Zoom in */}
        <button
          onClick={onZoomIn}
          className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 border-b border-gray-200 transition-colors"
          title="Zoom in"
        >
          <svg
            className="w-5 h-5 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>

        {/* Zoom out */}
        <button
          onClick={onZoomOut}
          className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 border-b border-gray-200 transition-colors"
          title="Zoom out"
        >
          <svg
            className="w-5 h-5 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 12H4"
            />
          </svg>
        </button>

        {/* Reset view */}
        <button
          onClick={onResetView}
          className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
          title="Reset view"
        >
          <svg
            className="w-5 h-5 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ViewportControls;
