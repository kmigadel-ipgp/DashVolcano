import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Layers } from 'lucide-react';

/**
 * Props for the LayerControls component
 */
interface LayerControlsProps {
  /** Whether volcano layer is visible */
  showVolcanoes: boolean;
  /** Whether sample points layer is visible */
  showSamplePoints: boolean;
  /** Whether tectonic boundaries are visible */
  showTectonicBoundaries: boolean;
  /** Callback when volcano visibility changes */
  onVolcanoesChange: (show: boolean) => void;
  /** Callback when sample points visibility changes */
  onSamplePointsChange: (show: boolean) => void;
  /** Callback when tectonic visibility changes */
  onTectonicsChange: (show: boolean) => void;
}

/**
 * Layer controls component for toggling map layers
 * 
 * Features:
 * - Toggle volcanoes layer (red triangles)
 * - Toggle sample points
 * - Toggle tectonic plate boundaries
 */
export const LayerControls: React.FC<LayerControlsProps> = ({
  showVolcanoes,
  showSamplePoints,
  showTectonicBoundaries,
  onVolcanoesChange,
  onSamplePointsChange,
  onTectonicsChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg min-w-[200px] max-w-[280px] md:max-w-none">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-4 hover:bg-gray-50 rounded-t-lg transition-colors duration-200"
        aria-label={isExpanded ? 'Collapse layer controls' : 'Expand layer controls'}
        aria-expanded={isExpanded}
      >
        <Layers className="w-4 h-4 text-volcano-600" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-gray-800 flex-1 text-left">Map Layers</h3>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-600" aria-hidden="true" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-600" aria-hidden="true" />
        )}
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200">
      
      <div className="space-y-2">
        {/* Volcanoes toggle */}
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showVolcanoes}
            onChange={(e) => onVolcanoesChange(e.target.checked)}
            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
          />
          <span className="ml-2 text-sm text-gray-700">
            Volcanoes
          </span>
          <svg className="ml-auto w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2 L22 20 L2 20 Z" fill="rgb(220, 20, 60)" stroke="rgb(180, 0, 40)" strokeWidth="1.5"/>
          </svg>
        </label>

        {/* Sample points toggle */}
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showSamplePoints}
            onChange={(e) => onSamplePointsChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">
            Sample Points
          </span>
          <span className="ml-auto w-3 h-3 rounded-full bg-blue-400"></span>
        </label>

        {/* Tectonic boundaries toggle */}
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showTectonicBoundaries}
            onChange={(e) => onTectonicsChange(e.target.checked)}
            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
          />
          <span className="ml-2 text-sm text-gray-700">
            Tectonic Plates
          </span>
          <div className="ml-auto flex gap-1">
            <span className="w-3 h-0.5 bg-orange-500"></span>
            <span className="w-3 h-0.5 bg-red-500"></span>
            <span className="w-3 h-0.5 bg-gray-500"></span>
          </div>
        </label>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-xs font-semibold mb-2 text-gray-600">Legend</h4>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex items-center">
            <svg className="w-3 h-3 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2 L22 20 L2 20 Z" fill="rgb(220, 20, 60)" stroke="rgb(180, 0, 40)" strokeWidth="1.5"/>
            </svg>
            <span>Volcano</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-blue-400 mr-2"></span>
            <span>Sample</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: 'rgb(255, 140, 0)' }}></span>
            <span>Selected Volcano Sample</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-orange-500"></span>
            <span className="flex-1">Ridge</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-red-500"></span>
            <span className="flex-1">Trench</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-gray-500"></span>
            <span className="flex-1">Transform</span>
          </div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
};

export default LayerControls;
