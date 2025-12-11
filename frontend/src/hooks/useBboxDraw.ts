import { useState, useCallback } from 'react';
import type { BBox } from '../types';

interface Point {
  x: number;
  y: number;
  lon: number;
  lat: number;
}

export interface DrawState {
  isDrawing: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
  bbox: BBox | null;
}

/**
 * Hook for handling bounding box drawing on a map
 * Returns drawing state and handlers for mouse events
 */
export const useBboxDraw = (onBboxComplete: (bbox: BBox) => void) => {
  const [drawState, setDrawState] = useState<DrawState>({
    isDrawing: false,
    startPoint: null,
    currentPoint: null,
    bbox: null,
  });

  const startDrawing = useCallback(() => {
    setDrawState({
      isDrawing: true,
      startPoint: null,
      currentPoint: null,
      bbox: null,
    });
  }, []);

  const cancelDrawing = useCallback(() => {
    setDrawState({
      isDrawing: false,
      startPoint: null,
      currentPoint: null,
      bbox: null,
    });
  }, []);

  const handleMouseDown = useCallback((point: Point) => {
    if (drawState.isDrawing) {
      setDrawState(prev => ({
        ...prev,
        startPoint: point,
        currentPoint: point,
      }));
    }
  }, [drawState.isDrawing]);

  const handleMouseMove = useCallback((point: Point) => {
    if (drawState.isDrawing && drawState.startPoint) {
      setDrawState(prev => ({
        ...prev,
        currentPoint: point,
      }));
    }
  }, [drawState.isDrawing, drawState.startPoint]);

  const handleMouseUp = useCallback((point: Point) => {
    if (drawState.isDrawing && drawState.startPoint) {
      const start = drawState.startPoint;
      const end = point;

      // Calculate bbox from start and end points
      const minLon = Math.min(start.lon, end.lon);
      const maxLon = Math.max(start.lon, end.lon);
      const minLat = Math.min(start.lat, end.lat);
      const maxLat = Math.max(start.lat, end.lat);

      // Only create bbox if there's a meaningful area (at least 0.1 degrees)
      if (Math.abs(maxLon - minLon) > 0.1 && Math.abs(maxLat - minLat) > 0.1) {
        const bbox: BBox = { minLon, minLat, maxLon, maxLat };
        setDrawState({
          isDrawing: false,
          startPoint: null,
          currentPoint: null,
          bbox,
        });
        onBboxComplete(bbox);
      } else {
        // Too small, cancel
        cancelDrawing();
      }
    }
  }, [drawState.isDrawing, drawState.startPoint, onBboxComplete, cancelDrawing]);

  return {
    drawState,
    startDrawing,
    cancelDrawing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
};

/**
 * Get the rectangle coordinates for rendering the drawing rectangle
 */
export const getDrawingRectangle = (drawState: DrawState): BBox | null => {
  if (!drawState.startPoint || !drawState.currentPoint) {
    return null;
  }

  const start = drawState.startPoint;
  const current = drawState.currentPoint;

  return {
    minLon: Math.min(start.lon, current.lon),
    maxLon: Math.max(start.lon, current.lon),
    minLat: Math.min(start.lat, current.lat),
    maxLat: Math.max(start.lat, current.lat),
  };
};

/**
 * Convert BBox to GeoJSON polygon for rendering
 */
export const bboxToGeoJSON = (bbox: BBox) => {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
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

/**
 * Format bbox for API (min_lon,min_lat,max_lon,max_lat)
 */
export const formatBboxForAPI = (bbox: BBox): string => {
  return `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
};
