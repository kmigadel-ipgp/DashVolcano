import React from 'react';
import Plot from 'react-plotly.js';

interface VEIBarChartProps {
  /** VEI counts object with VEI levels as keys */
  veiCounts: Record<string, number>;
  /** Volcano name for chart title */
  volcanoName: string;
  /** Color for the bars */
  color: string;
}

/**
 * VEI (Volcanic Explosivity Index) Bar Chart Component
 * 
 * Displays a bar chart showing the distribution of eruptions by VEI level (0-8 + unknown).
 * VEI is a logarithmic scale measuring the explosiveness of volcanic eruptions.
 */
export const VEIBarChart: React.FC<VEIBarChartProps> = ({
  veiCounts,
  volcanoName,
  color,
}) => {
  // VEI levels in order (0-8 + unknown)
  const veiLevels = ['0', '1', '2', '3', '4', '5', '6', '7', '8', 'unknown'];
  
  // Normalize VEI counts keys (convert '1.0' to '1', etc.)
  const normalizedCounts: Record<string, number> = {};
  for (const [key, value] of Object.entries(veiCounts)) {
    if (key === 'unknown') {
      normalizedCounts['unknown'] = value;
    } else {
      // Convert '1.0' to '1', '2.0' to '2', etc.
      const normalized = String(Math.floor(Number(key)));
      normalizedCounts[normalized] = (normalizedCounts[normalized] || 0) + value;
    }
  }
  
  // Prepare data for Plotly
  const xValues: string[] = [];
  const yValues: number[] = [];
  const hoverText: string[] = [];
  
  const totalEruptions = Object.values(normalizedCounts).reduce((sum, count) => sum + count, 0);
  
  for (const level of veiLevels) {
    const count = normalizedCounts[level] || 0;
    xValues.push(level === 'unknown' ? 'Unknown' : `VEI ${level}`);
    yValues.push(count);
    
    const percentage = totalEruptions > 0 ? ((count / totalEruptions) * 100).toFixed(1) : '0.0';
    hoverText.push(
      `VEI ${level === 'unknown' ? 'Unknown' : level}<br>` +
      `Eruptions: ${count}<br>` +
      `Percentage: ${percentage}%`
    );
  }
  
  // Check if there's any data
  const hasData = yValues.some(v => v > 0);
  
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-center">
          <p className="text-lg font-semibold">No eruption data available</p>
          <p className="text-sm mt-2">This volcano has no recorded eruptions</p>
        </div>
      </div>
    );
  }
  
  const plotlyData: Plotly.Data[] = [
    {
      type: 'bar',
      x: xValues,
      y: yValues,
      marker: {
        color: color,
        opacity: 0.8,
      },
      text: hoverText,
      hoverinfo: 'text',
      name: volcanoName,
    },
  ];
  
  return (
    <div className="w-full h-full">
      <Plot
        data={plotlyData}
        layout={{
          title: {
            text: `VEI Distribution - ${volcanoName}`,
            font: { size: 14 },
          },
          xaxis: {
            title: { text: 'VEI Level' },
            gridcolor: 'rgba(200, 200, 200, 0.3)',
          },
          yaxis: {
            title: { text: 'Number of Eruptions' },
            gridcolor: 'rgba(200, 200, 200, 0.3)',
          },
          autosize: true,
          hovermode: 'closest',
          showlegend: false,
          margin: { l: 60, r: 40, t: 60, b: 60 },
          plot_bgcolor: 'rgba(250, 250, 250, 1)',
          paper_bgcolor: 'white',
          bargap: 0.2,
        }}
        config={{
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['lasso2d', 'select2d'],
          toImageButtonOptions: {
            format: 'png',
            filename: `vei_distribution_${volcanoName.replaceAll(' ', '_')}`,
            height: 600,
            width: 800,
          },
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
