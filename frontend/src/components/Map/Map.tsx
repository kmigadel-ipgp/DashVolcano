import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { Map as MapboxMap } from 'react-map-gl/mapbox';
import { ScatterplotLayer, GeoJsonLayer, IconLayer } from '@deck.gl/layers';
import type { LayersList, PickingInfo, ViewStateChangeParameters } from '@deck.gl/core';
import type { BBox, Sample, Volcano, TectonicBoundary } from '../../types';
import {
  getMatchMethod,
  getMatchMethodColor,
  getVolcanoNumber,
  getVolcanoName,
} from '../../utils/matchMethod';
import { getWrapCenter, wrapBbox, wrapLine, wrapLongitude } from '../../utils/longitude';

import 'mapbox-gl/dist/mapbox-gl.css';
import { usePlotTheme } from '../../hooks/usePlotTheme';
import { BOUNDARY_TYPES, MAP_STYLE, MAPBOX_TOKEN, VOLCANO_ICON } from './mapStyle';
import { MapTooltip } from './MapTooltip';
import { sampleHoverObject, useMapHover } from './mapHover';

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
  /** Secondary comparison samples shown only for radar/map comparison */
  comparisonSamples?: Sample[];
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
  /** Stable volcano id for matching selected volcano samples */
  selectedVolcanoNumber?: number | string;
  /** Callback when a volcano is clicked */
  onVolcanoClick?: (volcano: Volcano) => void;
  /** Callback when a sample is clicked */
  onSampleClick?: (sample: Sample) => void;
  /** Callback when the viewport changes */
  onViewportChange?: (viewState: ViewState) => void;
  /** Whether the map is in loading state */
  loading?: boolean;
  /** Active bbox filter to show border */
  activeBbox?: BBox | null;
  /** Secondary comparison bbox shown for radar comparisons */
  comparisonBbox?: BBox | null;
  /** Drawing bbox for visualization */
  drawingBboxProp?: BBox | null;
  /** Which bbox is currently being drawn */
  drawingBboxVariant?: 'primary' | 'comparison';
  /** Whether bbox drawing mode is active */
  isDrawingBbox?: boolean;
  /** Callback when map is clicked (for drawing) */
  onMapClick?: (info: PickingInfo) => void;
  /** Callback when mouse hovers over map (for drawing) */
  onMapHover?: (info: PickingInfo) => void;
}

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
  comparisonSamples = [],
  volcanoes = [],
  tectonicBoundaries = [],
  viewState: externalViewState,
  showSamplePoints = true,
  showVolcanoes = true,
  showTectonicBoundaries = true,
  selectedVolcanoName,
  selectedVolcanoNumber,
  onVolcanoClick,
  onSampleClick,
  onViewportChange,
  loading = false,
  activeBbox = null,
  comparisonBbox = null,
  drawingBboxProp = null,
  drawingBboxVariant = 'primary',
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

  // Radar comparison areas use the theme's second series colour (as in the radar chart)
  const { palette: plotPalette } = usePlotTheme();
  const comparisonRgb = [1, 3, 5].map((k) => parseInt(plotPalette.series[1].slice(k, k + 2), 16)) as [number, number, number];

  // Each object is drawn once, in the world copy closest to the view centre
  const wrapCenter = getWrapCenter(currentViewState.longitude);
  const getWrappedPosition = useCallback(
    (coordinates: number[]): [number, number] => [wrapLongitude(coordinates[0], wrapCenter), coordinates[1]],
    [wrapCenter]
  );

  // Tooltip shared with the volcano maps of the other pages (MapTooltip.tsx)
  const { hoverInfo, showHover, clearHover, enterTooltip, leaveTooltip } = useMapHover();

  const normalizedSelectedVolcanoName = selectedVolcanoName?.trim().toLowerCase();
  const normalizedSelectedVolcanoNumber = selectedVolcanoNumber != null
    ? String(selectedVolcanoNumber)
    : undefined;

  const isSelectedVolcanoSample = useCallback((sample: Sample) => {
    if (normalizedSelectedVolcanoNumber) {
      const sampleVolcanoNumber = getVolcanoNumber(sample.matching_metadata);
      if (sampleVolcanoNumber) {
        return sampleVolcanoNumber === normalizedSelectedVolcanoNumber;
      }
    }

    if (normalizedSelectedVolcanoName) {
      const sampleVolcanoName = getVolcanoName(sample.matching_metadata)?.trim().toLowerCase();
      return sampleVolcanoName === normalizedSelectedVolcanoName;
    }

    return false;
  }, [normalizedSelectedVolcanoName, normalizedSelectedVolcanoNumber]);

  /**
   * Handle viewport changes
   */
  const handleViewStateChange = useCallback(
    (e: ViewStateChangeParameters) => {
      const viewState = e.viewState as ViewState;
      if (!externalViewState) {
        setInternalViewState(viewState);
      }
      if (onViewportChange) {
        onViewportChange(viewState);
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


    return new IconLayer({
      id: 'volcanoes',
      data: volcanoes,
      getPosition: (d: Volcano) => getWrappedPosition(d.geometry.coordinates),
      getIcon: () => VOLCANO_ICON,
      getSize: 8, // Size in pixels (consistent at all latitudes and zoom levels)
      sizeScale: 1,
      sizeMinPixels: 2,
      sizeMaxPixels: 8,
      updateTriggers: { getPosition: wrapCenter },
      pickable: true,
      // Click interaction
      onClick: (info: PickingInfo<Volcano>) => {
        if (info.object && onVolcanoClick) {
          onVolcanoClick(info.object);
        }
      },
      // Hover interaction
      onHover: (info: PickingInfo<Volcano>) => {
        if (info.object) {
          showHover({
            x: info.x,
            y: info.y,
            object: info.object,
          });
        } else {
          clearHover();
        }
      },
    });
  }, [volcanoes, showVolcanoes, onVolcanoClick, getWrappedPosition, wrapCenter, showHover, clearHover]);

  /**
   * Sample points layer for individual sample visualization and selection
   * 
   * Color Priority Logic:
   * 1. HIGHEST: Selected volcano samples → Orange fill [255, 140, 0] (always visible)
   *    - Border/stroke shows the association method (see below)
   * 2. SECONDARY: Non-selected samples use association-method fill color
   *    - Literature: Green (volcano named in the publication)
   *    - Nearest: Blue (nearest volcano within 15 km)
   *    - Unmatched: Gray (no association)
   *
   * This ensures users can always identify selected volcano samples (orange fill) while
   * still seeing how each sample was associated via the colored border.
   */
  const samplePointsLayer = useCallback(() => {
    if (!showSamplePoints || samples.length === 0) return null;

    return new ScatterplotLayer({
      id: 'samples-points',
      data: samples,
      getPosition: (d: Sample) => getWrappedPosition(d.geometry.coordinates),
      getRadius: 3000, // 3km radius points
      getFillColor: (d: Sample) => {
        // PRIORITY 1: Highlight samples from the selected volcano with orange color
        // This ALWAYS takes precedence over confidence coloring for the FILL
        if (isSelectedVolcanoSample(d)) {
          return [255, 140, 0, 200]; // Orange with higher opacity for selected volcano
        }
        
        // PRIORITY 2: Use association-method coloring for non-selected samples
        // (literature = green, nearest = blue, unmatched = gray)
        const method = getMatchMethod(d.matching_metadata);
        return getMatchMethodColor(method);
      },
      // Line color (stroke/border) always shows the association method,
      // so selected-volcano samples still expose it via their border.
      getLineColor: (d: Sample) => {
        const method = getMatchMethod(d.matching_metadata);
        const color = getMatchMethodColor(method);
        // Return RGB with full opacity for visible border
        return [color[0], color[1], color[2], 255];
      },
      // Enable stroke and set width
      stroked: true,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 2,
      getLineWidth: (d: Sample) => {
        // Thicker border for selected volcano samples to make confidence more visible
        if (isSelectedVolcanoSample(d)) {
          return 2;
        }
        return 1;
      },
      updateTriggers: {
        getPosition: wrapCenter,
        getFillColor: [normalizedSelectedVolcanoName, normalizedSelectedVolcanoNumber],
        getLineColor: [normalizedSelectedVolcanoName, normalizedSelectedVolcanoNumber],
        getLineWidth: [normalizedSelectedVolcanoName, normalizedSelectedVolcanoNumber],
      },
      pickable: true,
      radiusMinPixels: 2,
      radiusMaxPixels: 8,
      // Click interaction
      onClick: (info: PickingInfo<Sample>) => {
        if (info.object && onSampleClick) {
          onSampleClick(info.object as Sample);
        }
      },
      // Hover interaction - now includes association-method information
      onHover: (info: PickingInfo<Sample>) => {
        if (info.object) {
          const sample = info.object as Sample;
          showHover({ x: info.x, y: info.y, object: sampleHoverObject(sample) });
        } else {
          clearHover();
        }
      },
    });
  }, [samples, showSamplePoints, isSelectedVolcanoSample, onSampleClick, normalizedSelectedVolcanoName, normalizedSelectedVolcanoNumber, getWrappedPosition, wrapCenter, showHover, clearHover]);

  const comparisonSampleLayer = useCallback(() => {
    if (!showSamplePoints || comparisonSamples.length === 0) return null;

    return new ScatterplotLayer({
      id: 'comparison-samples-points',
      data: comparisonSamples,
      getPosition: (d: Sample) => getWrappedPosition(d.geometry.coordinates),
      getRadius: 3200,
      getFillColor: (d: Sample) => {
        const method = getMatchMethod(d.matching_metadata);
        const color = getMatchMethodColor(method);
        return [color[0], color[1], color[2], 140];
      },
      getLineColor: (d: Sample) => {
        const method = getMatchMethod(d.matching_metadata);
        const color = getMatchMethodColor(method);
        return [color[0], color[1], color[2], 255];
      },
      stroked: true,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 2,
      getLineWidth: 2,
      updateTriggers: { getPosition: wrapCenter },
      pickable: true,
      radiusMinPixels: 2,
      radiusMaxPixels: 9,
      onClick: (info: PickingInfo<Sample>) => {
        if (info.object && onSampleClick) {
          onSampleClick(info.object as Sample);
        }
      },
      onHover: (info: PickingInfo<Sample>) => {
        if (info.object) {
          const sample = info.object as Sample;
          showHover({ x: info.x, y: info.y, object: sampleHoverObject(sample, 'comparison-sample', 'Radar comparison overlay') });
        } else {
          clearHover();
        }
      },
    });
  }, [comparisonSamples, onSampleClick, showSamplePoints, getWrappedPosition, wrapCenter, showHover, clearHover]);

  // Boundary lines wrapped around the view centre (recomputed only when wrapCenter changes)
  const wrappedTectonicBoundaries = useMemo(
    () => tectonicBoundaries
      .map((boundary) => ({
        ...boundary,
        geometry: {
          type: 'MultiLineString' as const,
          coordinates: wrapLine(boundary.geometry.coordinates, wrapCenter),
        },
      }))
      // A line with fewer than two vertices draws nothing (deck.gl reports it as malformed)
      .filter((boundary) => boundary.geometry.coordinates.length > 0),
    [tectonicBoundaries, wrapCenter]
  );

  /**
   * Tectonic boundaries GeoJsonLayer
   * Lines for ridges, trenches, and transforms
   */
  const tectonicLayer = useCallback(() => {
    if (!showTectonicBoundaries || wrappedTectonicBoundaries.length === 0) return null;

    // Group boundaries by type for different colors
    const boundariesByType = wrappedTectonicBoundaries.reduce((acc, boundary) => {
      const type = boundary.properties?.boundary_type || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(boundary);
      return acc;
    }, {} as Record<string, typeof wrappedTectonicBoundaries>);

    // Create a layer for each boundary type
    const layers = Object.entries(boundariesByType).map(([type, boundaries]) => {
      // Colour by boundary type (shared with the legend in LayerControls)
      const color = BOUNDARY_TYPES.find((b) => b.type === type)?.color ?? [128, 128, 128];

      return new GeoJsonLayer({
        id: `tectonic-${type}`,
        data: boundaries,
        pickable: true,
        stroked: true,
        filled: false,
        lineWidthMinPixels: 1,
        getLineColor: color,
        getLineWidth: 2,
        opacity: 0.7,
        onHover: (info: PickingInfo<(typeof boundaries)[number]>) => {
          if (info.object) {
            showHover({
              x: info.x,
              y: info.y,
              object: {
                type: 'tectonic',
                boundaryType: type,
                ...info.object.properties,
              },
            });
          } else {
            clearHover();
          }
        },
      });
    });

    return layers;
  }, [wrappedTectonicBoundaries, showTectonicBoundaries, showHover, clearHover]);

  // Combine all layers
  // Drawing bbox layer (for real-time preview during drawing)
  const createBboxFeature = (rawBbox: BBox) => {
    const bbox = wrapBbox(rawBbox, wrapCenter);
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [bbox.minLon, bbox.minLat],
          [bbox.maxLon, bbox.minLat],
          [bbox.maxLon, bbox.maxLat],
          [bbox.minLon, bbox.maxLat],
          [bbox.minLon, bbox.minLat],
        ]],
      },
    };
  };

  const drawingBboxLayer = () => {
    if (!drawingBboxProp) return null;
    const bboxGeoJSON = createBboxFeature(drawingBboxProp);
    const isComparison = drawingBboxVariant === 'comparison';

    return new GeoJsonLayer({
      id: 'drawing-bbox-layer',
      data: [bboxGeoJSON],
      filled: true,
      stroked: true,
      getFillColor: isComparison ? [...comparisonRgb, 70] : [59, 130, 246, 80],
      getLineColor: isComparison ? [...comparisonRgb, 220] : [59, 130, 246, 200],
      getLineWidth: 2,
      lineWidthMinPixels: 2,
      getDashArray: [5, 3], // Dashed line
      pickable: false,
    });
  };

  // Active bbox layer (for showing the final selected search area)
  const activeBboxLayer = () => {
    if (!activeBbox) return null;
    const bboxGeoJSON = createBboxFeature(activeBbox);

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

  const comparisonBboxLayer = () => {
    if (!comparisonBbox) return null;

    return new GeoJsonLayer({
      id: 'comparison-bbox-layer',
      data: [createBboxFeature(comparisonBbox)],
      filled: false,
      stroked: true,
      getLineColor: [...comparisonRgb, 255],
      getLineWidth: 3,
      lineWidthMinPixels: 3,
      getDashArray: [6, 4],
      pickable: false,
    });
  };

  const layers: LayersList = [];
  
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

  const comparisonPoints = comparisonSampleLayer();
  if (comparisonPoints) {
    layers.push(comparisonPoints);
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

  const comparisonBboxBorder = comparisonBboxLayer();
  if (comparisonBboxBorder) {
    layers.push(comparisonBboxBorder);
  }

  // Add drawing bbox layer (on top)
  const drawingBbox = drawingBboxLayer();
  if (drawingBbox) {
    layers.push(drawingBbox);
  }

  // Handle click events
  const handleClick = useCallback((info: PickingInfo) => {
    // The hover tooltip would cover the panel the click opens
    clearHover();

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
  }, [isDrawingBbox, onMapClick, onVolcanoClick, onSampleClick, clearHover]);

  // Handle hover events
  const handleHover = useCallback((info: PickingInfo) => {
    if (isDrawingBbox && onMapHover) {
      onMapHover(info);
    }
    
    // Layer-specific onHover handlers own tooltip contents.
    if (!info.object) {
      clearHover();
    }
  }, [isDrawingBbox, onMapHover, clearHover]);

  // Keyboard access: deck.gl's event target (arrow keys pan, +/- zoom) is the
  // single, named tab stop of the map; mapbox's own canvas leaves the tab order.
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const wrapper = mapWrapperRef.current;
    const deckTarget = wrapper?.querySelector<HTMLElement>('.deck-widget-container');
    if (deckTarget) {
      deckTarget.setAttribute('role', 'application');
      deckTarget.setAttribute('aria-roledescription', 'map');
      deckTarget.setAttribute('aria-label', 'Volcano map. Use the arrow keys to pan and the + and - keys to zoom.');
    }
    wrapper?.querySelector('.mapboxgl-canvas')?.setAttribute('tabindex', '-1');
  });

  return (
    <div ref={mapWrapperRef} className="relative w-full h-full" style={{ cursor: isDrawingBbox ? 'crosshair' : 'default' }}>
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
          // Replaced by the attribution below: mapbox-gl's control uses an invalid role="list"
          attributionControl={false}
        />
      </DeckGL>

      {/* Basemap attribution (required by the OpenStreetMap tile usage policy) */}
      <p className="absolute bottom-0 right-0 z-[1] m-0 px-1.5 py-0.5 rounded-tl bg-surface/90 text-[11px] text-ink">
        ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
          OpenStreetMap
        </a>{' '}
        contributors
      </p>

      {/* Tooltip overlay (hidden during drawing) */}
      {!isDrawingBbox && (
        <MapTooltip hover={hoverInfo} onMouseEnter={enterTooltip} onMouseLeave={leaveTooltip} />
      )}

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
