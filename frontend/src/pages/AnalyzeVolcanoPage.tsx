import React, { useState, useEffect, useMemo } from 'react';
import { Mountain, Download, TrendingUp } from 'lucide-react';
import { TASPlot } from '../components/Charts/TASPlot';
import { AFMPlot } from '../components/Charts/AFMPlot';
import { RockTypeDistributionChart } from '../components/Charts/RockTypeDistributionChart';
import { exportSamplesToCSV } from '../utils/csvExport';
import {
  hasAfmOxides,
  hasTasOxides,
  transformChemicalAnalysisSamples,
  type ChemicalAnalysisAllSample,
} from '../utils/chemicalAnalysisSamples';
import { useKeyboardShortcuts, commonShortcuts } from '../hooks/useKeyboardShortcuts';
import { showError } from '../utils/toast';
import { CardSkeleton, ChartSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { ConfidenceFilter } from '../components/Filters';
import {
  createVolcanoAutocompleteOptions,
  filterVolcanoAutocompleteOptions,
  type VolcanoAutocompleteOption,
  type VolcanoAutocompleteSource,
} from '../utils/volcanoAutocomplete';
import type { Sample } from '../types';
import type { ConfidenceLevel } from '../utils/confidence';
import { filterSamplesByConfidence, calculateRockTypeDistribution } from '../utils/confidence';

interface ChemicalAnalysisData {
  volcano_number: number;
  volcano_name: string;
  samples_count: number;
  samples?: Array<{} & ChemicalAnalysisAllSample>;
  all_samples?: Array<{} & ChemicalAnalysisAllSample>;
  rock_types: Record<string, number>;
  rock_types_wr: Record<string, number>;  // Rock types for Whole Rock (WR) samples only
}

/**
 * AnalyzeVolcanoPage - Comprehensive chemical analysis for a selected volcano
 * 
 * Features:
 * - Volcano selection with autocomplete
 * - TAS diagram (Total Alkali vs Silica)
 * - AFM diagram (Alkali-FeO-MgO ternary)
 * - Chemical composition statistics
 * - CSV data export
 */
const AnalyzeVolcanoPage: React.FC = () => {
  const [volcanoes, setVolcanoes] = useState<VolcanoAutocompleteSource[]>([]);
  const [selectedVolcano, setSelectedVolcano] = useState<VolcanoAutocompleteOption | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [chemicalData, setChemicalData] = useState<ChemicalAnalysisData | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // TAS by VEI data
  const [samplesWithVEI, setSamplesWithVEI] = useState<Sample[]>([]);
  const [veiLoading, setVeiLoading] = useState(false);
  
  // Confidence level filter
  const [selectedConfidenceLevels, setSelectedConfidenceLevels] = useState<ConfidenceLevel[]>(['high', 'medium', 'low', 'unknown']);

  // Load volcano names on mount
  useEffect(() => {
    const loadVolcanoes = async () => {
      try {
        const response = await fetch('/api/volcanoes/summary');
        const data = await response.json();
        setVolcanoes(data.data || []);
      } catch (err) {
        console.error('Failed to load volcanoes:', err);
      }
    };
    loadVolcanoes();
  }, []);

  // Fetch chemical analysis data when volcano is selected
  useEffect(() => {
    if (!selectedVolcano) {
      setChemicalData(null);
      setSamples([]);
      return;
    }

    const loadChemicalData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/volcanoes/${selectedVolcano.volcano_number}/chemical-analysis`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch chemical analysis data');
        }

        const data = await response.json();
        setChemicalData(data);
        const analysisSamples = data.samples && data.samples.length > 0
          ? data.samples
          : data.all_samples || [];
        setSamples(transformChemicalAnalysisSamples(analysisSamples));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        showError(`Failed to load chemical analysis: ${errorMessage}`);
        setChemicalData(null);
        setSamples([]);
      } finally {
        setLoading(false);
      }
    };

    loadChemicalData();
  }, [selectedVolcano]);

  // Fetch samples with VEI when volcano is selected
  useEffect(() => {
    if (!selectedVolcano) {
      setSamplesWithVEI([]);
      return;
    }

    const loadVEIData = async () => {
      setVeiLoading(true);
      try {
        const response = await fetch(
          `/api/analytics/volcano/${selectedVolcano.volcano_number}/samples-with-vei`
        );
        
        if (response.ok) {
          const data = await response.json();
          setSamplesWithVEI(data.samples_with_vei || []);
        }
      } catch (err) {
        console.error('Failed to load VEI data:', err);
        setSamplesWithVEI([]);
      } finally {
        setVeiLoading(false);
      }
    };

    loadVEIData();
  }, [selectedVolcano]);

  const volcanoOptions = useMemo(
    () => createVolcanoAutocompleteOptions(volcanoes),
    [volcanoes],
  );

  // Filter volcano suggestions
  const filteredVolcanoNames = searchInput
    ? filterVolcanoAutocompleteOptions(volcanoOptions, searchInput).slice(0, 10)
    : [];

  const handleVolcanoSelect = (volcano: VolcanoAutocompleteOption) => {
    setSelectedVolcano(volcano);
    setSearchInput(volcano.label);
    setShowSuggestions(false);
  };

  // Filter samples by confidence level
  const filteredSamples = filterSamplesByConfidence(samples, selectedConfidenceLevels);
  const filteredSamplesWithVEI = filterSamplesByConfidence(samplesWithVEI, selectedConfidenceLevels);
  const totalTasSamples = samples.filter(hasTasOxides).length;
  const totalAfmSamples = samples.filter(hasAfmOxides).length;
  
  // Calculate rock type distribution for WR samples only, filtered by confidence level
  const wrSamples = filteredSamples.filter(s => s.material === 'WR');
  const filteredRockTypes = calculateRockTypeDistribution(wrSamples);

  const handleDownloadCSV = () => {
    if (filteredSamples.length === 0) return;
    const volcanoName = selectedVolcano?.volcano_name || chemicalData?.volcano_name || 'volcano';
    const filename = `${volcanoName.replaceAll(' ', '_')}_chemical_analysis.csv`;
    exportSamplesToCSV(filteredSamples, filename);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    commonShortcuts.download(handleDownloadCSV),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Mountain className="w-8 h-8 text-volcano-600" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-gray-900">Analyze Volcano</h1>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Explore chemical composition and classification diagrams for individual volcanoes
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        {/* Volcano Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Volcano</h2>
          
          <div className="relative max-w-md">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Type to search volcanoes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-volcano-500 focus:border-volcano-500"
              aria-label="Search for volcano"
            />
            
            {showSuggestions && filteredVolcanoNames.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredVolcanoNames.map((volcano) => (
                  <button
                    key={volcano.volcano_number}
                    type="button"
                    onClick={() => handleVolcanoSelect(volcano)}
                    className="w-full text-left px-4 py-2 hover:bg-volcano-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-volcano-500 transition-colors duration-200"
                    aria-label={`Select ${volcano.label}`}
                  >
                    {volcano.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Confidence Level Filter */}
        {selectedVolcano && !loading && samples.length > 0 && (
          <ConfidenceFilter
            selectedLevels={selectedConfidenceLevels}
            onChange={setSelectedConfidenceLevels}
            className="mb-6"
          />
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            <CardSkeleton />
            <ChartSkeleton height="500px" />
            <ChartSkeleton height="500px" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!selectedVolcano && !loading && (
          <EmptyState
            icon={Mountain}
            title="No Volcano Selected"
            description="Select a volcano from the dropdown above to view detailed chemical analysis, TAS diagrams, and AFM plots."
          />
        )}

        {/* Results */}
        {chemicalData && !loading && selectedVolcano && (
          <>
            {/* Summary Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {chemicalData.volcano_name}
                </h2>
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-volcano-600 text-white rounded-lg hover:bg-volcano-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-volcano-500 focus:ring-offset-2"
                  aria-label="Download chemical analysis data as CSV"
                  title="Download CSV (Ctrl+D / Cmd+D)"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Download CSV
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 transition-shadow duration-300 hover:shadow-md">
                  <p className="text-sm text-gray-600">Filtered Samples</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredSamples.length}</p>
                  {filteredSamples.length < samples.length && (
                    <p className="text-xs text-gray-500 mt-1">of {samples.length} total</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4 transition-shadow duration-300 hover:shadow-md">
                  <p className="text-sm text-gray-600">TAS Data Points</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredSamples.filter(hasTasOxides).length}
                  </p>
                  {filteredSamples.length < samples.length && (
                    <p className="text-xs text-gray-500 mt-1">of {totalTasSamples} total</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4 transition-shadow duration-300 hover:shadow-md">
                  <p className="text-sm text-gray-600">AFM Data Points</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredSamples.filter(hasAfmOxides).length}
                  </p>
                  {filteredSamples.length < samples.length && (
                    <p className="text-xs text-gray-500 mt-1">of {totalAfmSamples} total</p>
                  )}
                </div>
              </div>

              {/* Rock Types Distribution */}
              {Object.keys(filteredRockTypes).length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Rock Types Distribution</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(filteredRockTypes).map(([rockType, count]) => (
                      <div key={rockType} className="flex justify-between items-center bg-gray-50 rounded px-3 py-2">
                        <span className="text-xs text-gray-600 truncate">{rockType}</span>
                        <span className="text-xs font-semibold text-gray-900 ml-2">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Rock Type Distribution */}
            {Object.keys(filteredRockTypes).length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rock Type Distribution</h3>
                <RockTypeDistributionChart
                  volcanoes={[{
                    volcanoName: chemicalData.volcano_name,
                    rockTypes: filteredRockTypes,
                    color: "#DC2626"
                  }]}
                />
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TAS Diagram - Rock Type */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-volcano-600" />
                  <h3 className="text-lg font-semibold text-gray-900">TAS Diagram (by Rock Type)</h3>
                </div>
                <div className="h-[500px]">
                  <TASPlot 
                    samples={filteredSamples}
                    colorBy="rock_type"
                  />
                </div>
              </div>

              {/* TAS Diagram - VEI */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-volcano-600" />
                  <h3 className="text-lg font-semibold text-gray-900">TAS Diagram (by VEI)</h3>
                </div>
                {veiLoading ? (
                  <ChartSkeleton height="500px" />
                ) : filteredSamplesWithVEI.length > 0 ? (
                  <>
                    <div className="h-[500px]">
                      <TASPlot 
                        samples={filteredSamplesWithVEI}
                        colorBy="vei"
                      />
                    </div>
                    <div className="mt-3 text-sm text-gray-600 bg-blue-50 border-l-4 border-blue-400 p-3">
                      <strong>VEI Mode:</strong> Showing {filteredSamplesWithVEI.length} of {samplesWithVEI.length} samples (
                      {samplesWithVEI.length > 0 ? ((filteredSamplesWithVEI.length / samplesWithVEI.length) * 100).toFixed(1) : 0}% after filtering) matched with eruption VEI by year. 
                      Samples are colored by Volcanic Explosivity Index (0-8).
                    </div>
                  </>
                ) : (
                  <div className="h-[500px] flex items-center justify-center">
                    <div className="text-center max-w-md p-6">
                      <p className="text-gray-600 mb-3">
                        <strong>VEI Data Not Available</strong>
                      </p>
                      <p className="text-sm text-gray-500">
                        No samples could be matched with eruption VEI data. This requires samples 
                        with eruption year information that matches eruption records in the database.
                      </p>
                      <p className="text-xs text-gray-400 mt-3">
                        VEI matching depends on: eruption_date.year field in samples and corresponding 
                        eruption records with VEI values.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* AFM Diagram */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-volcano-600" />
                  <h3 className="text-lg font-semibold text-gray-900">AFM Diagram</h3>
                </div>
                <div className="h-[500px]">
                  <AFMPlot samples={filteredSamples} />
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AnalyzeVolcanoPage;
