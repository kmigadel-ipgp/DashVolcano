// Geometry types
export interface Point {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Polygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export type Geometry = Point | Polygon;

// Bounding box for spatial filtering
export interface BBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

// Date and age types
export interface DateInfo {
  year?: number;
  month?: number;
  day?: number;
  uncertainty_days?: number;
  iso8601?: string;
}

export interface GeologicalAge {
  age?: string;  // e.g., "ARCHEAN", "HOLOCENE", "PLEISTOCENE"
  age_prefix?: string;  // e.g., "NEO", "EARLY", "LATE"
}

// Chemical composition types
export interface Oxides {
  SiO2?: number;
  TiO2?: number;
  Al2O3?: number;
  FeOT?: number;
  Fe2O3?: number;
  FeO?: number;
  MnO?: number;
  MgO?: number;
  CaO?: number;
  Na2O?: number;
  K2O?: number;
  P2O5?: number;
  [key: string]: number | undefined;
}

// New matching metadata structure (aligned with MongoDB schema)
export interface VolcanoInfo {
  name: string;
  number: string;
  dist_km: number;
  rock_type?: string;  // Primary rock type of volcano (legacy)
  petro?: Petro;  // New petrology structure
}

export interface MatchingScores {
  sp: number;  // Spatial score
  te: number;  // Tectonic score
  ti: number;  // Temporal score
  pe: number;  // Petrological score
  final: number;  // Final weighted score
}

export interface TectonicSettingSample {
  r?: string;  // Regime: subduction, rift, or intraplate
  c?: string;  // Crust type: oceanic, continental, or unknown
  ui?: string;  // Display value: GEOROC/PetDB setting
  volcano_ui?: string;  // GVP volcano tectonic setting
}

export interface TectonicSettingVolcano {
  r?: string;  // Regime: subduction, rift, or intraplate
  c?: string;  // Crust type: oceanic, continental, or unknown
  ui?: string;  // Display value: GVP setting
}

// Petrology/Rock type information
export interface Petro {
  rock_type?: string;  // Rock type classification
  rock_family?: string;  // Rock family grouping
  ui?: string;  // Display value (for volcanoes)
}

export interface MatchingQuality {
  cov: number;  // Coverage (0.0-1.0)
  unc: number;  // Uncertainty (0.0-1.0)
  conf: string;  // Confidence: high, medium, low, or none
  gap?: number;  // Score gap between best and second best match (0.0-1.0)
}

export interface LiteratureEvidence {
  match: boolean;
  type: string;  // explicit, partial, regional, or none
  conf: number;  // 0.0-1.0
  src?: string;  // title, abstract, or none
}

export interface MatchingEvidence {
  lit: LiteratureEvidence;
}

export interface MatchingMeta {
  method: string;  // Matching method
  ts: string;  // Timestamp (ISO 8601)
}

// Complete matching metadata for samples
export interface MatchingMetadata {
  volcano?: VolcanoInfo;  // Only present if matched
  scores?: MatchingScores;  // Only present if matched
  quality: MatchingQuality;  // Always present
  evidence: MatchingEvidence;  // Always present
  meta: MatchingMeta;  // Always present
  // Legacy fields for backward compatibility (deprecated)
  volcano_name?: string;
  volcano_number?: number | string;
  distance_km?: number;
  confidence_level?: string | number;
}

// Main entity types
export interface Sample {
  _id: string;
  sample_id: string;
  sample_code?: string; // Display-friendly sample identifier
  db: string;
  material: string;
  petro?: Petro;  // Petrology information (rock_type, rock_family)
  tecto?: TectonicSettingSample;  // New nested tectonic setting structure
  geometry: Point;
  oxides?: Oxides;
  matching_metadata?: MatchingMetadata;
  geological_age?: GeologicalAge;
  eruption_date?: DateInfo;  // Changed from eruption_year
  vei?: number;  // Volcanic Explosivity Index
  references?: string;
}

export interface Volcano {
  _id: string;
  volcano_number: number;
  volcano_name: string;
  primary_volcano_type?: string;
  last_known_eruption?: string;
  country?: string;
  region?: string;
  subregion?: string;
  petro?: Petro;  // Petrology information (rock_type, rock_family, ui)
  tectonic_setting?: TectonicSettingVolcano;  // New nested tectonic setting structure
  geometry: Point;
  rocks?: string[];
  elevation_m?: number;
}

export interface Eruption {
  _id: string;
  eruption_number: number;
  volcano_number: number;
  volcano_name: string;
  vei?: number;
  start_date?: DateInfo;
  end_date?: DateInfo;
  eruption_category?: string;
  area_of_activity?: string;
  geometry?: Point;
}

// GeoJSON types
export interface Feature<T = Record<string, unknown>> {
  type: 'Feature';
  geometry: Geometry;
  properties: T;
}

export interface FeatureCollection<T = Record<string, unknown>> {
  type: 'FeatureCollection';
  features: Feature<T>[];
}

// Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface MetadataResponse {
  [key: string]: string | number | boolean | string[] | number[];
}

// Analytics types
export interface TASPolygon {
  name: string;
  alkali_coords: number[];
  silica_coords: number[];
}

export interface TASPolygonsResponse {
  polygons: TASPolygon[];
}

export interface AFMBoundary {
  type: 'LineString';
  coordinates: Array<{ A: number; F: number; M: number }>;
}

export interface AFMBoundaryResponse {
  boundary: AFMBoundary;
  description: string;
}

export interface VEIDistribution {
  volcano_number: number;
  volcano_name: string;
  total_eruptions: number;
  vei_counts: Record<string, number>;
  date_range?: {
    start?: string;  // ISO 8601 format: "YYYY-MM-DDTHH:mm:ssZ" or "-YYYY-MM-DDTHH:mm:ssZ" for BCE
    end?: string;    // ISO 8601 format: "YYYY-MM-DDTHH:mm:ssZ"
  };
}

export interface ChemicalSample {
  sample_id: string;
  database: string;
  rock_type?: string;
  oxides: Oxides;
  tas_classification?: string;
  afm_values?: { A: number; F: number; M: number };
  vei?: number;
  eruption_date?: DateInfo;
}

export interface ChemicalAnalysisResponse {
  volcano_number: number;
  volcano_name: string;
  total_samples: number;
  samples: ChemicalSample[];
  rock_type_distribution?: Record<string, number>;
}

// Filter types
export interface SampleFilters {
  database?: string;
  rock_type?: string | string[]; // Support multi-select with OR logic
  tectonic_setting?: string | string[]; // Support multi-select with OR logic
  volcano_number?: number;
  min_sio2?: number; // Updated to match backend naming
  max_sio2?: number; // Updated to match backend naming
  bbox?: string; // Bounding box as "min_lon,min_lat,max_lon,max_lat"
  limit?: number;
  offset?: number;
}

export interface VolcanoFilters {
  country?: string;
  region?: string;
  tectonic_setting?: string | string[]; // Support multi-select with OR logic
  volcano_name?: string; // For autocomplete search
  limit?: number;
  offset?: number;
}

export interface SpatialBoundsParams {
  min_lon: number;
  max_lon: number;
  min_lat: number;
  max_lat: number;
  limit?: number;
}

export interface SpatialNearbyParams {
  lon: number;
  lat: number;
  radius: number; // in meters
  limit?: number;
}

// Tectonic types
export interface TectonicPlate {
  type: 'Feature';
  properties: {
    PlateName: string;
    Code: string;
  };
  geometry: Polygon;
}

export interface TectonicBoundary {
  type: 'Feature';
  properties: {
    boundary_type: 'ridge' | 'trench' | 'transform';
  };
  geometry: {
    type: 'LineString';
    coordinates: number[][];
  };
}

export interface TectonicPlatesResponse {
  type: 'FeatureCollection';
  features: TectonicPlate[];
  count: number;
}

export interface TectonicBoundariesResponse {
  type: 'FeatureCollection';
  features: TectonicBoundary[];
  count: number;
  ridge_count: number;
  trench_count: number;
  transform_count: number;
}

// GVP Rock Types
export interface RockType {
  type: string;
  rank: number; // 1 = primary, 2 = secondary, 3 = tertiary
}

export interface VolcanoRockTypesResponse {
  volcano_number: number;
  volcano_name: string;
  rock_types: RockType[];
}

// Sample Timeline
export interface SampleTimelineData {
  year: number;
  sample_count: number;
  rock_types: string[];
}

export interface RockTypeDistribution {
  rock_type: string;
  count: number;
}

export interface SampleTimelineResponse {
  volcano_number: number;
  volcano_name: string;
  total_samples: number;
  samples_with_dates: number;
  timeline_data: SampleTimelineData[];
  rock_type_distribution: RockTypeDistribution[];
  date_range: {
    min_year: number | null;
    max_year: number | null;
    span_years: number;
  };
  has_timeline_data: boolean;
}
