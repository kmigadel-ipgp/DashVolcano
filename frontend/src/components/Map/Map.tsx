import React, { useState, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { Map as MapboxMap } from 'react-map-gl/mapbox';
import { ScatterplotLayer, GeoJsonLayer, IconLayer } from '@deck.gl/layers';
import type { Sample, Volcano, TectonicBoundary } from '../../types';

import 'mapbox-gl/dist/mapbox-gl.css';

type ViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
};

/**
 * Props for the VolcanoMap component
 */
interface MapProps {
  /** Array of samples to display on the map */
  samples?: Sample[];
  /** Array of volcanoes to display on the map */
  volcanoes?: Volcano[];
  /** Tectonic boundaries to display */
  tectonicBoundaries?: TectonicBoundary[];
  /** Current viewport state (controlled) */
  viewState?: Partial<ViewState>;
  /** Whether to show the sample points layer */
  showSamplePoints?: boolean;
  /** Whether to show volcano points */
  showVolcanoes?: boolean;
  /** Whether to show tectonic boundaries */
  showTectonicBoundaries?: boolean;
  /** Name of the selected volcano to highlight its samples */
  selectedVolcanoName?: string;
  /** Callback when a volcano is clicked */
  onVolcanoClick?: (volcano: Volcano) => void;
  /** Callback when a sample is clicked */
  onSampleClick?: (sample: Sample) => void;
  /** Callback when the viewport changes */
  onViewportChange?: (viewState: ViewState) => void;
  /** Whether the map is in loading state */
  loading?: boolean;
  /** Active bbox filter to show border */
  activeBbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number } | null;
  /** Drawing bbox for visualization */
  drawingBboxProp?: { minLon: number; minLat: number; maxLon: number; maxLat: number } | null;
  /** Whether bbox drawing mode is active */
  isDrawingBbox?: boolean;
  /** Callback when map is clicked (for drawing) */
  onMapClick?: (info: any) => void;
  /** Callback when mouse hovers over map (for drawing) */
  onMapHover?: (info: any) => void;
}

// Mapbox token - you'll need to set this in your environment
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

// Use OpenStreetMap style if no Mapbox token is available
const MAP_STYLE = MAPBOX_TOKEN 
  ? 'mapbox://styles/mapbox/dark-v10'
  : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Default viewport settings
const INITIAL_VIEW_STATE: ViewState = {
  longitude: 0,
  latitude: 20,
  zoom: 2,
  pitch: 0,
  bearing: 0,
};

/**
 * Main Map component using Deck.gl for WebGL-powered visualizations
 * 
 * Features:
 * - Volcano triangles (PolygonLayer) with VEI-based sizing
 * - Sample points (ScatterplotLayer) for individual selection
 * - Tectonic boundaries (GeoJsonLayer)
 * - Click and hover interactions
 * - Performance optimized for 100k+ samples
 * - OSM fallback when no Mapbox token provided
 */
export const VolcanoMap: React.FC<MapProps> = ({
  samples = [],
  volcanoes = [],
  tectonicBoundaries = [],
  viewState: externalViewState,
  showSamplePoints = true,
  showVolcanoes = true,
  showTectonicBoundaries = true,
  selectedVolcanoName,
  onVolcanoClick,
  onSampleClick,
  onViewportChange,
  loading = false,
  activeBbox = null,
  drawingBboxProp = null,
  isDrawingBbox = false,
  onMapClick,
  onMapHover,
}) => {
  // Use external viewState if provided, otherwise use internal state
  const [internalViewState, setInternalViewState] = useState<ViewState>({
    ...INITIAL_VIEW_STATE,
    ...externalViewState,
  });
  
  const currentViewState = externalViewState 
    ? { ...INITIAL_VIEW_STATE, ...externalViewState } as ViewState
    : internalViewState;

  // Hover state for tooltips
  type HoverObject = Volcano | { type: string; volcano_name?: string; rock_name?: string; longitude?: number; latitude?: number; boundaryType?: string; tectonic_setting?: string | string[]; references?: string };
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    object: HoverObject;
  } | null>(null);

  /**
   * Handle viewport changes
   */
  const handleViewStateChange = useCallback(
    (e: any) => {
      if (!externalViewState) {
        setInternalViewState(e.viewState);
      }
      if (onViewportChange) {
        onViewportChange(e.viewState);
      }
    },
    [externalViewState, onViewportChange]
  );

  /**
   * Volcano layer with IconLayer
   * Shows volcanoes as triangles pointing upward
   * Uses screen-space pixels (no latitude distortion)
   */
  const volcanoLayer = useCallback(() => {
    if (!showVolcanoes || volcanoes.length === 0) return null;

    // Create SVG triangle icon data URL
    const triangleIcon = {
      url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2 L22 20 L2 20 Z" fill="rgb(220, 20, 60)" stroke="rgb(180, 0, 40)" stroke-width="1.5"/>
        </svg>`
      ),
      width: 24,
      height: 24,
      anchorY: 16, // Anchor point at bottom center of triangle
    };

    return new IconLayer({
      id: 'volcanoes',
      data: volcanoes,
      getPosition: (d: Volcano) => d.geometry.coordinates,
      getIcon: () => triangleIcon,
      getSize: 8, // Size in pixels (consistent at all latitudes and zoom levels)
      sizeScale: 1,
      sizeMinPixels: 2,
      sizeMaxPixels: 8,
      pickable: true,
      // Click interaction
      onClick: (info: any) => {
        if (info.object && onVolcanoClick) {
          onVolcanoClick(info.object);
        }
      },
      // Hover interaction
      onHover: (info: any) => {
        if (info.object) {
          setHoverInfo({
            x: info.x,
            y: info.y,
            object: info.object,
          });
        } else {
          setHoverInfo(null);
        }
      },
    });
  }, [volcanoes, showVolcanoes, onVolcanoClick]);

  /**
   * Sample points layer for individual sample visualization and selection
   * Displays each sample as a small semi-transparent point
   * Highlights samples from the selected volcano with a different color
   */
  const samplePointsLayer = useCallback(() => {
    if (!showSamplePoints || samples.length === 0) return null;

    return new ScatterplotLayer({
      id: 'samples-points',
      data: samples,
      getPosition: (d: Sample) => d.geometry.coordinates,
      getRadius: 3000, // 3km radius points
      getFillColor: (d: Sample) => {
        console.log(selectedVolcanoName, d)
        // Highlight samples from the selected volcano with orange color
        if (selectedVolcanoName && d.matching_metadata?.volcano_name === selectedVolcanoName) {
          return [255, 140, 0, 200]; // Orange with higher opacity for selected volcano
        }
        // Default blue for other samples
        return [100, 150, 200, 100]; // Semi-transparent blue
      },
      updateTriggers: {
        getFillColor: [selectedVolcanoName], // Force re-render when selected volcano changes
      },
      pickable: true,
      radiusMinPixels: 2,
      radiusMaxPixels: 8,
      // Click interaction
      onClick: (info: any) => {
        if (info.object && onSampleClick) {
          onSampleClick(info.object as Sample);
        }
      },
      // Hover interaction
      onHover: (info: any) => {
        if (info.object) {
          const sample = info.object as Sample;
          setHoverInfo({
            x: info.x,
            y: info.y,
            object: {
              type: 'sample',
              volcano_name: sample.matching_metadata?.volcano_name,
              rock_name: sample.rock_type,
              longitude: sample.geometry.coordinates[0],
              latitude: sample.geometry.coordinates[1],
              tectonic_setting: sample.tectonic_setting,
              references: sample.references
            } as any,
          });
        } else {
          setHoverInfo(null);
        }
      },
    });
  }, [samples, showSamplePoints, selectedVolcanoName, onSampleClick]);

  /**
   * Tectonic boundaries GeoJsonLayer
   * Lines for ridges, trenches, and transforms
   */
  const tectonicLayer = useCallback(() => {
    if (!showTectonicBoundaries || tectonicBoundaries.length === 0) return null;

    // Group boundaries by type for different colors
    const boundariesByType = tectonicBoundaries.reduce((acc, boundary) => {
      const type = boundary.properties?.boundary_type || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(boundary);
      return acc;
    }, {} as Record<string, TectonicBoundary[]>);

    // Create a layer for each boundary type
    const layers = Object.entries(boundariesByType).map(([type, boundaries]) => {
      // Determine color based on boundary type
      let color: [number, number, number];
      if (type === 'ridge') {
        color = [255, 165, 0]; // Orange
      } else if (type === 'trench') {
        color = [255, 0, 0]; // Red
      } else {
        color = [128, 128, 128]; // Gray
      }

      return new GeoJsonLayer({
        id: `tectonic-${type}`,
        data: boundaries as any,
        pickable: true,
        stroked: true,
        filled: false,
        lineWidthMinPixels: 1,
        getLineColor: color,
        getLineWidth: 2,
        opacity: 0.7,
        onHover: (info: any) => {
          if (info.object) {
            setHoverInfo({
              x: info.x,
              y: info.y,
              object: {
                type: 'tectonic',
                boundaryType: type,
                ...info.object.properties,
              },
            });
          } else {
            setHoverInfo(null);
          }
        },
      });
    });

    return layers;
  }, [tectonicBoundaries, showTectonicBoundaries]);

  // Combine all layers
  // Drawing bbox layer (for real-time preview during drawing)
  const drawingBboxLayer = () => {
    if (!drawingBboxProp) return null;

    const { minLon, minLat, maxLon, maxLat } = drawingBboxProp;
    
    const bboxGeoJSON = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
          [minLon, minLat],
        ]],
      },
    };

    return new GeoJsonLayer({
      id: 'drawing-bbox-layer',
      data: [bboxGeoJSON],
      filled: true,
      stroked: true,
      getFillColor: [59, 130, 246, 80], // Blue with transparency for shadow effect
      getLineColor: [59, 130, 246, 200], // Semi-transparent blue border
      getLineWidth: 2,
      lineWidthMinPixels: 2,
      getDashArray: [5, 3], // Dashed line
      pickable: false,
    });
  };

  // Active bbox layer (for showing the final selected search area)
  const activeBboxLayer = () => {
    if (!activeBbox) return null;

    const { minLon, minLat, maxLon, maxLat } = activeBbox;
    
    const bboxGeoJSON = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
          [minLon, minLat],
        ]],
      },
    };

    return new GeoJsonLayer({
      id: 'active-bbox-layer',
      data: [bboxGeoJSON],
      filled: false,
      stroked: true,
      getLineColor: [255, 165, 0, 255], // Solid orange border
      getLineWidth: 3,
      lineWidthMinPixels: 3,
      pickable: false,
    });
  };

  const layers: any[] = [];
  
  // Add tectonic boundaries first (bottom layer)
  const tectonic = tectonicLayer();
  if (tectonic) {
    if (Array.isArray(tectonic)) {
      layers.push(...tectonic);
    } else {
      layers.push(tectonic);
    }
  }
  
  // Add sample points layer
  const samplePoints = samplePointsLayer();
  if (samplePoints) {
    layers.push(samplePoints);
  }
  
  // Add volcano layer (top)
  const volcano = volcanoLayer();
  if (volcano) {
    layers.push(volcano);
  }

  // Add active bbox border (selected search area)
  const activeBboxBorder = activeBboxLayer();
  if (activeBboxBorder) {
    layers.push(activeBboxBorder);
  }

  // Add drawing bbox layer (on top)
  const drawingBbox = drawingBboxLayer();
  if (drawingBbox) {
    layers.push(drawingBbox);
  }

  /**
   * Render tooltip
   */
  const renderTooltip = () => {
    if (!hoverInfo?.object) return null;

    const { x, y, object } = hoverInfo;

    // Volcano tooltip
    if ('volcano_name' in object && !('type' in object)) {
      return (
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y,
            pointerEvents: 'none',
            padding: '8px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 1000,
          }}
        >
          <div><strong>{object.volcano_name}</strong></div>
          <div>Type: {object.primary_volcano_type || 'N/A'}</div>
          <div>Country: {object.country || 'N/A'}</div>
          <div>Region: {object.region || 'N/A'}</div>
        </div>
      );
    }

    // Sample tooltip
    if ('type' in object && object.type === 'sample') {
      return (
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y,
            pointerEvents: 'none',
            padding: '8px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 1000,
          }}
        >
          <div><strong>Sample</strong></div>
          <div>Volcano: {object.volcano_name || 'N/A'}</div>
          <div>Rock: {object.rock_name || 'N/A'}</div>
          <div>Location: {object.latitude?.toFixed(2)}°, {object.longitude?.toFixed(2)}°</div>
          <div>Tectonic Setting: {object.tectonic_setting || 'N/A'}</div>
          <div>References: {object.references || 'N/A'}</div>
        </div>
      );
    }

    // Tectonic boundary tooltip
    if ('type' in object && object.type === 'tectonic') {
      return (
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y,
            pointerEvents: 'none',
            padding: '8px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 1000,
          }}
        >
          <div><strong>Tectonic Boundary</strong></div>
          <div>Type: {object.boundaryType}</div>
        </div>
      );
    }

    return null;
  };

  // Handle click events
  const handleClick = useCallback((info: any) => {
    if (isDrawingBbox && onMapClick) {
      onMapClick(info);
      return;
    }

    // Handle normal clicks on objects
    if (!info.object) return;

    if ('volcano_name' in info.object && !('type' in info.object)) {
      onVolcanoClick?.(info.object);
    } else if ('type' in info.object && info.object.type === 'sample') {
      onSampleClick?.(info.object);
    }
  }, [isDrawingBbox, onMapClick, onVolcanoClick, onSampleClick]);

  // Handle hover events
  const handleHover = useCallback((info: any) => {
    if (isDrawingBbox && onMapHover) {
      onMapHover(info);
    }
    
    // Update hover info for tooltip
    if (info.object) {
      setHoverInfo(info);
    } else {
      setHoverInfo(null);
    }
  }, [isDrawingBbox, onMapHover]);

  return (
    <div className="relative w-full h-full" style={{ cursor: isDrawingBbox ? 'crosshair' : 'default' }}>
      <DeckGL
        viewState={currentViewState}
        onViewStateChange={handleViewStateChange}
        controller={true}
        layers={layers}
        onClick={handleClick}
        onHover={handleHover}
        getTooltip={() => null}
        getCursor={() => isDrawingBbox ? 'crosshair' : 'default'}
      >
        <MapboxMap
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={MAP_STYLE}
        />
      </DeckGL>

      {/* Tooltip overlay (hidden during drawing) */}
      {!isDrawingBbox && renderTooltip()}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="text-white text-lg">Loading map data...</div>
        </div>
      )}
    </div>
  );
};

export default VolcanoMap;
