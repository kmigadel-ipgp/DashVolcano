import React, { useEffect, useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import { Globe2, Map as MapIcon, X } from 'lucide-react';
import { RockTypeRadarChart } from '../Charts';
import { fetchRockTypeDistribution } from '../../api/analytics';
import { fetchVolcanoes } from '../../api/volcanoes';
import { calculateRockTypeDistribution, filterSamplesByConfidence } from '../../utils/confidence';
import type {
  BBox,
  ComparisonVolcanoOption,
  RockTypeComparisonMode,
  RockTypeDistributionResponse,
  RockTypeRadarSeries,
  Sample,
  SampleFilters,
  Volcano,
} from '../../types';
import type { ConfidenceLevel } from '../../utils/confidence';

interface RockTypeRadarPanelProps {
  samples: Sample[];
  sampleFilters: SampleFilters;
  selectedConfidenceLevels: ConfidenceLevel[];
  primaryDatasetLabel: string;
  comparisonBbox?: BBox | null;
  isDrawingComparisonBbox?: boolean;
  onStartComparisonBbox?: () => void;
  onClearComparisonBbox?: () => void;
  comparisonMode: RockTypeComparisonMode;
  onComparisonModeChange: (mode: RockTypeComparisonMode) => void;
  comparisonVolcano: ComparisonVolcanoOption | null;
  onComparisonVolcanoChange: (volcano: ComparisonVolcanoOption | null) => void;
  comparisonSamples?: Sample[];
  comparisonLoading?: boolean;
  comparisonError?: string | null;
}

interface APIErrorResponse {
  detail?: string;
}

const PRIMARY_COLOR = '#D97706';
const MODE_COLORS: Record<Exclude<RockTypeComparisonMode, 'none'>, string> = {
  global: '#2563EB',
  volcano: '#0F766E',
  bbox: '#059669',
};

const buildDistributionFilters = (
  sampleFilters: SampleFilters,
  selectedConfidenceLevels: ConfidenceLevel[]
) => ({
  database: sampleFilters.database,
  rock_type: sampleFilters.rock_type,
  tectonic_setting: sampleFilters.tectonic_setting,
  min_sio2: sampleFilters.min_sio2,
  max_sio2: sampleFilters.max_sio2,
  material: 'WR',
  confidence_levels: selectedConfidenceLevels,
});

const formatBboxLabel = (bbox: BBox) => (
  `${bbox.minLon.toFixed(2)}, ${bbox.minLat.toFixed(2)} → ${bbox.maxLon.toFixed(2)}, ${bbox.maxLat.toFixed(2)}`
);

export const RockTypeRadarPanel: React.FC<RockTypeRadarPanelProps> = ({
  samples,
  sampleFilters,
  selectedConfidenceLevels,
  primaryDatasetLabel,
  comparisonBbox = null,
  isDrawingComparisonBbox = false,
  onStartComparisonBbox,
  onClearComparisonBbox,
  comparisonMode,
  onComparisonModeChange,
  comparisonVolcano,
  onComparisonVolcanoChange,
  comparisonSamples = [],
  comparisonLoading = false,
  comparisonError = null,
}) => {
  const [globalComparisonData, setGlobalComparisonData] = useState<RockTypeDistributionResponse | null>(null);
  const [globalComparisonLoading, setGlobalComparisonLoading] = useState(false);
  const [globalComparisonError, setGlobalComparisonError] = useState<string | null>(null);
  const [volcanoOptions, setVolcanoOptions] = useState<ComparisonVolcanoOption[]>([]);
  const [volcanoSearch, setVolcanoSearch] = useState(comparisonVolcano?.volcano_name ?? '');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const primarySamples = useMemo(
    () => filterSamplesByConfidence(samples, selectedConfidenceLevels).filter(sample => sample.material === 'WR'),
    [samples, selectedConfidenceLevels]
  );

  const primaryRockTypes = useMemo(
    () => calculateRockTypeDistribution(primarySamples),
    [primarySamples]
  );

  const primarySampleCount = useMemo(
    () => Object.values(primaryRockTypes).reduce((sum, count) => sum + count, 0),
    [primaryRockTypes]
  );

  const primarySeriesLabel = useMemo(() => {
    if (!primaryDatasetLabel) {
      return `${primarySampleCount} WR`;
    }

    return `${primaryDatasetLabel} (${primarySampleCount} WR)`;
  }, [primaryDatasetLabel, primarySampleCount]);

  const primarySeries = useMemo<RockTypeRadarSeries>(() => ({
    label: primarySeriesLabel,
    rockTypes: primaryRockTypes,
    sampleCount: primarySampleCount,
    color: PRIMARY_COLOR,
    sourceType: 'primary',
  }), [primaryRockTypes, primarySampleCount, primarySeriesLabel]);

  const comparisonRockTypes = useMemo(
    () => calculateRockTypeDistribution(
      comparisonSamples.filter(sample => sample.material === 'WR' && !!sample.petro?.rock_type)
    ),
    [comparisonSamples]
  );

  const comparisonSampleCount = useMemo(
    () => Object.values(comparisonRockTypes).reduce((sum, count) => sum + count, 0),
    [comparisonRockTypes]
  );

  const comparisonSeries = useMemo<RockTypeRadarSeries | null>(() => {
    if (comparisonMode === 'global') {
      if (!globalComparisonData || Object.keys(globalComparisonData.rock_types).length === 0) {
        return null;
      }

      return {
        label: `Filtered DB Baseline (${globalComparisonData.sample_count} WR)`,
        rockTypes: globalComparisonData.rock_types,
        sampleCount: globalComparisonData.sample_count,
        color: MODE_COLORS.global,
        sourceType: 'global',
      };
    }

    if (comparisonMode === 'volcano' && comparisonVolcano) {
      if (comparisonSampleCount === 0 || Object.keys(comparisonRockTypes).length === 0) {
        return null;
      }

      return {
        label: `${comparisonVolcano.volcano_name} (${comparisonSampleCount} WR)`,
        rockTypes: comparisonRockTypes,
        sampleCount: comparisonSampleCount,
        color: MODE_COLORS.volcano,
        sourceType: 'volcano',
      };
    }

    if (comparisonMode === 'bbox') {
      if (comparisonSampleCount === 0 || Object.keys(comparisonRockTypes).length === 0) {
        return null;
      }

      return {
        label: `Comparison Area (${comparisonSampleCount} WR)`,
        rockTypes: comparisonRockTypes,
        sampleCount: comparisonSampleCount,
        color: MODE_COLORS.bbox,
        sourceType: 'bbox',
      };
    }

    return null;
  }, [comparisonMode, comparisonRockTypes, comparisonSampleCount, comparisonVolcano, globalComparisonData]);

  const radarSeries = useMemo(
    () => comparisonSeries ? [primarySeries, comparisonSeries] : [primarySeries],
    [comparisonSeries, primarySeries]
  );

  const resolvedComparisonLoading = comparisonMode === 'global'
    ? globalComparisonLoading
    : comparisonLoading;

  const resolvedComparisonError = comparisonMode === 'global'
    ? globalComparisonError
    : comparisonError;

  const filteredVolcanoOptions = useMemo(() => {
    if (!volcanoSearch) {
      return volcanoOptions.slice(0, 10);
    }

    return volcanoOptions
      .filter(volcano => volcano.volcano_name.toLowerCase().includes(volcanoSearch.toLowerCase()))
      .slice(0, 10);
  }, [volcanoOptions, volcanoSearch]);

  useEffect(() => {
    if (comparisonVolcano && volcanoSearch !== comparisonVolcano.volcano_name) {
      setVolcanoSearch(comparisonVolcano.volcano_name);
      return;
    }

    if (!comparisonVolcano && comparisonMode !== 'volcano' && volcanoSearch) {
      setVolcanoSearch('');
    }
  }, [comparisonMode, comparisonVolcano, volcanoSearch]);

  useEffect(() => {
    if (comparisonMode !== 'volcano' || volcanoOptions.length > 0) {
      return;
    }

    let cancelled = false;

    const loadVolcanoes = async () => {
      try {
        const response = await fetchVolcanoes();
        if (cancelled) {
          return;
        }

        const options = response.data
          .map((volcano: Volcano) => ({
            volcano_name: volcano.volcano_name,
            volcano_number: volcano.volcano_number,
          }))
          .sort((left, right) => left.volcano_name.localeCompare(right.volcano_name));

        setVolcanoOptions(options);
      } catch {
        if (!cancelled) {
          setGlobalComparisonError('Failed to load volcano list for radar comparison.');
        }
      }
    };

    loadVolcanoes();

    return () => {
      cancelled = true;
    };
  }, [comparisonMode, volcanoOptions.length]);

  useEffect(() => {
    if (comparisonMode !== 'global') {
      setGlobalComparisonData(null);
      setGlobalComparisonError(null);
      setGlobalComparisonLoading(false);
      return;
    }

    let cancelled = false;

    const loadComparison = async () => {
      setGlobalComparisonLoading(true);
      setGlobalComparisonError(null);

      try {
        const filters = buildDistributionFilters(sampleFilters, selectedConfidenceLevels);
        const response = await fetchRockTypeDistribution({
          ...filters,
        });

        if (!cancelled) {
          setGlobalComparisonData(response);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          const axiosError = error as AxiosError<APIErrorResponse>;
          setGlobalComparisonData(null);
          setGlobalComparisonError(
            axiosError.response?.data?.detail ||
            axiosError.message ||
            'Failed to load comparison distribution.'
          );
        }
      } finally {
        if (!cancelled) {
          setGlobalComparisonLoading(false);
        }
      }
    };

    loadComparison();

    return () => {
      cancelled = true;
    };
  }, [comparisonMode, sampleFilters, selectedConfidenceLevels]);

  return (
    <div className="space-y-4">
      <div className="border rounded-lg bg-gray-50 p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Compare against:</span>
          <button
            onClick={() => onComparisonModeChange('none')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              comparisonMode === 'none'
                ? 'bg-volcano-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            None
          </button>
          <button
            onClick={() => onComparisonModeChange('global')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              comparisonMode === 'global'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            <Globe2 className="w-4 h-4 inline mr-2" />
            Filtered DB Baseline
          </button>
          <button
            onClick={() => onComparisonModeChange('volcano')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              comparisonMode === 'volcano'
                ? 'bg-teal-700 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Another Volcano
          </button>
          <button
            onClick={() => onComparisonModeChange('bbox')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              comparisonMode === 'bbox'
                ? 'bg-emerald-700 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            <MapIcon className="w-4 h-4 inline mr-2" />
            Comparison Area
          </button>
        </div>

        <div className="text-sm text-gray-600">
          Baseline comparisons reuse the active non-spatial filters and current confidence selection. Radar counts include <strong>WR samples only</strong>.
        </div>

        {comparisonMode === 'volcano' && (
          <div className="relative max-w-xl">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compare with another volcano
            </label>
            <input
              type="text"
              value={volcanoSearch}
              onChange={(event) => {
                setVolcanoSearch(event.target.value);
                onComparisonVolcanoChange(null);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Type to search volcanoes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            />
            {comparisonVolcano && (
              <button
                onClick={() => {
                  onComparisonVolcanoChange(null);
                  setVolcanoSearch('');
                }}
                className="absolute top-9 right-3 text-gray-400 hover:text-gray-600"
                aria-label="Clear comparison volcano"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {showSuggestions && filteredVolcanoOptions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredVolcanoOptions.map(volcano => (
                  <button
                    key={volcano.volcano_number}
                    type="button"
                    onClick={() => {
                      onComparisonVolcanoChange(volcano);
                      setVolcanoSearch(volcano.volcano_name);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-teal-50 text-sm text-gray-700"
                  >
                    {volcano.volcano_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {comparisonMode === 'bbox' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onStartComparisonBbox}
                disabled={isDrawingComparisonBbox}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  isDrawingComparisonBbox
                    ? 'bg-emerald-600 text-white cursor-not-allowed'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800'
                }`}
              >
                {isDrawingComparisonBbox ? 'Drawing comparison area...' : 'Draw comparison area'}
              </button>
              {comparisonBbox && (
                <button
                  onClick={onClearComparisonBbox}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Clear comparison area
                </button>
              )}
            </div>
            <div className="text-sm text-gray-600">
              Draw a second bbox on the map. It is used only for radar comparison and does not replace the primary map selection.
            </div>
            {comparisonBbox && (
              <div className="text-sm font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md p-3">
                {formatBboxLabel(comparisonBbox)}
              </div>
            )}
          </div>
        )}
      </div>

      {primarySeries.sampleCount === 0 ? (
        <div className="border rounded-lg p-6 bg-gray-50 text-gray-600 text-center">
          No whole-rock samples remain after applying the current confidence filter.
        </div>
      ) : (
        <RockTypeRadarChart series={radarSeries} />
      )}

      {comparisonMode === 'volcano' && !comparisonVolcano && (
        <div className="border rounded-lg p-4 bg-gray-50 text-sm text-gray-600">
          Choose a volcano from the autocomplete list to load a comparison distribution.
        </div>
      )}

      {comparisonMode === 'bbox' && !comparisonBbox && !isDrawingComparisonBbox && (
        <div className="border rounded-lg p-4 bg-gray-50 text-sm text-gray-600">
          Draw a comparison area on the map to load its rock-type distribution.
        </div>
      )}

      {resolvedComparisonLoading && (
        <div className="border rounded-lg p-4 bg-white text-sm text-gray-600">
          Loading comparison distribution...
        </div>
      )}

      {resolvedComparisonError && (
        <div className="border rounded-lg p-4 bg-red-50 text-sm text-red-700 border-red-200">
          {resolvedComparisonError}
        </div>
      )}

      {comparisonMode === 'global' && !resolvedComparisonLoading && globalComparisonData && Object.keys(globalComparisonData.rock_types).length === 0 && (
        <div className="border rounded-lg p-4 bg-gray-50 text-sm text-gray-600">
          No rock-type distribution is available for the selected comparison filters.
        </div>
      )}

      {comparisonMode === 'volcano' && comparisonVolcano && !resolvedComparisonLoading && !resolvedComparisonError && comparisonSampleCount === 0 && (
        <div className="border rounded-lg p-4 bg-gray-50 text-sm text-gray-600">
          No whole-rock rock type samples are available for the selected comparison volcano.
        </div>
      )}

      {comparisonMode === 'bbox' && comparisonBbox && !resolvedComparisonLoading && !resolvedComparisonError && comparisonSampleCount === 0 && (
        <div className="border rounded-lg p-4 bg-gray-50 text-sm text-gray-600">
          No rock-type distribution is available for the selected comparison filters.
        </div>
      )}
    </div>
  );
};

export default RockTypeRadarPanel;