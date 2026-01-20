import React from 'react';
import Plot from 'react-plotly.js';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

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

  // WR Filter Notice
  const WRFilterNotice = () => (
    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <span className="text-blue-600 font-semibold text-sm">📊 Data Filter:</span>
        <p className="text-sm text-blue-900">
          Showing <strong>Whole Rock (WR) samples only</strong> for accurate rock type comparison. 
          This excludes minerals, glasses, and inclusions to ensure representative data.
        </p>
      </div>
    </div>
  );

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
      <WRFilterNotice />
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
              {volcanoStats.length === 2 && (
                <th className="text-right py-2 px-3 font-semibold text-gray-700">
                  Absolute Diff.
                  <span className="block text-[10px] font-normal text-gray-500">
                    <InlineMath math="|v1_r - v2_r|" />
                  </span>
                </th>
              )}
              {volcanoStats.length === 2 && (
                <th className="text-right py-2 px-3 font-semibold text-gray-700">
                  Similarity
                  <span className="block text-[10px] font-normal text-gray-500">
                    <InlineMath math="1 - |v1_r - v2_r|" />
                  </span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedRockTypes.map((rockType, idx) => {
              const pct1 = volcanoStats[0].percentages[rockType]?.percentage || 0;
              const pct2 = volcanoStats.length === 2 ? (volcanoStats[1].percentages[rockType]?.percentage || 0) : 0;
              const absDiff = volcanoStats.length === 2 ? Math.abs(pct1 - pct2) : 0;
              const similarity = volcanoStats.length === 2 ? (100 - absDiff) : 0;
              
              return (
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
                  {volcanoStats.length === 2 && (
                    <td className="text-right py-2 px-3">
                      <span className={`font-semibold ${absDiff < 10 ? 'text-green-600' : absDiff < 30 ? 'text-amber-600' : 'text-red-600'}`}>
                        {absDiff.toFixed(1)}%
                      </span>
                      <span className="text-gray-600 text-xs ml-1 block">
                        (w<sub>r</sub> = {(volcanoStats[0].percentages[rockType]?.count || 0) + (volcanoStats[1].percentages[rockType]?.count || 0)})
                      </span>
                    </td>
                  )}
                  {volcanoStats.length === 2 && (
                    <td className="text-right py-2 px-3">
                      <span className={`font-semibold ${similarity > 90 ? 'text-green-600' : similarity > 30 ? 'text-amber-600' : 'text-red-600'}`}>
                        {similarity.toFixed(0)}%
                      </span>
                      <span className="text-gray-600 text-xs ml-1 block">
                        (w<sub>r</sub> = {(volcanoStats[0].percentages[rockType]?.count || 0) + (volcanoStats[1].percentages[rockType]?.count || 0)})
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
            <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
              <td className="py-2 px-3 text-gray-900">Total Samples</td>
              {volcanoStats.map(v => (
                <td key={v.volcanoName} className="text-right py-2 px-3 text-gray-900">
                  {v.total}
                </td>
              ))}
              {volcanoStats.length === 2 && (() => {
                // Calculate weighted average of absolute differences
                let weightedSum = 0;
                let totalWeight = 0;
                sortedRockTypes.forEach(rockType => {
                  const pct1 = volcanoStats[0].percentages[rockType]?.percentage || 0;
                  const pct2 = volcanoStats[1].percentages[rockType]?.percentage || 0;
                  const absDiff = Math.abs(pct1 - pct2);
                  const weight = (volcanoStats[0].percentages[rockType]?.count || 0) + (volcanoStats[1].percentages[rockType]?.count || 0);
                  weightedSum += absDiff * weight;
                  totalWeight += weight;
                });
                const weightedAvgAbsDiff = totalWeight > 0 ? weightedSum / totalWeight : 0;
                const weightedAvgSimilarity = 1 - (weightedAvgAbsDiff / 100);
                
                return (
                  <>
                    <td className="text-right py-2 px-3 text-gray-900">
                      {weightedAvgAbsDiff.toFixed(1)}%
                      <span className="block text-[10px] font-normal text-gray-500">weighted avg.</span>
                    </td>
                    <td className="text-right py-2 px-3 text-gray-600 italic text-xs">
                      {(weightedAvgSimilarity * 100).toFixed(1)}%
                      <span className="block text-[10px] font-normal text-gray-500">weighted avg.</span>
                    </td>
                  </>
                );
              })()}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Comparison Insights */}
      {volcanoes.length >= 2 && (
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">📊 Comparison Insights</h3>
            <details className="text-xs">
              <summary className="cursor-pointer text-blue-700 hover:text-blue-900 font-medium">How are these calculated?</summary>
              <div className="mt-2 p-3 bg-white rounded-lg shadow-sm space-y-2 max-w-md">
                <div>
                  <p className="font-semibold text-gray-700">Similarity Score:</p>
                  <p className="text-gray-600">Weighted average of rock type similarities. For each rock type <InlineMath math="r" />, compute local similarity <InlineMath math="(1 - |v1_r - v2_r|)" /> where <InlineMath math="v1_r" /> and <InlineMath math="v2_r" /> are the fractions in each volcano. Weight by total sample count <InlineMath math="(w_r = n1_r + n2_r)" />. Rock types with more samples have more influence.</p>
                  <div className="mt-2 p-2 bg-gray-800 rounded">
                    <p className="text-xs font-semibold text-yellow-300 mb-2">
                      Formula (weighted percentage)
                    </p>
                    <div className="text-yellow-300 flex justify-center">
                      <BlockMath math="\text{Similarity} = \frac{\sum_r [(100 - |v1_r - v2_r|) \times w_r]}{\sum_r w_r}" />
                    </div>
                    <div className="mt-2 text-[10px] text-gray-300 space-y-1">
                      <div><InlineMath math="v1_r, v2_r" /> = % of rock type <InlineMath math="r" /> in each volcano</div>
                      <div><InlineMath math="w_r = n1_r + n2_r" /> (total samples of type <InlineMath math="r" />)</div>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Most Diverse:</p>
                  <p className="text-gray-600">Volcano with the highest number of unique rock types (WR samples only).</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Common Rock Type:</p>
                  <p className="text-gray-600">Rock type with highest combined dominance score across all selected volcanoes.</p>
                </div>
              </div>
            </details>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Similarity Score */}
            <div className="bg-white rounded-lg p-4 shadow">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-gray-600">Similarity Score</p>
                <div className="group relative">
                  <span className="text-blue-500 cursor-help text-xs border border-blue-500 rounded-full w-4 h-4 inline-flex items-center justify-center relative -translate-y-px">?</span>
                  <div className="hidden group-hover:block absolute z-50 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg -left-36 top-6">
                    <p className="font-semibold mb-2">Similarity Score Formula:</p>
                    <div className="my-2 p-2 bg-gray-800 rounded">
                      <div className="text-yellow-300 flex justify-center">
                        <BlockMath math="\text{Similarity} = \frac{\sum_r [(1 - |v1_r - v2_r|) \times w_r]}{\sum_r w_r}" />
                      </div>
                    </div>
                    <p className="text-gray-300 text-[10px] mb-2 leading-relaxed">
                      <strong>Legend:</strong>
                      <br />
                      <span className="ml-2"><InlineMath math="v1_r, v2_r" /> = fraction of rock type <InlineMath math="r" /> in each volcano (0–1)</span>
                      <br />
                      <span className="ml-2"><InlineMath math="w_r = n1_r + n2_r" /> (total samples of type <InlineMath math="r" />)</span>
                    </p>
                    {(() => {
                      if (volcanoStats.length >= 2) {
                        const v1 = volcanoStats[0];
                        const v2 = volcanoStats[1];
                        const commonRockType = Object.keys(v1.percentages).find(rt => v2.percentages[rt]);
                        if (commonRockType) {
                          const pct1 = v1.percentages[commonRockType].percentage.toFixed(1);
                          const pct2 = v2.percentages[commonRockType].percentage.toFixed(1);
                          const count1 = v1.percentages[commonRockType].count;
                          const count2 = v2.percentages[commonRockType].count;
                          const v1r = (v1.percentages[commonRockType].percentage / 100).toFixed(3);
                          const v2r = (v2.percentages[commonRockType].percentage / 100).toFixed(3);
                          const diff = Math.abs(Number(v1r) - Number(v2r)).toFixed(3);
                          const similarity = (1 - Number(diff)).toFixed(3);
                          const weight = count1 + count2;
                          return (
                            <div className="mt-2 p-2 bg-gray-800 rounded text-[10px] leading-relaxed">
                              <p className="text-yellow-300 font-semibold mb-1">Example: {commonRockType}</p>
                              <p>• {v1.volcanoName}: {pct1}% → <InlineMath math={`v1_r = ${v1r}`} /></p>
                              <p>• {v2.volcanoName}: {pct2}% → <InlineMath math={`v2_r = ${v2r}`} /></p>
                              <p className="mt-1">Similarity: <InlineMath math={`1 - |${v1r} - ${v2r}| = ${similarity}`} /></p>
                              <p>Weight: <InlineMath math={`w_r = ${count1} + ${count2} = ${weight}`} /></p>
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                    <p className="mt-2 text-gray-300 text-[10px]">100% = identical, 0% = completely different</p>
                  </div>
                </div>
              </div>
              <p className="text-lg font-bold text-purple-600">
                {getRockTypeSimilarity(volcanoStats)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Distribution overlap</p>
            </div>

            {/* Most Diverse */}
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 mb-1">Most Diverse</p>
              <p className="text-lg font-bold" style={{ color: getMostDiverseColor(volcanoStats) }}>
                {getMostDiverseVolcano(volcanoStats)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Unique rock types</p>
            </div>

            {/* Dominant Rock Type */}
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 mb-1">Common Rock Type</p>
              <p className="text-lg font-bold text-orange-600">
                {getCommonDominantRockType(volcanoStats)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Most frequent overall</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default RockTypeDistributionChart;

// Helper Functions for Comparison Insights

function getRockTypeSimilarity(volcanoStats: Array<{ volcanoName: string; total: number; percentages: Record<string, { count: number; percentage: number }> }>): number {
  if (volcanoStats.length < 2) return 0;

  // For simplicity, compare first two volcanoes
  const v1 = volcanoStats[0];
  const v2 = volcanoStats[1];

  // Collect all rock types from both volcanoes
  const allRockTypes = new Set([
    ...Object.keys(v1.percentages),
    ...Object.keys(v2.percentages)
  ]);

  if (allRockTypes.size === 0) return 0;

  let weightedSimilarity = 0;
  let totalWeight = 0;

  for (const rockType of allRockTypes) {
    const pct1 = v1.percentages[rockType]?.percentage || 0;
    const pct2 = v2.percentages[rockType]?.percentage || 0;

    // Calculate local similarity (100% = identical, 0% = max difference)
    const localSimilarity = 100 - Math.abs(pct1 - pct2);

    // Weight by the combined count of this rock type
    const count1 = v1.percentages[rockType]?.count || 0;
    const count2 = v2.percentages[rockType]?.count || 0;
    const weight = count1 + count2;

    weightedSimilarity += localSimilarity * weight;
    totalWeight += weight;
  }

  return totalWeight === 0 ? 0 : Math.round(weightedSimilarity / totalWeight);
}

function getMostDiverseVolcano(volcanoStats: Array<{ volcanoName: string; rockTypes: Record<string, number>; color: string }>): string {
  if (volcanoStats.length === 0) return 'None';

  let maxDiversity = 0;
  let mostDiverse = volcanoStats[0].volcanoName;

  for (const volcano of volcanoStats) {
    const diversity = Object.keys(volcano.rockTypes).length;
    if (diversity > maxDiversity) {
      maxDiversity = diversity;
      mostDiverse = volcano.volcanoName;
    }
  }

  return `${mostDiverse} (${maxDiversity} types)`;
}

function getMostDiverseColor(volcanoStats: Array<{ volcanoName: string; rockTypes: Record<string, number>; color: string }>): string {
  if (volcanoStats.length === 0) return '#6B7280';

  let maxDiversity = 0;
  let color = volcanoStats[0].color;

  for (const volcano of volcanoStats) {
    const diversity = Object.keys(volcano.rockTypes).length;
    if (diversity > maxDiversity) {
      maxDiversity = diversity;
      color = volcano.color;
    }
  }

  return color;
}

function getCommonDominantRockType(volcanoStats: Array<{ volcanoName: string; rockTypes: Record<string, number>; total: number; percentages: Record<string, { count: number; percentage: number }> }>): string {
  // Find rock type with highest combined dominance score (product of percentages)
  // This identifies rock types that are dominant across multiple volcanoes
  
  if (volcanoStats.length === 0) return 'None';

  // Collect all unique rock types
  const allRockTypes = new Set<string>();
  volcanoStats.forEach(v => {
    Object.keys(v.percentages).forEach(rt => allRockTypes.add(rt));
  });

  if (allRockTypes.size === 0) return 'None';

  let maxScore = 0;
  let dominantType = 'None';

  for (const rockType of allRockTypes) {
    // Calculate score as product of percentages across all volcanoes
    let score = 1;
    for (const volcano of volcanoStats) {
      const percentage = volcano.percentages[rockType]?.percentage || 0;
      score *= percentage;
    }

    if (score > maxScore) {
      maxScore = score;
      dominantType = rockType;
    }
  }

  return dominantType;
}