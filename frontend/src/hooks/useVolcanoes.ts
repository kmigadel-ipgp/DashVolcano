import { useEffect } from 'react';
import { useVolcanoesStore } from '../store';
import { fetchVolcanoes } from '../api/volcanoes';
import type { VolcanoFilters } from '../types';

/**
 * Custom hook to fetch volcanoes with filters and loading/error states
 * 
 * @param filters - Optional filters to apply to volcano query
 * @param autoFetch - Whether to automatically fetch on mount (default: true)
 * @returns Volcanoes data, loading state, error state, and refetch function
 * 
 * @example
 * ```tsx
 * const { volcanoes, loading, error, refetch } = useVolcanoes({
 *   country: ['Japan'],
 *   tectonic_setting: ['Subduction zone'],
 *   limit: 50
 * });
 * ```
 */
export function useVolcanoes(filters?: VolcanoFilters, autoFetch: boolean = true) {
  const { 
    volcanoes, 
    loading, 
    error, 
    setVolcanoes, 
    setLoading, 
    setError,
    filters: storeFilters,
    setFilters 
  } = useVolcanoesStore();

  // Fetch volcanoes from API
  const fetchData = async (customFilters?: VolcanoFilters) => {
    const filtersToUse = customFilters || filters || storeFilters;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchVolcanoes(filtersToUse);
      setVolcanoes(response.data);
      
      // Update filters in store if provided
      if (customFilters) {
        setFilters(customFilters);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch volcanoes';
      setError(errorMessage);
      console.error('Error fetching volcanoes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, JSON.stringify(filters)]); // Refetch when filters change

  return {
    volcanoes,
    loading,
    error,
    refetch: fetchData,
    hasData: volcanoes.length > 0
  };
}
