import React from 'react';
import Plot from 'react-plotly.js';
import type { Eruption } from '../../types';
import { dateInfoToYear, formatDateInfo } from '../../utils/dateUtils';

interface EruptionTimelinePlotProps {
  eruptions: Eruption[];
  volcanoName: string;
}

/**
 * Timeline scatter plot showing eruption dates vs VEI
 * X-axis: Year (handles BCE dates)
 * Y-axis: VEI (0-8)
 * Color: VEI level (yellow → orange → red gradient)
 */
const EruptionTimelinePlot: React.FC<EruptionTimelinePlotProps> = ({
  eruptions,
  volcanoName,
}) => {
  if (eruptions.length === 0) {
    return (
      <div className="bg-white">
        <p className="text-gray-500 text-center py-8">No eruptions found</p>
      </div>
    );
  }

  // Extract data from eruptions
  const plotData = eruptions
    .map((eruption) => {
      const year = dateInfoToYear(eruption.start_date);
      if (year === null) return null;

      return {
        year,
        vei: eruption.vei ?? -1,
        startDate: formatDateInfo(eruption.start_date, true),
        endDate: eruption.end_date ? formatDateInfo(eruption.end_date, true) : null,
        category: eruption.eruption_category || 'Unknown',
        areaOfActivity: eruption.area_of_activity || 'Unknown',
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  if (plotData.length === 0) {
    return (
      <div className="bg-white">
        <p className="text-gray-500 text-center py-8">No eruptions with known dates</p>
      </div>
    );
  }

  // VEI color mapping
  const veiColors: Record<number, string> = {
    '-1': '#94a3b8',
    '0': '#fef3c7',
    '1': '#fde68a',
    '2': '#fcd34d',
    '3': '#fbbf24',
    '4': '#f59e0b',
    '5': '#f97316',
    '6': '#ef4444',
    '7': '#dc2626',
    '8': '#991b1b',
  };

  // Group by VEI
  const veiGroups: Record<number, typeof plotData> = {};
  for (const d of plotData) {
    const vei = d.vei;
    if (!veiGroups[vei]) {
      veiGroups[vei] = [];
    }
    veiGroups[vei].push(d);
  }

  // Create traces
  const traces = Object.entries(veiGroups)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([veiStr, data]) => {
      const vei = Number(veiStr);
      const veiLabel = vei === -1 ? 'Unknown' : `VEI ${vei}`;

      return {
        x: data.map((d) => d.year),
        y: data.map((d) => (d.vei === -1 ? -0.5 : d.vei)),
        mode: 'markers',
        type: 'scatter',
        name: veiLabel,
        marker: {
          size: 8,
          color: veiColors[vei] || '#94a3b8',
          line: { width: 1, color: '#1f2937' },
        },
        text: data.map(
          (d) =>
            `<b>${d.startDate}</b><br>` +
            `VEI: ${d.vei === -1 ? 'Unknown' : d.vei}<br>` +
            `Category: ${d.category}<br>` +
            `Area: ${d.areaOfActivity}` +
            (d.endDate ? `<br>End: ${d.endDate}` : '')
        ),
        hoverinfo: 'text',
      } as Plotly.Data;
    });

  const layout: Partial<Plotly.Layout> = {
    title: { text: `${volcanoName} - Eruption Timeline` },
    xaxis: {
      title: { text: 'Year' },
      showgrid: true,
      zeroline: true,
      zerolinewidth: 2,
      zerolinecolor: '#374151',
    },
    yaxis: {
      title: { text: 'VEI (Volcanic Explosivity Index)' },
      range: [-1, 8.5],
      showgrid: true,
      dtick: 1,
      tickvals: [-0.5, 0, 1, 2, 3, 4, 5, 6, 7, 8],
      ticktext: ['Unknown', '0', '1', '2', '3', '4', '5', '6', '7', '8'],
    },
    hovermode: 'closest',
    showlegend: true,
    legend: { x: 1.05, y: 1, xanchor: 'left', yanchor: 'top' },
    margin: { l: 60, r: 120, t: 60, b: 60 },
    autosize: true,
  };

  const config: Partial<Plotly.Config> = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    displaylogo: false,
  };

  return (
    <div className="bg-white">
      <Plot data={traces} layout={layout} config={config} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default EruptionTimelinePlot;
