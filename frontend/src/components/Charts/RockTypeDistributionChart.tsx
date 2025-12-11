import React from 'react';
import Plot from 'react-plotly.js';

interface RockTypeData {
  volcanoName: string;
  rockTypes: Record<string, number>;
  color: string;
}

interface RockTypeDistributionChartProps {
  volcanoes: RockTypeData[];
}

/**
 * RockTypeDistributionChart Component
 * 
 * Displays a grouped horizontal bar chart comparing rock type distributions
 * across multiple volcanoes as percentages.
 * 
 * Features:
 * - Grouped bars for easy comparison
 * - Percentage-based for normalization
 * - Sorted by frequency (most common first)
 * - Interactive hover tooltips with counts and percentages
 * - Color-coded by volcano
 */
export const RockTypeDistributionChart: React.FC<RockTypeDistributionChartProps> = React.memo(({ volcanoes }) => {
  if (volcanoes.length === 0 || volcanoes.every(v => Object.keys(v.rockTypes).length === 0)) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No rock type data available for selected volcanoes</p>
      </div>
    );
  }

  // Collect all unique rock types across all volcanoes
  const allRockTypes = new Set<string>();
  volcanoes.forEach(v => {
    Object.keys(v.rockTypes).forEach(rt => allRockTypes.add(rt));
  });

  // Calculate total samples and percentages for each volcano
  const volcanoStats = volcanoes.map(v => {
    const total = Object.values(v.rockTypes).reduce((sum, count) => sum + count, 0);
    const percentages = Object.fromEntries(
      Object.entries(v.rockTypes).map(([rockType, count]) => [
        rockType,
        { count, percentage: (count / total) * 100 }
      ])
    );
    return { ...v, total, percentages };
  });

  // Sort rock types by overall frequency (sum across all volcanoes)
  const rockTypeFrequency = new Map<string, number>();
  volcanoes.forEach(v => {
    Object.entries(v.rockTypes).forEach(([rockType, count]) => {
      rockTypeFrequency.set(rockType, (rockTypeFrequency.get(rockType) || 0) + count);
    });
  });
  
  const sortedRockTypes = Array.from(allRockTypes).sort((a, b) => {
    return (rockTypeFrequency.get(b) || 0) - (rockTypeFrequency.get(a) || 0);
  });

  // Create traces (one per volcano)
  const traces = volcanoStats.map(volcano => ({
    type: 'bar' as const,
    name: volcano.volcanoName,
    y: sortedRockTypes,
    x: sortedRockTypes.map(rt => volcano.percentages[rt]?.percentage || 0),
    orientation: 'h' as const,
    marker: {
      color: volcano.color,
      opacity: 0.8
    },
    text: sortedRockTypes.map(rt => {
      const stats = volcano.percentages[rt];
      return stats ? `${stats.percentage.toFixed(1)}% (n=${stats.count})` : '';
    }),
    textposition: 'none' as const,
    hovertemplate:
      `<b>${volcano.volcanoName}</b><br>` +
      'Rock Type: %{y}<br>' +
      'Percentage: %{x:.1f}%<br>' +
      'Count: %{text}<br>' +
      '<extra></extra>',
    customdata: sortedRockTypes.map(rt => volcano.percentages[rt]?.count || 0),
    hovertext: sortedRockTypes.map(rt => {
      const stats = volcano.percentages[rt];
      return stats ? `${stats.count} samples` : '0 samples';
    })
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <Plot
        data={traces}
        layout={{
          title: { text: 'Rock Type Distribution Comparison', font: { size: 16 } },
          barmode: 'group',
          xaxis: {
            title: { text: 'Percentage (%)' },
            range: [0, Math.max(...traces.flatMap(t => t.x)) * 1.1 || 100],
            showgrid: true,
            gridcolor: '#e5e7eb'
          },
          yaxis: {
            title: { text: '' },
            automargin: true,
            tickfont: { size: 11 }
          },
          height: Math.max(350, sortedRockTypes.length * 40 + 100),
          margin: { l: 120, r: 20, t: 60, b: 60 },
          showlegend: true,
          legend: {
            orientation: 'h' as const,
            yanchor: 'bottom',
            y: 1.02,
            xanchor: 'right',
            x: 1
          },
          hovermode: 'closest',
          paper_bgcolor: 'white',
          plot_bgcolor: 'white'
        }}
        config={{
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
          toImageButtonOptions: {
            format: 'png',
            filename: 'rock_type_distribution',
            height: 800,
            width: 1200,
            scale: 2
          },
          responsive: true
        }}
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Summary Statistics Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-2 px-3 font-semibold text-gray-700">Rock Type</th>
              {volcanoStats.map(v => (
                <th key={v.volcanoName} className="text-right py-2 px-3 font-semibold text-gray-700">
                  {v.volcanoName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRockTypes.map((rockType, idx) => (
              <tr key={rockType} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-2 px-3 font-medium text-gray-900">{rockType}</td>
                {volcanoStats.map(v => {
                  const stats = v.percentages[rockType];
                  return (
                    <td key={v.volcanoName} className="text-right py-2 px-3 text-gray-700">
                      {stats ? (
                        <>
                          <span className="font-semibold">{stats.percentage.toFixed(1)}%</span>
                          <span className="text-gray-500 text-xs ml-1">({stats.count})</span>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
              <td className="py-2 px-3 text-gray-900">Total Samples</td>
              {volcanoStats.map(v => (
                <td key={v.volcanoName} className="text-right py-2 px-3 text-gray-900">
                  {v.total}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default RockTypeDistributionChart;
