import apiClient from './client';
import type {
  Sample,
  FeatureCollection,
  PaginatedResponse,
  SampleFilters,
  SpatialBoundsParams,
  SpatialNearbyParams,
} from '../types';

const joinFilterValue = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value.join(',');
  }

  return value;
};

/**
 * Fetch samples with optional filters
 */
export const fetchSamples = async (
  filters?: SampleFilters
): Promise<PaginatedResponse<Sample>> => {
  const params = filters
    ? {
        ...filters,
        rock_type: joinFilterValue(filters.rock_type),
        tectonic_setting: joinFilterValue(filters.tectonic_setting),
        material: joinFilterValue(filters.material),
        confidence_levels: filters.confidence_levels?.join(','),
      }
    : undefined;

  const response = await apiClient.get<PaginatedResponse<Sample>>('/samples', {
    params,
  });
  return response.data;
};

/**
 * Fetch a single sample by ID
 */
export const fetchSampleById = async (id: string): Promise<Sample> => {
  const response = await apiClient.get<Sample>(`/samples/${id}`);
  return response.data;
};

/**
 * Fetch samples as GeoJSON
 */
export const fetchSamplesGeoJSON = async (
  filters?: SampleFilters
): Promise<FeatureCollection<Sample>> => {
  const response = await apiClient.get<FeatureCollection<Sample>>('/samples/geojson', {
    params: filters,
  });
  return response.data;
};

/**
 * Fetch samples within a bounding box
 */
export const fetchSamplesInBounds = async (
  params: SpatialBoundsParams
): Promise<PaginatedResponse<Sample>> => {
  const response = await apiClient.get<PaginatedResponse<Sample>>('/spatial/bounds', {
    params,
  });
  return response.data;
};

/**
 * Fetch samples near a point
 */
export const fetchSamplesNearby = async (
  params: SpatialNearbyParams
): Promise<PaginatedResponse<Sample>> => {
  const response = await apiClient.get<PaginatedResponse<Sample>>('/spatial/nearby', {
    params,
  });
  return response.data;
};

/**
 * Export samples as CSV
 */
export const exportSamples = async (filters?: SampleFilters): Promise<Blob> => {
  const response = await apiClient.get('/samples/export', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};
