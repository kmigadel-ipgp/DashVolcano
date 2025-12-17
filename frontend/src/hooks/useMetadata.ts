import { useState, useEffect } from 'react';
import { fetchCountries, fetchTectonicSettings, fetchRockTypes, fetchDatabases } from '../api/analytics';

interface MetadataCache {
  countries: string[];
  tectonicSettings: string[];
  rockTypes: string[];
  databases: string[];
}

/**
 * Custom hook to fetch metadata (countries, tectonic settings, rock types, databases)
 * Data is cached after first fetch to avoid repeated API calls
 * 
 * @param autoFetch - Whether to automatically fetch on mount (default: true)
 * @returns Metadata lists, loading state, error state, and refetch function
 * 
 * @example
 * ```tsx
 * const { countries, tectonicSettings, rockTypes, databases, loading } = useMetadata();
 * 
 * // Use in dropdowns
 * <select>
 *   {countries.map(country => (
 *     <option key={country} value={country}>{country}</option>
 *   ))}
 * </select>
 * ```
 */
export function useMetadata(autoFetch: boolean = true) {
  const [metadata, setMetadata] = useState<MetadataCache>({
    countries: [],
    tectonicSettings: [],
    rockTypes: [],
    databases: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all metadata in parallel
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [countries, tectonicSettings, rockTypes, databases] = await Promise.all([
        fetchCountries(),
        fetchTectonicSettings(),
        fetchRockTypes(),
        fetchDatabases()
      ]);
      
      setMetadata({
        countries,
        tectonicSettings,
        rockTypes,
        databases
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metadata';
      setError(errorMessage);
      console.error('Error fetching metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  return {
    countries: metadata.countries,
    tectonicSettings: metadata.tectonicSettings,
    rockTypes: metadata.rockTypes,
    databases: metadata.databases,
    loading,
    error,
    refetch: fetchData,
    hasData: metadata.countries.length > 0
  };
}
