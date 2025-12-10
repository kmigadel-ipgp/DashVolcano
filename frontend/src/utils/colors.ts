/**
 * Color utilities for rock types and visualizations
 * Based on constants from backend/constants/rocks.py and helpers.py
 */

// Rock type to hex color mapping
export const ROCK_TYPE_COLORS: Record<string, string> = {
  // Major rock types
  'Basalt': '#FF6B6B',           // Red
  'Andesite': '#FFA500',         // Orange
  'Dacite': '#FFD700',           // Gold
  'Rhyolite': '#FFFF00',         // Yellow
  'Trachyte': '#90EE90',         // Light green
  'Phonolite': '#00FF00',        // Green
  'Basaltic-andesite': '#FF8C00', // Dark orange
  'Trachyandesite': '#ADFF2F',   // Yellow-green
  
  // Alkaline rocks
  'Basanite': '#8B008B',         // Purple
  'Tephrite': '#9932CC',         // Dark orchid
  'Phonotephrite': '#BA55D3',    // Medium orchid
  
  // Other types
  'Picrite': '#8B4513',          // Saddle brown
  'Komatiite': '#A0522D',        // Sienna
  'Foidite': '#4B0082',          // Indigo
  
  // Default
  'Unknown': '#808080'            // Gray
};

// Tectonic setting colors
export const TECTONIC_SETTING_COLORS: Record<string, string> = {
  'Subduction zone': '#FF4444',
  'Intraplate': '#4444FF',
  'Rift zone': '#44FF44',
  'Unknown': '#808080'
};

// Database colors
export const DATABASE_COLORS: Record<string, string> = {
  'GEOROC': '#E74C3C',           // Red
  'PETDB': '#3498DB',            // Blue
  'GVP': '#2ECC71'               // Green
};

// VEI colors (Volcanic Explosivity Index)
export const VEI_COLORS: string[] = [
  '#90EE90',  // VEI 0 - Light green
  '#FFFF00',  // VEI 1 - Yellow
  '#FFA500',  // VEI 2 - Orange
  '#FF8C00',  // VEI 3 - Dark orange
  '#FF4500',  // VEI 4 - Orange red
  '#FF0000',  // VEI 5 - Red
  '#DC143C',  // VEI 6 - Crimson
  '#8B0000',  // VEI 7 - Dark red
  '#4B0000'   // VEI 8 - Very dark red
];

/**
 * Get color for a rock type
 * 
 * @param rockType - Rock type name
 * @returns Hex color string
 * 
 * @example
 * getRockTypeColor('Basalt') // "#FF6B6B"
 * getRockTypeColor('Unknown rock') // "#808080"
 */
export function getRockTypeColor(rockType: string | undefined): string {
  if (!rockType) return ROCK_TYPE_COLORS['Unknown'];
  
  // Try exact match
  if (rockType in ROCK_TYPE_COLORS) {
    return ROCK_TYPE_COLORS[rockType];
  }
  
  // Try partial match (case insensitive)
  const rockTypeLower = rockType.toLowerCase();
  for (const [key, color] of Object.entries(ROCK_TYPE_COLORS)) {
    if (rockTypeLower.includes(key.toLowerCase())) {
      return color;
    }
  }
  
  return ROCK_TYPE_COLORS['Unknown'];
}

/**
 * Get color for a tectonic setting
 * 
 * @param setting - Tectonic setting name
 * @returns Hex color string
 */
export function getTectonicSettingColor(setting: string | undefined): string {
  if (!setting) return TECTONIC_SETTING_COLORS['Unknown'];
  return TECTONIC_SETTING_COLORS[setting] || TECTONIC_SETTING_COLORS['Unknown'];
}

/**
 * Get color for a database
 * 
 * @param database - Database name
 * @returns Hex color string
 */
export function getDatabaseColor(database: string | undefined): string {
  if (!database) return '#808080';
  return DATABASE_COLORS[database] || '#808080';
}

/**
 * Get color for a VEI value
 * 
 * @param vei - Volcanic Explosivity Index (0-8)
 * @returns Hex color string
 * 
 * @example
 * getVEIColor(0) // "#90EE90" (light green)
 * getVEIColor(8) // "#4B0000" (very dark red)
 */
export function getVEIColor(vei: number | undefined): string {
  if (vei === undefined || vei === null) return '#808080';
  
  const index = Math.max(0, Math.min(8, Math.floor(vei)));
  return VEI_COLORS[index];
}

/**
 * Convert hex color to RGB object
 * 
 * @param hex - Hex color string (with or without #)
 * @returns RGB object with r, g, b values (0-255)
 * 
 * @example
 * hexToRgb('#FF6B6B') // { r: 255, g: 107, b: 107 }
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Parse hex string
  const bigint = Number.parseInt(cleanHex, 16);
  
  if (Number.isNaN(bigint)) return null;
  
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

/**
 * Convert RGB to hex color
 * 
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns Hex color string with #
 * 
 * @example
 * rgbToHex(255, 107, 107) // "#FF6B6B"
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert hex color to RGB array for Deck.gl
 * 
 * @param hex - Hex color string
 * @param alpha - Alpha value (0-255, default 255)
 * @returns RGBA array [r, g, b, a]
 * 
 * @example
 * hexToRgbArray('#FF6B6B') // [255, 107, 107, 255]
 * hexToRgbArray('#FF6B6B', 128) // [255, 107, 107, 128]
 */
export function hexToRgbArray(hex: string, alpha: number = 255): [number, number, number, number] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [128, 128, 128, alpha]; // Default gray
  
  return [rgb.r, rgb.g, rgb.b, alpha];
}
