import { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchTectonicPlates, fetchTectonicBoundaries } from '../api/analytics';
import type { TectonicPlatesResponse, TectonicBoundariesResponse } from '../types';

interface TectonicData {
  plates: TectonicPlatesResponse | null;
  boundaries: TectonicBoundariesResponse | null;
}

/** Max number of automatic retries on transient network errors. */
const MAX_RETRIES = 3;
/** Base backoff delay in ms (doubles on each attempt: 800, 1600, 3200). */
const RETRY_BASE_DELAY_MS = 800;

const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });

/** A request was cancelled (unmount / StrictMode double-invoke), not a real failure. */
const isCancelled = (err: unknown) =>
  axios.isCancel(err) ||
  (err instanceof DOMException && err.name === 'AbortError') ||
  (axios.isAxiosError(err) && err.code === 'ERR_CANCELED');

/** A transient network error (no response received) is worth retrying. */
const isRetryableNetworkError = (err: unknown) =>
  axios.isAxiosError(err) && !err.response && !isCancelled(err);

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

  // One attempt: resolves with the fetched data or throws (network/cancel error).
  const attemptFetch = async (signal?: AbortSignal): Promise<TectonicData> => {
    const [platesData, boundariesData] = await Promise.all([
      fetchPlates ? fetchTectonicPlates(signal) : Promise.resolve(null),
      fetchBoundaries ? fetchTectonicBoundaries(boundaryType, signal) : Promise.resolve(null)
    ]);
    return { plates: platesData, boundaries: boundariesData };
  };

  // Fetch tectonic data, retrying transient network errors with backoff.
  // The optional signal lets the caller abort in-flight requests on unmount.
  const fetchData = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const result = await attemptFetch(signal);
        if (signal?.aborted) return;
        setData(result);
        setError(null);
        setLoading(false);
        return;
      } catch (err) {
        // Cancellations (unmount / StrictMode double-invoke) are not failures.
        if (isCancelled(err) || signal?.aborted) return;

        const canRetry = isRetryableNetworkError(err) && attempt < MAX_RETRIES;
        if (!canRetry) {
          const message = err instanceof Error ? err.message : 'Failed to fetch tectonic data';
          setError(message);
          setLoading(false);
          console.error('Error fetching tectonic data:', err);
          return;
        }

        try {
          await delay(RETRY_BASE_DELAY_MS * 2 ** attempt, signal);
        } catch {
          return; // aborted while waiting
        }
      }
    }
  };

  // Fetch on mount and when options change
  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
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
