import type { BBox } from '../types';

/**
 * Longitude helpers for a map that repeats the world horizontally.
 *
 * Every object is drawn exactly once (no duplicated world copies), but in the
 * copy of the world closest to the viewport centre, so data on the other side
 * of the antimeridian stays visible (e.g. when looking at the Pacific).
 */

/** Step (degrees) used to quantise the view centre, to avoid recomputing positions on every pan frame */
const WRAP_CENTER_STEP = 15;

/** Shift a longitude by a multiple of 360 so it lies within [center - 180, center + 180) */
export const wrapLongitude = (lon: number, center: number): number =>
  lon - 360 * Math.floor((lon - center + 180) / 360);

/** Quantised view centre: positions only need recomputing when this value changes */
export const getWrapCenter = (viewLongitude: number): number =>
  wrapLongitude(Math.round(viewLongitude / WRAP_CENTER_STEP) * WRAP_CENTER_STEP, 0);

/** Display a longitude in the usual [-180, 180) range */
export const toStandardLongitude = (lon: number): number => wrapLongitude(lon, 0);

/**
 * Normalise a bbox drawn on the map: minLon in [-180, 180) and maxLon = minLon + width,
 * so maxLon may exceed 180 when the box crosses the antimeridian.
 */
export const normalizeBbox = (bbox: BBox): BBox => {
  const width = bbox.maxLon - bbox.minLon;
  if (width >= 360) {
    return { ...bbox, minLon: -180, maxLon: 180 };
  }
  const minLon = toStandardLongitude(bbox.minLon);
  return { ...bbox, minLon, maxLon: minLon + width };
};

/** Split a normalised bbox into one or two boxes within [-180, 180] (the API only accepts these) */
export const splitBboxAtAntimeridian = (bbox: BBox): BBox[] => {
  const { minLon, maxLon } = normalizeBbox(bbox);
  if (maxLon <= 180) {
    return [{ ...bbox, minLon, maxLon }];
  }
  return [
    { ...bbox, minLon, maxLon: 180 },
    { ...bbox, minLon: -180, maxLon: maxLon - 360 },
  ];
};

/** Shift a bbox as a whole so it is drawn in the world copy closest to the view centre */
export const wrapBbox = (bbox: BBox, center: number): BBox => {
  const mid = (bbox.minLon + bbox.maxLon) / 2;
  const shift = wrapLongitude(mid, center) - mid;
  return { ...bbox, minLon: bbox.minLon + shift, maxLon: bbox.maxLon + shift };
};

/**
 * Wrap a line around the view centre, splitting it where consecutive vertices
 * would jump across the opposite side of the world (which is off-screen).
 */
export const wrapLine = (coordinates: number[][], center: number): number[][][] => {
  const parts: number[][][] = [];
  let current: number[][] = [];
  let previous: number | null = null;
  for (const [lon, ...rest] of coordinates) {
    const wrapped = wrapLongitude(lon, center);
    if (previous !== null && Math.abs(wrapped - previous) > 180) {
      if (current.length > 1) parts.push(current);
      current = [];
    }
    current.push([wrapped, ...rest]);
    previous = wrapped;
  }
  if (current.length > 1) parts.push(current);
  return parts;
};
