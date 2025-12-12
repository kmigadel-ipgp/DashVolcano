import { useState, useEffect } from 'react';
import { Mountain, Download } from 'lucide-react';
import { VEIBarChart } from '../components/Charts/VEIBarChart';
import { fetchVolcanoVEIDistribution, fetchVolcanoRockTypes } from '../api/volcanoes';
import { RockTypeBadges } from '../components/RockTypeBadges';
import { showError, showSuccess } from '../utils/toast';
import { useKeyboardShortcuts, commonShortcuts } from '../hooks/useKeyboardShortcuts';
import { CardSkeleton, ChartSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import type { VEIDistribution, RockType } from '../types';

interface VolcanoVEISelection {
  name: string;
  number: number;
  data: VEIDistribution | null;
  rockTypes: RockType[] | null;
  loading: boolean;
  error: string | null;
}

const VOLCANO_COLORS = ['#DC2626', '#2563EB', '#16A34A']; // red, blue, green

const CompareVEIPage = () => {
  const [volcanoNames, setVolcanoNames] = useState<string[]>([]);
  const [volcanoes, setVolcanoes] = useState<Array<{ volcano_number: number; volcano_name: string }>>([]);
  const [searchInputs, setSearchInputs] = useState<string[]>(['', '']);
  const [showSuggestions, setShowSuggestions] = useState<boolean[]>([false, false]);
  
  const [selections, setSelections] = useState<VolcanoVEISelection[]>([
    { name: '', number: 0, data: null, rockTypes: null, loading: false, error: null },
    { name: '', number: 0, data: null, rockTypes: null, loading: false, error: null },
  ]);

  // Load volcano names on mount
  useEffect(() => {
    const loadVolcanoes = async () => {
      try {
        const response = await fetch('/api/volcanoes/summary?limit=5000');
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

  const handleVolcanoSelect = async (index: number, volcanoName: string, volcanoNumber: number) => {
    // Update selection and set loading state
    setSelections((prev) =>
      prev.map((sel, i) =>
        i === index
          ? { name: volcanoName, number: volcanoNumber, data: null, rockTypes: null, loading: true, error: null }
          : sel
      )
    );

    try {
      // Fetch both VEI distribution and rock types in parallel
      const [data, rockTypesData] = await Promise.all([
        fetchVolcanoVEIDistribution(volcanoNumber),
        fetchVolcanoRockTypes(volcanoNumber)
      ]);
      
      setSelections((prev) =>
        prev.map((sel, i) =>
          i === index
            ? { ...sel, data, rockTypes: rockTypesData.rock_types, loading: false, error: null }
            : sel
        )
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch data';
      showError(`Failed to load ${volcanoName}: ${errorMessage}`);
      setSelections((prev) =>
        prev.map((sel, i) =>
          i === index
            ? { ...sel, data: null, rockTypes: null, loading: false, error: errorMessage }
            : sel
        )
      );
    }
  };

  const handleClearVolcano = (index: number) => {
    setSelections((prev) =>
      prev.map((sel, i) =>
        i === index
          ? { name: '', number: 0, data: null, rockTypes: null, loading: false, error: null }
          : sel
      )
    );
  };

  const exportToCSV = () => {
    // Helper to escape CSV fields
    const escapeCSV = (field: string) => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replaceAll('"', '""')}"`;
      }
      return field;
    };

    const rows: string[] = ['Volcano,VEI Level,Eruption Count'];

    for (const sel of selections) {
      if (sel.data?.vei_counts) {
        for (const [vei, count] of Object.entries(sel.data.vei_counts)) {
          rows.push(`${escapeCSV(sel.name)},${vei},${count}`);
        }
      }
    }

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const volcanoNames = selections
      .filter((s) => s.name)
      .map((s) => s.name.replaceAll(' ', '_'))
      .join('_vs_');
    link.download = `compare_${volcanoNames || 'volcanoes'}_VEI.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    
    showSuccess('VEI comparison data exported successfully!');
  };

  // Keyboard shortcut for CSV export
  useKeyboardShortcuts([
    commonShortcuts.download(exportToCSV),
  ]);

  const hasAnyData = selections.some((sel) => sel.data !== null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Mountain className="w-8 h-8 text-volcano-600" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-gray-900">Compare VEI Distributions</h1>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Compare Volcanic Explosivity Index (VEI) distributions between volcanoes
              </p>
            </div>
            {hasAnyData && (
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-volcano-600 text-white rounded-lg hover:bg-volcano-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-volcano-500 focus:ring-offset-2"
                aria-label="Download VEI comparison data as CSV"
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
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main" aria-label="Compare VEI distributions">
        {/* About VEI Info Box */}
        <div className="mb-6 text-sm text-gray-500 bg-blue-50 p-4 rounded-lg">
          <p className="font-semibold mb-1">About VEI:</p>
          <p>
            The Volcanic Explosivity Index (VEI) is a logarithmic scale (0-8) measuring the
            explosiveness of volcanic eruptions based on ejecta volume and eruption column height.
          </p>
        </div>

      {/* Volcano Comparison Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {selections.map((selection, index) => (
          <div
            key={selection.number || `empty-${index}`}
            className="border-4 rounded-lg p-6 bg-white shadow-lg"
            style={{ borderColor: VOLCANO_COLORS[index] }}
          >
            {/* Volcano Selector */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3" style={{ color: VOLCANO_COLORS[index] }}>
                Volcano {index + 1}
              </h2>
              <div className="relative">
                <input
                  type="text"
                  aria-label={`Search for volcano ${index + 1}`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder={`Select volcano ${index + 1}...`}
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
                />
                {showSuggestions[index] && searchInputs[index] && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {volcanoNames
                      .filter(name => name.toLowerCase().includes(searchInputs[index].toLowerCase()))
                      .slice(0, 10)
                      .map((name) => {
                        const volcano = volcanoes.find(v => v.volcano_name === name);
                        return (
                          <button
                            key={name}
                            onClick={() => {
                              if (volcano) {
                                handleVolcanoSelect(index, name, volcano.volcano_number);
                                const newInputs = [...searchInputs];
                                newInputs[index] = name;
                                setSearchInputs(newInputs);
                                const newShow = [...showSuggestions];
                                newShow[index] = false;
                                setShowSuggestions(newShow);
                              }
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors"
                          >
                            {name}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
              {selection.name && (
                <button
                  onClick={() => {
                    handleClearVolcano(index);
                    const newInputs = [...searchInputs];
                    newInputs[index] = '';
                    setSearchInputs(newInputs);
                  }}
                  aria-label={`Clear volcano ${index + 1} selection`}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 transition-colors duration-200"
                >
                  Clear selection
                </button>
              )}
            </div>

            {/* Loading State */}
            {selection.loading && (
              <div className="space-y-4">
                <ChartSkeleton height="350px" />
                <CardSkeleton />
              </div>
            )}

            {/* Error State */}
            {selection.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-semibold">Error</p>
                <p className="text-red-600 text-sm mt-1">{selection.error}</p>
              </div>
            )}

            {/* Data Display */}
            {selection.data && !selection.loading && !selection.error && (
              <div>
                {/* VEI Bar Chart */}
                <div className="mb-6 h-[350px]">
                  <VEIBarChart
                    veiCounts={selection.data.vei_counts}
                    volcanoName={selection.data.volcano_name}
                    color={VOLCANO_COLORS[index]}
                  />
                </div>

                {/* Rock Type Badges */}
                {selection.rockTypes && selection.rockTypes.length > 0 && (
                  <div className="mb-6">
                    <RockTypeBadges 
                      rockTypes={selection.rockTypes}
                      color={VOLCANO_COLORS[index]}
                    />
                  </div>
                )}

                {/* Statistics */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-800 mb-3">Summary Statistics</h3>

                  {/* Total Eruptions */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Eruptions:</span>
                    <span className="font-semibold">{selection.data.total_eruptions}</span>
                  </div>

                  {/* VEI Range */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">VEI Range:</span>
                    <span className="font-semibold">{getVEIRange(selection.data.vei_counts)}</span>
                  </div>

                  {/* Dominant VEI */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Most Common VEI:</span>
                    <span className="font-semibold">{getDominantVEI(selection.data.vei_counts)}</span>
                  </div>

                  {/* Date Range */}
                  {selection.data.date_range && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date Range:</span>
                      <span className="font-semibold">
                        {formatDateRange(selection.data.date_range)}
                      </span>
                    </div>
                  )}

                  {/* Volcano Number */}
                  <div className="flex justify-between text-sm text-gray-500 pt-2 border-t border-gray-200">
                    <span>Volcano Number:</span>
                    <span>{selection.data.volcano_number}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!selection.name && !selection.loading && (
              <EmptyState
                icon={Mountain}
                title="No Volcano Selected"
                description="Select a volcano to view its VEI distribution"
              />
            )}
          </div>
        ))}
      </div>

      {/* Comparison Insights */}
      {selections[0].data && selections[1].data && (
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">📊 Comparison Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* More Explosive */}
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 mb-1">More Explosive</p>
              <p className="text-lg font-bold" style={{ color: getMoreExplosiveColor(selections) }}>
                {getMoreExplosiveVolcano(selections)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Based on avg VEI</p>
            </div>

            {/* More Active */}
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 mb-1">More Active</p>
              <p className="text-lg font-bold" style={{ color: getMoreActiveColor(selections) }}>
                {getMoreActiveVolcano(selections)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total eruptions</p>
            </div>

            {/* Similar VEI */}
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 mb-1">Similarity Score</p>
              <p className="text-lg font-bold text-purple-600">
                {getVEISimilarity(selections)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Distribution overlap</p>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
};

export default CompareVEIPage;

// Helper Functions

function getVEIRange(veiCounts: Record<string, number>): string {
  // Normalize VEI keys (handle '1.0' format from API)
  const numericVEIs = Object.keys(veiCounts)
    .filter((k) => k !== 'unknown' && veiCounts[k] > 0)
    .map((k) => Math.floor(Number(k)))  // Convert '1.0' to 1, etc.
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);

  if (numericVEIs.length === 0) return 'Unknown';
  if (numericVEIs.length === 1) return `VEI ${numericVEIs[0]}`;
  return `VEI ${numericVEIs[0]} - ${numericVEIs.at(-1)}`;
}

function getDominantVEI(veiCounts: Record<string, number>): string {
  let maxCount = 0;
  let dominantVEI = 'None';

  for (const [vei, count] of Object.entries(veiCounts)) {
    if (count > maxCount) {
      maxCount = count;
      // Normalize VEI display (convert '1.0' to '1')
      if (vei === 'unknown') {
        dominantVEI = 'Unknown';
      } else {
        const normalized = Math.floor(Number(vei));
        dominantVEI = `VEI ${normalized}`;
      }
    }
  }

  return `${dominantVEI} (${maxCount} eruptions)`;
}

function formatDateRange(dateRange?: { start?: string; end?: string }): string {
  if (!dateRange?.start || !dateRange?.end) return 'Unknown';
  
  try {
    // Parse ISO 8601 dates (e.g., "-032-12-31T00:00:00Z" or "2022-11-27T00:00:00Z")
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    // Extract year, handling BCE dates (negative years)
    let startYear: number;
    let endYear: number;
    
    if (dateRange.start.startsWith('-')) {
      // BCE date: extract year from string like "-032-12-31T00:00:00Z"
      const yearRegex = /^-0*(\d+)/;
      const yearMatch = yearRegex.exec(dateRange.start);
      startYear = yearMatch ? -Number(yearMatch[1]) : startDate.getFullYear();
    } else {
      startYear = startDate.getFullYear();
    }
    
    endYear = endDate.getFullYear();
    
    // Format with BCE/CE notation if needed
    const startStr = startYear < 0 ? `${Math.abs(startYear)} BCE` : String(startYear);
    const endStr = String(endYear);
    
    return `${startStr} - ${endStr}`;
  } catch {
    return 'Unknown';
  }
}

function getAverageVEI(veiCounts: Record<string, number>): number {
  let totalVEI = 0;
  let totalCount = 0;

  for (const [vei, count] of Object.entries(veiCounts)) {
    if (vei !== 'unknown') {
      // Use floor to normalize '1.0' to 1, '2.0' to 2, etc.
      const veiValue = Math.floor(Number(vei));
      if (!Number.isNaN(veiValue)) {
        totalVEI += veiValue * count;
        totalCount += count;
      }
    }
  }

  return totalCount > 0 ? totalVEI / totalCount : 0;
}

function getMoreExplosiveVolcano(selections: VolcanoVEISelection[]): string {
  const avg0 = selections[0].data ? getAverageVEI(selections[0].data.vei_counts) : 0;
  const avg1 = selections[1].data ? getAverageVEI(selections[1].data.vei_counts) : 0;

  if (Math.abs(avg0 - avg1) < 0.1) return 'Similar';
  return avg0 > avg1 ? selections[0].name : selections[1].name;
}

function getMoreExplosiveColor(selections: VolcanoVEISelection[]): string {
  const avg0 = selections[0].data ? getAverageVEI(selections[0].data.vei_counts) : 0;
  const avg1 = selections[1].data ? getAverageVEI(selections[1].data.vei_counts) : 0;

  if (Math.abs(avg0 - avg1) < 0.1) return '#6B7280';
  return avg0 > avg1 ? VOLCANO_COLORS[0] : VOLCANO_COLORS[1];
}

function getMoreActiveVolcano(selections: VolcanoVEISelection[]): string {
  const total0 = selections[0].data?.total_eruptions || 0;
  const total1 = selections[1].data?.total_eruptions || 0;

  if (total0 === total1) return 'Equal';
  return total0 > total1 ? selections[0].name : selections[1].name;
}

function getMoreActiveColor(selections: VolcanoVEISelection[]): string {
  const total0 = selections[0].data?.total_eruptions || 0;
  const total1 = selections[1].data?.total_eruptions || 0;

  if (total0 === total1) return '#6B7280';
  return total0 > total1 ? VOLCANO_COLORS[0] : VOLCANO_COLORS[1];
}

function getVEISimilarity(selections: VolcanoVEISelection[]): number {
  if (!selections[0].data || !selections[1].data) return 0;

  const normalize = (counts: Record<string, number>): Record<string, number> => {
    const normalized: Record<string, number> = {};
    for (const [key, value] of Object.entries(counts)) {
      if (key === 'unknown') {
        normalized['unknown'] = value;
      } else {
        const veiLevel = String(Math.floor(Number(key)));
        normalized[veiLevel] = (normalized[veiLevel] || 0) + value;
      }
    }
    return normalized;
  };

  const vei0 = normalize(selections[0].data.vei_counts);
  const vei1 = normalize(selections[1].data.vei_counts);

  const allVEIs = new Set([...Object.keys(vei0), ...Object.keys(vei1)]);
  const total0 = selections[0].data.total_eruptions;
  const total1 = selections[1].data.total_eruptions;

  if (total0 === 0 || total1 === 0) return 0;

  let weightedSimilarity = 0;
  let totalWeight = 0;

  for (const vei of allVEIs) {
    const count0 = vei0[vei] || 0;
    const count1 = vei1[vei] || 0;

    const pct0 = (count0 / total0) * 100;
    const pct1 = (count1 / total1) * 100;
    const localSimilarity = 100 - Math.abs(pct0 - pct1);

    // Weight: number of eruptions in this VEI level (combined)
    const weight = count0 + count1;

    weightedSimilarity += localSimilarity * weight;
    totalWeight += weight;
  }

  return totalWeight === 0 ? 0 : Math.round(weightedSimilarity / totalWeight);
}
