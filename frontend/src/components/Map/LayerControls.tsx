import React, { useEffect, useRef, useState } from 'react';
import { ChevronUp, ChevronDown, Layers } from 'lucide-react';
import { getMatchMethodColor, getMatchMethodLabel, ALL_MATCH_METHODS } from '../../utils/matchMethod';
import { BOUNDARY_TYPES, type BoundaryType } from './mapStyle';

/**
 * Props for the LayerControls component
 */
interface LayerControlsProps {
  /** Whether volcano layer is visible */
  showVolcanoes: boolean;
  /** Whether sample points layer is visible */
  showSamplePoints: boolean;
  /** Plate boundary types currently shown */
  visibleBoundaryTypes: BoundaryType[];
  /** Callback when volcano visibility changes */
  onVolcanoesChange: (show: boolean) => void;
  /** Callback when sample points visibility changes */
  onSamplePointsChange: (show: boolean) => void;
  /** Callback when the shown plate boundary types change */
  onBoundaryTypesChange: (types: BoundaryType[]) => void;
}

const rgba = ([r, g, b]: number[], alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`;

/** Volcano marker, as drawn on the map */
const VolcanoSymbol = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2 L22 20 L2 20 Z" fill="rgb(220, 20, 60)" stroke="rgb(180, 0, 40)" strokeWidth="1.5" />
  </svg>
);

/** Sample marker: fill and border as drawn on the map */
const SampleSymbol = ({ fill, stroke }: { fill: string; stroke: string }) => (
  <span className="w-3 h-3 shrink-0 rounded-full border-2" style={{ backgroundColor: fill, borderColor: stroke }} aria-hidden="true" />
);

/** Boundary line, as drawn on the map (70 % opacity) */
const LineSymbol = ({ color }: { color: [number, number, number] }) => (
  <span className="w-5 h-[3px] shrink-0 rounded-full" style={{ backgroundColor: rgba(color, 0.7) }} aria-hidden="true" />
);

const rowClass = 'flex items-center gap-2 min-h-[28px] cursor-pointer text-sm text-gray-700';
const checkboxClass = 'w-4 h-4 shrink-0 border-gray-300 rounded';

/**
 * Map layers: one legend in which every entry can be shown or hidden.
 * Plate boundaries can be shown by type (ridge, trench, transform).
 */
export const LayerControls: React.FC<LayerControlsProps> = ({
  showVolcanoes,
  showSamplePoints,
  visibleBoundaryTypes,
  onVolcanoesChange,
  onSamplePointsChange,
  onBoundaryTypesChange,
}) => {
  // Expanded by default on wide screens, collapsed on phones
  const [isExpanded, setIsExpanded] = useState(() => window.matchMedia('(min-width: 768px)').matches);

  const allBoundaries = visibleBoundaryTypes.length === BOUNDARY_TYPES.length;
  const someBoundaries = visibleBoundaryTypes.length > 0 && !allBoundaries;

  // "Plate boundaries" is a parent checkbox: mixed when only some types are shown
  const boundariesRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (boundariesRef.current) boundariesRef.current.indeterminate = someBoundaries;
  }, [someBoundaries, isExpanded]);

  const toggleBoundaryType = (type: BoundaryType, checked: boolean) => {
    const next = checked ? [...visibleBoundaryTypes, type] : visibleBoundaryTypes.filter((t) => t !== type);
    // Keep the legend order
    onBoundaryTypesChange(BOUNDARY_TYPES.map((b) => b.type).filter((t) => next.includes(t)));
  };

  return (
    <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-md border border-line w-[240px] max-w-[calc(100vw-6rem)]">
      {/* Header - Always Visible */}
      <h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-2 p-4 hover:bg-gray-50 rounded-t-lg transition-colors duration-200"
          aria-expanded={isExpanded}
          aria-controls="map-layers-panel"
        >
          <Layers className="w-4 h-4 text-volcano-600" aria-hidden="true" />
          <span className="text-sm font-semibold text-gray-800 flex-1 text-left">Map Layers</span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-600" aria-hidden="true" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-600" aria-hidden="true" />
          )}
        </button>
      </h2>

      {isExpanded && (
        <div id="map-layers-panel" className="px-4 pb-3 pt-2 border-t border-line space-y-3">
          {/* Volcanoes */}
          <label className={rowClass}>
            <input
              type="checkbox"
              checked={showVolcanoes}
              onChange={(e) => onVolcanoesChange(e.target.checked)}
              className={checkboxClass}
            />
            <span className="flex-1">Volcanoes</span>
            <VolcanoSymbol />
          </label>

          {/* Samples, with the colour key of the association methods */}
          <div>
            <label className={rowClass}>
              <input
                type="checkbox"
                checked={showSamplePoints}
                onChange={(e) => onSamplePointsChange(e.target.checked)}
                className={checkboxClass}
                aria-describedby="map-layers-samples-key"
              />
              <span className="flex-1">Samples</span>
            </label>
            <ul
              id="map-layers-samples-key"
              className={`ml-6 mt-1 space-y-1 text-xs text-gray-600 ${showSamplePoints ? '' : 'opacity-60'}`}
              aria-label="Sample colours"
            >
              {ALL_MATCH_METHODS.map((method) => {
                const color = getMatchMethodColor(method);
                return (
                  <li key={method} className="flex items-center gap-2">
                    <SampleSymbol fill={rgba(color, color[3] / 255)} stroke={rgba(color, 1)} />
                    {getMatchMethodLabel(method)}
                  </li>
                );
              })}
              <li className="flex items-center gap-2">
                <SampleSymbol fill="rgba(255, 140, 0, 0.78)" stroke="rgb(255, 140, 0)" />
                Sample of the selected volcano
              </li>
            </ul>
          </div>

          {/* Plate boundaries, by type */}
          <div>
            <label className={rowClass}>
              <input
                ref={boundariesRef}
                type="checkbox"
                checked={allBoundaries}
                onChange={() => onBoundaryTypesChange(allBoundaries ? [] : BOUNDARY_TYPES.map((b) => b.type))}
                className={checkboxClass}
              />
              <span className="flex-1">Plate boundaries</span>
            </label>
            <div className="ml-6 mt-1 space-y-0.5" role="group" aria-label="Boundary types">
              {BOUNDARY_TYPES.map(({ type, label, color }) => (
                <label key={type} className={`${rowClass} text-xs text-gray-600`}>
                  <input
                    type="checkbox"
                    checked={visibleBoundaryTypes.includes(type)}
                    onChange={(e) => toggleBoundaryType(type, e.target.checked)}
                    className={checkboxClass}
                  />
                  <span className="flex-1">{label}</span>
                  <LineSymbol color={color} />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayerControls;
