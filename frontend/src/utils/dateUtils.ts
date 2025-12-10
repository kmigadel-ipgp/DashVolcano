/**
 * Date utility functions for handling volcanic eruption dates
 * Supports DateInfo structure from backend, including BCE dates and uncertainty
 */

import type { DateInfo } from '../types';

/**
 * Parse DateInfo object to JavaScript Date
 * Handles missing fields and BCE dates (negative years)
 * 
 * @param dateInfo - DateInfo object from backend
 * @returns Date object or null if year is missing
 */
export function parseDateInfo(dateInfo: DateInfo | null | undefined): Date | null {
  if (!dateInfo?.year) {
    return null;
  }

  const year = dateInfo.year;
  const month = dateInfo.month ?? 1;  // Default to January
  const day = dateInfo.day ?? 1;      // Default to 1st

  // Handle BCE dates (negative years)
  // JavaScript Date uses year 0 = 1 BCE, year -1 = 2 BCE, etc.
  const jsYear = year <= 0 ? year - 1 : year;

  // Create date using UTC to avoid timezone issues
  const date = new Date(Date.UTC(jsYear, month - 1, day));

  return date;
}

/**
 * Convert DateInfo to year number (supports BCE as negative)
 * 
 * @param dateInfo - DateInfo object from backend
 * @returns Year as number (negative for BCE) or null
 */
export function dateInfoToYear(dateInfo: DateInfo | null | undefined): number | null {
  if (!dateInfo?.year && dateInfo?.year !== 0) {
    return null;
  }
  return dateInfo.year;
}

/**
 * Format DateInfo for display
 * Handles BCE dates and uncertainty
 * 
 * @param dateInfo - DateInfo object from backend
 * @param includeDay - Whether to include day in output
 * @returns Formatted date string
 */
export function formatDateInfo(dateInfo: DateInfo | null | undefined, includeDay = false): string {
  if (!dateInfo?.year && dateInfo?.year !== 0) {
    return 'Unknown';
  }

  const year = dateInfo.year;
  const month = dateInfo.month;
  const day = dateInfo.day;
  const uncertainty = dateInfo.uncertainty;

  // Format year with BCE/CE
  const yearStr = year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;

  // Build date string
  let dateStr = yearStr;

  if (month && includeDay && day) {
    // Full date with month and day
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthStr = monthNames[month - 1] || month;
    dateStr = `${day} ${monthStr} ${yearStr}`;
  } else if (month) {
    // Year and month only
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthStr = monthNames[month - 1] || month;
    dateStr = `${monthStr} ${yearStr}`;
  }

  // Add uncertainty if present
  if (uncertainty) {
    dateStr += ` (${uncertainty})`;
  }

  return dateStr;
}

/**
 * Calculate decade from year
 * @param year - Year (can be negative for BCE)
 * @returns Decade start year
 */
export function getDecade(year: number): number {
  return Math.floor(year / 10) * 10;
}

/**
 * Calculate century from year
 * @param year - Year (can be negative for BCE)
 * @returns Century start year
 */
export function getCentury(year: number): number {
  return Math.floor(year / 100) * 100;
}

/**
 * Format decade for display
 * @param decadeStart - Start year of decade
 * @returns Formatted decade string (e.g., "1990s", "32-41 BCE")
 */
export function formatDecade(decadeStart: number): string {
  if (decadeStart < 0) {
    const end = decadeStart + 9;
    return `${Math.abs(decadeStart)}-${Math.abs(end)} BCE`;
  }
  return `${decadeStart}s`;
}

/**
 * Format century for display
 * @param centuryStart - Start year of century
 * @returns Formatted century string (e.g., "1900s", "1st Century BCE")
 */
export function formatCentury(centuryStart: number): string {
  if (centuryStart < 0) {
    const centuryNumber = Math.abs(Math.floor(centuryStart / 100)) + 1;
    return `${centuryNumber}${getOrdinalSuffix(centuryNumber)} Century BCE`;
  }
  
  const centuryNumber = Math.floor(centuryStart / 100) + 1;
  return `${centuryNumber}${getOrdinalSuffix(centuryNumber)} Century`;
}

/**
 * Get ordinal suffix for a number (st, nd, rd, th)
 */
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Group eruptions by time period (decade or century)
 * Returns a map of period start year to count
 * 
 * @param years - Array of years
 * @param period - 'decade' or 'century'
 * @returns Map of period start year to eruption count
 */
export function groupByPeriod(
  years: number[],
  period: 'decade' | 'century'
): Map<number, number> {
  const grouped = new Map<number, number>();

  for (const year of years) {
    const periodStart = period === 'decade' ? getDecade(year) : getCentury(year);
    grouped.set(periodStart, (grouped.get(periodStart) || 0) + 1);
  }

  return grouped;
}

/**
 * Calculate date range from array of DateInfo objects
 * @param dates - Array of DateInfo objects
 * @returns Object with min and max years, or null if no valid dates
 */
export function getDateRange(dates: (DateInfo | null | undefined)[]): { min: number; max: number } | null {
  const years = dates
    .map(dateInfoToYear)
    .filter((y): y is number => y !== null);

  if (years.length === 0) {
    return null;
  }

  return {
    min: Math.min(...years),
    max: Math.max(...years),
  };
}

/**
 * Format date range for display
 * @param minYear - Minimum year
 * @param maxYear - Maximum year
 * @returns Formatted range string (e.g., "32 BCE - 2022 CE")
 */
export function formatYearRange(minYear: number, maxYear: number): string {
  const minStr = minYear < 0 ? `${Math.abs(minYear)} BCE` : `${minYear} CE`;
  const maxStr = maxYear < 0 ? `${Math.abs(maxYear)} BCE` : `${maxYear} CE`;
  return `${minStr} - ${maxStr}`;
}
