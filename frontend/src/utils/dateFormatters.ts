import type { DateInfo, GeologicalAge } from '../types';

/**
 * Format a DateInfo object to a readable string
 * 
 * @param date - DateInfo object with year, month, day, uncertainty
 * @returns Formatted date string
 * 
 * @example
 * formatDate({ year: 2024, month: 12, day: 4 }) // "December 4, 2024"
 * formatDate({ year: 2024, uncertainty: "±10" }) // "2024 ±10"
 * formatDate({ year: -5000 }) // "5000 BCE"
 */
export function formatDate(date: DateInfo | undefined): string {
  if (!date) return 'Unknown';
  
  const { year, month, day, uncertainty_days } = date;
  
  if (!year) return 'Unknown';
  
  // Handle negative years (BCE)
  const yearAbs = Math.abs(year);
  const era = year < 0 ? ' BCE' : '';
  
  // Full date with day
  if (month && day) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const uncertaintyStr = uncertainty_days ? ` (±${uncertainty_days} days)` : '';
    return `${monthNames[month - 1]} ${day}, ${yearAbs}${era}${uncertaintyStr}`;
  }
  
  // Year and month
  if (month) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const uncertaintyStr = uncertainty_days ? ` (±${uncertainty_days} days)` : '';
    return `${monthNames[month - 1]} ${yearAbs}${era}${uncertaintyStr}`;
  }
  
  // Year only
  const uncertaintyStr = uncertainty_days ? ` ±${uncertainty_days} days` : '';
  return `${yearAbs}${era}${uncertaintyStr}`;
}

/**
 * Format a geological age range
 * 
 * @param age - GeologicalAge object with min_age, max_age, age_unit
 * @returns Formatted age range string
 * 
 * @example
 * formatGeologicalAge({ min_age: 2.5, max_age: 5.3, age_unit: "Ma" }) // "2.5-5.3 Ma"
 * formatGeologicalAge({ min_age: 100, age_unit: "ka" }) // "~100 ka"
 */
export function formatGeologicalAge(age: GeologicalAge | undefined): string {
  if (!age) return 'Unknown';
  
  const { age: ageValue, age_prefix } = age;
  
  if (!ageValue) return 'Unknown';
  
  // Format: "PREFIX AGE" (e.g., "NEO ARCHEAN", "EARLY HOLOCENE")
  if (age_prefix) {
    return `${age_prefix} ${ageValue}`;
  }
  
  return ageValue;
}

/**
 * Format a date range between two DateInfo objects
 * 
 * @param start - Start date
 * @param end - End date
 * @returns Formatted date range string
 * 
 * @example
 * formatDateRange(
 *   { year: 2020, month: 1 },
 *   { year: 2024, month: 12 }
 * ) // "January 2020 - December 2024"
 */
export function formatDateRange(start: DateInfo | undefined, end: DateInfo | undefined): string {
  if (!start && !end) return 'Unknown';
  if (!start) return `Before ${formatDate(end)}`;
  if (!end) return `After ${formatDate(start)}`;
  
  return `${formatDate(start)} - ${formatDate(end)}`;
}

/**
 * Convert DateInfo to ISO 8601 string for API queries
 * 
 * @param date - DateInfo object
 * @returns ISO 8601 date string (YYYY-MM-DD)
 * 
 * @example
 * dateInfoToISO({ year: 2024, month: 12, day: 4 }) // "2024-12-04"
 * dateInfoToISO({ year: 2024, month: 3 }) // "2024-03-01"
 */
export function dateInfoToISO(date: DateInfo | undefined): string | null {
  if (!date?.year) return null;
  
  const year = date.year.toString().padStart(4, '0');
  const month = (date.month || 1).toString().padStart(2, '0');
  const day = (date.day || 1).toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
