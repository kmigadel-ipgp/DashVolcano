import React from 'react';
import { ThemedPlot } from './ThemedPlot';
import { useIsPhone, chartTitle } from '../../hooks/useIsPhone';
import { usePlotTheme } from '../../hooks/usePlotTheme';

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
  const isPhone = useIsPhone();
  const { palette } = usePlotTheme();
  if (!data || data.length === 0) {
    return (
      <div className="note flex items-center justify-center h-96">
        <p>No sample timeline data available</p>
      </div>
    );
  }

  const plotData: Plotly.Data[] = [{
    x: data.map(d => d.year),
    y: data.map(d => d.sample_count),
    type: 'bar',
    name: 'Samples',
    marker: {
      color: palette.series[0], // single-volcano series colour
      line: {
        color: palette.series[0],
        width: 1
      }
    },
    hovertemplate:
      '<b>Year:</b> %{x}<br>' +
      '<b>Samples:</b> %{y}<br>' +
      '<extra></extra>'
  }];

  return (
    <div className="h-full">
      <ThemedPlot
        data={plotData}
        layout={{
          title: {
            ...chartTitle(`Sample Collection Timeline - ${volcanoName}`, isPhone),
          },
          xaxis: {
            title: { text: 'Year (based on eruption date)' },
            type: 'linear',
            showgrid: true,
          },
          yaxis: {
            title: { text: 'Number of Samples' },
            showgrid: true,
          },
          height: 400,
          margin: { l: 60, r: 40, t: 60, b: 80 },
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
