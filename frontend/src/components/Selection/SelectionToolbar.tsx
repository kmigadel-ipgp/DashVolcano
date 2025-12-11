import React from 'react';
import { Lasso, Square, X, Download, BarChart3 } from 'lucide-react';

export type SelectionMode = 'none' | 'lasso' | 'box';

interface SelectionToolbarProps {
  /** Current selection mode */
  mode: SelectionMode;
  /** Number of samples currently selected */
  selectedCount: number;
  /** Number of samples in current filtered view (e.g., bbox search) */
  filteredSampleCount?: number;
  /** Whether bbox filter is active */
  hasBboxFilter?: boolean;
  /** Callback when selection mode changes */
  onModeChange: (mode: SelectionMode) => void;
  /** Callback to clear selection */
  onClearSelection: () => void;
  /** Callback to download selected samples */
  onDownloadSelection: () => void;
  /** Callback to show chemical classification charts */
  onShowCharts: () => void;
}

/**
 * SelectionToolbar Component
 * 
 * Provides tools for selecting samples on the map:
 * - Lasso selection (freeform polygon)
 * - Box selection (rectangular area)
 * - Clear selection
 * - Download selected samples as CSV
 * 
 * Features:
 * - Active tool highlighting
 * - Selected sample count display
 * - Enable/disable download button based on selection
 */
export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  mode,
  selectedCount,
  filteredSampleCount = 0,
  hasBboxFilter = false,
  onModeChange,
  onClearSelection,
  onDownloadSelection,
  onShowCharts,
}) => {
  // Show chart button if: manual selection exists OR bbox filter is active with samples
  const showChartButton = selectedCount > 0 || (hasBboxFilter && filteredSampleCount > 0);
  return (
    <div className="bg-white rounded-lg shadow-lg p-2 flex flex-col gap-2 w-fit">
      {/* Lasso Tool */}
      <button
        onClick={() => onModeChange(mode === 'lasso' ? 'none' : 'lasso')}
        className={`p-2 rounded transition-colors ${
          mode === 'lasso'
            ? 'bg-volcano-600 text-white'
            : 'hover:bg-gray-100 text-gray-700'
        }`}
        title="Lasso Selection"
        aria-label="Lasso selection tool"
      >
        <Lasso className="w-5 h-5" />
      </button>

      {/* Box Tool */}
      <button
        onClick={() => onModeChange(mode === 'box' ? 'none' : 'box')}
        className={`p-2 rounded transition-colors ${
          mode === 'box'
            ? 'bg-volcano-600 text-white'
            : 'hover:bg-gray-100 text-gray-700'
        }`}
        title="Box Selection"
        aria-label="Box selection tool"
      >
        <Square className="w-5 h-5" />
      </button>

      {/* Divider */}
      {(selectedCount > 0 || (hasBboxFilter && filteredSampleCount > 0)) && <div className="border-t border-gray-200 my-1" />}

      {/* Clear Selection */}
      {selectedCount > 0 && (
        <button
          onClick={onClearSelection}
          className="p-2 rounded hover:bg-gray-100 text-gray-700"
          title="Clear Selection"
          aria-label="Clear selection"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Show Charts */}
      {showChartButton && (
        <button
          onClick={onShowCharts}
          className="p-2 rounded hover:bg-gray-100 text-gray-700"
          title={hasBboxFilter && selectedCount === 0 
            ? `Show charts for ${filteredSampleCount} samples in search area`
            : "Show Chemical Classification Diagrams"}
          aria-label="Show TAS/AFM charts"
        >
          <BarChart3 className="w-5 h-5" />
        </button>
      )}

      {/* Download Selection */}
      {(selectedCount > 0 || (hasBboxFilter && filteredSampleCount > 0)) && (
        <button
          onClick={onDownloadSelection}
          className="p-2 rounded hover:bg-gray-100 text-gray-700"
          title={selectedCount > 0 
            ? `Download ${selectedCount} selected samples`
            : `Download ${filteredSampleCount} samples in search area`}
          aria-label="Download samples"
        >
          <Download className="w-5 h-5" />
        </button>
      )}

      {/* Selection Count */}
      {(selectedCount > 0 || (hasBboxFilter && filteredSampleCount > 0)) && (
        <div className="px-2 py-1 text-xs font-medium text-gray-700 text-center border-t border-gray-200 mt-1 pt-2">
          {selectedCount > 0 
            ? `${selectedCount} selected`
            : `${filteredSampleCount} in area`}
        </div>
      )}
    </div>
  );
};

export default SelectionToolbar;
