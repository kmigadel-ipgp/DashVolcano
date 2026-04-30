import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { RockTypeRadarSeries } from '../../types';

interface RockTypeRadarChartProps {
  series: RockTypeRadarSeries[];
  title?: string;
}

interface PreparedSeries extends RockTypeRadarSeries {
  percentages: Record<string, number>;
}

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map(char => `${char}${char}`).join('')
    : normalized;

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const prepareRockTypes = (
  series: RockTypeRadarSeries[]
): { categories: string[]; preparedSeries: PreparedSeries[] } => {
  const frequency = new Map<string, number>();

  series.forEach(entry => {
    Object.entries(entry.rockTypes).forEach(([rockType, count]) => {
      frequency.set(rockType, (frequency.get(rockType) || 0) + count);
    });
  });

  const sortedCategories = Array.from(frequency.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([rockType]) => rockType);

  const preparedSeries = series.map(entry => {
    const total = Math.max(entry.sampleCount, 1);

    const percentages = Object.fromEntries(
      sortedCategories.map(category => [category, ((entry.rockTypes[category] || 0) / total) * 100])
    );

    return {
      ...entry,
      percentages,
    };
  });

  return { categories: sortedCategories, preparedSeries };
};

export const RockTypeRadarChart: React.FC<RockTypeRadarChartProps> = React.memo(({
  series,
  title = 'Rock Type Distribution Radar',
}) => {
  const nonEmptySeries = useMemo(
    () => series.filter(entry => Object.keys(entry.rockTypes).length > 0 && entry.sampleCount > 0),
    [series]
  );

  const chartData = useMemo(() => {
    if (nonEmptySeries.length === 0) {
      return { categories: [], preparedSeries: [] as PreparedSeries[] };
    }
    return prepareRockTypes(nonEmptySeries);
  }, [nonEmptySeries]);

  if (chartData.preparedSeries.length === 0 || chartData.categories.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-600">
        No whole-rock rock type data available for the current filters.
      </div>
    );
  }

  const theta = [...chartData.categories, chartData.categories[0]];
  const traces = chartData.preparedSeries.map(entry => ({
    type: 'scatterpolar' as const,
    mode: 'lines+markers' as const,
    name: entry.label,
    theta,
    r: [...chartData.categories.map(category => entry.percentages[category] || 0), entry.percentages[chartData.categories[0]] || 0],
    line: {
      color: entry.color,
      width: 3,
    },
    marker: {
      color: entry.color,
      size: 8,
    },
    fill: 'toself' as const,
    fillcolor: hexToRgba(entry.color, 0.18),
    hovertemplate:
      `<b>${entry.label}</b><br>` +
      'Rock Type: %{theta}<br>' +
      'Percentage: %{r:.1f}%<br>' +
      '<extra></extra>',
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
        Showing <strong>Whole Rock (WR) samples only</strong>. Percentages are normalized within each compared dataset.
      </div>

      <Plot
        data={traces}
        layout={{
          title: {
            text: title,
            font: { size: 16 },
          },
          height: 560,
          margin: { l: 40, r: 40, t: 90, b: 90 },
          showlegend: true,
          legend: {
            orientation: 'h' as const,
            yanchor: 'top',
            y: -0.12,
            xanchor: 'center',
            x: 0.5,
          },
          polar: {
            radialaxis: {
              visible: true,
              ticksuffix: '%',
              range: [0, 100],
              gridcolor: '#d1d5db',
              tickfont: { size: 10 },
            },
            angularaxis: {
              tickfont: { size: 11 },
              direction: 'clockwise' as const,
            },
            bgcolor: 'white',
          },
          paper_bgcolor: 'white',
          hovermode: 'closest',
        }}
        config={{
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['lasso2d', 'select2d', 'pan2d'],
          responsive: true,
          toImageButtonOptions: {
            format: 'png',
            filename: 'rock_type_radar',
            height: 900,
            width: 1200,
            scale: 2,
          },
        }}
        style={{ width: '100%', height: '100%' }}
      />

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-2 px-3 font-semibold text-gray-700">Rock Type</th>
              {chartData.preparedSeries.map(entry => (
                <th key={entry.label} className="text-right py-2 px-3 font-semibold text-gray-700">
                  {entry.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartData.categories.map((category, index) => (
              <tr key={category} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-2 px-3 font-medium text-gray-900">{category}</td>
                {chartData.preparedSeries.map(entry => {
                  const count = entry.rockTypes[category] || 0;
                  return (
                    <td key={entry.label} className="text-right py-2 px-3 text-gray-700">
                      <span className="font-semibold">{(entry.percentages[category] || 0).toFixed(1)}%</span>
                      <span className="text-gray-500 text-xs ml-1">({count})</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default RockTypeRadarChart;