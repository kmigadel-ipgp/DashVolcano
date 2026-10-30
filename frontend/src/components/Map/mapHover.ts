import { useEffect, useState } from 'react';
import type { Sample, Volcano } from '../../types';
import { getMatchMethod, getMatchMethodLabel, getVolcanoName, type MatchMethod } from '../../utils/matchMethod';

/** What a map tooltip describes: a volcano, a sample or a tectonic boundary */
export type MapHoverObject = Volcano | {
  type: string;
  volcano_name?: string;
  rock_name?: string;
  longitude?: number;
  latitude?: number;
  boundaryType?: string;
  tectonic_setting?: string | string[];
  references?: string;
  match_method?: MatchMethod;
  method_label?: string;
  sample_context?: string;
};

export interface MapHover {
  x: number;
  y: number;
  object: MapHoverObject;
}

/** Tooltip content for a sample (main map and volcano maps share it) */
export const sampleHoverObject = (
  sample: Sample,
  type: 'sample' | 'comparison-sample' = 'sample',
  sampleContext?: string,
): MapHoverObject => {
  const method = getMatchMethod(sample.matching_metadata);
  return {
    type,
    volcano_name: getVolcanoName(sample.matching_metadata),
    rock_name: sample.petro?.rock_type,
    longitude: sample.geometry.coordinates[0],
    latitude: sample.geometry.coordinates[1],
    tectonic_setting: typeof sample.tecto === 'object' ? sample.tecto?.ui : sample.tecto,
    references: sample.references,
    match_method: method,
    method_label: getMatchMethodLabel(method),
    ...(sampleContext ? { sample_context: sampleContext } : {}),
  };
};

/**
 * Hover state of a map tooltip. Tooltips stay open while the pointer moves
 * onto them and close with Escape (WCAG 1.4.13): clearing is delayed and
 * cancelled by entering the tooltip.
 */
export const useMapHover = () => {
  const [hoverInfo, setHoverInfo] = useState<MapHover | null>(null);
  const [control] = useState(() => {
    let timer: number | undefined;
    let tooltipHovered = false;
    const clear = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!tooltipHovered) setHoverInfo(null);
      }, 150);
    };
    return {
      show: (info: MapHover) => {
        window.clearTimeout(timer);
        setHoverInfo(info);
      },
      clear,
      enterTooltip: () => { tooltipHovered = true; },
      leaveTooltip: () => { tooltipHovered = false; clear(); },
      dispose: () => window.clearTimeout(timer),
    };
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHoverInfo(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      control.dispose();
    };
  }, [control]);
  return { hoverInfo, showHover: control.show, clearHover: control.clear, enterTooltip: control.enterTooltip, leaveTooltip: control.leaveTooltip };
};
