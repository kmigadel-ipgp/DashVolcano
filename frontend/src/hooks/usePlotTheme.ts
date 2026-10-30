import { useMemo } from 'react';
import type { Layout } from 'plotly.js';
import { useTheme, type Theme } from './useTheme';

/**
 * Chart palette per theme. Chrome values mirror the CSS tokens in index.css
 * (surface-chart, ink, ink-muted, line); Plotly needs concrete colours, so
 * they are repeated here. Data colours (rock types, VEI, match methods) are
 * not part of the theme and never change.
 */
export interface PlotPalette {
  mode: Theme;
  /** Chart panel background (paper and plot area) */
  surface: string;
  /** Hover label background */
  popover: string;
  text: string;
  muted: string;
  grid: string;
  axis: string;
  accent: string;
  /** Reference lines drawn on the data (TAS alkaline divide, AFM boundary, triangle) */
  reference: string;
  /** TAS classification field boundaries */
  field: string;
  /** Compared volcanoes: series[0] = volcano 1, series[1] = volcano 2 */
  series: [string, string, string];
}

export const PLOT_PALETTES: Record<Theme, PlotPalette> = {
  light: {
    mode: 'light',
    surface: '#f3f5f9',
    popover: '#ffffff',
    text: '#1a2233',
    muted: '#596579',
    grid: '#dde2ea',
    axis: '#b9c1cd',
    accent: '#b91c1c',
    reference: '#1a2233',
    field: '#7a8496',
    series: ['#2f5fd0', '#b25e00', '#0f7b6c'],
  },
  dark: {
    mode: 'dark',
    surface: '#1b2330',
    popover: '#232c3b',
    text: '#e7ebf2',
    muted: '#a0aabb',
    grid: '#2b3546',
    axis: '#465266',
    accent: '#f87171',
    reference: '#e7ebf2',
    field: '#7d889b',
    series: ['#6e9bf5', '#f0a33a', '#3fbfa8'],
  },
};

export const PLOT_FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Deep merge for layout objects: plain objects merge, everything else is replaced */
const deepMerge = (base: Plain, override: Plain): Plain => {
  const out: Plain = { ...base };
  for (const [key, value] of Object.entries(override)) {
    out[key] = isPlain(value) && isPlain(out[key]) ? deepMerge(out[key] as Plain, value) : value;
  }
  return out;
};

const axisChrome = (p: PlotPalette) => ({
  gridcolor: p.grid,
  zerolinecolor: p.axis,
  linecolor: p.axis,
  tickcolor: p.axis,
  tickfont: { color: p.muted },
  title: { font: { color: p.muted } },
});

/** Theme chrome (backgrounds, text, grids, legend, hover labels, toolbar) */
export const baseLayout = (p: PlotPalette): Partial<Layout> => ({
  paper_bgcolor: p.surface,
  plot_bgcolor: p.surface,
  font: { family: PLOT_FONT, color: p.text },
  title: { font: { color: p.text } },
  xaxis: axisChrome(p),
  yaxis: axisChrome(p),
  legend: { bgcolor: 'rgba(0,0,0,0)', font: { color: p.text } },
  hoverlabel: { bgcolor: p.popover, bordercolor: p.axis, font: { color: p.text, family: PLOT_FONT } },
  modebar: { bgcolor: 'rgba(0,0,0,0)', color: p.muted, activecolor: p.accent },
});

/** Chart layout on top of the theme chrome. Polar chrome is added only to polar charts. */
export const mergeLayout = (p: PlotPalette, layout: Partial<Layout> = {}): Partial<Layout> => {
  let base = baseLayout(p) as Plain;
  if (layout.polar) {
    base = deepMerge(base, {
      polar: {
        bgcolor: p.surface,
        radialaxis: { gridcolor: p.grid, linecolor: p.axis, tickfont: { color: p.muted } },
        angularaxis: { gridcolor: p.grid, linecolor: p.axis, tickfont: { color: p.text } },
      },
    });
  }
  return deepMerge(base, layout as Plain) as Partial<Layout>;
};

/**
 * Replace every colour of one palette by its counterpart in another, in data
 * or layout (used to export a dark-mode chart with the light palette).
 */
export const swapPalette = <T>(value: T, from: PlotPalette, to: PlotPalette): T => {
  const map = new Map<string, string>();
  (Object.keys(from) as (keyof PlotPalette)[]).forEach((key) => {
    const a = from[key];
    const b = to[key];
    if (Array.isArray(a) && Array.isArray(b)) a.forEach((c, i) => map.set(c, b[i]));
    else if (typeof a === 'string' && typeof b === 'string' && key !== 'mode') map.set(a, b);
  });
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return map.get(v) ?? v;
    if (Array.isArray(v)) return v.map(walk);
    if (isPlain(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
};

/** Palette and layout helpers for the current theme */
export const usePlotTheme = () => {
  const { theme } = useTheme();
  return useMemo(() => {
    const palette = PLOT_PALETTES[theme];
    return { palette, mergeLayout: (layout?: Partial<Layout>) => mergeLayout(palette, layout) };
  }, [theme]);
};
