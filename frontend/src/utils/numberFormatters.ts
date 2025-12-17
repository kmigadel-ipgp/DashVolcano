/**
 * Format a coordinate value with specified precision
 * 
 * @param value - Coordinate value (longitude or latitude)
 * @param precision - Number of decimal places (default: 4)
 * @param type - Coordinate type for directional suffix ('lon' or 'lat')
 * @returns Formatted coordinate string
 * 
 * @example
 * formatCoordinate(139.6917, 4, 'lon') // "139.6917°E"
 * formatCoordinate(35.6895, 4, 'lat') // "35.6895°N"
 * formatCoordinate(-73.9857, 4, 'lon') // "73.9857°W"
 */
export function formatCoordinate(
  value: number, 
  precision: number = 4,
  type?: 'lon' | 'lat'
): string {
  const absValue = Math.abs(value).toFixed(precision);
  
  if (type === 'lon') {
    const direction = value >= 0 ? 'E' : 'W';
    return `${absValue}°${direction}`;
  }
  
  if (type === 'lat') {
    const direction = value >= 0 ? 'N' : 'S';
    return `${absValue}°${direction}`;
  }
  
  return `${value.toFixed(precision)}°`;
}

/**
 * Format a percentage value
 * 
 * @param value - Percentage value (0-100)
 * @param precision - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 * 
 * @example
 * formatPercentage(45.6789) // "45.68%"
 * formatPercentage(0.5, 3) // "0.500%"
 */
export function formatPercentage(value: number | undefined, precision: number = 2): string {
  if (value === undefined || value === null) return 'N/A';
  return `${value.toFixed(precision)}%`;
}

/**
 * Format an oxide concentration value
 * 
 * @param value - Oxide concentration (weight percent)
 * @param precision - Number of decimal places (default: 2)
 * @returns Formatted oxide string with "wt%" suffix
 * 
 * @example
 * formatOxide(48.5) // "48.50 wt%"
 * formatOxide(undefined) // "N/A"
 */
export function formatOxide(value: number | undefined, precision: number = 2): string {
  if (value === undefined || value === null) return 'N/A';
  return `${value.toFixed(precision)} wt%`;
}

/**
 * Format a large number with thousands separators
 * 
 * @param value - Number to format
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(100000) // "100,000"
 * formatNumber(1234.56) // "1,234.56"
 */
export function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A';
  return value.toLocaleString('en-US');
}

/**
 * Format a distance value in meters with appropriate units
 * 
 * @param meters - Distance in meters
 * @returns Formatted distance string with units
 * 
 * @example
 * formatDistance(500) // "500 m"
 * formatDistance(1500) // "1.50 km"
 * formatDistance(150000) // "150.00 km"
 */
export function formatDistance(meters: number | undefined): string {
  if (meters === undefined || meters === null) return 'N/A';
  
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  
  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
}

/**
 * Abbreviate a long number (e.g., 1000 -> 1K, 1000000 -> 1M)
 * 
 * @param value - Number to abbreviate
 * @returns Abbreviated number string
 * 
 * @example
 * abbreviateNumber(1500) // "1.5K"
 * abbreviateNumber(2500000) // "2.5M"
 */
export function abbreviateNumber(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A';
  
  if (value < 1000) {
    return value.toString();
  }
  
  if (value < 1000000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  return `${(value / 1000000).toFixed(1)}M`;
}
