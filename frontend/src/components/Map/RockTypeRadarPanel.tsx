import React, { useEffect, useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import { Globe2, Map as MapIcon, X } from 'lucide-react';
import { RockTypeRadarChart } from '../Charts';
import { fetchRockTypeDistribution } from '../../api/analytics';
import { fetchVolcanoes } from '../../api/volcanoes';
import { calculateRockTypeDistribution, filterSamplesByMethod } from '../../utils/matchMethod';
import {
  createVolcanoAutocompleteOptions,
  filterVolcanoAutocompleteOptions,
} from '../../utils/volcanoAutocomplete';
import type {
  BBox,
  ComparisonVolcanoOption,
  RockTypeComparisonMode,
  RockTypeDistributionResponse,
  RockTypeRadarSeries,
  Sample,
  SampleFilters,
} from '../../types';
import type { MatchMethod } from '../../utils/matchMethod';
import { toStandardLongitude } from '../../utils/longitude';
import { Combobox } from '../Common/Combobox';
import { usePlotTheme } from '../../hooks/usePlotTheme';

interface RockTypeRadarPanelProps {
  samples: Sample[];
  sampleFilters: SampleFilters;
  selectedMatchMethods: MatchMethod[];
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

// Primary selection and comparison use the compared-series colours of the theme (hooks/usePlotTheme)

const buildDistributionFilters = (
  sampleFilters: SampleFilters,
  selectedMatchMethods: MatchMethod[]
) => ({
  database: sampleFilters.database,
  rock_type: sampleFilters.rock_type,
  tectonic_setting: sampleFilters.tectonic_setting,
  min_sio2: sampleFilters.min_sio2,
  max_sio2: sampleFilters.max_sio2,
  material: 'WR',
  match_methods: selectedMatchMethods,
});

const formatBboxLabel = (bbox: BBox) => (
  `${bbox.minLon.toFixed(2)}, ${bbox.minLat.toFixed(2)} → ${toStandardLongitude(bbox.maxLon).toFixed(2)}, ${bbox.maxLat.toFixed(2)}`
);

export const RockTypeRadarPanel: React.FC<RockTypeRadarPanelProps> = ({
  samples,
  sampleFilters,
  selectedMatchMethods,
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
  const { palette: { series } } = usePlotTheme();
  const [globalComparisonData, setGlobalComparisonData] = useState<RockTypeDistributionResponse | null>(null);
  const [globalComparisonLoading, setGlobalComparisonLoading] = useState(false);
  const [globalComparisonError, setGlobalComparisonError] = useState<string | null>(null);
  const [volcanoOptions, setVolcanoOptions] = useState<ComparisonVolcanoOption[]>([]);
  const [volcanoSearch, setVolcanoSearch] = useState(comparisonVolcano?.label ?? comparisonVolcano?.volcano_name ?? '');

  const primarySamples = useMemo(
    () => filterSamplesByMethod(samples, selectedMatchMethods).filter(sample => sample.material === 'WR'),
    [samples, selectedMatchMethods]
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
    color: series[0],
    sourceType: 'primary',
  }), [primaryRockTypes, primarySampleCount, primarySeriesLabel, series]);

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
        color: series[1],
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
        color: series[1],
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
        color: series[1],
        sourceType: 'bbox',
      };
    }

    return null;
  }, [comparisonMode, comparisonRockTypes, comparisonSampleCount, comparisonVolcano, globalComparisonData, series]);

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

    return filterVolcanoAutocompleteOptions(volcanoOptions, volcanoSearch).slice(0, 10);
  }, [volcanoOptions, volcanoSearch]);

  useEffect(() => {
    if (comparisonVolcano && volcanoSearch !== comparisonVolcano.label) {
      setVolcanoSearch(comparisonVolcano.label);
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

        const options = createVolcanoAutocompleteOptions(response.data);

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
        const filters = buildDistributionFilters(sampleFilters, selectedMatchMethods);
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
  }, [comparisonMode, sampleFilters, selectedMatchMethods]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-surface-sunken p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Compare against:</span>
          <button
            onClick={() => onComparisonModeChange('none')}
            className="seg-btn"
            aria-pressed={comparisonMode === 'none'}
          >
            None
          </button>
          <button
            onClick={() => onComparisonModeChange('global')}
            className="seg-btn"
            aria-pressed={comparisonMode === 'global'}
          >
            <Globe2 className="w-4 h-4 inline mr-2" />
            Filtered DB Baseline
          </button>
          <button
            onClick={() => onComparisonModeChange('volcano')}
            className="seg-btn"
            aria-pressed={comparisonMode === 'volcano'}
          >
            Another Volcano
          </button>
          <button
            onClick={() => onComparisonModeChange('bbox')}
            className="seg-btn"
            aria-pressed={comparisonMode === 'bbox'}
          >
            <MapIcon className="w-4 h-4 inline mr-2" />
            Comparison Area
          </button>
        </div>

        <div className="text-sm text-gray-600">
          Baseline comparisons reuse the active non-spatial filters and current association-method selection. Radar counts include <strong>WR samples only</strong>.
        </div>

        {comparisonMode === 'volcano' && (
          <div className="relative max-w-xl">
            <label htmlFor="radar-comparison-volcano" className="block text-sm font-medium text-gray-700 mb-2">
              Compare with another volcano
            </label>
            <Combobox
              id="radar-comparison-volcano"
              value={volcanoSearch}
              onValueChange={(value) => {
                setVolcanoSearch(value);
                onComparisonVolcanoChange(null);
              }}
              options={filteredVolcanoOptions}
              getOptionKey={(volcano) => volcano.volcano_number}
              getOptionLabel={(volcano) => volcano.label}
              onSelect={(volcano) => {
                onComparisonVolcanoChange(volcano);
                setVolcanoSearch(volcano.label);
              }}
              placeholder="Type to search volcanoes..."
              inputClassName="field"
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
          </div>
        )}

        {comparisonMode === 'bbox' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onStartComparisonBbox}
                disabled={isDrawingComparisonBbox}
                className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isDrawingComparisonBbox ? 'Drawing comparison area...' : 'Draw comparison area'}
              </button>
              {comparisonBbox && (
                <button
                  onClick={onClearComparisonBbox}
                  className="btn-secondary"
                >
                  Clear comparison area
                </button>
              )}
            </div>
            <div className="text-sm text-gray-600">
              Draw a second bbox on the map. It is used only for radar comparison and does not replace the primary map selection.
            </div>
            {comparisonBbox && (
              <div className="note font-mono text-gray-900">
                {formatBboxLabel(comparisonBbox)}
              </div>
            )}
          </div>
        )}
      </div>

      {primarySeries.sampleCount === 0 ? (
        <div className="border rounded-lg p-6 bg-gray-50 text-gray-600 text-center">
          No whole-rock samples remain after applying the current association-method filter.
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