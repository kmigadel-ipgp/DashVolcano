import type { CSSProperties } from 'react';
import { ExternalLink } from 'lucide-react';
import { getMatchMethodColor } from '../../utils/matchMethod';
import { GVP_VOTW, gvpVolcanoCitation, gvpVolcanoUrl } from '../../utils/gvp';
import type { MapHover } from './mapHover';

const TOOLTIP_WIDTH = 260;
const TOOLTIP_HEIGHT = 190;
/** Volcano tooltips are taller: they end with the GVP link and citation */
const VOLCANO_TOOLTIP_HEIGHT = 210;
/**
 * Gap between the cursor and the tooltip. A volcano tooltip takes the pointer (its GVP
 * links can be clicked), so it must not sit under the cursor: a click on the volcano
 * has to reach the map. The hover is kept briefly, long enough to cross this gap.
 */
const CURSOR_OFFSET = 12;

interface MapTooltipProps {
  hover: MapHover | null;
  /** Size of the map, to keep the tooltip inside it near the right and bottom edges */
  width?: number;
  height?: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/** Tooltip shown when hovering a volcano, a sample or a tectonic boundary on a map */
export const MapTooltip = ({ hover, width, height, onMouseEnter, onMouseLeave }: MapTooltipProps) => {
  if (!hover?.object) return null;
  const { x, y, object } = hover;
  const isVolcano = 'volcano_name' in object && !('type' in object);
  const tooltipHeight = isVolcano ? VOLCANO_TOOLTIP_HEIGHT : TOOLTIP_HEIGHT;

  const base: CSSProperties = {
    position: 'absolute',
    left: width && x + CURSOR_OFFSET + TOOLTIP_WIDTH > width ? Math.max(0, x - CURSOR_OFFSET - TOOLTIP_WIDTH) : x + CURSOR_OFFSET,
    top: height && y + CURSOR_OFFSET + tooltipHeight > height ? Math.max(0, y - CURSOR_OFFSET - tooltipHeight) : y + CURSOR_OFFSET,
    maxWidth: TOOLTIP_WIDTH,
    overflowWrap: 'break-word',
    // Only volcano tooltips hold links. Sample and boundary tooltips let the pointer through,
    // so they never hide the samples around the cursor from hovering and clicking.
    pointerEvents: isVolcano ? 'auto' : 'none',
    padding: '8px',
    background: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    borderRadius: '4px',
    fontSize: '12px',
    zIndex: 1000,
  };
  const handlers = { onMouseEnter, onMouseLeave };

  // Volcano tooltip
  if (isVolcano) {
    return (
      <div style={base} {...handlers}>
        <div><strong>{object.volcano_name}</strong></div>
        <div>Type: {object.primary_volcano_type || 'N/A'}</div>
        <div>Country: {object.country || 'N/A'}</div>
        <div>Region: {object.region || 'N/A'}</div>
        {object.volcano_number > 0 && (
          <a
            href={gvpVolcanoUrl(object.volcano_number)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '6px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              width: '100%',
              color: 'white',
              textDecoration: 'underline',
            }}
          >
            View on the GVP website
            <ExternalLink style={{ width: 12, height: 12 }} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
        {object.volcano_number > 0 && (
          <p style={{ margin: '6px 0 0', fontSize: '10px', lineHeight: 1.4, color: 'rgba(255, 255, 255, 0.75)' }}>
            {gvpVolcanoCitation(object.volcano_name, object.volcano_number)}{' '}
            <a href={GVP_VOTW.doi} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
              {GVP_VOTW.doi}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        )}
      </div>
    );
  }

  // Sample tooltip, with the association method
  if ('type' in object && (object.type === 'sample' || object.type === 'comparison-sample')) {
    const isComparisonSample = object.type === 'comparison-sample';
    const methodColor = object.match_method
      ? getMatchMethodColor(object.match_method)
      : [156, 163, 175, 140];

    return (
      <div
        style={{
          ...base,
          background: 'rgba(0, 0, 0, 0.9)',
          borderLeft: `3px solid rgba(${methodColor[0]}, ${methodColor[1]}, ${methodColor[2]}, ${methodColor[3] / 255})`,
          minWidth: '200px',
        }}
        {...handlers}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          {isComparisonSample ? 'Comparison Sample' : 'Sample'}
        </div>
        <div>Volcano: {object.volcano_name || 'N/A'}</div>
        <div>Rock: {object.rock_name || 'N/A'}</div>
        <div>Location: {object.latitude?.toFixed(2)}°, {object.longitude?.toFixed(2)}°</div>
        <div>Tectonic Setting: {object.tectonic_setting || 'N/A'}</div>
        {isComparisonSample && object.sample_context && (
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>
            {object.sample_context}
          </div>
        )}

        {object.match_method && (
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)', marginTop: '6px', paddingTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 'bold' }}>{object.method_label}</span>
            </div>
          </div>
        )}

        <div style={{
          fontSize: '10px',
          color: 'rgba(255, 255, 255, 0.5)',
          marginTop: '4px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '4px',
        }}>
          References: {object.references || 'N/A'}
        </div>
      </div>
    );
  }

  // Tectonic boundary tooltip
  if ('type' in object && object.type === 'tectonic') {
    return (
      <div style={base} {...handlers}>
        <div><strong>Tectonic Boundary</strong></div>
        <div>Type: {object.boundaryType}</div>
      </div>
    );
  }

  return null;
};
