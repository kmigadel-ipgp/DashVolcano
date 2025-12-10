import { useState, useEffect, useCallback } from 'react';
import { useViewportStore } from '../store';
import { fetchSamplesInBounds } from '../api/samples';
import type { Sample } from '../types';

/**
 * Custom hook to fetch samples within the current map viewport bounds
 * 
 * @param enabled - Whether to fetch samples (default: true)
 * @param autoFetch - Whether to automatically fetch when viewport changes (default: false)
 * @returns Samples in bounds, loading state, error state, and fetch function
 * 
 * @example
 * ```tsx
 * const { samples, loading, error, fetchInBounds } = useMapBounds();
 * 
 * // Manually trigger fetch after user stops panning
 * const handleViewportChange = () => {
 *   fetchInBounds();
 * };
 * ```
 */
export function useMapBounds(enabled: boolean = true, autoFetch: boolean = false) {
  const { longitude, latitude, zoom } = useViewportStore();
  
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate approximate bounding box from viewport
  // This is a rough estimate based on zoom level
  const calculateBounds = useCallback(() => {
    // Rough approximation: zoom 0 = ~360 degrees, each zoom level halves the distance
    const degreesPerPixel = 360 / Math.pow(2, zoom + 8);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const deltaLon = (viewportWidth * degreesPerPixel) / 2;
    const deltaLat = (viewportHeight * degreesPerPixel) / 2;
    
    return {
      min_lon: longitude - deltaLon,
      max_lon: longitude + deltaLon,
      min_lat: latitude - deltaLat,
      max_lat: latitude + deltaLat
    };
  }, [longitude, latitude, zoom]);

  // Fetch samples in current viewport bounds
  const fetchInBounds = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const bounds = calculateBounds();
      const response = await fetchSamplesInBounds(bounds);
      setSamples(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch samples in bounds';
      setError(errorMessage);
      console.error('Error fetching samples in bounds:', err);
    } finally {
      setLoading(false);
    }
  }, [enabled, calculateBounds]);

  // Auto-fetch when viewport changes (if enabled)
  useEffect(() => {
    if (autoFetch && enabled) {
      // Debounce to avoid excessive API calls during panning
      const timeoutId = setTimeout(() => {
        fetchInBounds();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [autoFetch, enabled, fetchInBounds]);

  return {
    samples,
    loading,
    error,
    fetchInBounds,
    bounds: calculateBounds(),
    hasData: samples.length > 0
  };
}
