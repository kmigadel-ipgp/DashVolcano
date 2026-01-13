import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { normalizeConfidence, getConfidenceLabel } from '../../utils/confidence';
import type { MatchingMetadata } from '../../types';

interface HarkerDataPoint {
  sample_code: string;
  SIO2: number;
  rock_type: string;
  material: string;
  TIO2?: number;
  AL2O3?: number;
  FEOT?: number;
  MGO?: number;
  CAO?: number;
  NA2O?: number;
  K2O?: number;
  P2O5?: number;
  volcano_name?: string;
  matching_metadata?: MatchingMetadata;
  confidenceLabel?: string;
}

interface VolcanoHarkerData {
  volcanoName: string;
  harkerData: HarkerDataPoint[];
  color: string;
}

interface HarkerDiagramsProps {
  volcanoes: VolcanoHarkerData[];
}

/**
 * Harker Diagram Configuration
 * Defines the 8 major oxide variation diagrams vs SiO2
 */
const HARKER_DIAGRAMS = [
  { 
    oxide: 'TIO2' as keyof HarkerDataPoint, 
    yaxis: 'TiO₂ (wt%)', 
    range: [0, 4] as [number, number],
    description: 'Titanium oxide - indicator of magma differentiation'
  },
  { 
    oxide: 'AL2O3' as keyof HarkerDataPoint, 
    yaxis: 'Al₂O₃ (wt%)', 
    range: [10, 25] as [number, number],
    description: 'Aluminum oxide - major rock-forming oxide'
  },
  { 
    oxide: 'FEOT' as keyof HarkerDataPoint, 
    yaxis: 'FeO<sup>T</sup> (wt%)', 
    range: [0, 15] as [number, number],
    description: 'Total iron oxide - shows Fe enrichment trends'
  },
  { 
    oxide: 'MGO' as keyof HarkerDataPoint, 
    yaxis: 'MgO (wt%)', 
    range: [0, 20] as [number, number],
    description: 'Magnesium oxide - decreases with differentiation'
  },
  { 
    oxide: 'CAO' as keyof HarkerDataPoint, 
    yaxis: 'CaO (wt%)', 
    range: [0, 15] as [number, number],
    description: 'Calcium oxide - related to plagioclase content'
  },
  { 
    oxide: 'NA2O' as keyof HarkerDataPoint, 
    yaxis: 'Na₂O (wt%)', 
    range: [0, 8] as [number, number],
    description: 'Sodium oxide - increases with differentiation'
  },
  { 
    oxide: 'K2O' as keyof HarkerDataPoint, 
    yaxis: 'K₂O (wt%)', 
    range: [0, 6] as [number, number],
    description: 'Potassium oxide - calc-alkaline indicator'
  },
  { 
    oxide: 'P2O5' as keyof HarkerDataPoint, 
    yaxis: 'P₂O₅ (wt%)', 
    range: [0, 1.5] as [number, number],
    description: 'Phosphorus pentoxide - accessory mineral indicator'
  },
];

/**
 * HarkerDiagrams Component
 * 
 * Displays 8 Harker variation diagrams comparing major oxides vs SiO2
 * across multiple volcanoes. Harker diagrams are fundamental tools for
 * understanding magma differentiation and evolution.
 * 
 * Features:
 * - 8 diagrams in 4x2 grid layout
 * - Consistent SiO2 axis (40-80 wt%)
 * - Volcano-specific colors
 * - Interactive tooltips with sample details
 * - Responsive grid layout
 * - Export functionality
 */
export const HarkerDiagrams: React.FC<HarkerDiagramsProps> = React.memo(({ volcanoes }) => {
  const [diagramsReady, setDiagramsReady] = useState(false);

  // Progressive rendering: allow component to mount before rendering heavy plots
  useEffect(() => {
    // Delay rendering to avoid blocking UI on initial mount
    const timer = setTimeout(() => {
      setDiagramsReady(true);
    }, 100);

    return () => {
      clearTimeout(timer);
      setDiagramsReady(false);
    };
  }, []);

  // Calculate total data points for performance info
  const totalDataPoints = volcanoes.reduce((sum, v) => sum + v.harkerData.length, 0);
  const isLargeDataset = totalDataPoints > 10000;

  if (volcanoes.length === 0 || volcanoes.every(v => v.harkerData.length === 0)) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No Harker diagram data available for selected volcanoes</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Harker Variation Diagrams</h3>
        <p className="text-sm text-gray-600">
          Major oxide variations vs SiO₂ content showing magma differentiation trends. 
          Each point represents a chemical analysis sample.
        </p>
      </div>

      {/* WR Filter Notice */}
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <span className="text-blue-600 font-semibold text-sm">📊 Data Filter:</span>
          <p className="text-sm text-blue-900">
            Displaying <strong>Whole Rock (WR) samples only</strong> for accurate geochemical interpretation. 
            Minerals, glasses, and inclusions are excluded to ensure representative bulk compositions.
          </p>
        </div>
      </div>

      {/* Loading Skeleton */}
      {!diagramsReady && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {HARKER_DIAGRAMS.map(({ oxide }) => (
            <div key={`skeleton-${oxide}`} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-3"></div>
                <div className="h-[240px] bg-gray-200 rounded mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actual Diagrams */}
      {diagramsReady && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {HARKER_DIAGRAMS.map(({ oxide, yaxis, range, description }) => {
          // Create traces (one per volcano) with sampled data
          const traces = volcanoes.map((volcano) => {
            // Filter data points that have this oxide
            const validData = volcano.harkerData.filter(
              (d) => d[oxide] !== null && 
                     d[oxide] !== undefined
            );

            if (validData.length === 0) return null;

            return {
              type: 'scattergl' as const,  // WebGL for GPU acceleration - handles 100k+ points
              mode: 'markers' as const,
              name: volcano.volcanoName,
              x: validData.map((d) => d['SIO2']),
              y: validData.map((d) => d[oxide] as number),
              marker: {
                color: volcano.color,
                size: 3,                     // Smaller markers = faster rendering
                opacity: 0.7,
                line: { width: 0 }           // No borders = much faster
              },
              text: validData.map((d) => d.sample_code),
              customdata: validData.map((d) => [
                d.rock_type, 
                d.material,
                d.confidenceLabel || getConfidenceLabel(normalizeConfidence(d.matching_metadata?.confidence_level, d.matching_metadata)),
                d.volcano_name || volcano.volcanoName
              ]),
              hovertemplate:
                `<b>%{customdata[3]}</b><br>` +
                `Sample: %{text}<br>` +
                `SiO₂: %{x:.2f} wt%<br>` +
                `${yaxis.replace(/<[^>]*>/g, '')}: %{y:.2f} wt%<br>` +
                `Rock Type: %{customdata[0]}<br>` +
                `Material: %{customdata[1]}<br>` +
                `Confidence: %{customdata[2]}<br>` +
                `<extra></extra>`
            };
          }).filter(trace => trace !== null);

          // Skip if no data for any volcano
          if (traces.length === 0) {
            return (
              <div key={oxide} className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex items-center justify-center min-h-[280px]">
                <p className="text-sm text-gray-500 text-center">
                  No {oxide} data available
                </p>
              </div>
            );
          }

          return (
            <div key={oxide} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <Plot
                data={traces}
                layout={{
                  title: { 
                    text: `${yaxis.replace(/<[^>]*>/g, '')} vs SiO₂`,
                    font: { size: 12 }
                  },
                  xaxis: { 
                    title: { text: 'SiO₂ (wt%)', font: { size: 10 } },
                    range: [40, 80],
                    showgrid: true,
                    gridcolor: '#e5e7eb',
                    tickfont: { size: 9 }
                  },
                  yaxis: { 
                    title: { text: yaxis, font: { size: 10 } },
                    range: range,
                    showgrid: true,
                    gridcolor: '#e5e7eb',
                    tickfont: { size: 9 }
                  },
                  height: 280,
                  margin: { l: 50, r: 20, t: 40, b: 50 },
                  showlegend: false,
                  hovermode: 'closest',
                  paper_bgcolor: 'white',
                  plot_bgcolor: 'white'
                }}
                config={{
                  displayModeBar: false,
                  responsive: true
                }}
                style={{ width: '100%', height: '100%' }}
              />
              <div className="px-3 pb-3">
                <p className="text-xs text-gray-500 italic">{description}</p>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Performance Info for Large Datasets */}
      {isLargeDataset && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-900">
            <strong>🚀 GPU Acceleration Active:</strong> Displaying all {totalDataPoints.toLocaleString()} data points 
            using WebGL rendering for optimal performance. All scientific data is preserved.
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 justify-center">
          {volcanoes.map((volcano) => {
            const dataCount = volcano.harkerData.length;
            return (
              <div key={volcano.volcanoName} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full opacity-60"
                  style={{ backgroundColor: volcano.color }}
                />
                <span className="text-sm font-medium text-gray-700">
                  {volcano.volcanoName}
                </span>
                <span className="text-xs text-gray-500">
                  (n={dataCount})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Information Box */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900">
          <strong>About Harker Diagrams:</strong> These diagrams plot major element oxides against SiO₂ 
          to visualize magma differentiation trends. As magma evolves from mafic to felsic compositions, 
          SiO₂ increases while MgO, FeO, and CaO generally decrease, and alkalis (Na₂O, K₂O) increase. 
          Different trends can indicate different tectonic settings or magma sources.
        </p>
      </div>
    </div>
  );
});

export default HarkerDiagrams;
