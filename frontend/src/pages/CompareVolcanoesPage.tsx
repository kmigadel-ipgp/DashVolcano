import React, { useState, useEffect } from 'react';
import { Mountain, Download, X } from 'lucide-react';
import { TASPlot } from '../components/Charts/TASPlot';
import { AFMPlot } from '../components/Charts/AFMPlot';
import { exportSamplesToCSV } from '../utils/csvExport';
import { useKeyboardShortcuts, commonShortcuts } from '../hooks/useKeyboardShortcuts';
import { showError } from '../utils/toast';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import type { Sample } from '../types';

interface ChemicalAnalysisData {
  volcano_number: number;
  volcano_name: string;
  samples_count: number;
  tas_data: Array<{
    sample_code: string;
    SiO2: number;
    Na2O: number;
    K2O: number;
    Na2O_K2O: number;
    rock_type: string;
    material: string;
  }>;
  afm_data: Array<{
    sample_code: string;
    FeOT: number;
    Na2O: number;
    K2O: number;
    MgO: number;
    A: number;
    F: number;
    M: number;
    rock_type: string;
    material: string;
  }>;
  rock_types: Record<string, number>;
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

/**
 * Transform backend chemical analysis data to Sample[] format
 * Reused from AnalyzeVolcanoPage (Sprint 3.1)
 */
const transformToSamples = (data: ChemicalAnalysisData): Sample[] => {
  const sampleMap = new Map<string, Sample>();

  for (const tas of data.tas_data) {
    const sample: Sample = {
      _id: tas.sample_code,
      sample_id: tas.sample_code,
      sample_code: tas.sample_code,
      db: 'GEOROC',
      geographic_location: data.volcano_name,
      material: tas.material,
      rock_type: tas.rock_type,
      geometry: { type: 'Point', coordinates: [0, 0] },
      oxides: {
        'SIO2(WT%)': tas.SiO2,
        'NA2O(WT%)': tas.Na2O,
        'K2O(WT%)': tas.K2O,
      },
    };
    sampleMap.set(tas.sample_code, sample);
  }

  for (const afm of data.afm_data) {
    const existing = sampleMap.get(afm.sample_code);
    if (existing?.oxides) {
      existing.oxides['FEOT(WT%)'] = afm.FeOT;
      existing.oxides['MGO(WT%)'] = afm.MgO;
      if (!existing.oxides['NA2O(WT%)']) {
        existing.oxides['NA2O(WT%)'] = afm.Na2O;
      }
      if (!existing.oxides['K2O(WT%)']) {
        existing.oxides['K2O(WT%)'] = afm.K2O;
      }
    } else {
      const sample: Sample = {
        _id: afm.sample_code,
        sample_id: afm.sample_code,
        sample_code: afm.sample_code,
        db: 'GEOROC',
        geographic_location: data.volcano_name,
        material: afm.material,
        rock_type: afm.rock_type,
        geometry: { type: 'Point', coordinates: [0, 0] },
        oxides: {
          'FEOT(WT%)': afm.FeOT,
          'MGO(WT%)': afm.MgO,
          'NA2O(WT%)': afm.Na2O,
          'K2O(WT%)': afm.K2O,
        },
      };
      sampleMap.set(afm.sample_code, sample);
    }
  }

  return Array.from(sampleMap.values());
};

const CompareVolcanoesPage: React.FC = () => {
  const [volcanoNames, setVolcanoNames] = useState<string[]>([]);
  const [volcanoes, setVolcanoes] = useState<Array<{ volcano_number: number; volcano_name: string }>>([]);
  
  const [selections, setSelections] = useState<VolcanoSelection[]>([
    { name: '', number: 0, data: null, samples: [], loading: false, error: null },
    { name: '', number: 0, data: null, samples: [], loading: false, error: null },
  ]);
  
  const [searchInputs, setSearchInputs] = useState<string[]>(['', '']);
  const [showSuggestions, setShowSuggestions] = useState<boolean[]>([false, false]);

  // Load volcano names on mount
  useEffect(() => {
    const loadVolcanoes = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/volcanoes?limit=5000');
        const data = await response.json();
        setVolcanoes(data.data || []);
        const names = (data.data as Array<{volcano_name: string}>)
          .map(v => v.volcano_name)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        setVolcanoNames(names);
      } catch (err) {
        console.error('Failed to load volcanoes:', err);
      }
    };
    loadVolcanoes();
  }, []);

  const handleVolcanoSelect = async (index: number, volcanoName: string) => {
    const volcano = volcanoes.find(v => v.volcano_name === volcanoName);
    if (!volcano) return;

    // Update search input
    const newSearchInputs = [...searchInputs];
    newSearchInputs[index] = volcanoName;
    setSearchInputs(newSearchInputs);

    const newShowSuggestions = [...showSuggestions];
    newShowSuggestions[index] = false;
    setShowSuggestions(newShowSuggestions);

    // Update selection with loading state
    const newSelections = [...selections];
    newSelections[index] = {
      name: volcanoName,
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
        `http://localhost:8000/api/volcanoes/${volcano.volcano_number}/chemical-analysis`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch chemical analysis data');
      }

      const data = await response.json();
      const samples = transformToSamples(data);

      newSelections[index] = {
        name: volcanoName,
        number: volcano.volcano_number,
        data,
        samples,
        loading: false,
        error: null,
      };
      setSelections([...newSelections]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      showError(`Failed to load ${volcanoName}: ${errorMessage}`);
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
    return volcanoNames
      .filter(name => name.toLowerCase().includes(searchInputs[index].toLowerCase()))
      .slice(0, 10);
  };

  const handleDownloadCSV = () => {
    const allSamples = selections.flatMap(s => s.samples);
    if (allSamples.length === 0) return;
    
    const volcanoNamesStr = selections
      .filter(s => s.name)
      .map(s => s.name.replaceAll(' ', '_'))
      .join('_vs_');
    
    exportSamplesToCSV(allSamples, `compare_${volcanoNamesStr}.csv`);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    commonShortcuts.download(handleDownloadCSV),
  ]);

  const allSamples = selections.flatMap(s => s.samples);
  const selectedCount = selections.filter(s => s.name).length;
  const isLoading = selections.some(s => s.loading);

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
                    {getFilteredVolcanoNames(index).map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleVolcanoSelect(index, name)}
                        className="w-full text-left px-4 py-2 hover:bg-volcano-50 text-sm text-gray-700"
                      >
                        {name}
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

              {selection.data && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-600">Samples</p>
                    <p className="text-lg font-bold" style={{ color: VOLCANO_COLORS[index] }}>
                      {selection.data.samples_count}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-600">TAS Points</p>
                    <p className="text-lg font-bold" style={{ color: VOLCANO_COLORS[index] }}>
                      {selection.data.tas_data.length}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Side-by-Side Comparison */}
        {selectedCount >= 2 && !isLoading && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {selections.filter(s => s.name && s.data).map((selection, index) => (
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
                      <p className="text-xs text-gray-600 mb-1">Total Samples</p>
                      <p className="text-xl font-bold" style={{ color: VOLCANO_COLORS[index] }}>
                        {selection.data?.samples_count || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-600 mb-1">TAS Data</p>
                      <p className="text-xl font-bold" style={{ color: VOLCANO_COLORS[index] }}>
                        {selection.data?.tas_data.length || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-600 mb-1">AFM Data</p>
                      <p className="text-xl font-bold" style={{ color: VOLCANO_COLORS[index] }}>
                        {selection.data?.afm_data.length || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* TAS Plot */}
                <div className="mb-6">
                  <h3 className="text-md font-semibold text-gray-700 mb-3">TAS Diagram</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden h-[500px]">
                    <TASPlot samples={selection.samples} />
                  </div>
                </div>

                {/* AFM Plot */}
                <div>
                  <h3 className="text-md font-semibold text-gray-700 mb-3">AFM Diagram</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden h-[500px]">
                    <AFMPlot samples={selection.samples} />
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
