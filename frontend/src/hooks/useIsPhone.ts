import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 639px)';

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};

/** True below Tailwind's `sm` breakpoint (phones) */
export const useIsPhone = (): boolean =>
  useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);

/**
 * Plotly legend placement for phones: below the plot instead of on its right,
 * so the plotting area keeps the full screen width. Plotly grows the bottom
 * margin to fit the legend.
 */
export const PHONE_LEGEND = {
  orientation: 'h' as const,
  x: 0,
  xanchor: 'left' as const,
  y: -0.12,
  yanchor: 'top' as const,
};

/** Longest title line (characters) that fits a 320px-wide phone chart */
const PHONE_TITLE_LINE = 22;

/**
 * Plotly title props. On phones, long titles wrap at word boundaries and
 * push the top margin, instead of being cut at both edges of the chart.
 */
export const chartTitle = (text: string, isPhone: boolean) => {
  if (!isPhone || text.length <= PHONE_TITLE_LINE) return { text };
  const lines: string[] = [];
  for (const word of text.split(' ')) {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= PHONE_TITLE_LINE) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else {
      lines.push(word);
    }
  }
  return { text: lines.join('<br>'), automargin: true, yref: 'paper' as const };
};
