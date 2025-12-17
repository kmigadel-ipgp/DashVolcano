import React, { useState } from 'react';
import { ChevronUp, Search, X } from 'lucide-react';

/**
 * Bounding box coordinates
 */
export interface BBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

/**
 * Preset region definitions
 */
const PRESET_REGIONS: { name: string; bbox: BBox }[] = [
  {
    name: 'Europe',
    bbox: { minLon: -10, minLat: 35, maxLon: 40, maxLat: 70 }
  },
  {
    name: 'North America',
    bbox: { minLon: -130, minLat: 24, maxLon: -60, maxLat: 50 }
  },
  {
    name: 'Asia-Pacific',
    bbox: { minLon: 70, minLat: -10, maxLon: 150, maxLat: 50 }
  },
  {
    name: 'South America',
    bbox: { minLon: -82, minLat: -56, maxLon: -34, maxLat: 13 }
  }
];

interface BboxSearchWidgetProps {
  /** Current bounding box */
  bbox: BBox | null;
  /** Whether draw mode is active */
  isDrawing: boolean;
  /** Number of samples in current bbox */
  sampleCount?: number;
  /** Total number of samples (before bbox filter) */
  totalSamples?: number;
  /** Callback when user wants to start drawing */
  onStartDrawing: () => void;
  /** Callback when bbox should be set to a preset region */
  onSetPresetRegion: (bbox: BBox) => void;
  /** Callback when bbox should be cleared */
  onClearBbox: () => void;
}

/**
 * BboxSearchWidget - UI component for spatial bounding box search
 * 
 * Features:
 * - Toggle panel visibility
 * - Draw custom bounding box button
 * - Preset region quick-select buttons
 * - Display current bbox coordinates
 * - Display sample count within bbox
 * - Clear bbox button
 */
export const BboxSearchWidget: React.FC<BboxSearchWidgetProps> = ({
  bbox,
  isDrawing,
  sampleCount,
  totalSamples,
  onStartDrawing,
  onSetPresetRegion,
  onClearBbox
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  const formatBbox = (b: BBox): string => {
    return `(${b.minLon.toFixed(2)}, ${b.minLat.toFixed(2)}) to (${b.maxLon.toFixed(2)}, ${b.maxLat.toFixed(2)})`;
  };

  return (
    <div>
      {/* Collapsed: Single button matching SelectionToolbar style */}
      {!isExpanded && (
        <button
          onClick={toggleExpanded}
          className={`p-4 rounded-lg shadow-lg transition-colors ${
            bbox
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Spatial Search"
          aria-label="Open spatial search"
        >
          <Search className="w-5 h-5" />
        </button>
      )}

      {/* Expanded: Full panel */}
      {isExpanded && (
        <div className="bg-white rounded-lg shadow-lg w-80 max-h-[calc(100vh-2rem)] overflow-y-auto">
          {/* Header */}
          <div
            className="flex items-center justify-between p-3 border-b cursor-pointer hover:bg-gray-50"
            onClick={toggleExpanded}
          >
            <div className="flex items-center gap-2">
              <Search className={`w-5 h-5 ${bbox ? 'text-blue-600' : 'text-gray-700'}`} />
              <h3 className="font-semibold text-gray-900">Spatial Search</h3>
            </div>
            <ChevronUp className="w-5 h-5 text-gray-500" />
          </div>

          {/* Content */}
          <div className="p-3 space-y-3">
            {/* Draw Area Button */}
            <button
              onClick={onStartDrawing}
              disabled={isDrawing}
              className={`w-full py-2 px-3 rounded-md font-medium transition-colors ${
                isDrawing
                  ? 'bg-orange-500 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isDrawing ? 'Drawing Mode Active...' : 'Draw Search Area'}
            </button>

            {/* Current Bbox Display */}
            {bbox && (
              <div className="bg-gray-50 rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Current Area:</span>
                  <button
                    onClick={onClearBbox}
                    className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                    title="Clear bounding box"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-gray-600 font-mono">
                  {formatBbox(bbox)}
                </div>
                {sampleCount !== undefined && (
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold">{sampleCount.toLocaleString()}</span>{' '}
                    {totalSamples !== undefined && (
                      <span className="text-gray-500">
                        of {totalSamples.toLocaleString()}
                      </span>
                    )}{' '}
                    samples
                  </div>
                )}
              </div>
            )}

            {/* Preset Regions */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Quick Regions:</label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_REGIONS.map((region) => (
                  <button
                    key={region.name}
                    onClick={() => onSetPresetRegion(region.bbox)}
                    className="py-2 px-3 text-sm border border-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-500 transition-colors text-gray-700 hover:text-blue-700 font-medium"
                  >
                    {region.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Help Text */}
            <div className="text-xs text-gray-500 pt-2 border-t">
              <p>
                Select a preset region to filter samples by location.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BboxSearchWidget;
