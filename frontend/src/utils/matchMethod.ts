/**
 * Match Method Utilities
 *
 * Handles visualization and formatting of matching_metadata for volcano-sample
 * associations under the distance + literature model.
 *
 * Association rules (from volcano-sample-matcher):
 * - `literature`: a volcano explicitly named in the publication (title) is linked
 *   directly, at any distance. Strongest, most explainable association.
 * - `nearest`: the nearest volcano within max distance (15 km) is linked.
 * - `no_match`: no volcano within range and no literature evidence.
 */

import type { MatchMethod, MatchingMetadata } from '../types';
import { getMatchingDistance } from './matchingMetadata';

export type { MatchMethod } from '../types';

export const ALL_MATCH_METHODS: MatchMethod[] = ['literature', 'nearest', 'no_match'];

/**
 * Derive the association method from matching metadata.
 * Falls back to inferring from the presence of a volcano when `method` is absent.
 */
export const getMatchMethod = (metadata?: MatchingMetadata): MatchMethod => {
  const method = metadata?.method;
  if (method === 'literature' || method === 'nearest' || method === 'no_match') {
    return method;
  }
  // Fallback for older/partial documents without an explicit method.
  if (metadata?.evid_lit?.match) return 'literature';
  if (metadata?.volcano) return 'nearest';
  return 'no_match';
};

/**
 * Get RGBA color for a match method (for map visualization).
 *
 * Note: only used when no volcano is selected. Selected-volcano samples always
 * use orange [255, 140, 0].
 */
export const getMatchMethodColor = (
  method: MatchMethod
): [number, number, number, number] => {
  switch (method) {
    case 'literature':
      return [34, 197, 94, 180];   // Green-500 — explicit, publication-backed
    case 'nearest':
      return [59, 130, 246, 180];  // Blue-500 — distance-based
    case 'no_match':
    default:
      return [156, 163, 175, 140]; // Gray-400 — unmatched
  }
};

/**
 * Get hex color for a match method (for CSS/badges).
 */
export const getMatchMethodColorHex = (method: MatchMethod): string => {
  switch (method) {
    case 'literature':
      return '#22C55E';   // Green-500
    case 'nearest':
      return '#3B82F6';   // Blue-500
    case 'no_match':
    default:
      return '#9CA3AF';   // Gray-400
  }
};

/**
 * Get human-readable label for a match method.
 */
export const getMatchMethodLabel = (method: MatchMethod): string => {
  switch (method) {
    case 'literature':
      return 'Literature match';
    case 'nearest':
      return 'Nearest (≤ 15 km)';
    case 'no_match':
    default:
      return 'Unmatched';
  }
};

/**
 * Get an icon glyph for a match method (quick visual reference).
 */
export const getMatchMethodIcon = (method: MatchMethod): string => {
  switch (method) {
    case 'literature':
      return '📚';
    case 'nearest':
      return '📍';
    case 'no_match':
    default:
      return '−';
  }
};

/**
 * Filter samples by association method.
 * Supports empty (nothing) and full (everything) selections explicitly.
 */
export const filterSamplesByMethod = <T extends { matching_metadata?: MatchingMetadata }>(
  samples: T[],
  selectedMethods: MatchMethod[]
): T[] => {
  if (selectedMethods.length === 0) {
    return [];
  }

  if (selectedMethods.length === ALL_MATCH_METHODS.length) {
    return samples;
  }

  return samples.filter(sample =>
    selectedMethods.includes(getMatchMethod(sample.matching_metadata))
  );
};

/**
 * Calculate rock type distribution from samples.
 * Used to compute rock type counts after applying method filtering.
 */
export const calculateRockTypeDistribution = <T extends { petro?: { rock_type?: string } }>(
  samples: T[]
): Record<string, number> => {
  const distribution: Record<string, number> = {};

  for (const sample of samples) {
    const rockType = sample.petro?.rock_type;
    if (rockType) {
      distribution[rockType] = (distribution[rockType] || 0) + 1;
    }
  }

  return distribution;
};

/**
 * Extract volcano name from matching metadata.
 */
export const getVolcanoName = (metadata?: MatchingMetadata): string | undefined => {
  return metadata?.volcano?.name;
};

/**
 * Extract volcano number from matching metadata.
 */
export const getVolcanoNumber = (metadata?: MatchingMetadata): string | undefined => {
  return metadata?.volcano?.number ? String(metadata.volcano.number) : undefined;
};

/**
 * Extract distance (km) from matching metadata.
 */
export const getDistance = (metadata?: MatchingMetadata): number | undefined => {
  return getMatchingDistance(metadata);
};

/**
 * Check if a sample is matched to a volcano.
 */
export const isMatched = (metadata?: MatchingMetadata): boolean => {
  return getMatchMethod(metadata) !== 'no_match' && !!metadata?.volcano;
};
