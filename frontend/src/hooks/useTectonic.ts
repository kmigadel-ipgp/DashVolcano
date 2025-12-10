import { useState, useEffect } from 'react';
import { fetchTectonicPlates, fetchTectonicBoundaries } from '../api/analytics';
import type { TectonicPlatesResponse, TectonicBoundariesResponse } from '../types';

interface TectonicData {
  plates: TectonicPlatesResponse | null;
  boundaries: TectonicBoundariesResponse | null;
}

/**
 * Custom hook to fetch tectonic plates and boundaries
 * 
 * @param fetchPlates - Whether to fetch tectonic plates (default: true)
 * @param fetchBoundaries - Whether to fetch tectonic boundaries (default: true)
 * @param boundaryType - Optional boundary type filter ('ridge', 'trench', 'transform')
 * @returns Tectonic data, loading state, error state, and refetch function
 * 
 * @example
 * ```tsx
 * const { plates, boundaries, loading, error } = useTectonic();
 * 
 * // Fetch only ridges
 * const { boundaries } = useTectonic(false, true, 'ridge');
 * ```
 */
export function useTectonic(
  fetchPlates: boolean = true,
  fetchBoundaries: boolean = true,
  boundaryType?: 'ridge' | 'trench' | 'transform'
) {
  const [data, setData] = useState<TectonicData>({
    plates: null,
    boundaries: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tectonic data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [platesData, boundariesData] = await Promise.all([
        fetchPlates ? fetchTectonicPlates() : Promise.resolve(null),
        fetchBoundaries ? fetchTectonicBoundaries(boundaryType) : Promise.resolve(null)
      ]);
      
      setData({
        plates: platesData,
        boundaries: boundariesData
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tectonic data';
      setError(errorMessage);
      console.error('Error fetching tectonic data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when options change
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPlates, fetchBoundaries, boundaryType]);

  return {
    plates: data.plates,
    boundaries: data.boundaries,
    loading,
    error,
    refetch: fetchData,
    hasPlates: data.plates !== null,
    hasBoundaries: data.boundaries !== null
  };
}
