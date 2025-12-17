import apiClient from './client';
import type {
  Volcano,
  FeatureCollection,
  PaginatedResponse,
  VolcanoFilters,
  Sample,
  Eruption,
  VEIDistribution,
  ChemicalAnalysisResponse,
  VolcanoRockTypesResponse,
  SampleTimelineResponse,
} from '../types';

/**
 * Fetch volcanoes with optional filters
 */
export const fetchVolcanoes = async (
  filters?: VolcanoFilters
): Promise<PaginatedResponse<Volcano>> => {
  // Use the lightweight summary endpoint by default for initial map/list loads.
  const response = await apiClient.get<PaginatedResponse<Volcano>>('/volcanoes/summary', {
    params: filters,
  });
  return response.data;
};

/**
 * Fetch the full volcano documents (fallback when callers need all fields).
 */
export const fetchFullVolcanoes = async (
  filters?: VolcanoFilters
): Promise<PaginatedResponse<Volcano>> => {
  const response = await apiClient.get<PaginatedResponse<Volcano>>('/volcanoes', {
    params: filters,
  });
  return response.data;
};

/**
 * Fetch a single volcano by volcano number
 */
export const fetchVolcanoByNumber = async (volcanoNumber: number): Promise<Volcano> => {
  const response = await apiClient.get<Volcano>(`/volcanoes/${volcanoNumber}`);
  return response.data;
};

/**
 * Fetch volcanoes as GeoJSON
 */
export const fetchVolcanoesGeoJSON = async (
  filters?: VolcanoFilters
): Promise<FeatureCollection<Volcano>> => {
  const response = await apiClient.get<FeatureCollection<Volcano>>('/volcanoes/geojson', {
    params: filters,
  });
  return response.data;
};

/**
 * Fetch samples for a specific volcano
 */
export const fetchVolcanoSamples = async (
  volcanoNumber: number,
  limit?: number
): Promise<PaginatedResponse<Sample>> => {
  const response = await apiClient.get<PaginatedResponse<Sample>>(
    `/volcanoes/${volcanoNumber}/samples`,
    {
      params: { limit },
    }
  );
  return response.data;
};

/**
 * Fetch eruptions for a specific volcano
 */
export const fetchVolcanoEruptions = async (
  volcanoNumber: number
): Promise<PaginatedResponse<Eruption>> => {
  const response = await apiClient.get<PaginatedResponse<Eruption>>(
    `/volcanoes/${volcanoNumber}/eruptions`
  );
  return response.data;
};

/**
 * Fetch VEI distribution for a specific volcano
 */
export const fetchVolcanoVEIDistribution = async (
  volcanoNumber: number
): Promise<VEIDistribution> => {
  const response = await apiClient.get<VEIDistribution>(
    `/volcanoes/${volcanoNumber}/vei-distribution`
  );
  return response.data;
};

/**
 * Fetch chemical analysis data for a specific volcano
 */
export const fetchVolcanoChemicalAnalysis = async (
  volcanoNumber: number
): Promise<ChemicalAnalysisResponse> => {
  const response = await apiClient.get<ChemicalAnalysisResponse>(
    `/volcanoes/${volcanoNumber}/chemical-analysis`
  );
  return response.data;
};

/**
 * Fetch GVP rock types for a specific volcano
 */
export const fetchVolcanoRockTypes = async (
  volcanoNumber: number
): Promise<VolcanoRockTypesResponse> => {
  const response = await apiClient.get<VolcanoRockTypesResponse>(
    `/volcanoes/${volcanoNumber}/rock-types`
  );
  return response.data;
};

/**
 * Fetch sample timeline (aggregated by year) for a specific volcano
 */
export const fetchVolcanoSampleTimeline = async (
  volcanoNumber: number
): Promise<SampleTimelineResponse> => {
  const response = await apiClient.get<SampleTimelineResponse>(
    `/volcanoes/${volcanoNumber}/sample-timeline`
  );
  return response.data;
};
