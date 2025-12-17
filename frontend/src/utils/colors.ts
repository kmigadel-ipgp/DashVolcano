/**
 * Color utilities for rock types and visualizations
 * Colors are dynamically generated from API data for consistency
 */

// Base color palette for rock types (hue distributed across spectrum)
const BASE_COLOR_PALETTE = [
  '#FF6B6B',  // Red
  '#00FF00',  // Green
  '#FF8C00',  // Dark orange
  '#4169E1',  // Royal blue
  '#FFA500',  // Orange
  '#00CED1',  // Dark turquoise
  '#FFD700',  // Gold
  '#8B008B',  // Dark magenta
  '#DC143C',  // Crimson
  '#ADFF2F',  // Yellow-green
  '#BA55D3',  // Medium orchid
  '#90EE90',  // Light green
  '#9932CC',  // Dark orchid
  '#8B4513',  // Saddle brown
  '#A0522D',  // Sienna
  '#4B0082',  // Indigo
  '#FFFF00',  // Yellow
  '#FF1493',  // Deep pink
  '#32CD32',  // Lime green
  '#808080',  // Gray
];

// Fallback rock type to color mapping (used until API loads)
const FALLBACK_ROCK_TYPE_COLORS: Record<string, string> = {
  'BASALT': '#FF6B6B',
  'ANDESITE': '#FFA500',
  'DACITE': '#FFD700',
  'RHYOLITE': '#FFFF00',
  'TRACHYTE/TRACHYDACITE': '#90EE90',
  'PHONOLITE': '#00FF00',
  'BASALTIC ANDESITE': '#FF8C00',
  'BASALTIC TRACHYANDESITE': '#ADFF2F',
  'TEPHRITE/BASANITE': '#8B008B',
  'PHONO-TEPHRITE': '#9932CC',
  'TEPHRI-PHONOLITE': '#BA55D3',
  'PICROBASALT': '#8B4513',
  'TRACHYANDESITE': '#A0522D',
  'TRACHYBASALT': '#4B0082',
  'FOIDITE': '#808080',
};

// Dynamic rock type colors (populated from API)
let ROCK_TYPE_COLORS: Record<string, string> = { ...FALLBACK_ROCK_TYPE_COLORS };
let rockTypesLoaded = false;

/**
 * Fetch rock types from API and generate color mapping
 */
async function loadRockTypeColors(): Promise<void> {
  if (rockTypesLoaded) return;
  
  try {
    const response = await fetch('/api/metadata/rock-types');
    if (!response.ok) throw new Error('Failed to fetch rock types');
    
    const result = await response.json();
    const rockTypes = result.data as string[];
    
    // Generate colors for each rock type
    // Start from fallback colors (normalized to uppercase keys) so we preserve
    // special mappings (e.g. FOIDITE -> #808080). Then assign palette colors
    // to remaining rock types reported by the API.
    const newColors: Record<string, string> = {};

    // Copy fallback colors with normalized uppercase keys
    for (const [key, color] of Object.entries(FALLBACK_ROCK_TYPE_COLORS)) {
      newColors[key.toUpperCase()] = color;
    }

    // Assign palette colors for rock types not covered by the fallback
    let paletteIndex = 0;
    for (const rockType of rockTypes) {
      const key = rockType.toUpperCase();
      if (newColors[key]) {
        // keep fallback color
        continue;
      }
      // Use next palette color (cycle through palette)
      newColors[key] = BASE_COLOR_PALETTE[paletteIndex % BASE_COLOR_PALETTE.length];
      paletteIndex += 1;
    }

    ROCK_TYPE_COLORS = newColors;
    rockTypesLoaded = true;
    console.log(`Loaded ${rockTypes.length} rock types with colors from API`);
  } catch (error) {
    console.warn('Failed to load rock types from API, using fallback colors:', error);
    // Ensure fallback keys are normalized to uppercase for consistency
    const fallbackNormalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(FALLBACK_ROCK_TYPE_COLORS)) {
      fallbackNormalized[k.toUpperCase()] = v;
    }
    ROCK_TYPE_COLORS = fallbackNormalized;
  }
}

// Start loading rock types immediately
loadRockTypeColors();

// Export getter function instead of constant
export function getRockTypeColors(): Record<string, string> {
  return ROCK_TYPE_COLORS;
}

// Base colors for tectonic setting types
const TECTONIC_BASE_COLORS: Record<string, string> = {
  'Subduction zone': '#DC2626',      // Red (danger, active)
  'Rift zone': '#16A34A',            // Green (growth, spreading)
  'Intraplate': '#2563EB',           // Blue (stable, isolated)
  'Unknown': '#808080',              // Gray
};

// Crust type modifiers (lightness variations)
const CRUST_MODIFIERS: Record<string, number> = {
  'Continental': 0,                   // Base color
  'Intermediate': 0.15,               // Slightly lighter
  'Oceanic': 0.30,                    // Lighter
  'crust (>25 km)': 0,               // Continental (thick)
  'crust (15-25 km)': 0.15,          // Intermediate
  'crust (< 15 km)': 0.30,           // Oceanic (thin)
  'Crustal thickness unknown': 0.20, // Medium lightness
};

// Fallback tectonic setting colors
const FALLBACK_TECTONIC_COLORS: Record<string, string> = {
  'Subduction zone / Continental crust (>25 km)': '#DC2626',
  'Subduction zone / Intermediate crust (15-25 km)': '#EF4444',
  'Subduction zone / Oceanic crust (< 15 km)': '#F87171',
  'Subduction zone / Continental': '#DC2626',
  'Subduction zone / Oceanic': '#F87171',
  'Subduction zone / Crustal thickness unknown': '#EF4444',
  'Rift zone / Continental crust (>25 km)': '#16A34A',
  'Rift zone / Intermediate crust (15-25 km)': '#22C55E',
  'Rift zone / Oceanic crust (< 15 km)': '#4ADE80',
  'Rift at plate boundaries / Continental': '#16A34A',
  'Rift at plate boundaries / Oceanic': '#4ADE80',
  'Intraplate / Continental crust (>25 km)': '#2563EB',
  'Intraplate / Intermediate crust (15-25 km)': '#3B82F6',
  'Intraplate / Oceanic crust (< 15 km)': '#60A5FA',
  'Intraplate / Continental': '#2563EB',
  'Intraplate / Oceanic': '#60A5FA',
  'Unknown': '#808080',
};

// Dynamic tectonic setting colors
let TECTONIC_SETTING_COLORS: Record<string, string> = { ...FALLBACK_TECTONIC_COLORS };
let tectonicSettingsLoaded = false;

/**
 * Generate color for a tectonic setting based on type and crust
 */
function generateTectonicColor(setting: string): string {
  // Find base color from setting type
  let baseColor = TECTONIC_BASE_COLORS['Unknown'];
  for (const [type, color] of Object.entries(TECTONIC_BASE_COLORS)) {
    if (setting.includes(type)) {
      baseColor = color;
      break;
    }
  }
  
  // Find crust modifier
  let modifier = 0;
  for (const [crustType, mod] of Object.entries(CRUST_MODIFIERS)) {
    if (setting.includes(crustType)) {
      modifier = mod;
      break;
    }
  }
  
  // Apply lightness modification if needed
  if (modifier > 0) {
    const rgb = hexToRgb(baseColor);
    if (rgb) {
      // Lighten by interpolating towards white
      const r = Math.round(rgb.r + (255 - rgb.r) * modifier);
      const g = Math.round(rgb.g + (255 - rgb.g) * modifier);
      const b = Math.round(rgb.b + (255 - rgb.b) * modifier);
      return rgbToHex(r, g, b);
    }
  }
  
  return baseColor;
}

/**
 * Fetch tectonic settings from API and generate color mapping
 */
async function loadTectonicSettingColors(): Promise<void> {
  if (tectonicSettingsLoaded) return;
  
  try {
    // Fetch both sample and volcano tectonic settings
    const [samplesResponse, volcanoesResponse] = await Promise.all([
      fetch('/api/metadata/tectonic-settings-samples'),
      fetch('/api/metadata/tectonic-settings-volcanoes'),
    ]);
    
    if (!samplesResponse.ok || !volcanoesResponse.ok) {
      throw new Error('Failed to fetch tectonic settings');
    }
    
    const samplesResult = await samplesResponse.json();
    const volcanoesResult = await volcanoesResponse.json();
    
    const sampleSettings = samplesResult.data as string[];
    const volcanoSettings = volcanoesResult.data as string[];
    
    // Combine all unique settings
    const allSettings = [...new Set([...sampleSettings, ...volcanoSettings])];
    
    // Generate colors for each setting
    const newColors: Record<string, string> = {};
    allSettings.forEach((setting) => {
      newColors[setting] = generateTectonicColor(setting);
    });
    
    TECTONIC_SETTING_COLORS = newColors;
    tectonicSettingsLoaded = true;
    console.log(`Loaded ${allSettings.length} tectonic settings with colors from API`);
  } catch (error) {
    console.warn('Failed to load tectonic settings from API, using fallback colors:', error);
    TECTONIC_SETTING_COLORS = { ...FALLBACK_TECTONIC_COLORS };
  }
}

// Start loading tectonic settings immediately
loadTectonicSettingColors();

// Database colors
export const DATABASE_COLORS: Record<string, string> = {
  'GEOROC': '#E74C3C',           // Red
  'PETDB': '#3498DB',            // Blue
  'GVP': '#2ECC71'               // Green
};

// VEI colors (Volcanic Explosivity Index)
// Using darker, more readable colors for better visibility on charts
export const VEI_COLORS: string[] = [
  '#4A9B4A',  // VEI 0 - Medium green
  '#C9A800',  // VEI 1 - Dark yellow/gold
  '#D97706',  // VEI 2 - Amber
  '#EA580C',  // VEI 3 - Dark orange
  '#DC2626',  // VEI 4 - Red
  '#B91C1C',  // VEI 5 - Dark red
  '#991B1B',  // VEI 6 - Deeper red
  '#7F1D1D',  // VEI 7 - Very dark red
  '#5C1111'   // VEI 8 - Almost black red
];

/**
 * Get color for a rock type
 * 
 * @param rockType - Rock type name
 * @returns Hex color string
 * 
 * @example
 * getRockTypeColor('BASALT') // "#FF6B6B"
 * getRockTypeColor('Unknown rock') // "#808080"
 */
export function getRockTypeColor(rockType: string | undefined): string {
  if (!rockType) return '#808080'; // Gray for unknown
  
  // Normalize to uppercase for exact match
  const normalizedRockType = rockType.toUpperCase();
  
  // Try exact match
  if (normalizedRockType in ROCK_TYPE_COLORS) {
    return ROCK_TYPE_COLORS[normalizedRockType];
  }
  
  // Try partial match (case insensitive)
  const rockTypeLower = rockType.toLowerCase();
  for (const [key, color] of Object.entries(ROCK_TYPE_COLORS)) {
    if (rockTypeLower.includes(key.toLowerCase())) {
      return color;
    }
  }
  
  // Return gray for truly unknown types
  return '#808080';
}

/**
 * Ensure rock type colors are loaded from API
 * Call this before rendering charts to ensure colors are ready
 * 
 * @returns Promise that resolves when colors are loaded
 */
export async function ensureRockTypeColorsLoaded(): Promise<void> {
  if (!rockTypesLoaded) {
    await loadRockTypeColors();
  }
}

/**
 * Get color for a tectonic setting
 * 
 * @param setting - Tectonic setting name
 * @returns Hex color string
 */
export function getTectonicSettingColor(setting: string | undefined): string {
  if (!setting) return '#808080'; // Gray for unknown
  
  // Try exact match
  if (setting in TECTONIC_SETTING_COLORS) {
    return TECTONIC_SETTING_COLORS[setting];
  }
  
  // Try partial match (in case of slight variations)
  const settingLower = setting.toLowerCase();
  for (const [key, color] of Object.entries(TECTONIC_SETTING_COLORS)) {
    if (settingLower.includes(key.toLowerCase()) || key.toLowerCase().includes(settingLower)) {
      return color;
    }
  }
  
  // Generate color on the fly if not found
  return generateTectonicColor(setting);
}

/**
 * Ensure tectonic setting colors are loaded from API
 * Call this before rendering visualizations to ensure colors are ready
 * 
 * @returns Promise that resolves when colors are loaded
 */
export async function ensureTectonicSettingColorsLoaded(): Promise<void> {
  if (!tectonicSettingsLoaded) {
    await loadTectonicSettingColors();
  }
}

/**
 * Export getter function for tectonic setting colors
 */
export function getTectonicSettingColors(): Record<string, string> {
  return TECTONIC_SETTING_COLORS;
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
