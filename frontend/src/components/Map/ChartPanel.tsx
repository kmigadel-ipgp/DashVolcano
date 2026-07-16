import React, { useState } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { TASPlot } from '../Charts/TASPlot';
import { AFMPlot } from '../Charts/AFMPlot';
import { MatchMethodFilter } from '../Filters';
import { RockTypeRadarPanel } from './RockTypeRadarPanel';
import { PublicationsTab } from './PublicationsTab';
import { filterSamplesByMethod } from '../../utils/matchMethod';
import type {
  BBox,
  ComparisonVolcanoOption,
  RockTypeComparisonMode,
  Sample,
  SampleFilters,
} from '../../types';
import type { MatchMethod } from '../../utils/matchMethod';

type ChartTab = 'both' | 'tas' | 'afm' | 'radar' | 'publications';

const TAB_OPTIONS: Array<{ value: ChartTab; label: string }> = [
  { value: 'both', label: 'Both' },
  { value: 'tas', label: 'TAS Only' },
  { value: 'afm', label: 'AFM Only' },
  { value: 'radar', label: 'Radar' },
  { value: 'publications', label: 'Publications' },
];

interface ChartPanelProps {
  /** Array of samples to display in charts */
  samples: Sample[];
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when panel is toggled */
  onToggle: () => void;
  /** Callback when panel is closed */
  onClose: () => void;
  /** Selected confidence levels for filtering */
  selectedMatchMethods: MatchMethod[];
  /** Callback when confidence levels change */
  onMatchMethodsChange: (levels: MatchMethod[]) => void;
  /** Active non-spatial sample filters for comparison fetches */
  sampleFilters: SampleFilters;
  /** Label for the primary dataset shown in the radar tab */
  primaryDatasetLabel: string;
  /** Optional comparison bbox for radar-mode comparisons */
  comparisonBbox?: BBox | null;
  /** Whether a comparison bbox is currently being drawn */
  isDrawingComparisonBbox?: boolean;
  /** Start drawing a comparison bbox on the map */
  onStartComparisonBbox?: () => void;
  /** Clear the current comparison bbox */
  onClearComparisonBbox?: () => void;
  /** Active comparison mode for radar/map comparison */
  comparisonMode: RockTypeComparisonMode;
  /** Update the comparison mode */
  onComparisonModeChange: (mode: RockTypeComparisonMode) => void;
  /** Selected comparison volcano for radar/map comparison */
  comparisonVolcano: ComparisonVolcanoOption | null;
  /** Update the selected comparison volcano */
  onComparisonVolcanoChange: (volcano: ComparisonVolcanoOption | null) => void;
  /** Samples shown only in the radar comparison and map overlay */
  comparisonSamples: Sample[];
  /** Loading state for volcano/bbox comparison samples */
  comparisonLoading?: boolean;
  /** Error state for volcano/bbox comparison samples */
  comparisonError?: string | null;
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
  selectedMatchMethods,
  onMatchMethodsChange,
  sampleFilters,
  primaryDatasetLabel,
  comparisonBbox = null,
  isDrawingComparisonBbox = false,
  onStartComparisonBbox,
  onClearComparisonBbox,
  comparisonMode,
  onComparisonModeChange,
  comparisonVolcano,
  onComparisonVolcanoChange,
  comparisonSamples,
  comparisonLoading = false,
  comparisonError = null,
}) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('both');

  // Apply confidence filtering to samples
  const filteredSamples = filterSamplesByMethod(samples, selectedMatchMethods);

  // Filter samples with required oxide data
  const tasValidSamples = filteredSamples.filter(
    s => s.oxides?.['SIO2'] && s.oxides?.['NA2O'] && s.oxides?.['K2O']
  );
  
  const afmValidSamples = filteredSamples.filter(
    s => s.oxides?.['FEOT'] && s.oxides?.['MGO'] && s.oxides?.['NA2O'] && s.oxides?.['K2O']
  );

  const radarValidSamples = filteredSamples.filter(
    sample => sample.material === 'WR' && !!sample.petro?.rock_type
  );

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-volcano-600 text-white px-4 py-2 rounded-t-lg shadow-lg hover:bg-volcano-700 transition-colors z-30"
      >
        <ChevronUp className="w-5 h-5 inline" />
        <span className="ml-2">Show Charts</span>
      </button>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-white border-t-2 border-volcano-600 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-volcano-600 to-volcano-500 text-white">
        <div className="flex items-center gap-4 min-w-0">
          <h3 className="font-semibold text-lg shrink-0">Chemical and Rock-Type Charts</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TAB_OPTIONS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.value
                    ? 'bg-white text-volcano-600'
                    : 'bg-volcano-700 hover:bg-volcano-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm">
            TAS: {tasValidSamples.length} | AFM: {afmValidSamples.length} | WR Radar: {radarValidSamples.length}
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
        {/* Confidence Filter */}
        {samples.length > 0 && (
          <div className="px-4 pt-4 pb-2 bg-gray-50 border-b">
            <MatchMethodFilter
              selectedMethods={selectedMatchMethods}
              onChange={onMatchMethodsChange}
            />
          </div>
        )}

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

            {activeTab === 'radar' && (
              <div className="p-4 w-full">
                <RockTypeRadarPanel
                  samples={samples}
                  sampleFilters={sampleFilters}
                  selectedMatchMethods={selectedMatchMethods}
                  primaryDatasetLabel={primaryDatasetLabel}
                  comparisonBbox={comparisonBbox}
                  isDrawingComparisonBbox={isDrawingComparisonBbox}
                  onStartComparisonBbox={onStartComparisonBbox}
                  onClearComparisonBbox={onClearComparisonBbox}
                  comparisonMode={comparisonMode}
                  onComparisonModeChange={onComparisonModeChange}
                  comparisonVolcano={comparisonVolcano}
                  onComparisonVolcanoChange={onComparisonVolcanoChange}
                  comparisonSamples={comparisonSamples}
                  comparisonLoading={comparisonLoading}
                  comparisonError={comparisonError}
                />
              </div>
            )}

            {activeTab === 'publications' && (
              <div className="p-4 w-full">
                <PublicationsTab
                  samples={filteredSamples}
                  totalSamplesInScope={samples.length}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
