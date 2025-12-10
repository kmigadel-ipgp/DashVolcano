import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as turf from '@turf/turf';
import { WebMercatorViewport } from '@deck.gl/core';
import type { Sample } from '../../types';

interface SelectionOverlayProps {
  /** Selection mode: 'lasso' for freeform or 'box' for rectangular */
  mode: 'lasso' | 'box';
  /** Array of all samples to check for selection */
  samples: Sample[];
  /** Callback when selection is complete */
  onSelectionComplete: (selectedSamples: Sample[]) => void;
  /** Callback to cancel selection mode */
  onCancel: () => void;
  /** Current map viewport for coordinate conversion */
  viewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  /** Map container dimensions */
  width: number;
  height: number;
}

/**
 * SelectionOverlay Component
 * 
 * Provides interactive drawing tools for selecting samples on the map:
 * - Lasso: Freeform polygon selection
 * - Box: Rectangular selection
 * 
 * Uses @turf/turf for point-in-polygon calculations
 */
export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  mode,
  samples,
  onSelectionComplete,
  onCancel,
  viewState,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  /**
   * Convert screen coordinates to geographic coordinates (lng, lat)
   * Uses DeckGL's WebMercatorViewport for accurate projection
   */
  const screenToGeo = useCallback((x: number, y: number) => {
    const viewport = new WebMercatorViewport({
      width,
      height,
      longitude: viewState.longitude,
      latitude: viewState.latitude,
      zoom: viewState.zoom,
    });
    
    const [lng, lat] = viewport.unproject([x, y]);
    return [lng, lat];
  }, [viewState, width, height]);

  /**
   * Handle mouse down - start drawing
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPoint({ x, y });
    setPoints([{ x, y }]);
  };

  /**
   * Handle mouse move - continue drawing
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mode === 'lasso') {
      setPoints((prev) => [...prev, { x, y }]);
    } else if (mode === 'box' && startPoint) {
      // For box, we only need start and current point
      setPoints([startPoint, { x, y }]);
    }
  };

  /**
   * Handle mouse up - complete drawing and select samples
   */
  const handleMouseUp = () => {
    if (!isDrawing || points.length < 2) {
      setIsDrawing(false);
      return;
    }

    setIsDrawing(false);

    // Convert screen points to geographic coordinates
    let polygon: number[][];
    
    if (mode === 'box' && startPoint && points.length >= 2) {
      // Create box polygon from start and end points
      const end = points.at(-1)!;
      const minX = Math.min(startPoint.x, end.x);
      const maxX = Math.max(startPoint.x, end.x);
      const minY = Math.min(startPoint.y, end.y);
      const maxY = Math.max(startPoint.y, end.y);
      
      polygon = [
        screenToGeo(minX, minY),
        screenToGeo(maxX, minY),
        screenToGeo(maxX, maxY),
        screenToGeo(minX, maxY),
        screenToGeo(minX, minY), // Close the polygon
      ];
    } else if (mode === 'lasso') {
      // Convert lasso points to geographic coordinates
      polygon = points.map((p) => screenToGeo(p.x, p.y));
      // Close the polygon
      polygon.push(polygon[0]);
    } else {
      onCancel();
      return;
    }

    // Create turf polygon
    const turfPolygon = turf.polygon([polygon]);

    // Find samples within the polygon
    const selectedSamples = samples.filter((sample) => {
      const point = turf.point(sample.geometry.coordinates);
      return turf.booleanPointInPolygon(point, turfPolygon);
    });

    // Complete selection
    onSelectionComplete(selectedSamples);
    
    // Reset state
    setPoints([]);
    setStartPoint(null);
  };

  /**
   * Handle escape key to cancel
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  /**
   * Draw the selection shape on canvas
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (points.length === 0) return;

    // Draw the selection shape
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'; // Blue
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.lineWidth = 2;

    ctx.beginPath();

    if (mode === 'box' && startPoint && points.length >= 2) {
      // Draw rectangle
      const end = points.at(-1)!;
      const width = end.x - startPoint.x;
      const height = end.y - startPoint.y;
      ctx.rect(startPoint.x, startPoint.y, width, height);
    } else if (mode === 'lasso' && points.length > 1) {
      // Draw lasso path
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      if (!isDrawing) {
        ctx.closePath();
      }
    }

    ctx.stroke();
    ctx.fill();
  }, [points, startPoint, isDrawing, mode, width, height]);

  return (
    <div className="absolute inset-0 z-20" style={{ cursor: 'crosshair' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="absolute inset-0"
      />
      
      {/* Instructions */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-4 py-2 text-sm">
        <span className="font-semibold">
          {mode === 'lasso' ? 'Draw a lasso' : 'Draw a box'} to select samples
        </span>
        <span className="ml-2 text-gray-500">Press ESC to cancel</span>
      </div>
    </div>
  );
};

export default SelectionOverlay;
