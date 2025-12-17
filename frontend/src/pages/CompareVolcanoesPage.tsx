import React, { useState, useEffect, useMemo } from 'react';
import { Mountain, Download, X } from 'lucide-react';
import { TASPlot } from '../components/Charts/TASPlot';
import { AFMPlot } from '../components/Charts/AFMPlot';
import { RockTypeDistributionChart } from '../components/Charts/RockTypeDistributionChart';
import { HarkerDiagrams } from '../components/Charts/HarkerDiagrams';
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
    sample_id: string;
    db: string;
    rock_type: string;
    material: string;
    tectonic_setting?: string;
    geometry?: { type: 'Point'; coordinates: [number, number] };
    matching_metadata?: Record<string, unknown>;
    references?: string;
    'SIO2(WT%)': number;
    'NA2O(WT%)': number;
    'K2O(WT%)': number;
    'FEOT(WT%)'?: number;
    'MGO(WT%)'?: number;
    'TIO2(WT%)'?: number;
    'AL2O3(WT%)'?: number;
    'CAO(WT%)'?: number;
    'P2O5(WT%)'?: number;
    'MNO(WT%)'?: number;
  }>;
  afm_data: Array<{
    sample_code: string;
    sample_id: string;
    db: string;
    rock_type: string;
    material: string;
    tectonic_setting?: string;
    geometry?: { type: 'Point'; coordinates: [number, number] };
    matching_metadata?: Record<string, unknown>;
    references?: string;
    'FEOT(WT%)': number;
    'NA2O(WT%)': number;
    'K2O(WT%)': number;
    'MGO(WT%)': number;
    'SIO2(WT%)'?: number;
    'TIO2(WT%)'?: number;
    'AL2O3(WT%)'?: number;
    'CAO(WT%)'?: number;
    'P2O5(WT%)'?: number;
    'MNO(WT%)'?: number;
  }>;
  harker_data?: Array<{
    sample_code: string;
    sample_id: string;
    db: string;
    'SIO2(WT%)': number;
    rock_type: string;
    material: string;
    tectonic_setting?: string;
    geometry?: { type: 'Point'; coordinates: [number, number] };
    matching_metadata?: Record<string, unknown>;
    references?: string;
    'TIO2(WT%)'?: number;
    'AL2O3(WT%)'?: number;
    'FEOT(WT%)'?: number;
    'MGO(WT%)'?: number;
    'CAO(WT%)'?: number;
    'NA2O(WT%)'?: number;
    'K2O(WT%)'?: number;
    'P2O5(WT%)'?: number;
    'MNO(WT%)'?: number;
  }>;
  all_samples?: Array<{
    sample_code: string;
    sample_id: string;
    db: string;
    rock_type: string;
    material: string;
    tectonic_setting?: string;
    geometry?: { type: 'Point'; coordinates: [number, number] };
    matching_metadata?: Record<string, unknown>;
    references?: string;
    'SIO2(WT%)'?: number;
    'NA2O(WT%)'?: number;
    'K2O(WT%)'?: number;
    'FEOT(WT%)'?: number;
    'MGO(WT%)'?: number;
    'TIO2(WT%)'?: number;
    'AL2O3(WT%)'?: number;
    'CAO(WT%)'?: number;
    'P2O5(WT%)'?: number;
    'MNO(WT%)'?: number;
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
 * Transform all_samples array (includes ALL samples regardless of oxide completeness)
 */
const transformAllSamples = (
  allSamples: ChemicalAnalysisData['all_samples'],
  volcanoName: string
): Sample[] => {
  if (!allSamples) return [];
  
  return allSamples.map(sample => {
    const oxides: Record<string, number> = {};
    if (sample['SIO2(WT%)'] !== undefined) oxides['SIO2(WT%)'] = sample['SIO2(WT%)'];
    if (sample['NA2O(WT%)'] !== undefined) oxides['NA2O(WT%)'] = sample['NA2O(WT%)'];
    if (sample['K2O(WT%)'] !== undefined) oxides['K2O(WT%)'] = sample['K2O(WT%)'];
    if (sample['FEOT(WT%)'] !== undefined) oxides['FEOT(WT%)'] = sample['FEOT(WT%)'];
    if (sample['MGO(WT%)'] !== undefined) oxides['MGO(WT%)'] = sample['MGO(WT%)'];
    if (sample['TIO2(WT%)'] !== undefined) oxides['TIO2(WT%)'] = sample['TIO2(WT%)'];
    if (sample['AL2O3(WT%)'] !== undefined) oxides['AL2O3(WT%)'] = sample['AL2O3(WT%)'];
    if (sample['CAO(WT%)'] !== undefined) oxides['CAO(WT%)'] = sample['CAO(WT%)'];
    if (sample['P2O5(WT%)'] !== undefined) oxides['P2O5(WT%)'] = sample['P2O5(WT%)'];
    if (sample['MNO(WT%)'] !== undefined) oxides['MNO(WT%)'] = sample['MNO(WT%)'];

    return {
      _id: sample.sample_id,
      sample_id: sample.sample_id,
      sample_code: sample.sample_code,
      db: sample.db,
      material: sample.material,
      rock_type: sample.rock_type,
      tectonic_setting: sample.tectonic_setting,
      geometry: sample.geometry || { type: 'Point', coordinates: [0, 0] },
      matching_metadata: sample.matching_metadata,
      references: sample.references,
      oxides: Object.keys(oxides).length > 0 ? oxides : undefined,
    };
  });
};

/**
 * Transform backend chemical analysis data to Sample[] format
 * Now preserves MongoDB field names without conversion
 */
const transformToSamples = (data: ChemicalAnalysisData): Sample[] => {
  const sampleMap = new Map<string, Sample>();

  for (const tas of data.tas_data) {
    const oxides: Record<string, number> = {
      'SIO2(WT%)': tas['SIO2(WT%)'],
      'NA2O(WT%)': tas['NA2O(WT%)'],
      'K2O(WT%)': tas['K2O(WT%)'],
    };
    if (tas['FEOT(WT%)'] !== undefined) oxides['FEOT(WT%)'] = tas['FEOT(WT%)'];
    if (tas['MGO(WT%)'] !== undefined) oxides['MGO(WT%)'] = tas['MGO(WT%)'];
    if (tas['TIO2(WT%)'] !== undefined) oxides['TIO2(WT%)'] = tas['TIO2(WT%)'];
    if (tas['AL2O3(WT%)'] !== undefined) oxides['AL2O3(WT%)'] = tas['AL2O3(WT%)'];
    if (tas['CAO(WT%)'] !== undefined) oxides['CAO(WT%)'] = tas['CAO(WT%)'];
    if (tas['P2O5(WT%)'] !== undefined) oxides['P2O5(WT%)'] = tas['P2O5(WT%)'];
    if (tas['MNO(WT%)'] !== undefined) oxides['MNO(WT%)'] = tas['MNO(WT%)'];

    const sample: Sample = {
      _id: tas.sample_id,
      sample_id: tas.sample_id,
      sample_code: tas.sample_code,
      db: tas.db,
      material: tas.material,
      rock_type: tas.rock_type,
      tectonic_setting: tas.tectonic_setting,
      geometry: tas.geometry || { type: 'Point', coordinates: [0, 0] },
      matching_metadata: tas.matching_metadata,
      references: tas.references,
      oxides,
    };
    sampleMap.set(tas.sample_code, sample);
  }

  for (const afm of data.afm_data) {
    const existing = sampleMap.get(afm.sample_code);
    if (existing?.oxides) {
      existing.oxides['FEOT(WT%)'] = afm['FEOT(WT%)'];
      existing.oxides['MGO(WT%)'] = afm['MGO(WT%)'];
      if (!existing.oxides['NA2O(WT%)']) existing.oxides['NA2O(WT%)'] = afm['NA2O(WT%)'];
      if (!existing.oxides['K2O(WT%)']) existing.oxides['K2O(WT%)'] = afm['K2O(WT%)'];
      if (afm['SIO2(WT%)'] !== undefined && !existing.oxides['SIO2(WT%)']) existing.oxides['SIO2(WT%)'] = afm['SIO2(WT%)'];
      if (afm['TIO2(WT%)'] !== undefined && !existing.oxides['TIO2(WT%)']) existing.oxides['TIO2(WT%)'] = afm['TIO2(WT%)'];
      if (afm['AL2O3(WT%)'] !== undefined && !existing.oxides['AL2O3(WT%)']) existing.oxides['AL2O3(WT%)'] = afm['AL2O3(WT%)'];
      if (afm['CAO(WT%)'] !== undefined && !existing.oxides['CAO(WT%)']) existing.oxides['CAO(WT%)'] = afm['CAO(WT%)'];
      if (afm['P2O5(WT%)'] !== undefined && !existing.oxides['P2O5(WT%)']) existing.oxides['P2O5(WT%)'] = afm['P2O5(WT%)'];
      if (afm['MNO(WT%)'] !== undefined && !existing.oxides['MNO(WT%)']) existing.oxides['MNO(WT%)'] = afm['MNO(WT%)'];
    } else {
      const oxides: Record<string, number> = {
        'FEOT(WT%)': afm['FEOT(WT%)'],
        'MGO(WT%)': afm['MGO(WT%)'],
        'NA2O(WT%)': afm['NA2O(WT%)'],
        'K2O(WT%)': afm['K2O(WT%)'],
      };
      if (afm['SIO2(WT%)'] !== undefined) oxides['SIO2(WT%)'] = afm['SIO2(WT%)'];
      if (afm['TIO2(WT%)'] !== undefined) oxides['TIO2(WT%)'] = afm['TIO2(WT%)'];
      if (afm['AL2O3(WT%)'] !== undefined) oxides['AL2O3(WT%)'] = afm['AL2O3(WT%)'];
      if (afm['CAO(WT%)'] !== undefined) oxides['CAO(WT%)'] = afm['CAO(WT%)'];
      if (afm['P2O5(WT%)'] !== undefined) oxides['P2O5(WT%)'] = afm['P2O5(WT%)'];
      if (afm['MNO(WT%)'] !== undefined) oxides['MNO(WT%)'] = afm['MNO(WT%)'];

      const sample: Sample = {
        _id: afm.sample_id,
        sample_id: afm.sample_id,
        sample_code: afm.sample_code,
        db: afm.db,
        material: afm.material,
        rock_type: afm.rock_type,
        tectonic_setting: afm.tectonic_setting,
        geometry: afm.geometry || { type: 'Point', coordinates: [0, 0] },
        matching_metadata: afm.matching_metadata,
        references: afm.references,
        oxides,
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
        const response = await fetch('/api/volcanoes/summary');
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
        `/api/volcanoes/${volcano.volcano_number}/chemical-analysis`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch chemical analysis data');
      }

      const data = await response.json();
      // Use all_samples if available (includes samples with incomplete oxides)
      const samples = data.all_samples && data.all_samples.length > 0
        ? transformAllSamples(data.all_samples, volcanoName)
        : transformToSamples(data);

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

  // Memoize expensive chart data preparations to prevent unnecessary re-renders
  const rockTypeChartData = useMemo(() => {
    return selections
      .filter((v: VolcanoSelection) => v.data?.rock_types && Object.keys(v.data.rock_types).length > 0)
      .map((v: VolcanoSelection, idx: number) => ({
        volcanoName: v.name,
        rockTypes: v.data!.rock_types,
        color: VOLCANO_COLORS[idx]
      }));
  }, [selections]);

  const harkerChartData = useMemo(() => {
    return selections
      .filter((v: VolcanoSelection) => v.data?.harker_data && v.data.harker_data.length > 0)
      .map((v: VolcanoSelection, idx: number) => ({
        volcanoName: v.name,
        harkerData: v.data!.harker_data!,
        color: VOLCANO_COLORS[idx]
      }));
  }, [selections]);

  // Memoize sampled data for TAS/AFM plots to improve performance with large datasets
  const sampledSelectionsData = useMemo(() => {
    return selections.map(selection => ({
      ...selection,
      sampledSamples: selection.samples
    }));
  }, [selections]);

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
                <div className="mt-4 grid grid-cols-3 gap-3">
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
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-600">AFM Points</p>
                    <p className="text-lg font-bold" style={{ color: VOLCANO_COLORS[index] }}>
                      {selection.data.afm_data.length}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

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
