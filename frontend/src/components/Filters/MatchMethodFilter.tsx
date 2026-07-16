import React from 'react';
import { Link2 } from 'lucide-react';
import type { MatchMethod } from '../../utils/matchMethod';

interface MatchMethodFilterProps {
  selectedMethods: MatchMethod[];
  onChange: (methods: MatchMethod[]) => void;
  className?: string;
}

const METHOD_OPTIONS: Array<{ value: MatchMethod; label: string; description: string; color: string }> = [
  { value: 'literature', label: 'Literature', description: 'Volcano named in the publication', color: 'text-green-700 bg-green-50 border-green-300' },
  { value: 'nearest', label: 'Nearest', description: 'Nearest volcano within 15 km', color: 'text-blue-700 bg-blue-50 border-blue-300' },
  { value: 'no_match', label: 'Unmatched', description: 'No volcano within range', color: 'text-gray-700 bg-gray-50 border-gray-300' },
];

const ALL_METHODS: MatchMethod[] = ['literature', 'nearest', 'no_match'];

/**
 * MatchMethodFilter Component
 *
 * Multi-select filter for the volcano-sample association method
 * (literature match, nearest within 15 km, or unmatched).
 */
export const MatchMethodFilter: React.FC<MatchMethodFilterProps> = ({
  selectedMethods,
  onChange,
  className = '',
}) => {
  const handleToggle = (method: MatchMethod) => {
    if (selectedMethods.includes(method)) {
      onChange(selectedMethods.filter(m => m !== method));
    } else {
      onChange([...selectedMethods, method]);
    }
  };

  const handleSelectAll = () => {
    onChange([...ALL_METHODS]);
  };

  const handleClear = () => {
    onChange([]);
  };

  const allSelected = selectedMethods.length === ALL_METHODS.length;
  const noneSelected = selectedMethods.length === 0;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-gray-700" />
          <h3 className="font-semibold text-gray-900">Association Method Filter</h3>
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
        Filter samples by how they were associated with a volcano
      </p>

      <div className="grid grid-cols-3 gap-2">
        {METHOD_OPTIONS.map(({ value, label, description, color }) => {
          const isSelected = selectedMethods.includes(value);

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

      {selectedMethods.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            Showing samples with: <span className="font-medium text-gray-900">
              {selectedMethods.map(m => METHOD_OPTIONS.find(o => o.value === m)?.label).join(', ')}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
