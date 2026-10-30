import React from 'react';
import { ThemedPlot } from './ThemedPlot';
import type { Eruption } from '../../types';
import { dateInfoToYear, groupByPeriod, formatDecade, formatCentury } from '../../utils/dateUtils';
import { useIsPhone, chartTitle } from '../../hooks/useIsPhone';

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
  const isPhone = useIsPhone();
  if (eruptions.length === 0) {
    return (
      <div className="note text-center py-8">
        <p>No eruptions found</p>
      </div>
    );
  }

  // Extract years from eruptions
  const years = eruptions
    .map((eruption) => dateInfoToYear(eruption.start_date))
    .filter((year): year is number => year !== null);

  if (years.length === 0) {
    return (
      <div className="note text-center py-8">
        <p>No eruptions with known dates</p>
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
    // Counts are read on the y axis and in the hover label (in-bar text was too small to read)
    textposition: 'none',
    hoverinfo: 'text',
    hovertext: yCounts.map((count, i) => `<b>${xLabels[i]}</b><br>${count} eruption${count === 1 ? '' : 's'}`),
  };

  const layout: Partial<Plotly.Layout> = {
    title: {
      ...chartTitle(`${volcanoName} - Eruption Frequency (${period === 'decade' ? 'by Decade' : 'by Century'})`, isPhone),
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
    <div className="h-full">
      <ThemedPlot data={[trace]} layout={layout} config={config} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default EruptionFrequencyChart;
