/**
 * Confidence Score Utilities
 * 
 * Handles visualization and formatting of matching_metadata.confidence_level
 * for volcano-sample associations.
 * 
 * Design Philosophy:
 * - Confidence is SECONDARY to selected-volcano highlighting
 * - Used primarily in tooltips/details, not as primary visual encoding
 * - Subtle color scheme that doesn't compete with existing rock/database colors
 * - Clear labels for accessibility and transparency
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

/**
 * Normalize confidence score to standard levels
 * Handles various input formats from backend
 */
export const normalizeConfidence = (
  confidence?: string | number | null
): ConfidenceLevel => {
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
