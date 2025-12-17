import { useEffect } from 'react';
import { useSamplesStore } from '../store';
import { fetchSamples } from '../api/samples';
import type { SampleFilters } from '../types';

/**
 * Custom hook to fetch samples with filters and loading/error states
 * 
 * @param filters - Optional filters to apply to sample query
 * @param autoFetch - Whether to automatically fetch on mount (default: true)
 * @returns Samples data, loading state, error state, and refetch function
 * 
 * @example
 * ```tsx
 * const { samples, loading, error, refetch } = useSamples({
 *   rock_db: ['GEOROC'],
 *   country: ['Japan'],
 *   limit: 100
 * });
 * ```
 */
export function useSamples(filters?: SampleFilters, autoFetch: boolean = true) {
  const { 
    samples, 
    loading, 
    error, 
    setSamples, 
    setLoading, 
    setError,
    filters: storeFilters,
    setFilters 
  } = useSamplesStore();

  // Fetch samples from API
  const fetchData = async (customFilters?: SampleFilters) => {
    const filtersToUse = customFilters || filters || storeFilters;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchSamples(filtersToUse);
      setSamples(response.data);
      
      // Update filters in store if provided
      if (customFilters) {
        setFilters(customFilters);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch samples';
      setError(errorMessage);
      console.error('Error fetching samples:', err);
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
    samples,
    loading,
    error,
    refetch: fetchData,
    hasData: samples.length > 0
  };
}
