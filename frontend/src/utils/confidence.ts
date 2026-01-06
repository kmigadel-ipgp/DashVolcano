/**
 * Confidence Score Utilities
 * 
 * Handles visualization and formatting of matching_metadata for volcano-sample associations.
 * Supports both legacy (confidence_level) and new (quality.conf) structure.
 * 
 * Design Philosophy:
 * - Confidence is SECONDARY to selected-volcano highlighting
 * - Used primarily in tooltips/details, not as primary visual encoding
 * - Subtle color scheme that doesn't compete with existing rock/database colors
 * - Clear labels for accessibility and transparency
 */

import type { MatchingMetadata } from '../types';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

/**
 * Normalize confidence score to standard levels
 * Handles both legacy and new structure
 */
export const normalizeConfidence = (
  confidence?: string | number | null,
  metadata?: MatchingMetadata
): ConfidenceLevel => {
  // Try new structure first (quality.conf)
  if (metadata?.quality?.conf) {
    const conf = String(metadata.quality.conf).toLowerCase().trim();
    if (conf === 'high') return 'high';
    if (conf === 'medium') return 'medium';
    if (conf === 'low') return 'low';
    if (conf === 'none') return 'unknown';
  }
  
  // Fallback to legacy structure
  if (!confidence) return 'unknown';
  
  const conf = String(confidence).toLowerCase().trim();
  
  if (conf === 'high' || conf === '1') return 'high';
  if (conf === 'medium' || conf === '2') return 'medium';
  if (conf === 'low' || conf === '3') return 'low';
  
  return 'unknown';
};

/**
 * Get RGB color for confidence level (for map visualization)
 * Returns subtle colors that don't overpower existing encodings
 * 
 * Color Strategy:
 * - High: Green (reliable association)
 * - Medium: Yellow/Amber (moderate confidence)
 * - Low: Orange/Red (uncertain association)
 * - Unknown: Neutral gray (no metadata)
 * 
 * Note: These are ONLY used when no volcano is selected.
 * Selected volcano samples always use orange [255, 140, 0].
 */
export const getConfidenceColor = (
  confidence: ConfidenceLevel
): [number, number, number, number] => {
  switch (confidence) {
    case 'high':
      return [34, 197, 94, 180];    // Green-500 with transparency
    case 'medium':
      return [251, 191, 36, 180];   // Amber-400 with transparency
    case 'low':
      return [239, 68, 68, 180];    // Red-500 with transparency
    case 'unknown':
    default:
      return [156, 163, 175, 140];  // Gray-400 with more transparency
  }
};

/**
 * Get hex color for confidence level (for CSS/badges)
 */
export const getConfidenceColorHex = (confidence: ConfidenceLevel): string => {
  switch (confidence) {
    case 'high':
      return '#22C55E';    // Green-500
    case 'medium':
      return '#FBBF24';    // Amber-400
    case 'low':
      return '#EF4444';    // Red-500
    case 'unknown':
    default:
      return '#9CA3AF';    // Gray-400
  }
};

/**
 * Get human-readable label for confidence level
 */
export const getConfidenceLabel = (confidence: ConfidenceLevel): string => {
  switch (confidence) {
    case 'high':
      return 'High Confidence';
    case 'medium':
      return 'Medium Confidence';
    case 'low':
      return 'Low Confidence';
    case 'unknown':
    default:
      return 'Unknown Confidence';
  }
};

/**
 * Get detailed explanation of confidence level
 * Used in tooltips and detail panels
 */
export const getConfidenceDescription = (confidence: ConfidenceLevel): string => {
  switch (confidence) {
    case 'high':
      return 'Sample location is very close to volcano, high certainty of association';
    case 'medium':
      return 'Sample location is moderately close to volcano, reasonable association';
    case 'low':
      return 'Sample location is far from volcano, uncertain association';
    case 'unknown':
    default:
      return 'No confidence score available for this sample-volcano match';
  }
};

/**
 * Get confidence icon emoji (for visual quick reference)
 */
export const getConfidenceIcon = (confidence: ConfidenceLevel): string => {
  switch (confidence) {
    case 'high':
      return '✓';
    case 'medium':
      return '~';
    case 'low':
      return '?';
    case 'unknown':
    default:
      return '−';
  }
};

/**
 * Format confidence for CSV export
 * Returns standardized string representation
 */
export const formatConfidenceForCSV = (
  confidence?: string | number | null
): string => {
  return normalizeConfidence(confidence);
};

/**
 * Get confidence badge component props
 * Returns consistent styling for confidence badges across UI
 */
export const getConfidenceBadgeProps = (confidence: ConfidenceLevel) => {
  return {
    label: getConfidenceLabel(confidence),
    color: getConfidenceColorHex(confidence),
    icon: getConfidenceIcon(confidence),
    description: getConfidenceDescription(confidence),
  };
};

/**
 * Filter samples by confidence levels
 * Supports both legacy and new structure
 */
export const filterSamplesByConfidence = <T extends { matching_metadata?: MatchingMetadata }>(
  samples: T[],
  selectedLevels: ConfidenceLevel[]
): T[] => {
  // If no levels selected, return empty array (explicit filtering)
  if (selectedLevels.length === 0) {
    return [];
  }
  
  // If all levels selected, return all samples (no filtering needed)
  if (selectedLevels.length === 4) {
    return samples;
  }
  
  return samples.filter(sample => {
    const confidence = normalizeConfidence(
      sample.matching_metadata?.confidence_level,
      sample.matching_metadata
    );
    return selectedLevels.includes(confidence);
  });
};

/**
 * Calculate rock type distribution from samples
 * Used to compute rock type counts after applying confidence filtering
 */
export const calculateRockTypeDistribution = <T extends { rock_type?: string }>(
  samples: T[]
): Record<string, number> => {
  const distribution: Record<string, number> = {};
  
  for (const sample of samples) {
    const rockType = sample.rock_type;
    if (rockType) {
      distribution[rockType] = (distribution[rockType] || 0) + 1;
    }
  }
  
  return distribution;
};

/**
 * Extract volcano name from matching metadata (handles both legacy and new structure)
 */
export const getVolcanoName = (metadata?: MatchingMetadata): string | undefined => {
  return metadata?.volcano?.name || metadata?.volcano_name;
};

/**
 * Extract volcano number from matching metadata (handles both legacy and new structure)
 */
export const getVolcanoNumber = (metadata?: MatchingMetadata): string | undefined => {
  if (metadata?.volcano?.number) return metadata.volcano.number;
  if (metadata?.volcano_number) return String(metadata.volcano_number);
  return undefined;
};

/**
 * Extract distance from matching metadata (handles both legacy and new structure)
 */
export const getDistance = (metadata?: MatchingMetadata): number | undefined => {
  return metadata?.volcano?.dist_km || metadata?.distance_km;
};

/**
 * Check if sample is matched to a volcano
 */
export const isMatched = (metadata?: MatchingMetadata): boolean => {
  return !!(metadata?.volcano || metadata?.volcano_name);
};

/**
 * Get human-readable explanation from matching metadata
 * Translates tokens into readable messages
 */
export const getMatchExplanation = (metadata?: MatchingMetadata): string[] => {
  if (!metadata?.expl?.r) return [];
  
  const translations: Record<string, string> = {
    // Spatial
    'space:very_close': '📍 Very close (<5 km)',
    'space:near': '📍 Near (5-25 km)',
    'space:moderate': '📍 Moderate distance (25-50 km)',
    'space:far': '📍 Far (>50 km)',
    'space:no_data': '📍 No spatial data',
    
    // Tectonic
    'tecto:match': '🌍 Tectonic setting matches',
    'tecto:likely': '🌍 Tectonic setting likely matches',
    'tecto:partial': '🌍 Tectonic setting partially matches',
    'tecto:mismatch': '🌍 Tectonic mismatch',
    'tecto:no_data': '🌍 No tectonic data',
    
    // Temporal
    'time:strong': '📅 Date strongly matches',
    'time:partial': '📅 Date partially matches',
    'time:marginal': '📅 Date marginally matches',
    'time:pre_holocene': '📅 Pre-Holocene eruption',
    'time:no_data': '📅 No date data',
    
    // Petrological
    'petro:match': '🪨 Rock type strongly matches',
    'petro:compatible': '🪨 Rock type compatible',
    'petro:weak': '🪨 Rock type differs',
    'petro:no_data': '🪨 No rock type data',
    
    // Literature
    'lit:explicit': '📚 Explicitly mentioned in literature',
    'lit:partial': '📚 Partially mentioned in literature',
    'lit:regional': '📚 Region mentioned in literature',
    'lit:none': '📚 No literature mention'
  };
  
  return metadata.expl.r.map(token => translations[token] || token);
};

/**
 * Get warning flags from matching metadata
 */
export const getMatchFlags = (metadata?: MatchingMetadata): string[] => {
  if (!metadata?.expl?.f) return [];
  
  const flagTranslations: Record<string, string> = {
    'space:high_uncertainty': '⚠️ High spatial uncertainty',
    'time:low_precision': '⚠️ Low temporal precision',
    'time:wide_interval': '⚠️ Wide time interval',
    'time:zero_bp': '⚠️ Dated to 0 BP',
    'score:competing_candidates': '⚠️ Multiple volcanoes possible'
  };
  
  return metadata.expl.f.map(token => flagTranslations[token] || token);
};
