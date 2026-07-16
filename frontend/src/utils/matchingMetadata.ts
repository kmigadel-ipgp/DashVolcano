import type { MatchingMetadata } from '../types';

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

/**
 * Distance (km) between the sample and its associated volcano.
 * Under the distance + literature model this lives on `volcano.dist_km`.
 */
export const getMatchingDistance = (metadata?: MatchingMetadata): number | undefined => {
  const distKm = metadata?.volcano?.dist_km;
  return isFiniteNumber(distKm) ? distKm : undefined;
};
