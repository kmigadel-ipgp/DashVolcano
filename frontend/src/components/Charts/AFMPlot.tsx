import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import type { Sample } from '../../types';
import { fetchAFMBoundary } from '../../api/analytics';
import { getRockTypeColor } from '../../utils/colors';
import { normalizeConfidence, getConfidenceLabel } from '../../utils/confidence';

interface AFMPlotProps {
  /** Array of samples to plot */
  samples: Sample[];
  /** Whether to show loading state */
  loading?: boolean;
}

/**
 * AFM (Alkali-FeO-MgO) Plot Component - Ternary Diagram
 * 
 * Displays a ternary (triangle) diagram with:
 * - Three vertices: A (Na₂O+K₂O), F (FeOT), M (MgO)
 * - Tholeiitic vs Calc-alkaline series boundary
 * - Sample points colored by rock type
 * 
 * Ternary coordinates are converted to Cartesian (x, y) for plotting:
 * - x = 0.5 * (2*M + F) / (A + F + M)
 * - y = (√3/2) * A / (A + F + M)
 */
export const AFMPlot: React.FC<AFMPlotProps> = React.memo(({
  samples,
  loading = false,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [boundaryData, setBoundaryData] = useState<Array<{a: number; f: number; m: number}>>([]);

  // Fetch AFM boundary from backend
  useEffect(() => {
    const loadBoundary = async () => {
      try {
        const data = await fetchAFMBoundary();
        // Convert backend format {A, F, M} to {a, f, m}
        const boundary = data.boundary.coordinates.map(point => ({
          a: point.F, // Backend has F for alkali (Na2O+K2O)
          f: point.A, // Backend has A for FeOT
          m: point.M, // Backend has M for MgO
        }));
        setBoundaryData(boundary);
      } catch (err) {
        console.error('Failed to load AFM boundary:', err);
        setError('Failed to load AFM boundary');
      }
    };
    loadBoundary();
  }, []);

  // Convert ternary coordinates (A, F, M) to Cartesian (x, y)
  const ternaryToCartesian = (a: number, f: number, m: number) => {
    const total = a + f + m;
    if (total === 0) return { x: 0, y: 0 };
    
    // Normalize to fractions
    const aNorm = a / total;
    const fNorm = f / total;
    const mNorm = m / total;
    
    // Convert to Cartesian coordinates
    // Bottom-left vertex (A - Alkali) at (0, 0)
    // Bottom-right vertex (M - MgO) at (1, 0)
    // Top vertex (F - FeOT) at (0.5, √3/2)
    const x = aNorm * 0 + mNorm * 1 + fNorm * 0.5;
    const y = aNorm * 0 + mNorm * 0 + fNorm * (Math.sqrt(3) / 2);
    
    return { x, y };
  };

  // Process sample data for AFM plotting
  const prepareSampleData = () => {
    return samples
      .filter(s => 
        s.oxides?.['FEOT(WT%)'] !== undefined && 
        s.oxides?.['MGO(WT%)'] !== undefined && 
        s.oxides?.['NA2O(WT%)'] !== undefined && 
        s.oxides?.['K2O(WT%)'] !== undefined
      )
      .map(s => {
        const feot = s.oxides!['FEOT(WT%)']!;
        const mgo = s.oxides!['MGO(WT%)']!;
        const alkali = s.oxides!['NA2O(WT%)']! + s.oxides!['K2O(WT%)']!;
        const confidence = normalizeConfidence(s.matching_metadata?.confidence_level);
        const confidenceLabel = getConfidenceLabel(confidence);
                
        // Convert to Cartesian coordinates for plotting
        const { x, y } = ternaryToCartesian(alkali, feot, mgo);
        
        return {
          x,
          y,
          feot,
          mgo,
          alkali,
          material: s.material || 'Unknown',
          rock_type: s.rock_type || 'Unknown',
          sample_code: s.sample_code || s.sample_id,
          sample_id: s.sample_id,
          confidence: confidence,
          confidenceLabel: confidenceLabel,
        };
      });
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

  // Get unique rock types and assign consistent colors using shared color utility
  const uniqueRockTypes = Array.from(new Set(sampleData.map(s => s.rock_type)));
  const rockTypeColors: Record<string, string> = {};
  
  for (const rockType of uniqueRockTypes) {
    rockTypeColors[rockType] = getRockTypeColor(rockType);
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
        <div className="text-red-600">Error loading AFM diagram: {error}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading AFM diagram...</div>
      </div>
    );
  }

  if (sampleData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No samples with complete oxide data to plot</div>
      </div>
    );
  }

  // Prepare Plotly data
  const plotlyData: Plotly.Data[] = [];

  // Draw triangle edges
  const triangleX = [0, 1, 0.5, 0];
  const triangleY = [0, 0, Math.sqrt(3) / 2, 0];
  
  plotlyData.push({
    type: 'scatter',
    mode: 'lines',
    x: triangleX,
    y: triangleY,
    line: { color: 'black' },
    name: 'Triangle',
    hoverinfo: 'skip',
    showlegend: false,
  });

  // Add grid lines and percentage labels
  // Grid lines parallel to each edge at 20%, 40%, 60%, 80%
  const gridPercentages = [20, 40, 60, 80];
  
  for (const pct of gridPercentages) {
    // Lines parallel to bottom edge (constant FeOT)
    // From (Alkali=100-pct, FeOT=pct, MgO=0) to (Alkali=0, FeOT=pct, MgO=100-pct)
    const p1 = ternaryToCartesian(100 - pct, pct, 0);
    const p2 = ternaryToCartesian(0, pct, 100 - pct);
    plotlyData.push({
      type: 'scatter',
      mode: 'lines',
      x: [p1.x, p2.x],
      y: [p1.y, p2.y],
      line: { color: 'lightgray', width: 1, dash: 'dot' },
      hoverinfo: 'skip',
      showlegend: false,
    });
    
    // Lines parallel to left edge (constant MgO)
    // From (Alkali=100-pct, FeOT=0, MgO=pct) to (Alkali=0, FeOT=100-pct, MgO=pct)
    const p3 = ternaryToCartesian(100 - pct, 0, pct);
    const p4 = ternaryToCartesian(0, 100 - pct, pct);
    plotlyData.push({
      type: 'scatter',
      mode: 'lines',
      x: [p3.x, p4.x],
      y: [p3.y, p4.y],
      line: { color: 'lightgray', width: 1, dash: 'dot' },
      hoverinfo: 'skip',
      showlegend: false,
    });
    
    // Lines parallel to right edge (constant Alkali)
    // From (Alkali=pct, FeOT=100-pct, MgO=0) to (Alkali=pct, FeOT=0, MgO=100-pct)
    const p5 = ternaryToCartesian(pct, 100 - pct, 0);
    const p6 = ternaryToCartesian(pct, 0, 100 - pct);
    plotlyData.push({
      type: 'scatter',
      mode: 'lines',
      x: [p5.x, p6.x],
      y: [p5.y, p6.y],
      line: { color: 'lightgray', width: 1, dash: 'dot' },
      hoverinfo: 'skip',
      showlegend: false,
    });
  }

  // Add tholeiitic/calc-alkaline boundary (Irvine & Baragar, 1971)
  // Boundary data loaded from backend API
  const boundaryCoords = boundaryData.length > 0
    ? boundaryData.map(p => ternaryToCartesian(p.a, p.f, p.m))
    : [];
  
  // Only add boundary line if data is loaded
  if (boundaryCoords.length > 0) {
    plotlyData.push({
      type: 'scatter',
      mode: 'lines',
      x: boundaryCoords.map(c => c.x),
      y: boundaryCoords.map(c => c.y),
      line: { color: 'black', width: 2, dash: 'dash' },
      name: 'Tholeiitic/Calc-Alkaline',
      hoverinfo: 'name',
      showlegend: true,
    });
  }

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
      x: samples.map(s => s.x),
      y: samples.map(s => s.y),
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
        `FeOT: ${s.feot.toFixed(2)}%<br>` +
        `MgO: ${s.mgo.toFixed(2)}%<br>` +
        `Alkali: ${s.alkali.toFixed(2)}%<br>`+
        `Confidence: ${s.confidenceLabel}`
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
            text: 'AFM (Alkali-FeO-MgO) Ternary Diagram',
            font: { size: 16 },
          },
          xaxis: {
            visible: false,
            range: [-0.1, 1.1],
          },
          yaxis: {
            visible: false,
            range: [-0.1, 1],
            scaleanchor: 'x',
            scaleratio: 1,
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
          annotations: [
            // Vertex labels
            {
              x: 0,
              y: -0.08,
              text: '<b>Na₂O + K₂O (wt%)</b>',
              showarrow: false,
              xanchor: 'center',
            },
            {
              x: 1,
              y: -0.08,
              text: '<b>MgO (wt%)</b>',
              showarrow: false,
              xanchor: 'center',
            },
            {
              x: 0.5,
              y: Math.sqrt(3) / 2 + 0.08,
              text: '<b>FeOT (wt%)</b>',
              showarrow: false,
              xanchor: 'center',
            },
            // Percentage labels along bottom edge (Alkali axis, 0-100% left to right)
            ...Array.from({ length: 6 }, (_, i) => i * 20).map(pct => ({
              x: pct / 100,
              y: -0.04,
              text: `${pct}`,
              showarrow: false,
              font: { size: 10, color: 'gray' },
              xanchor: 'center' as const,
            })),
            // Percentage labels along right edge (MgO axis, 0-100% bottom to top)
            ...Array.from({ length: 6 }, (_, i) => i * 20).map(pct => {
              const pos = ternaryToCartesian(0, 100 - pct, pct);
              return {
                x: pos.x + 0.04,
                y: pos.y,
                text: `${pct}`,
                showarrow: false,
                font: { size: 10, color: 'gray' },
                xanchor: 'left' as const,
                textangle: '60' as const,
              };
            }),
            // Percentage labels along left edge (FeOT axis, 0-100% bottom to top)
            ...Array.from({ length: 6 }, (_, i) => i * 20).map(pct => {
              const pos = ternaryToCartesian(100 - pct, pct, 0);
              return {
                x: pos.x - 0.04,
                y: pos.y,
                text: `${pct}`,
                showarrow: false,
                font: { size: 10, color: 'gray' },
                xanchor: 'right' as const,
                textangle: '-60' as const,
              };
            }),
            // Field labels
            {
              x: 0.65,
              y: 0.4,
              text: 'Tholeiitic',
              showarrow: false,
              font: { size: 12, color: 'gray' },
            },
            {
              x: 0.35,
              y: 0.2,
              text: 'Calc-Alkaline',
              showarrow: false,
              font: { size: 12, color: 'gray' },
            },
          ],
        }}
        config={{
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['lasso2d', 'select2d'],
          toImageButtonOptions: {
            format: 'png',
            filename: 'afm_ternary_diagram',
            height: 800,
            width: 1000,
          },
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
});
