import React from 'react';
import Plot from 'react-plotly.js';

interface SampleTimelineData {
  year: number;
  sample_count: number;
  rock_types: string[];
}

interface SampleTimelinePlotProps {
  data: SampleTimelineData[];
  volcanoName: string;
}

/**
 * Sample Timeline Plot - Bar chart showing sample counts by year
 * Note: Uses eruption_date.year as proxy for collection date
 */
export const SampleTimelinePlot: React.FC<SampleTimelinePlotProps> = ({
  data,
  volcanoName
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500">No sample timeline data available</p>
      </div>
    );
  }

  const plotData: Plotly.Data[] = [{
    x: data.map(d => d.year),
    y: data.map(d => d.sample_count),
    type: 'bar',
    name: 'Samples',
    marker: {
      color: '#DC2626', // volcano-600
      line: {
        color: '#991B1B', // volcano-800
        width: 1
      }
    },
    hovertemplate:
      '<b>Year:</b> %{x}<br>' +
      '<b>Samples:</b> %{y}<br>' +
      '<extra></extra>'
  }];

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <Plot
        data={plotData}
        layout={{
          title: {
            text: `Sample Collection Timeline - ${volcanoName}`
          },
          xaxis: {
            title: { text: 'Year (based on eruption date)' },
            type: 'linear',
            showgrid: true,
            gridcolor: '#e5e7eb'
          },
          yaxis: {
            title: { text: 'Number of Samples' },
            showgrid: true,
            gridcolor: '#e5e7eb'
          },
          height: 400,
          margin: { l: 60, r: 40, t: 60, b: 80 },
          paper_bgcolor: 'white',
          plot_bgcolor: 'white',
          hovermode: 'closest',
          showlegend: false
        }}
        config={{
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['lasso2d', 'select2d'],
          toImageButtonOptions: {
            format: 'png',
            filename: `${volcanoName.replace(/\\s+/g, '_')}_sample_timeline`,
            height: 600,
            width: 1000
          }
        }}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
      />
      <div className="px-6 pb-4">
        <p className="text-xs text-gray-500 italic">
          * Timeline based on eruption dates associated with samples. 
          Actual sample collection dates may vary.
        </p>
      </div>
    </div>
  );
};
