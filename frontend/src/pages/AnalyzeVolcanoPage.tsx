import React, { useState, useEffect } from 'react';
import { Mountain, Download, TrendingUp } from 'lucide-react';
import { TASPlot } from '../components/Charts/TASPlot';
import { AFMPlot } from '../components/Charts/AFMPlot';
import { exportSamplesToCSV } from '../utils/csvExport';
import { useKeyboardShortcuts, commonShortcuts } from '../hooks/useKeyboardShortcuts';
import { showError } from '../utils/toast';
import { CardSkeleton, ChartSkeleton } from '../components/LoadingSkeleton';
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

/**
 * Transform backend chemical analysis data to Sample[] format for chart components
 */
const transformToSamples = (data: ChemicalAnalysisData): Sample[] => {
  const sampleMap = new Map<string, Sample>();

  // Process TAS data
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

  // Merge AFM data
  for (const afm of data.afm_data) {
    const existing = sampleMap.get(afm.sample_code);
    if (existing?.oxides) {
      existing.oxides['FEOT(WT%)'] = afm.FeOT;
      existing.oxides['MGO(WT%)'] = afm.MgO;
      // Update Na2O and K2O if not set
      if (!existing.oxides['NA2O(WT%)']) {
        existing.oxides['NA2O(WT%)'] = afm.Na2O;
      }
      if (!existing.oxides['K2O(WT%)']) {
        existing.oxides['K2O(WT%)'] = afm.K2O;
      }
    } else {
      // Sample only in AFM data
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
  const [volcanoNames, setVolcanoNames] = useState<string[]>([]);
  const [volcanoes, setVolcanoes] = useState<Array<{ volcano_number: number; volcano_name: string }>>([]);
  const [selectedVolcano, setSelectedVolcano] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [chemicalData, setChemicalData] = useState<ChemicalAnalysisData | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        // Find volcano number from name
        const volcano = volcanoes.find(v => v.volcano_name === selectedVolcano);
        if (!volcano) {
          throw new Error('Volcano not found');
        }

        const response = await fetch(
          `http://localhost:8000/api/volcanoes/${volcano.volcano_number}/chemical-analysis`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch chemical analysis data');
        }

        const data = await response.json();
        setChemicalData(data);
        setSamples(transformToSamples(data));
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
  }, [selectedVolcano, volcanoes]);

  // Filter volcano suggestions
  const filteredVolcanoNames = searchInput
    ? volcanoNames.filter(name => name.toLowerCase().includes(searchInput.toLowerCase())).slice(0, 10)
    : [];

  const handleVolcanoSelect = (volcanoName: string) => {
    setSelectedVolcano(volcanoName);
    setSearchInput(volcanoName);
    setShowSuggestions(false);
  };

  const handleDownloadCSV = () => {
    if (samples.length === 0) return;
    const filename = `${selectedVolcano.replaceAll(' ', '_')}_chemical_analysis.csv`;
    exportSamplesToCSV(samples, filename);
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
                {filteredVolcanoNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleVolcanoSelect(name)}
                    className="w-full text-left px-4 py-2 hover:bg-volcano-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-volcano-500 transition-colors duration-200"
                    aria-label={`Select ${name}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

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
                  <p className="text-sm text-gray-600">Total Samples</p>
                  <p className="text-2xl font-bold text-gray-900">{chemicalData.samples_count}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 transition-shadow duration-300 hover:shadow-md">
                  <p className="text-sm text-gray-600">TAS Data Points</p>
                  <p className="text-2xl font-bold text-gray-900">{chemicalData.tas_data.length}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 transition-shadow duration-300 hover:shadow-md">
                  <p className="text-sm text-gray-600">AFM Data Points</p>
                  <p className="text-2xl font-bold text-gray-900">{chemicalData.afm_data.length}</p>
                </div>
              </div>

              {/* Rock Types Distribution */}
              {Object.keys(chemicalData.rock_types).length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Rock Types Distribution</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(chemicalData.rock_types).map(([rockType, count]) => (
                      <div key={rockType} className="flex justify-between items-center bg-gray-50 rounded px-3 py-2">
                        <span className="text-xs text-gray-600 truncate">{rockType}</span>
                        <span className="text-xs font-semibold text-gray-900 ml-2">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TAS Diagram */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-volcano-600" />
                  <h3 className="text-lg font-semibold text-gray-900">TAS Diagram</h3>
                </div>
                <div className="h-[500px]">
                  <TASPlot samples={samples} />
                </div>
              </div>

              {/* AFM Diagram */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-volcano-600" />
                  <h3 className="text-lg font-semibold text-gray-900">AFM Diagram</h3>
                </div>
                <div className="h-[500px]">
                  <AFMPlot samples={samples} />
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
