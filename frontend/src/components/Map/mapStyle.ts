import type { ComponentProps } from 'react';
import type { Map as MapboxMap } from 'react-map-gl/mapbox';

/** Mapbox token (unused by the OSM raster style, kept for react-map-gl) */
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

// OpenStreetMap raster basemap, as on VolcashDB. In the dark theme the basemap
// canvas is inverted by CSS (index.css); deck.gl layers are not affected.
export const MAP_STYLE: ComponentProps<typeof MapboxMap>['mapStyle'] = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

/** Volcano marker: the red triangle used on every map of the site */
export const VOLCANO_ICON = {
  url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2 L22 20 L2 20 Z" fill="rgb(220, 20, 60)" stroke="rgb(180, 0, 40)" stroke-width="1.5"/>
    </svg>`
  ),
  width: 24,
  height: 24,
  anchorY: 16, // Anchor point at bottom center of triangle
};

export type BoundaryType = 'ridge' | 'trench' | 'transform';

/** Plate boundary types, in legend order, with their line colours (drawn at 70 % opacity) */
export const BOUNDARY_TYPES: { type: BoundaryType; label: string; color: [number, number, number] }[] = [
  { type: 'ridge', label: 'Ridge', color: [255, 165, 0] },
  { type: 'trench', label: 'Trench', color: [255, 0, 0] },
  { type: 'transform', label: 'Transform', color: [128, 128, 128] },
];
