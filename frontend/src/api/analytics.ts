import apiClient from './client';
import type {
  TASPolygonsResponse,
  AFMBoundaryResponse,
  TectonicPlatesResponse,
  TectonicBoundariesResponse,
  MetadataResponse,
} from '../types';

/**
 * Fetch TAS diagram polygon definitions
 */
export const fetchTASPolygons = async (): Promise<TASPolygonsResponse> => {
  const response = await apiClient.get<TASPolygonsResponse>('/analytics/tas-polygons');
  return response.data;
};

/**
 * Fetch AFM diagram boundary (tholeiitic vs calc-alkaline)
 */
export const fetchAFMBoundary = async (): Promise<AFMBoundaryResponse> => {
  const response = await apiClient.get<AFMBoundaryResponse>('/analytics/afm-boundary');
  return response.data;
};

/**
 * Fetch tectonic plates GeoJSON
 */
export const fetchTectonicPlates = async (): Promise<TectonicPlatesResponse> => {
  const response = await apiClient.get<TectonicPlatesResponse>('/spatial/tectonic-plates');
  return response.data;
};

/**
 * Fetch tectonic boundaries GeoJSON
 */
export const fetchTectonicBoundaries = async (
  boundaryType?: 'ridge' | 'trench' | 'transform'
): Promise<TectonicBoundariesResponse> => {
  const response = await apiClient.get<TectonicBoundariesResponse>(
    '/spatial/tectonic-boundaries',
    {
      params: boundaryType ? { boundary_type: boundaryType } : undefined,
    }
  );
  return response.data;
};

/**
 * Fetch metadata (countries, tectonic settings, rock types, etc.)
 */
export const fetchCountries = async (): Promise<string[]> => {
  const response = await apiClient.get<MetadataResponse>('/metadata/countries');
  return response.data.data as string[];
};

export const fetchTectonicSettings = async (): Promise<string[]> => {
  const response = await apiClient.get<MetadataResponse>('/metadata/tectonic-settings');
  return response.data.data as string[];
};

export const fetchRockTypes = async (): Promise<string[]> => {
  const response = await apiClient.get<MetadataResponse>('/metadata/rock-types');
  return response.data.data as string[];
};

export const fetchDatabases = async (): Promise<string[]> => {
  const response = await apiClient.get<MetadataResponse>('/metadata/databases');
  return response.data.data as string[];
};

/**
 * Check API health
 */
export const checkHealth = async (): Promise<{ status: string; version: string }> => {
  const response = await apiClient.get<{ status: string; version: string }>('/health');
  return response.data;
};
