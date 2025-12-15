import React, { useState, useEffect } from 'react';
import { Clock, Download, TrendingUp } from 'lucide-react';
import EruptionTimelinePlot from '../components/Charts/EruptionTimelinePlot';
import EruptionFrequencyChart from '../components/Charts/EruptionFrequencyChart';
import { SampleTimelinePlot } from '../components/Charts/SampleTimelinePlot';
import { fetchVolcanoSampleTimeline } from '../api/volcanoes';
import { dateInfoToYear, getDateRange, formatYearRange } from '../utils/dateUtils';
import { showError } from '../utils/toast';
import { exportEruptionsToCSV } from '../utils/csvExport';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { ChartSkeleton, CardSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import type { Eruption, SampleTimelineResponse } from '../types';

/**
 * TimelinePage - Temporal visualization of volcanic eruption history
 * 
 * Features:
 * - Volcano selection with autocomplete
 * - Eruption timeline scatter plot (date vs VEI)
 * - Eruption frequency chart (by decade/century)
 * - Statistics panel (date range, eruption rate, etc.)
 * - CSV data export
 */
const TimelinePage: React.FC = () => {
  const [volcanoNames, setVolcanoNames] = useState<string[]>([]);
  const [volcanoes, setVolcanoes] = useState<Array<{ volcano_number: number; volcano_name: string }>>([]);
  const [selectedVolcano, setSelectedVolcano] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [eruptions, setEruptions] = useState<Eruption[]>([]);
  const [sampleTimeline, setSampleTimeline] = useState<SampleTimelineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<'decade' | 'century'>('decade');

  // Load volcano names on mount
  useEffect(() => {
    const loadVolcanoes = async () => {
      try {
        const response = await fetch('/api/volcanoes/summary');
        const data = await response.json();
        setVolcanoes(data.data || []);
        const names = (data.data as Array<{ volcano_name: string }>)
          .map((v) => v.volcano_name)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        setVolcanoNames(names);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load volcanoes';
        console.error('Failed to load volcanoes:', err);
        showError(errorMessage);
      }
    };
    loadVolcanoes();
  }, []);

  // Fetch eruption data when volcano is selected
  useEffect(() => {
    if (!selectedVolcano) {
      setEruptions([]);
      setSampleTimeline(null);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setSampleLoading(true);
      setError(null);

      try {
        // Find volcano number from name
        const volcano = volcanoes.find((v) => v.volcano_name === selectedVolcano);
        if (!volcano) {
          throw new Error('Volcano not found');
        }

        // Fetch both eruptions and sample timeline in parallel
        const [eruptionResponse, sampleTimelineData] = await Promise.all([
          fetch(`/api/eruptions?volcano_number=${volcano.volcano_number}`),
          fetchVolcanoSampleTimeline(volcano.volcano_number).catch(() => null) // Don't fail if no samples
        ]);

        if (!eruptionResponse.ok) {
          throw new Error('Failed to fetch eruption data');
        }

        const eruptionData = await eruptionResponse.json();
        setEruptions(eruptionData.data || []);
        setSampleTimeline(sampleTimelineData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        showError(`Failed to load data for ${selectedVolcano}: ${errorMessage}`);
        setEruptions([]);
        setSampleTimeline(null);
      } finally {
        setLoading(false);
        setSampleLoading(false);
      }
    };

    loadData();
  }, [selectedVolcano, volcanoes]);

  // Calculate statistics
  const eruptionsWithDates = eruptions.filter((e) => dateInfoToYear(e.start_date) !== null);
  const dateRange = getDateRange(eruptionsWithDates.map((e) => e.start_date));
  const eruptionsWithVEI = eruptions.filter((e) => e.vei !== null && e.vei !== undefined);
  const avgVEI = eruptionsWithVEI.length > 0
    ? (eruptionsWithVEI.reduce((sum, e) => sum + (e.vei || 0), 0) / eruptionsWithVEI.length).toFixed(1)
    : 'N/A';
  
  // Calculate eruption rate
  let eruptionRate = 'N/A';
  if (dateRange && eruptionsWithDates.length > 1) {
    const yearSpan = dateRange.max - dateRange.min;
    if (yearSpan > 0) {
      const rate = (eruptionsWithDates.length / yearSpan) * 100; // per century
      eruptionRate = `${rate.toFixed(2)} per century`;
    }
  }

  // Filter volcano suggestions
  const filteredVolcanoNames = searchInput
    ? volcanoNames.filter((name) => name.toLowerCase().includes(searchInput.toLowerCase())).slice(0, 10)
    : [];

  const handleVolcanoSelect = (volcanoName: string) => {
    setSelectedVolcano(volcanoName);
    setSearchInput(volcanoName);
    setShowSuggestions(false);
  };

  const handleDownloadCSV = () => {
    exportEruptionsToCSV(eruptions, selectedVolcano);
  };

  // Keyboard shortcut for CSV export
  useKeyboardShortcuts([
    {
      key: 'd',
      ctrlKey: true,
      description: 'Download eruption timeline data as CSV',
      action: () => {
        if (eruptions.length > 0) handleDownloadCSV();
      },
    },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-volcano-600" />
            <h1 className="text-2xl font-bold text-gray-900">Eruption Timeline</h1>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Visualize temporal patterns of volcanic activity
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main" aria-label="Eruption timeline content">
        {/* Volcano Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Volcano</h2>

          <div className="relative max-w-md">
            <input
              type="text"
              aria-label="Search for volcano"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Type to search volcanoes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-volcano-500 focus:border-volcano-500 transition-all duration-200"
            />

            {showSuggestions && filteredVolcanoNames.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredVolcanoNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleVolcanoSelect(name)}
                    className="w-full text-left px-4 py-2 hover:bg-volcano-50 text-sm text-gray-700"
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
            <ChartSkeleton height="400px" />
            <ChartSkeleton height="350px" />
            <CardSkeleton />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Results */}
        {!loading && !error && selectedVolcano && eruptions.length > 0 && (
          <>
            {/* Statistics Panel */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-volcano-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Summary Statistics</h2>
                </div>
                <button
                  onClick={handleDownloadCSV}
                  aria-label="Download eruption timeline data as CSV"
                  className="flex items-center gap-2 px-4 py-2 bg-volcano-600 text-white rounded-lg hover:bg-volcano-700 transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Eruptions</p>
                  <p className="text-2xl font-bold text-gray-900">{eruptions.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {eruptionsWithDates.length} with known dates
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Date Range</p>
                  <p className="text-lg font-bold text-gray-900">
                    {dateRange ? formatYearRange(dateRange.min, dateRange.max) : 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {dateRange ? `${dateRange.max - dateRange.min} years` : 'N/A'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Average VEI</p>
                  <p className="text-2xl font-bold text-gray-900">{avgVEI}</p>
                  <p className="text-xs text-gray-500 mt-1">{eruptionsWithVEI.length} with known VEI</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Eruption Rate</p>
                  <p className="text-lg font-bold text-gray-900">{eruptionRate}</p>
                </div>
              </div>
            </div>

            {/* Sample Timeline */}
            {sampleTimeline && sampleTimeline.total_samples > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Sample Collection Overview</h3>
                  <div className="text-sm text-gray-600">
                    {sampleTimeline.total_samples} samples
                    {sampleTimeline.has_timeline_data && ` · ${sampleTimeline.samples_with_dates} dated`}
                  </div>
                </div>
                {sampleLoading ? (
                  <ChartSkeleton height="400px" />
                ) : sampleTimeline.has_timeline_data ? (
                  <SampleTimelinePlot
                    data={sampleTimeline.timeline_data}
                    volcanoName={selectedVolcano}
                  />
                ) : (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          Timeline visualization not available: eruption date information is missing for this volcano's samples.
                          Samples are available ({sampleTimeline.rock_type_distribution.length} rock types) - use the <strong>Analyze Volcano</strong> tab to explore rock type distribution and geochemistry.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Timeline Plot */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Eruption Timeline</h3>
              <div className="h-[450px]">
                <EruptionTimelinePlot eruptions={eruptions} volcanoName={selectedVolcano} />
              </div>
            </div>

            {/* Frequency Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Eruption Frequency</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTimePeriod('decade')}
                      aria-label="Group eruptions by decade"
                      aria-pressed={timePeriod === 'decade'}
                      className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                        timePeriod === 'decade'
                          ? 'bg-volcano-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      By Decade
                    </button>
                    <button
                      onClick={() => setTimePeriod('century')}
                      aria-label="Group eruptions by century"
                      aria-pressed={timePeriod === 'century'}
                      className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                        timePeriod === 'century'
                          ? 'bg-volcano-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      By Century
                    </button>
                  </div>
                </div>
              </div>
              <div className="h-[450px]">
                <EruptionFrequencyChart
                  eruptions={eruptions}
                  volcanoName={selectedVolcano}
                  period={timePeriod}
                />
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && !error && selectedVolcano && eruptions.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No eruption data found for {selectedVolcano}</p>
          </div>
        )}

        {/* Initial State */}
        {!selectedVolcano && !loading && (
          <EmptyState
            icon={Clock}
            title="No Volcano Selected"
            description="Select a volcano to view its eruption timeline"
          />
        )}
      </main>
    </div>
  );
};

export default TimelinePage;
