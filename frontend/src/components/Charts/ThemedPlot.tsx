import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { PlotParams } from 'react-plotly.js';
import type { Config, ModeBarButtonAny, PlotlyHTMLElement } from 'plotly.js';
import Plotly from 'plotly.js/dist/plotly';
import { usePlotTheme, PLOT_PALETTES, mergeLayout, swapPalette } from '../../hooks/usePlotTheme';

/**
 * Exports always use the light palette (white-background figures for
 * publications), whatever theme is on screen.
 */
const downloadLightPng = async (gd: PlotlyHTMLElement, options: Config['toImageButtonOptions'] = {}) => {
  const graph = gd as PlotlyHTMLElement & { data: Plotly.Data[]; layout: Partial<Plotly.Layout> };
  const light = PLOT_PALETTES.light;
  const isDark = graph.layout.paper_bgcolor === PLOT_PALETTES.dark.surface;
  const data = isDark ? swapPalette(graph.data, PLOT_PALETTES.dark, light) : graph.data;
  const layout = mergeLayout(light, isDark ? swapPalette(graph.layout, PLOT_PALETTES.dark, light) : graph.layout);
  const url = await Plotly.toImage(
    { data, layout: { ...layout, paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff' } },
    { format: 'png', width: options.width ?? gd.clientWidth, height: options.height ?? gd.clientHeight, scale: options.scale ?? 1 },
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `${options.filename ?? 'dashvolcano_chart'}.png`;
  link.click();
};

/**
 * Plotly chart that follows the site theme, as on VolcashDB: the chart sits on
 * a tinted panel whose colour is also the plot background, and its text,
 * grids, legend, hover labels and toolbar use the theme colours.
 */
export const ThemedPlot = ({ layout, config, ...props }: PlotParams) => {
  const { mergeLayout: themed } = usePlotTheme();
  const themedLayout = useMemo(() => themed(layout), [themed, layout]);
  const themedConfig = useMemo<Partial<Config>>(() => {
    const base: Partial<Config> = { displaylogo: false, responsive: true, ...config };
    if (base.displayModeBar === false) return base;
    const exportButton: ModeBarButtonAny = {
      name: 'downloadPng',
      title: 'Download plot as PNG',
      icon: Plotly.Icons.camera,
      click: (gd: PlotlyHTMLElement) => { void downloadLightPng(gd, config?.toImageButtonOptions); },
    };
    return {
      ...base,
      modeBarButtonsToRemove: [...(base.modeBarButtonsToRemove ?? []), 'toImage'],
      modeBarButtonsToAdd: [exportButton],
    };
  }, [config]);

  return (
    <div className="plot-panel">
      <Plot {...props} layout={themedLayout} config={themedConfig} />
    </div>
  );
};
