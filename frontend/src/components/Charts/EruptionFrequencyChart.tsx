import React from 'react';
import Plot from 'react-plotly.js';
import type { Eruption } from '../../types';
import { dateInfoToYear, groupByPeriod, formatDecade, formatCentury } from '../../utils/dateUtils';

interface EruptionFrequencyChartProps {
  eruptions: Eruption[];
  volcanoName: string;
  period: 'decade' | 'century';
}

/**
 * Bar chart showing eruption frequency over time
 * Groups eruptions by decade or century
 */
const EruptionFrequencyChart: React.FC<EruptionFrequencyChartProps> = ({
  eruptions,
  volcanoName,
  period,
}) => {
  if (eruptions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <p className="text-gray-500 text-center py-8">No eruptions found</p>
      </div>
    );
  }

  // Extract years from eruptions
  const years = eruptions
    .map((eruption) => dateInfoToYear(eruption.start_date))
    .filter((year): year is number => year !== null);

  if (years.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <p className="text-gray-500 text-center py-8">No eruptions with known dates</p>
      </div>
    );
  }

  // Group by period
  const grouped = groupByPeriod(years, period);

  // Sort periods chronologically
  const sortedPeriods = Array.from(grouped.keys()).sort((a, b) => a - b);

  // Prepare data for plotting
  const xLabels = sortedPeriods.map((p) => (period === 'decade' ? formatDecade(p) : formatCentury(p)));
  const yCounts = sortedPeriods.map((p) => grouped.get(p) || 0);

  // Find most active period
  const maxCount = Math.max(...yCounts);
  const barColors = yCounts.map((count) => (count === maxCount ? '#ef4444' : '#3b82f6'));

  const trace: Plotly.Data = {
    x: xLabels,
    y: yCounts,
    type: 'bar',
    marker: {
      color: barColors,
      line: { width: 1, color: '#1f2937' },
    },
    text: yCounts.map((count) => `${count} eruption${count === 1 ? '' : 's'}`),
    hoverinfo: 'text',
    hovertext: yCounts.map((count, i) => `<b>${xLabels[i]}</b><br>${count} eruption${count === 1 ? '' : 's'}`),
  };

  const layout: Partial<Plotly.Layout> = {
    title: {
      text: `${volcanoName} - Eruption Frequency (${period === 'decade' ? 'by Decade' : 'by Century'})`,
    },
    xaxis: {
      title: { text: period === 'decade' ? 'Decade' : 'Century' },
      tickangle: -45,
      showgrid: false,
    },
    yaxis: {
      title: { text: 'Number of Eruptions' },
      showgrid: true,
      dtick: 1,
    },
    hovermode: 'closest',
    showlegend: false,
    margin: { l: 60, r: 40, t: 60, b: 120 },
    autosize: true,
  };

  const config: Partial<Plotly.Config> = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    displaylogo: false,
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <Plot data={[trace]} layout={layout} config={config} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default EruptionFrequencyChart;
