import apiClient from './client';

/**
 * Metadata API response type
 */
export interface MetadataResponse {
  count: number;
  data: string[];
}

/**
 * Fetch all countries
 */
export const fetchCountries = async (): Promise<string[]> => {
  const response = await apiClient.get<MetadataResponse>('/metadata/countries');
  return response.data.data;
};

/**
 * Fetch all regions
 */
export const fetchRegions = async (): Promise<string[]> => {
  const response = await apiClient.get<MetadataResponse>('/metadata/regions');
  return response.data.data;
};

/**
 * Fetch all tectonic settings (combined from volcanoes and samples)
 */
export const fetchTectonicSettings = async (): Promise<string[]> => {
  const response = await apiClient.get<MetadataResponse>('/metadata/tectonic-settings');
  return response.data.data;
};

/**
 * Fetch tectonic settings for volcanoes only
 */
export const fetchVolcanoTectonicSettings = async (): Promise<string[]> => {
  const response = await apiClient.get<MetadataResponse>('/metadata/tectonic-settings-volcanoes');
  return response.data.data;
};

/**
 * Fetch tectonic settings for samples only
 */
export const fetchSampleTectonicSettings = async (): Promise<string[]> => {
  const response = await apiClient.get<MetadataResponse>('/metadata/tectonic-settings-samples');
  return response.data.data;
};

/**
 * Fetch all rock types
 */
export const fetchRockTypes = async (): Promise<string[]> => {
  const response = await apiClient.get<MetadataResponse>('/metadata/rock-types');
  return response.data.data;
};

/**
 * Fetch all databases
 */
export const fetchDatabases = async (): Promise<string[]> => {
  const response = await apiClient.get<MetadataResponse>('/metadata/databases');
  return response.data.data;
};

/**
 * Fetch all volcano names for autocomplete
 */
export const fetchVolcanoNames = async (): Promise<string[]> => {
  const response = await apiClient.get<MetadataResponse>('/metadata/volcano-names');
  return response.data.data;
};
