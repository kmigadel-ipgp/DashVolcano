import React, { useState } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { TASPlot } from '../Charts/TASPlot';
import { AFMPlot } from '../Charts/AFMPlot';
import type { Sample } from '../../types';

interface ChartPanelProps {
  /** Array of samples to display in charts */
  samples: Sample[];
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when panel is toggled */
  onToggle: () => void;
  /** Callback when panel is closed */
  onClose: () => void;
}

/**
 * ChartPanel - Collapsible panel for displaying TAS and AFM chemical classification diagrams
 * 
 * Features:
 * - Side-by-side TAS and AFM plots
 * - Collapsible to save screen space
 * - Shows only samples with complete oxide data
 * - Responsive height adjustment
 */
export const ChartPanel: React.FC<ChartPanelProps> = ({
  samples,
  isOpen,
  onToggle,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'both' | 'tas' | 'afm'>('both');

  // Filter samples with required oxide data
  const tasValidSamples = samples.filter(
    s => s.oxides?.['SIO2(WT%)'] && s.oxides?.['NA2O(WT%)'] && s.oxides?.['K2O(WT%)']
  );
  
  const afmValidSamples = samples.filter(
    s => s.oxides?.['FEOT(WT%)'] && s.oxides?.['MGO(WT%)'] && s.oxides?.['NA2O(WT%)'] && s.oxides?.['K2O(WT%)']
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-white border-t-2 border-volcano-600 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-volcano-600 to-volcano-500 text-white">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-lg">Chemical Classification Diagrams</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('both')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                activeTab === 'both'
                  ? 'bg-white text-volcano-600'
                  : 'bg-volcano-700 hover:bg-volcano-800'
              }`}
            >
              Both
            </button>
            <button
              onClick={() => setActiveTab('tas')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                activeTab === 'tas'
                  ? 'bg-white text-volcano-600'
                  : 'bg-volcano-700 hover:bg-volcano-800'
              }`}
            >
              TAS Only
            </button>
            <button
              onClick={() => setActiveTab('afm')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                activeTab === 'afm'
                  ? 'bg-white text-volcano-600'
                  : 'bg-volcano-700 hover:bg-volcano-800'
              }`}
            >
              AFM Only
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm">
            TAS: {tasValidSamples.length} | AFM: {afmValidSamples.length} samples
          </span>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-volcano-700 rounded transition-colors"
            aria-label="Minimize panel"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-volcano-700 rounded transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
        {samples.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">No samples selected</p>
              <p className="text-sm mt-2">Click samples on the map or use selection tools</p>
            </div>
          </div>
        ) : (
          <div className="p-4">
            {activeTab === 'both' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border rounded-lg p-2 bg-gray-50">
                  <h4 className="text-sm font-semibold text-center mb-2 text-gray-700">
                    TAS Diagram ({tasValidSamples.length} samples)
                  </h4>
                  {tasValidSamples.length > 0 ? (
                    <div className="h-96">
                      <TASPlot samples={tasValidSamples} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-96 text-gray-500">
                      No samples with complete TAS data (SiO₂, Na₂O, K₂O)
                    </div>
                  )}
                </div>
                <div className="border rounded-lg p-2 bg-gray-50">
                  <h4 className="text-sm font-semibold text-center mb-2 text-gray-700">
                    AFM Diagram ({afmValidSamples.length} samples)
                  </h4>
                  {afmValidSamples.length > 0 ? (
                    <div className="h-96">
                      <AFMPlot samples={afmValidSamples} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-96 text-gray-500">
                      No samples with complete AFM data (FeOT, MgO, Na₂O, K₂O)
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tas' && (
              <div className="p-4 w-full">
                <div className="border rounded-lg p-4 bg-gray-50 w-full">
                  <h4 className="text-base font-semibold text-left mb-3 text-gray-700">
                    TAS Diagram ({tasValidSamples.length} samples)
                  </h4>
                  {tasValidSamples.length > 0 ? (
                    <div className="h-[600px] w-full">
                      <TASPlot samples={tasValidSamples} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-96 text-gray-500">
                      No samples with complete TAS data (SiO₂, Na₂O, K₂O)
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'afm' && (
              <div className="p-4 w-full">
                <div className="border rounded-lg p-4 bg-gray-50 w-full">
                  <h4 className="text-base font-semibold text-left mb-3 text-gray-700">
                    AFM Diagram ({afmValidSamples.length} samples)
                  </h4>
                  {afmValidSamples.length > 0 ? (
                    <div className="h-[600px] w-full">
                      <AFMPlot samples={afmValidSamples} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-96 text-gray-500">
                      No samples with complete AFM data (FeOT, MgO, Na₂O, K₂O)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Minimized Toggle Button */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-volcano-600 text-white px-4 py-2 rounded-t-lg shadow-lg hover:bg-volcano-700 transition-colors"
        >
          <ChevronUp className="w-5 h-5" />
          <span className="ml-2">Show Charts</span>
        </button>
      )}
    </div>
  );
};
