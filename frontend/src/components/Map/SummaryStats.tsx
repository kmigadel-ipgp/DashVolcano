import React, { useState } from 'react';
import { BarChart3, ChevronUp, ChevronDown } from 'lucide-react';
import type { Sample, Volcano } from '../../types';

interface SummaryStatsProps {
  /** Array of samples currently displayed */
  samples: Sample[];
  /** Array of volcanoes currently displayed */
  volcanoes: Volcano[];
  /** Array of selected samples */
  selectedSamples: Sample[];
  /** Whether data is loading */
  loading?: boolean;
}

/**
 * SummaryStats displays overview statistics for the current map view
 * Shows counts of samples, volcanoes, selected items, and data diversity
 */
export const SummaryStats: React.FC<SummaryStatsProps> = ({
  samples,
  volcanoes,
  selectedSamples,
  loading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  // Calculate unique values
  const uniqueRockTypes = new Set(
    samples.filter(s => s.petro?.rock_type).map(s => s.petro?.rock_type)
  ).size;

  const uniqueCountries = new Set(
    volcanoes.filter(v => v.country).map(v => v.country)
  ).size;

  const uniqueTectonicSettings = new Set([
    ...samples.filter(s => s.tecto).map(s => typeof s.tecto === 'object' ? s.tecto?.ui : s.tecto),
    ...volcanoes.filter(v => v.tectonic_setting).map(v => v.tectonic_setting),
  ]).size;

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg min-w-[280px] md:min-w-[300px]">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 rounded-t-lg transition-colors duration-200"
        aria-label={isExpanded ? 'Collapse data overview' : 'Expand data overview'}
        aria-expanded={isExpanded}
      >
        <BarChart3 className="w-4 h-4 text-volcano-600" aria-hidden="true" />
        <h3 className="font-semibold text-sm text-gray-800 flex-1 text-left">Data Overview</h3>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-600" aria-hidden="true" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-600" aria-hidden="true" />
        )}
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-3 pt-0 border-t border-gray-200">
          {/* Stats Grid */}
          {loading ? (
            <div className="text-sm text-gray-500 text-center py-2">Loading...</div>
          ) : (
            <div className="space-y-1.5">
            {/* Primary Stats */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Samples:</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatNumber(samples.length)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Volcanoes:</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatNumber(volcanoes.length)}
              </span>
            </div>

            {/* Selection Count */}
            {selectedSamples.length > 0 && (
              <div className="flex justify-between items-center pt-1.5 border-t border-gray-100">
                <span className="text-sm text-volcano-600 font-medium">Selected:</span>
                <span className="text-sm font-semibold text-volcano-600">
                  {formatNumber(selectedSamples.length)}
                </span>
              </div>
            )}

            {/* Diversity Stats */}
            <div className="pt-1.5 border-t border-gray-100 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Rock Types:</span>
                <span className="text-xs font-medium text-gray-700">{uniqueRockTypes}</span>
              </div>

              {uniqueCountries > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Countries:</span>
                  <span className="text-xs font-medium text-gray-700">{uniqueCountries}</span>
                </div>
              )}

              {uniqueTectonicSettings > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Tectonic Settings:</span>
                  <span className="text-xs font-medium text-gray-700">{uniqueTectonicSettings}</span>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
};
