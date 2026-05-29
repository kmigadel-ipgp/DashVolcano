import React, { useState, useEffect, useMemo } from 'react';
import { Mountain, Download, X } from 'lucide-react';
import { TASPlot } from '../components/Charts/TASPlot';
import { AFMPlot } from '../components/Charts/AFMPlot';
import { RockTypeDistributionChart } from '../components/Charts/RockTypeDistributionChart';
import { HarkerDiagrams } from '../components/Charts/HarkerDiagrams';
import { exportSamplesToCSV } from '../utils/csvExport';
import {
  hasAfmOxides,
  hasTasOxides,
  toHarkerDataPoint,
  transformChemicalAnalysisSamples,
  type ChemicalAnalysisAllSample,
} from '../utils/chemicalAnalysisSamples';
import { useKeyboardShortcuts, commonShortcuts } from '../hooks/useKeyboardShortcuts';
import { showError } from '../utils/toast';
import { CardSkeleton } from '../components/LoadingSkeleton';
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

interface VolcanoSelection {
  name: string;
  number: number;
  data: ChemicalAnalysisData | null;
  samples: Sample[];
  loading: boolean;
  error: string | null;
}

const VOLCANO_COLORS = ['#DC2626', '#2563EB', '#16A34A'];

const CompareVolcanoesPage: React.FC = () => {
  const [volcanoes, setVolcanoes] = useState<VolcanoAutocompleteSource[]>([]);
  
  const [selections, setSelections] = useState<VolcanoSelection[]>([
    { name: '', number: 0, data: null, samples: [], loading: false, error: null },
    { name: '', number: 0, data: null, samples: [], loading: false, error: null },
  ]);
  
  const [searchInputs, setSearchInputs] = useState<string[]>(['', '']);
  const [showSuggestions, setShowSuggestions] = useState<boolean[]>([false, false]);
  
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

  const volcanoOptions = useMemo(
    () => createVolcanoAutocompleteOptions(volcanoes),
    [volcanoes],
  );

  const handleVolcanoSelect = async (index: number, volcano: VolcanoAutocompleteOption) => {
    // Update search input
    const newSearchInputs = [...searchInputs];
    newSearchInputs[index] = volcano.label;
    setSearchInputs(newSearchInputs);

    const newShowSuggestions = [...showSuggestions];
    newShowSuggestions[index] = false;
    setShowSuggestions(newShowSuggestions);

    // Update selection with loading state
    const newSelections = [...selections];
    newSelections[index] = {
      name: volcano.volcano_name,
      number: volcano.volcano_number,
      data: null,
      samples: [],
      loading: true,
      error: null,
    };
    setSelections(newSelections);

    // Fetch data
    try {
      const response = await fetch(
        `/api/volcanoes/${volcano.volcano_number}/chemical-analysis`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch chemical analysis data');
      }

      const data = await response.json();
      const analysisSamples = data.samples && data.samples.length > 0
        ? data.samples
        : data.all_samples || [];
      const samples = transformChemicalAnalysisSamples(analysisSamples);

      newSelections[index] = {
        name: volcano.volcano_name,
        number: volcano.volcano_number,
        data,
        samples,
        loading: false,
        error: null,
      };
      setSelections([...newSelections]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      showError(`Failed to load ${volcano.volcano_name}: ${errorMessage}`);
      newSelections[index] = {
        ...newSelections[index],
        loading: false,
        error: errorMessage,
      };
      setSelections([...newSelections]);
    }
  };

  const handleClearSelection = (index: number) => {
    const newSelections = [...selections];
    newSelections[index] = { name: '', number: 0, data: null, samples: [], loading: false, error: null };
    setSelections(newSelections);

    const newSearchInputs = [...searchInputs];
    newSearchInputs[index] = '';
    setSearchInputs(newSearchInputs);
  };

  const getFilteredVolcanoNames = (index: number) => {
    if (!searchInputs[index]) return [];
    return filterVolcanoAutocompleteOptions(volcanoOptions, searchInputs[index]).slice(0, 10);
  };

  const handleDownloadCSV = () => {
    const allSamples = selections.flatMap(s => s.samples);
    const filteredSamples = filterSamplesByConfidence(allSamples, selectedConfidenceLevels);
    if (filteredSamples.length === 0) return;
    
    const volcanoNamesStr = selections
      .filter(s => s.name)
      .map(s => s.name.replaceAll(' ', '_'))
      .join('_vs_');
    
    exportSamplesToCSV(filteredSamples, `compare_${volcanoNamesStr}.csv`);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    commonShortcuts.download(handleDownloadCSV),
  ]);

  const allSamples = selections.flatMap(s => s.samples);
  const selectedCount = selections.filter(s => s.name).length;
  const isLoading = selections.some(s => s.loading);

  // Memoize expensive chart data preparations to prevent unnecessary re-renders
  const rockTypeChartData = useMemo(() => {
    return selections
      .filter((v: VolcanoSelection) => v.samples && v.samples.length > 0)
      .map((v: VolcanoSelection, idx: number) => {
        // Filter by confidence level AND material=WR for accurate rock type comparison
        const filteredSamples = filterSamplesByConfidence(v.samples, selectedConfidenceLevels);
        const wrSamples = filteredSamples.filter(s => s.material === 'WR');
        const rockTypes = calculateRockTypeDistribution(wrSamples);
        return {
          volcanoName: v.name,
          rockTypes,
          color: VOLCANO_COLORS[idx]
        };
      })
      .filter(v => Object.keys(v.rockTypes).length > 0);
  }, [selections, selectedConfidenceLevels]);

  const harkerChartData = useMemo(() => {
    return selections
      .filter((v: VolcanoSelection) => v.samples.length > 0)
      .map((v: VolcanoSelection, idx: number) => ({
        volcanoName: v.name,
        harkerData: filterSamplesByConfidence(v.samples, selectedConfidenceLevels)
          .map(sample => toHarkerDataPoint(sample, v.name))
          .filter((sample): sample is NonNullable<typeof sample> => sample !== null),
        color: VOLCANO_COLORS[idx]
      }))
      .filter(v => v.harkerData.length > 0);
  }, [selections, selectedConfidenceLevels]);

  // Memoize sampled data for TAS/AFM plots to improve performance with large datasets
  // Apply confidence filtering
  const sampledSelectionsData = useMemo(() => {
    return selections.map(selection => ({
      ...selection,
      sampledSamples: filterSamplesByConfidence(selection.samples, selectedConfidenceLevels)
    }));
  }, [selections, selectedConfidenceLevels]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Mountain className="w-8 h-8 text-volcano-600" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-gray-900">Compare Volcanoes</h1>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Compare chemical compositions side-by-side
              </p>
            </div>
            {selectedCount >= 2 && allSamples.length > 0 && (
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 px-4 py-2 bg-volcano-600 text-white rounded-lg hover:bg-volcano-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-volcano-500 focus:ring-offset-2"
                aria-label="Download comparison data as CSV"
                title="Download CSV (Ctrl+D / Cmd+D)"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Download Combined CSV
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Volcano Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {selections.map((selection, index) => (
            <div key={`selector-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Volcano {index + 1}
                </h2>
                {selection.name && (
                  <button
                    onClick={() => handleClearSelection(index)}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Clear selection"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  value={searchInputs[index]}
                  onChange={(e) => {
                    const newInputs = [...searchInputs];
                    newInputs[index] = e.target.value;
                    setSearchInputs(newInputs);
                    const newShow = [...showSuggestions];
                    newShow[index] = true;
                    setShowSuggestions(newShow);
                  }}
                  onFocus={() => {
                    const newShow = [...showSuggestions];
                    newShow[index] = true;
                    setShowSuggestions(newShow);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      const newShow = [...showSuggestions];
                      newShow[index] = false;
                      setShowSuggestions(newShow);
                    }, 200);
                  }}
                  placeholder="Type to search volcanoes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-volcano-500 focus:border-volcano-500"
                  style={{ borderColor: selection.name ? VOLCANO_COLORS[index] : undefined }}
                />
                
                {showSuggestions[index] && getFilteredVolcanoNames(index).length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {getFilteredVolcanoNames(index).map((volcano) => (
                      <button
                        key={volcano.volcano_number}
                        type="button"
                        onClick={() => handleVolcanoSelect(index, volcano)}
                        className="w-full text-left px-4 py-2 hover:bg-volcano-50 text-sm text-gray-700"
                      >
                        {volcano.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selection.loading && (
                <div className="mt-4">
                  <CardSkeleton />
                </div>
              )}

              {selection.error && (
                <div className="mt-4 text-sm text-red-600">{selection.error}</div>
              )}

              {selection.data && (() => {
                const filteredSamples = filterSamplesByConfidence(selection.samples, selectedConfidenceLevels);
                const tasCount = filteredSamples.filter(hasTasOxides).length;
                const afmCount = filteredSamples.filter(hasAfmOxides).length;
                const totalTasCount = selection.samples.filter(hasTasOxides).length;
                const totalAfmCount = selection.samples.filter(hasAfmOxides).length;
                return (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-600">Samples</p>
                      <p className="text-lg font-bold" style={{ color: VOLCANO_COLORS[index] }}>
                        {filteredSamples.length}
                      </p>
                      {filteredSamples.length < selection.samples.length && (
                        <p className="text-xs text-gray-500">of {selection.samples.length}</p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-600">TAS Points</p>
                      <p className="text-lg font-bold" style={{ color: VOLCANO_COLORS[index] }}>
                        {tasCount}
                      </p>
                      {filteredSamples.length < selection.samples.length && (
                        <p className="text-xs text-gray-500">of {totalTasCount}</p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-600">AFM Points</p>
                      <p className="text-lg font-bold" style={{ color: VOLCANO_COLORS[index] }}>
                        {afmCount}
                      </p>
                      {filteredSamples.length < selection.samples.length && (
                        <p className="text-xs text-gray-500">of {totalAfmCount}</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>

        {/* Confidence Level Filter */}
        {selectedCount >= 2 && !isLoading && allSamples.length > 0 && (
          <ConfidenceFilter
            selectedLevels={selectedConfidenceLevels}
            onChange={setSelectedConfidenceLevels}
            className="mb-6"
          />
        )}

        {/* Rock Type Distribution - Combined Chart for All Volcanoes */}
        {selectedCount >= 2 && !isLoading && rockTypeChartData.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Rock Type Distribution Comparison</h2>
            <RockTypeDistributionChart volcanoes={rockTypeChartData} />
          </div>
        )}

        {/* Harker Diagrams - Major Oxide Variations (Lazy Loaded) */}
        {selectedCount >= 2 && !isLoading && harkerChartData.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Harker Variation Diagrams</h2>
            </div>
            <HarkerDiagrams volcanoes={harkerChartData} />
          </div>
        )}

        {/* Side-by-Side Comparison */}
        {selectedCount >= 2 && !isLoading && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {sampledSelectionsData.filter(s => s.name && s.data).map((selection, index) => (
              <div 
                key={selection.number}
                className="bg-white rounded-lg shadow-sm border-2 p-6"
                style={{ borderColor: VOLCANO_COLORS[index] }}
              >
                {/* Volcano Header */}
                <div className="mb-6">
                  <h2 
                    className="text-xl font-bold mb-2"
                    style={{ color: VOLCANO_COLORS[index] }}
                  >
                    {selection.name}
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-600 mb-1">Filtered Samples</p>
                      <p className="text-xl font-bold" style={{ color: VOLCANO_COLORS[index] }}>
                        {selection.sampledSamples.length}
                      </p>
                      {selection.sampledSamples.length < selection.samples.length && (
                        <p className="text-xs text-gray-500">of {selection.samples.length} total</p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-600 mb-1">TAS Data</p>
                      <p className="text-xl font-bold" style={{ color: VOLCANO_COLORS[index] }}>
                        {selection.sampledSamples.filter(hasTasOxides).length}
                      </p>
                      {selection.sampledSamples.length < selection.samples.length && (
                        <p className="text-xs text-gray-500">of {selection.samples.filter(hasTasOxides).length} total</p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-600 mb-1">AFM Data</p>
                      <p className="text-xl font-bold" style={{ color: VOLCANO_COLORS[index] }}>
                        {selection.sampledSamples.filter(hasAfmOxides).length}
                      </p>
                      {selection.sampledSamples.length < selection.samples.length && (
                        <p className="text-xs text-gray-500">of {selection.samples.filter(hasAfmOxides).length} total</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* TAS Plot */}
                <div className="mb-6">
                  <h3 className="text-md font-semibold text-gray-700 mb-3">
                    TAS Diagram
                    {selection.samples.length > 1000 && (
                      <span className="ml-2 text-xs text-gray-500">
                        (showing {selection.sampledSamples.length} of {selection.samples.length} samples)
                      </span>
                    )}
                  </h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden h-[400px]">
                    <TASPlot samples={selection.sampledSamples} />
                  </div>
                </div>

                {/* AFM Plot */}
                <div>
                  <h3 className="text-md font-semibold text-gray-700 mb-3">
                    AFM Diagram
                    {selection.samples.length > 1000 && (
                      <span className="ml-2 text-xs text-gray-500">
                        (showing {selection.sampledSamples.length} of {selection.samples.length} samples)
                      </span>
                    )}
                  </h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden h-[400px]">
                    <AFMPlot samples={selection.sampledSamples} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {/* Empty State */}
        {selectedCount < 2 && !isLoading && (
          <EmptyState
            icon={Mountain}
            title="Select 2 Volcanoes to Compare"
            description="Choose volcanoes from the selectors above to view their side-by-side chemical comparison with TAS and AFM diagrams."
          />
        )}
      </main>
    </div>
  );
};

export default CompareVolcanoesPage;
