import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import type { Sample } from '../../types';

interface TASPlotProps {
  /** Array of samples to plot */
  samples: Sample[];
  /** Whether to show loading state */
  loading?: boolean;
}

interface TASPolygon {
  name: string;
  coordinates: number[][];
}

interface TASData {
  polygons: TASPolygon[];
  alkali_line: {
    name: string;
    coordinates: number[][];
  };
  axes: {
    x: { label: string; range: [number, number] };
    y: { label: string; range: [number, number] };
  };
}

/**
 * TAS (Total Alkali-Silica) Plot Component
 * 
 * Displays a TAS classification diagram with:
 * - Classification polygons (basalt, andesite, rhyolite, etc.)
 * - Alkali/Subalkalic dividing line
 * - Sample points colored by rock type
 */
export const TASPlot: React.FC<TASPlotProps> = ({
  samples,
  loading = false,
}) => {
  const [tasData, setTasData] = useState<TASData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch TAS polygon data
  useEffect(() => {
    const fetchTASData = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/analytics/tas-polygons');
        if (!response.ok) throw new Error('Failed to fetch TAS data');
        const data = await response.json();
        setTasData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    fetchTASData();
  }, []);

  // Process sample data for plotting
  const prepareSampleData = () => {
    return samples
      .filter(s => s.oxides?.['SIO2(WT%)'] && s.oxides?.['NA2O(WT%)'] && s.oxides?.['K2O(WT%)'])
      .map(s => ({
        sio2: s.oxides!['SIO2(WT%)']!,
        alkali: s.oxides!['NA2O(WT%)']! + s.oxides!['K2O(WT%)']!,
        material: s.material || 'Unknown',
        rock_type: s.rock_type || 'Unknown',
        sample_code: s.sample_code || s.sample_id,
        sample_id: s.sample_id,
      }));
  };

  const sampleData = prepareSampleData();

  // Material shapes mapping
  const materialShapes: Record<string, string> = {
    'WR': 'circle',
    'GL': 'square',
    'MIN': 'diamond',
    'INC': 'triangle-up',
    'Unknown': 'x',
  };

  // Get unique rock types and assign consistent colors
  const uniqueRockTypes = Array.from(new Set(sampleData.map(s => s.rock_type)));
  const rockTypeColors: Record<string, string> = {};
  const colorPalette = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
    '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
    '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5',
  ];
  for (let index = 0; index < uniqueRockTypes.length; index++) {
    const rockType = uniqueRockTypes[index];
    rockTypeColors[rockType] = colorPalette[index % colorPalette.length];
  }

  // Group samples by rock_type (for colors) and material (for shapes)
  const samplesByRockTypeAndMaterial = sampleData.reduce((acc, sample) => {
    const key = `${sample.rock_type}|${sample.material}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(sample);
    return acc;
  }, {} as Record<string, typeof sampleData>);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">Error loading TAS diagram: {error}</div>
      </div>
    );
  }

  if (loading || !tasData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading TAS diagram...</div>
      </div>
    );
  }

  if (sampleData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No samples with oxide data to plot</div>
      </div>
    );
  }

  // Prepare Plotly data
  const plotlyData: Plotly.Data[] = [];

  // Add classification polygons
  for (const polygon of tasData.polygons) {
    const x = polygon.coordinates.map(coord => coord[0]);
    const y = polygon.coordinates.map(coord => coord[1]);
    
    plotlyData.push({
      type: 'scatter',
      mode: 'lines',
      x,
      y,
      fill: 'toself',
      fillcolor: `rgba(200, 200, 200, 0.1)`,
      line: { color: 'rgba(150, 150, 150, 0.5)', width: 1 },
      hoverinfo: 'text',
      text: polygon.name,
      name: polygon.name,
      showlegend: false,
    });
  }

  // Add alkali/subalkalic line
  const alkaliX = tasData.alkali_line.coordinates.map(coord => coord[0]);
  const alkaliY = tasData.alkali_line.coordinates.map(coord => coord[1]);
  plotlyData.push({
    type: 'scatter',
    mode: 'lines',
    x: alkaliX,
    y: alkaliY,
    line: { color: 'black', width: 2, dash: 'dash' },
    name: 'Alkali/Subalkalic',
    showlegend: true,
    hoverinfo: 'name',
  });

  // Track which materials have been added to legend
  const materialLegendShown = new Set<string>();

  // Add sample points grouped by rock_type (colors) and material (shapes)
  for (const [key, samples] of Object.entries(samplesByRockTypeAndMaterial)) {
    const [rockType, material] = key.split('|');
    const shape = materialShapes[material] || materialShapes['Unknown'];
    const color = rockTypeColors[rockType] || '#999999';
    const showLegend = !materialLegendShown.has(material);
    
    if (showLegend) {
      materialLegendShown.add(material);
    }
    
    plotlyData.push({
      type: 'scatter',
      mode: 'markers',
      x: samples.map(s => s.sio2),
      y: samples.map(s => s.alkali),
      name: material,
      legendgroup: material,
      showlegend: showLegend,
      marker: {
        size: 8,
        opacity: 0.7,
        symbol: shape,
        color: color,
      },
      text: samples.map(s => 
        `${s.sample_code}<br>`+
        `Rock Type: ${s.rock_type}<br>` +
        `Material: ${s.material}<br>` +
        `SiO2: ${s.sio2.toFixed(2)}%<br>` +
        `Alkali: ${s.alkali.toFixed(2)}%`
      ),
      hoverinfo: 'text',
    });
  }

  return (
    <div className="w-full h-full">
      <Plot
        data={plotlyData}
        layout={{
          title: {
            text: 'TAS (Total Alkali-Silica) Diagram',
            font: { size: 16 },
          },
          xaxis: {
            title: { text: 'SiO₂ (wt%)' },
            range: tasData.axes.x.range,
            gridcolor: 'rgba(200, 200, 200, 0.3)',
          },
          yaxis: {
            title: { text: 'Na₂O + K₂O (wt%)' },
            range: tasData.axes.y.range,
            gridcolor: 'rgba(200, 200, 200, 0.3)',
          },
          autosize: true,
          hovermode: 'closest',
          showlegend: true,
          legend: {
            x: 1.05,
            y: 1,
            orientation: 'v',
          },
          margin: { l: 60, r: 150, t: 60, b: 60 },
          plot_bgcolor: 'rgba(250, 250, 250, 1)',
          paper_bgcolor: 'white',
        }}
        config={{
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['lasso2d', 'select2d'],
          toImageButtonOptions: {
            format: 'png',
            filename: 'tas_diagram',
            height: 800,
            width: 1000,
          },
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
