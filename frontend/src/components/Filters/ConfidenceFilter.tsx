import React from 'react';
import { Shield } from 'lucide-react';
import type { ConfidenceLevel } from '../../utils/confidence';

interface ConfidenceFilterProps {
  selectedLevels: ConfidenceLevel[];
  onChange: (levels: ConfidenceLevel[]) => void;
  className?: string;
}

const CONFIDENCE_OPTIONS: Array<{ value: ConfidenceLevel; label: string; description: string; color: string }> = [
  { value: 'high', label: 'High', description: 'Strong volcano-sample association', color: 'text-green-700 bg-green-50 border-green-300' },
  { value: 'medium', label: 'Medium', description: 'Moderate association confidence', color: 'text-yellow-700 bg-yellow-50 border-yellow-300' },
  { value: 'low', label: 'Low', description: 'Uncertain association', color: 'text-orange-700 bg-orange-50 border-orange-300' },
  { value: 'unknown', label: 'Unknown', description: 'No confidence metadata available', color: 'text-gray-700 bg-gray-50 border-gray-300' },
];

/**
 * ConfidenceFilter Component
 * 
 * Multi-select filter for confidence levels with visual indicators.
 * Allows users to filter samples based on volcano-sample matching confidence.
 */
export const ConfidenceFilter: React.FC<ConfidenceFilterProps> = ({
  selectedLevels,
  onChange,
  className = '',
}) => {
  const handleToggle = (level: ConfidenceLevel) => {
    if (selectedLevels.includes(level)) {
      // Remove if already selected
      onChange(selectedLevels.filter(l => l !== level));
    } else {
      // Add if not selected
      onChange([...selectedLevels, level]);
    }
  };

  const handleSelectAll = () => {
    onChange(['high', 'medium', 'low', 'unknown']);
  };

  const handleClear = () => {
    onChange([]);
  };

  const allSelected = selectedLevels.length === 4;
  const noneSelected = selectedLevels.length === 0;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-700" />
          <h3 className="font-semibold text-gray-900">Confidence Level Filter</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            disabled={allSelected}
            className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Select All
          </button>
          <button
            onClick={handleClear}
            disabled={noneSelected}
            className="text-xs px-2 py-1 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">
        Filter samples by volcano-sample matching confidence
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {CONFIDENCE_OPTIONS.map(({ value, label, description, color }) => {
          const isSelected = selectedLevels.includes(value);
          
          return (
            <button
              key={value}
              onClick={() => handleToggle(value)}
              className={`
                relative px-3 py-2 rounded-lg border-2 transition-all text-left
                ${isSelected 
                  ? `${color} font-medium` 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }
              `}
              title={description}
            >
              <div className="flex items-center gap-2">
                <div className={`
                  w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                  ${isSelected 
                    ? 'border-current bg-current' 
                    : 'border-gray-300 bg-white'
                  }
                `}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium">{label}</span>
              </div>
              <p className="text-xs mt-1 opacity-75">{description}</p>
            </button>
          );
        })}
      </div>

      {selectedLevels.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            Showing samples with: <span className="font-medium text-gray-900">
              {selectedLevels.map(l => CONFIDENCE_OPTIONS.find(o => o.value === l)?.label).join(', ')}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
