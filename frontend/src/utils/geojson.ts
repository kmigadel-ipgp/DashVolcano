import type { Sample, Volcano, Feature, FeatureCollection, Point } from '../types';

/**
 * Convert samples array to GeoJSON FeatureCollection for Deck.gl
 * 
 * @param samples - Array of samples
 * @returns GeoJSON FeatureCollection
 * 
 * @example
 * const geojson = samplesToGeoJSON(samples);
 * // Use in Deck.gl GeoJsonLayer
 * new GeoJsonLayer({ data: geojson })
 */
export function samplesToGeoJSON(samples: Sample[]): FeatureCollection<Sample> {
  return {
    type: 'FeatureCollection',
    features: samples.map((sample) => ({
      type: 'Feature',
      geometry: sample.geometry,
      properties: sample
    }))
  };
}

/**
 * Convert volcanoes array to GeoJSON FeatureCollection for Deck.gl
 * 
 * @param volcanoes - Array of volcanoes
 * @returns GeoJSON FeatureCollection
 * 
 * @example
 * const geojson = volcanoesToGeoJSON(volcanoes);
 * new ScatterplotLayer({ data: geojson.features })
 */
export function volcanoesToGeoJSON(volcanoes: Volcano[]): FeatureCollection<Volcano> {
  return {
    type: 'FeatureCollection',
    features: volcanoes.map((volcano) => ({
      type: 'Feature',
      geometry: volcano.geometry,
      properties: volcano
    }))
  };
}

/**
 * Extract coordinates from a GeoJSON Point geometry
 * 
 * @param geometry - GeoJSON Point geometry
 * @returns [longitude, latitude] array
 * 
 * @example
 * const [lon, lat] = getCoordinates(sample.geometry);
 */
export function getCoordinates(geometry: Point): [number, number] {
  return geometry.coordinates;
}

/**
 * Check if coordinates are valid (not NaN, within valid ranges)
 * 
 * @param lon - Longitude (-180 to 180)
 * @param lat - Latitude (-90 to 90)
 * @returns True if coordinates are valid
 * 
 * @example
 * isValidCoordinate(139.6917, 35.6895) // true
 * isValidCoordinate(200, 100) // false
 */
export function isValidCoordinate(lon: number, lat: number): boolean {
  return (
    !Number.isNaN(lon) &&
    !Number.isNaN(lat) &&
    lon >= -180 &&
    lon <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * 
 * @param lon1 - Longitude of point 1
 * @param lat1 - Latitude of point 1
 * @param lon2 - Longitude of point 2
 * @param lat2 - Latitude of point 2
 * @returns Distance in kilometers
 * 
 * @example
 * const distance = calculateDistance(139.6917, 35.6895, 139.7670, 35.6812);
 * console.log(`${distance.toFixed(2)} km`);
 */
export function calculateDistance(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Calculate bounding box from array of coordinates
 * 
 * @param coords - Array of [lon, lat] coordinates
 * @returns Bounding box { minLon, maxLon, minLat, maxLat }
 * 
 * @example
 * const bbox = calculateBoundingBox(samples.map(s => getCoordinates(s.geometry)));
 */
export function calculateBoundingBox(
  coords: Array<[number, number]>
): { minLon: number; maxLon: number; minLat: number; maxLat: number } | null {
  if (coords.length === 0) return null;
  
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  
  for (const [lon, lat] of coords) {
    if (!isValidCoordinate(lon, lat)) continue;
    
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  
  if (minLon === Infinity) return null;
  
  return { minLon, maxLon, minLat, maxLat };
}

/**
 * Create a GeoJSON Feature from coordinates and properties
 * 
 * @param lon - Longitude
 * @param lat - Latitude
 * @param properties - Feature properties
 * @returns GeoJSON Feature
 * 
 * @example
 * const feature = createFeature(139.6917, 35.6895, { name: 'Tokyo' });
 */
export function createFeature<T = Record<string, unknown>>(
  lon: number,
  lat: number,
  properties: T
): Feature<T> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lon, lat]
    },
    properties
  };
}

/**
 * Filter features by bounding box
 * 
 * @param features - Array of GeoJSON features
 * @param bbox - Bounding box { minLon, maxLon, minLat, maxLat }
 * @returns Filtered features
 * 
 * @example
 * const visible = filterFeaturesByBounds(features, viewport.bounds);
 */
export function filterFeaturesByBounds<T>(
  features: Feature<T>[],
  bbox: { minLon: number; maxLon: number; minLat: number; maxLat: number }
): Feature<T>[] {
  return features.filter((feature) => {
    if (feature.geometry.type !== 'Point') return true; // Keep non-point features
    
    const [lon, lat] = feature.geometry.coordinates;
    
    return (
      lon >= bbox.minLon &&
      lon <= bbox.maxLon &&
      lat >= bbox.minLat &&
      lat <= bbox.maxLat
    );
  });
}
