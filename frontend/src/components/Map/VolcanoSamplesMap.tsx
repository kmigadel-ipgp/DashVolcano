import { useEffect, useMemo, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map as MapboxMap } from 'react-map-gl/mapbox';
import { IconLayer, ScatterplotLayer } from '@deck.gl/layers';
import { WebMercatorViewport } from '@deck.gl/core';
import type { MapViewState, PickingInfo } from '@deck.gl/core';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { fetchSamples } from '../../api/samples';
import { fetchVolcanoByNumber } from '../../api/volcanoes';
import type { Sample, Volcano } from '../../types';
import {
  ALL_MATCH_METHODS,
  filterSamplesByMethod,
  getMatchMethod,
  getMatchMethodColor,
  getMatchMethodLabel,
  type MatchMethod,
} from '../../utils/matchMethod';
import { wrapLongitude } from '../../utils/longitude';
import { MAP_STYLE, MAPBOX_TOKEN, VOLCANO_ICON } from './mapStyle';
import { MapTooltip } from './MapTooltip';
import { sampleHoverObject, useMapHover } from './mapHover';

import 'mapbox-gl/dist/mapbox-gl.css';

interface VolcanoSamplesMapProps {
  volcanoNumber: number;
  volcanoName: string;
  /** Association methods to show (the page's method filter); all methods when omitted */
  matchMethods?: MatchMethod[];
  /** Map height in pixels */
  height?: number;
}

/** Zoom used when a volcano has no associated sample */
const DEFAULT_ZOOM = 9;
/** Closest zoom when fitting the samples (keeps context around a single sample) */
const MAX_FIT_ZOOM = 11;

const rgba = ([r, g, b, a]: number[]) => `rgba(${r}, ${g}, ${b}, ${(a ?? 255) / 255})`;

/**
 * Small map centred on one volcano with the samples associated with it,
 * coloured by association method as on the main map. Loads its own data
 * (the volcano record and its samples), so any page can drop it in.
 */
export const VolcanoSamplesMap = ({ volcanoNumber, volcanoName, matchMethods, height = 320 }: VolcanoSamplesMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  // Same tooltip as the main map (volcano and sample details)
  const { hoverInfo, showHover, clearHover, enterTooltip, leaveTooltip } = useMapHover();
  // Results are keyed by volcano number: a new volcano shows "loading" until its own data arrives
  const [loaded, setLoaded] = useState<{ number: number; volcano: Volcano; samples: Sample[] } | null>(null);
  const [failed, setFailed] = useState<number | null>(null);
  const [userView, setUserView] = useState<{ number: number; view: MapViewState } | null>(null);

  // Load the volcano and the samples linked to it
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchVolcanoByNumber(volcanoNumber), fetchSamples({ volcano_number: volcanoNumber })])
      .then(([volcanoRecord, response]) => {
        if (!cancelled) setLoaded({ number: volcanoNumber, volcano: volcanoRecord, samples: response.data });
      })
      .catch(() => {
        if (!cancelled) setFailed(volcanoNumber);
      });
    return () => {
      cancelled = true;
    };
  }, [volcanoNumber]);

  const current = loaded?.number === volcanoNumber ? loaded : null;
  const status: 'loading' | 'ready' | 'error' = current ? 'ready' : failed === volcanoNumber ? 'error' : 'loading';
  const volcano = current?.volcano ?? null;
  const samples = useMemo(() => current?.samples ?? [], [current]);
  const viewState = userView?.number === volcanoNumber ? userView.view : null;
  const setViewState = (view: MapViewState | null) => setUserView(view ? { number: volcanoNumber, view } : null);

  // Track the map width to fit the view
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const shownSamples = useMemo(
    () => (matchMethods ? filterSamplesByMethod(samples, matchMethods) : samples),
    [samples, matchMethods],
  );

  const center = volcano?.geometry?.coordinates;
  // Samples are drawn in the world copy around the volcano (volcanoes near 180°)
  const positionOf = useMemo(
    () => (coordinates: number[]): [number, number] => [wrapLongitude(coordinates[0], center?.[0] ?? 0), coordinates[1]],
    [center],
  );

  // View that fits the volcano and its samples
  const fittedView = useMemo<MapViewState | null>(() => {
    if (!center || width === 0) return null;
    const points = [center, ...shownSamples.map((s) => positionOf(s.geometry.coordinates))];
    const lons = points.map((p) => p[0]);
    const lats = points.map((p) => p[1]);
    const pad = 0.02;
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lons) - pad, Math.min(...lats) - pad],
      [Math.max(...lons) + pad, Math.max(...lats) + pad],
    ];
    if (points.length === 1) {
      return { longitude: center[0], latitude: center[1], zoom: DEFAULT_ZOOM, pitch: 0, bearing: 0 };
    }
    const fitted = new WebMercatorViewport({ width, height }).fitBounds(bounds, { padding: 32, maxZoom: MAX_FIT_ZOOM });
    return { longitude: fitted.longitude, latitude: fitted.latitude, zoom: fitted.zoom, pitch: 0, bearing: 0 };
  }, [center, width, height, shownSamples, positionOf]);

  const currentView = viewState ?? fittedView;

  const counts = useMemo(() => {
    const byMethod = new Map<MatchMethod, number>();
    shownSamples.forEach((s) => {
      const method = getMatchMethod(s.matching_metadata);
      byMethod.set(method, (byMethod.get(method) ?? 0) + 1);
    });
    return ALL_MATCH_METHODS.filter((m) => byMethod.get(m)).map((m) => ({ method: m, count: byMethod.get(m) ?? 0 }));
  }, [shownSamples]);

  // Keyboard access, as on the main map: deck.gl's event target is the named tab stop
  useEffect(() => {
    const wrapper = containerRef.current;
    const deckTarget = wrapper?.querySelector<HTMLElement>('.deck-widget-container');
    if (deckTarget) {
      deckTarget.setAttribute('role', 'application');
      deckTarget.setAttribute('aria-roledescription', 'map');
      deckTarget.setAttribute('aria-label', `Map of ${volcanoName} and its samples. Use the arrow keys to pan and the + and - keys to zoom.`);
    }
    wrapper?.querySelector('.mapboxgl-canvas')?.setAttribute('tabindex', '-1');
  });

  const layers = volcano && center ? [
    new ScatterplotLayer<Sample>({
      id: `samples-${volcanoNumber}`,
      data: shownSamples,
      getPosition: (d) => positionOf(d.geometry.coordinates),
      getRadius: 250,
      radiusMinPixels: 3,
      radiusMaxPixels: 7,
      getFillColor: (d) => getMatchMethodColor(getMatchMethod(d.matching_metadata)),
      getLineColor: (d) => {
        const [r, g, b] = getMatchMethodColor(getMatchMethod(d.matching_metadata));
        return [r, g, b, 255];
      },
      stroked: true,
      lineWidthMinPixels: 1,
      pickable: true,
      onHover: (info: PickingInfo<Sample>) => {
        if (info.object) showHover({ x: info.x, y: info.y, object: sampleHoverObject(info.object) });
        else clearHover();
      },
      updateTriggers: { getPosition: center[0] },
    }),
    new IconLayer<Volcano>({
      id: `volcano-${volcanoNumber}`,
      data: [volcano],
      getPosition: () => [center[0], center[1]],
      getIcon: () => VOLCANO_ICON,
      getSize: 22,
      pickable: true,
      onHover: (info: PickingInfo<Volcano>) => {
        if (info.object) showHover({ x: info.x, y: info.y, object: info.object });
        else clearHover();
      },
    }),
  ] : [];

  const zoomBy = (delta: number) => {
    if (currentView) setViewState({ ...currentView, zoom: Math.min(16, Math.max(1, currentView.zoom + delta)) });
  };

  const iconButton = 'w-8 h-8 inline-flex items-center justify-center text-gray-700 hover:bg-gray-100';

  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-lg border border-line bg-surface-chart"
          style={{ height }}
          onMouseLeave={clearHover}
        >
          {status === 'ready' && currentView && (
            <DeckGL
              viewState={currentView}
              onViewStateChange={({ viewState: next }) => setViewState(next as MapViewState)}
              controller={{ dragRotate: false, touchRotate: false }}
              layers={layers}
            >
              <MapboxMap mapboxAccessToken={MAPBOX_TOKEN} mapStyle={MAP_STYLE} attributionControl={false} />
            </DeckGL>
          )}

          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted">Loading map…</div>
          )}
          {status === 'error' && (
            <div role="alert" className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-ink-muted">
              The location of {volcanoName} could not be loaded.
            </div>
          )}

          {status === 'ready' && (
            <>
              <div className="absolute top-2 right-2 z-[1] flex flex-col overflow-hidden rounded-md border border-line bg-surface shadow-sm">
                <button type="button" className={iconButton} onClick={() => zoomBy(1)} aria-label="Zoom in">
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
                <button type="button" className={`${iconButton} border-t border-line`} onClick={() => zoomBy(-1)} aria-label="Zoom out">
                  <Minus className="w-4 h-4" aria-hidden="true" />
                </button>
                <button type="button" className={`${iconButton} border-t border-line`} onClick={() => setViewState(null)} aria-label="Reset view">
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <p className="absolute bottom-0 right-0 z-[1] m-0 px-1.5 py-0.5 rounded-tl bg-surface/90 text-[11px] text-ink">
                ©{' '}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
                  OpenStreetMap
                </a>{' '}
                contributors
              </p>
            </>
          )}
        </div>
        {status === 'ready' && (
          <MapTooltip hover={hoverInfo} width={width} height={height} onMouseEnter={enterTooltip} onMouseLeave={leaveTooltip} />
        )}
      </div>

      {status === 'ready' && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2 L22 20 L2 20 Z" fill="rgb(220, 20, 60)" stroke="rgb(180, 0, 40)" strokeWidth="1.5" />
            </svg>
            {volcanoName}
          </span>
          {counts.map(({ method, count }) => (
            <span key={method} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full border"
                style={{ backgroundColor: rgba(getMatchMethodColor(method)), borderColor: rgba([...getMatchMethodColor(method).slice(0, 3), 255]) }}
                aria-hidden="true"
              />
              {getMatchMethodLabel(method)}: {count.toLocaleString()}
            </span>
          ))}
          {shownSamples.length === 0 && <span>No sample is associated with this volcano for the selected methods.</span>}
        </div>
      )}
    </div>
  );
};
