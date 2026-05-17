import React, { useState } from 'react';
import { X, MapPin, Mountain, Database, Layers, FileText, Info } from 'lucide-react';
import type { Sample } from '../../types';
import { 
  normalizeConfidence, 
  getConfidenceColorHex, 
  getConfidenceLabel,
  getConfidenceIcon,
  getVolcanoName,
  getDistance,
  isMatched
} from '../../utils/confidence';
import { getMatchingScoreMeta, getMatchingScoreValue } from '../../utils/matchingMetadata';

interface SampleDetailsPanelProps {
  /** The selected sample to display */
  sample: Sample | null;
  /** Callback when the panel is closed */
  onClose: () => void;
  /** Callback to add sample to selection */
  onAddToSelection?: (sample: Sample) => void;
  /** Whether the sample is already in selection */
  isSelected?: boolean;
}

/**
 * SampleDetailsPanel displays detailed information about a clicked sample
 * Shows location, rock type, volcano association, tectonic setting, and chemical composition
 */
export const SampleDetailsPanel: React.FC<SampleDetailsPanelProps> = ({
  sample,
  onClose,
  onAddToSelection,
  isSelected = false,
}) => {
  const [showMatchScoreExplanation, setShowMatchScoreExplanation] = useState(false);
  const [showCoverageExplanation, setShowCoverageExplanation] = useState(false);
  const [showUncertaintyExplanation, setShowUncertaintyExplanation] = useState(false);
  const [showConfidenceExplanation, setShowConfidenceExplanation] = useState(false);
  const [showLiteratureExplanation, setShowLiteratureExplanation] = useState(false);
  const [showGapExplanation, setShowGapExplanation] = useState(false);
  const [showSpatialExplanation, setShowSpatialExplanation] = useState(false);
  const [showTectonicExplanation, setShowTectonicExplanation] = useState(false);
  const [showPetrologicalExplanation, setShowPetrologicalExplanation] = useState(false);
  const [showTemporalExplanation, setShowTemporalExplanation] = useState(false);
  
  if (!sample) return null;

  const { sample_id, db, petro, tecto, geometry, oxides, matching_metadata, references } = sample;
  const rock_type = petro?.rock_type;
  const [longitude, latitude] = geometry.coordinates;

  // Extract tectonic setting display value (support both legacy string and new nested structure)
  const tectonicSettingDisplay = typeof tecto === 'object' 
    ? tecto?.ui || 'Unknown'
    : tecto || 'Unknown';

  // Format coordinates to 4 decimal places
  const formatCoordinate = (coord: number, isLat: boolean) => {
    let direction: string;
    if (isLat) {
      direction = coord >= 0 ? 'N' : 'S';
    } else {
      direction = coord >= 0 ? 'E' : 'W';
    }
    return `${Math.abs(coord).toFixed(4)}°${direction}`;
  };

  // Format oxide values
  const formatOxide = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  // Get major oxides to display
  const majorOxides = oxides ? [
    { name: 'SiO₂ (wt%)', value: oxides['SIO2'] },
    { name: 'Al₂O₃ (wt%)', value: oxides['AL2O3'] },
    { name: 'FeO(T) (wt%)', value: oxides['FEOT'] },
    { name: 'MgO (wt%)', value: oxides['MGO'] },
    { name: 'CaO (wt%)', value: oxides['CAO'] },
    { name: 'Na₂O (wt%)', value: oxides['NA2O'] },
    { name: 'K₂O (wt%)', value: oxides['K2O'] },
    { name: 'TiO₂ (wt%)', value: oxides['TIO2'] },
  ].filter(oxide => oxide.value !== undefined) : [];

  return (
    <div className="absolute top-4 right-4 z-20 w-80 bg-white rounded-lg shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-volcano-600 text-white p-4 flex items-center justify-between">
        <h3 className="font-semibold text-lg">Sample Details</h3>
        <button
          onClick={onClose}
          className="hover:bg-volcano-700 rounded p-1 transition-colors"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Basic Information */}
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Database className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Sample ID</p>
              <p className="text-sm font-medium truncate" title={sample_id}>
                {sample_id}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Database className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">Database</p>
              <p className="text-sm font-medium">{db}</p>
            </div>
          </div>

          {rock_type && (
            <div className="flex items-start gap-2">
              <Layers className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Rock Type</p>
                <p className="text-sm font-medium">{rock_type}</p>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-medium">
                {formatCoordinate(latitude, true)}, {formatCoordinate(longitude, false)}
              </p>
            </div>
          </div>

          {/* Volcano Association */}
          {isMatched(matching_metadata) && (
            <div className="flex items-start gap-2">
              <Mountain className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Associated Volcano</p>
                <p className="text-sm font-medium">{getVolcanoName(matching_metadata)}</p>
                {getDistance(matching_metadata) !== undefined && (
                  <p className="text-xs text-gray-500">
                    Distance: {getDistance(matching_metadata)!.toFixed(1)} km
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Match Score Breakdown (dynamic) */}
          {matching_metadata?.scores && (() => {
            const scores = matching_metadata.scores;
            const quality = matching_metadata.quality;
            const coverage = quality?.cov || 0;
            const uncertainty = quality?.unc || 0;
            const confidence = normalizeConfidence(matching_metadata?.confidence_level, matching_metadata);
            const color = getConfidenceColorHex(confidence);
            const label = getConfidenceLabel(confidence);
            const icon = getConfidenceIcon(confidence);

            // Backend score weights from volcano-sample-matcher.
            const allComponents = [
              { key: 'sp', label: 'Spatial', value: getMatchingScoreValue(scores, 'sp'), weight: 0.35 },
              { key: 'te', label: 'Tectonic', value: getMatchingScoreValue(scores, 'te'), weight: 0.25 },
              { key: 'pe', label: 'Petrological', value: getMatchingScoreValue(scores, 'pe'), weight: 0.25 },
              { key: 'ti', label: 'Temporal', value: getMatchingScoreValue(scores, 'ti'), weight: 0.15 },
            ];

            const components = allComponents.filter(c => c.value !== undefined);
            const missingComponents = allComponents.filter(c => c.value === undefined);

            const formulaParts = components.map(c => 
              `(${(c.value! * 100).toFixed(1)}% × ${c.weight})`
            );
            const formulaSum = components.map(c => c.weight).join(' + ');

            return (
              <>
                {/* Match Score */}
                <div className="flex items-start gap-2">
                  <div className="relative group flex-shrink-0">
                    <button
                      onClick={() => setShowMatchScoreExplanation(!showMatchScoreExplanation)}
                      className="hover:bg-blue-50 rounded p-0.5 transition-colors mt-0.5"
                      title="Click to show/hide match score explanation"
                    >
                      <Info className="w-4 h-4 text-blue-500" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Match Score</p>
                    <p className="text-sm font-medium font-mono">{((scores.final ?? 0) * 100).toFixed(0)}%</p>
                    {showMatchScoreExplanation && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-600 leading-relaxed">
                        <p className="font-semibold mb-2">How is this calculated?</p>
                        
                        <p className="mb-2">
                          This score combines four geological dimensions used by the backend:
                          Spatial, Tectonic, Petrological, and Temporal.
                        </p>

                        <p className="mb-2">
                          Each dimension contributes a score between 0 and 1. The final score is a
                          weighted average over the dimensions that are actually available.
                        </p>

                        <p className="mb-2">
                          A volcano is assigned only if the best candidate reaches at least 40% final
                          score and 30% weighted coverage. Literature evidence is excluded from this
                          geological score.
                        </p>
                        
                        {/* Component Scores with Weights and Explanations */}
                        <div className="space-y-2 mb-2">
                          {components.map(c => (
                            <div key={c.key} className="border-b border-blue-100 pb-1">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-700 font-medium">{c.label}:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">
                                    {(c.value! * 100).toFixed(1)}%
                                    <span className="text-gray-400 ml-1">(weight: {c.weight})</span>
                                  </span>
                                  <button
                                    onClick={() => {
                                      if (c.key === 'sp') setShowSpatialExplanation(!showSpatialExplanation);
                                      else if (c.key === 'te') setShowTectonicExplanation(!showTectonicExplanation);
                                      else if (c.key === 'pe') setShowPetrologicalExplanation(!showPetrologicalExplanation);
                                      else if (c.key === 'ti') setShowTemporalExplanation(!showTemporalExplanation);
                                    }}
                                    className="hover:bg-blue-100 rounded p-0.5"
                                    title="Click to show/hide explanation"
                                  >
                                    <Info className="w-3 h-3 text-blue-600" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Spatial Score Explanation */}
                              {c.key === 'sp' && showSpatialExplanation && (() => {
                                const spMeta = getMatchingScoreMeta(scores, 'sp');
                                const distance = spMeta.dist_km ?? getDistance(matching_metadata);
                                const decay = spMeta.decay ?? 50;
                                const finalScore = c.value!;
                                
                                return (
                                  <div className="mt-1 pl-2 text-xs bg-white p-2 rounded border border-blue-200">
                                    <p className="font-semibold mb-1">Spatial Score Calculation:</p>
                                    <p className="mb-1">Uses exponential decay based on distance:</p>
                                    <p className="font-mono text-blue-600 mb-2">
                                      score = exp(-distance_km / decay_constant)
                                    </p>
                                    
                                    {distance !== undefined ? (
                                      <div className="bg-blue-50 p-2 rounded border border-blue-300 space-y-1">
                                        <p className="font-semibold text-gray-700">For this sample:</p>
                                        <p className="font-mono text-sm">
                                          Distance = <span className="text-blue-700">{distance.toFixed(2)} km</span>
                                        </p>
                                        <p className="font-mono text-sm">
                                          Decay constant = <span className="text-blue-700">{decay} km</span>
                                        </p>
                                        <p className="font-mono text-sm font-semibold text-blue-700">
                                          score = exp(-{distance.toFixed(2)} / {decay}) = {(finalScore * 100).toFixed(1)}%
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="mt-1 text-gray-500 italic">
                                        Distance data not available
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                              
                              {/* Tectonic Score Explanation */}
                              {c.key === 'te' && showTectonicExplanation && (() => {
                                const teMeta = getMatchingScoreMeta(scores, 'te');
                                const regimeScore = teMeta.regime_score;
                                const crustModifier = teMeta.crust_modifier;
                                const finalScore = c.value!;
                                const note = teMeta.note;
                                
                                return (
                                  <div className="mt-1 pl-2 text-xs bg-white p-2 rounded border border-blue-200">
                                    <p className="font-semibold mb-1">Tectonic Score Calculation:</p>
                                    <p className="mb-1">Uses geodynamically correct regime compatibility matrix:</p>
                                    <p className="font-mono text-blue-600 mb-2">
                                      score = regime_score × crust_modifier
                                    </p>
                                    
                                    {/* Regime Compatibility Matrix */}
                                    <div className="bg-gray-50 p-2 rounded border border-gray-300 mb-2">
                                      <p className="font-semibold text-gray-700 mb-1">Regime Compatibility Matrix:</p>
                                      <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
                                        <div className="font-semibold"></div>
                                        <div className="font-semibold text-center">Subduc.</div>
                                        <div className="font-semibold text-center">Rift</div>
                                        <div className="font-semibold text-center">Intraplat.</div>
                                        
                                        <div className="font-semibold">Subduction</div>
                                        <div className="text-center bg-green-100">1.0</div>
                                        <div className="text-center bg-red-100">0.0</div>
                                        <div className="text-center bg-red-100">0.0</div>
                                        
                                        <div className="font-semibold">Rift</div>
                                        <div className="text-center bg-red-100">0.0</div>
                                        <div className="text-center bg-green-100">1.0</div>
                                        <div className="text-center bg-yellow-100">0.7*</div>
                                        
                                        <div className="font-semibold">Intraplate</div>
                                        <div className="text-center bg-red-100">0.0</div>
                                        <div className="text-center bg-yellow-100">0.7*</div>
                                        <div className="text-center bg-green-100">1.0</div>
                                      </div>
                                      <p className="text-[10px] text-gray-600 mt-1">
                                        * 0.7 for plume–ridge systems (Iceland, Azores, Afar)
                                      </p>
                                      <p className="text-[10px] text-gray-600 mt-1">
                                        • Unknown regime: 0.5 (partial confidence based on crust only)
                                      </p>
                                    </div>
                                    
                                    {/* Crust Modifier */}
                                    <div className="bg-gray-50 p-2 rounded border border-gray-300 mb-2">
                                      <p className="font-semibold text-gray-700 mb-1">Crust Type Modifier:</p>
                                      <ul className="text-[10px] space-y-0.5 ml-3">
                                        <li>• <strong>Same crust type</strong> (oceanic–oceanic or continental–continental): <span className="font-mono">1.0</span></li>
                                        <li>• <strong>Unknown crust</strong> (one or both): <span className="font-mono">0.85</span></li>
                                        <li>• <strong>Different crust</strong> (oceanic vs continental): <span className="font-mono">0.75</span></li>
                                      </ul>
                                    </div>
                                    
                                    {regimeScore !== undefined && crustModifier !== undefined ? (
                                      <div className="bg-blue-50 p-2 rounded border border-blue-300 space-y-1">
                                        <p className="font-semibold text-gray-700">For this sample:</p>
                                        <p className="font-mono text-sm">
                                          Regime compatibility = <span className="text-blue-700">{regimeScore.toFixed(2)}</span>
                                          {note === 'partial_regime_unknown' && (
                                            <span className="text-amber-600 text-[10px]"> (regime unknown, partial score)</span>
                                          )}
                                        </p>
                                        <p className="font-mono text-sm">
                                          Crust modifier = <span className="text-blue-700">{crustModifier.toFixed(2)}</span>
                                          {crustModifier === 1.0 && <span className="text-gray-500 text-[10px]"> (same crust type)</span>}
                                          {crustModifier === 0.85 && <span className="text-gray-500 text-[10px]"> (unknown crust)</span>}
                                          {crustModifier === 0.75 && <span className="text-gray-500 text-[10px]"> (different crust type)</span>}
                                        </p>
                                        <p className="font-mono text-sm font-semibold text-blue-700">
                                          score = {regimeScore.toFixed(2)} × {crustModifier.toFixed(2)} = {(finalScore * 100).toFixed(1)}%
                                        </p>
                                        
                                        {regimeScore === 0.0 && (
                                          <p className="text-red-600 text-[10px] mt-1">
                                            ⚠️ Incompatible tectonic regimes (geodynamically inconsistent)
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="mt-1 text-gray-500 italic">
                                        Tectonic matching data not available
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                              
                              {/* Petrological Score Explanation */}
                              {c.key === 'pe' && showPetrologicalExplanation && (() => {
                                const peMeta = getMatchingScoreMeta(scores, 'pe');
                                const matchType = peMeta.match_type;
                                const finalScore = c.value!;
                                
                                return (
                                  <div className="mt-1 pl-2 text-xs bg-white p-2 rounded border border-blue-200">
                                    <p className="font-semibold mb-1">Petrological Score Calculation:</p>
                                    <p className="mb-1">Based on rock type compatibility:</p>
                                    <ul className="list-disc ml-4 space-y-0.5 mb-2">
                                      <li><strong>Direct match:</strong> same rock type = 1.0</li>
                                      <li><strong>Family match:</strong> same family (e.g., BASALTIC) = 0.7</li>
                                      <li><strong>No match:</strong> = 0.0</li>
                                    </ul>
                                    
                                    {matchType ? (
                                      <div className="bg-blue-50 p-2 rounded border border-blue-300 space-y-1">
                                        <p className="font-semibold text-gray-700">For this sample:</p>
                                        <p className="font-mono text-sm">
                                          Match type = <span className="text-blue-700">{matchType}</span>
                                        </p>
                                        <p className="font-mono text-sm font-semibold text-blue-700">
                                          score = {(finalScore * 100).toFixed(1)}%
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="mt-1 text-gray-500 italic">
                                        Rock type matching data not available
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                              
                              {/* Temporal Score Explanation */}
                              {c.key === 'ti' && showTemporalExplanation && (
                                  <div className="mt-1 pl-2 text-xs bg-white p-2 rounded border border-blue-200">
                                  <p className="font-semibold mb-1">Temporal Score Calculation:</p>
                                    <p className="mb-1">
                                      The backend temporal score tests whether the sample is compatible with
                                      Holocene volcanism, using 0 to 11,700 years BP as the reference window.
                                    </p>
                                    <ul className="list-disc ml-4 space-y-0.5 mb-2">
                                      <li><strong>Quantitative ages first:</strong> dated eruptions or age intervals are scored from their overlap with the Holocene window.</li>
                                      <li><strong>Textual fallback:</strong> Holocene/Recent = 1.0, Pleistocene = 0.7, Neogene = 0.3, older = 0.0.</li>
                                      <li><strong>Precision modifier:</strong> backend precision slightly adjusts the base score, but textual fallback is capped to avoid overconfidence.</li>
                                    </ul>
                                    <p className="text-[11px] text-gray-500">
                                      Ages are normalized in years BP using the backend 1950 reference, not the current calendar year.
                                    </p>

                                    {(() => {
                                      const tiMeta = getMatchingScoreMeta(scores, 'ti');
                                      const base = tiMeta.base;
                                      const precision = tiMeta.precision;
                                      const modifier = tiMeta.modifier;
                                      const finalScore = c.value!;

                                      if (
                                        base === undefined &&
                                        precision === undefined &&
                                        modifier === undefined
                                      ) {
                                        return null;
                                      }

                                      return (
                                        <div className="bg-blue-50 p-2 rounded border border-blue-300 mt-2 space-y-1">
                                          <p className="font-semibold text-gray-700">Backend values stored for this sample:</p>
                                          {base !== undefined && (
                                            <p className="font-mono text-sm">
                                              Base score = <span className="text-blue-700">{(base * 100).toFixed(1)}%</span>
                                            </p>
                                          )}
                                          {precision !== undefined && (
                                            <p className="font-mono text-sm">
                                              Precision = <span className="text-blue-700">{precision.toFixed(3)}</span>
                                            </p>
                                          )}
                                          {modifier !== undefined && (
                                            <p className="font-mono text-sm">
                                              Modifier = <span className="text-blue-700">{modifier.toFixed(3)}</span>
                                            </p>
                                          )}
                                          <p className="font-mono text-sm font-semibold text-blue-700">
                                            Final temporal score = {(finalScore * 100).toFixed(1)}%
                                          </p>
                                        </div>
                                      );
                                    })()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Formula */}
                        <div className="font-mono bg-white p-2 rounded mb-2 border border-gray-200">
                          <div className="mb-1 text-gray-700">Overall Score = </div>
                          <div className="pl-2 text-blue-600 text-[11px]">
                            [{formulaParts.join(' + ')}] / ({formulaSum})
                          </div>
                          <div className="mt-1 text-gray-500">
                            = {((scores.final ?? 0) * 100).toFixed(1)}%
                          </div>
                        </div>

                        {components.length < 4 && (
                          <p className="text-amber-600 mt-1 italic text-[11px]">
                            ⚠️ Missing dimensions are excluded from the denominator, so coverage falls as weighted evidence is missing.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Coverage */}
                {quality && (
                  <div className="flex items-start gap-2">
                    <div className="relative group flex-shrink-0">
                      <button
                        onClick={() => setShowCoverageExplanation(!showCoverageExplanation)}
                        className="hover:bg-blue-50 rounded p-0.5 transition-colors mt-0.5"
                        title="Click to show/hide coverage explanation"
                      >
                        <Info className="w-4 h-4 text-blue-500" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Coverage</p>
                      <p className="text-sm font-medium font-mono">{(coverage * 100).toFixed(0)}%</p>
                      {showCoverageExplanation && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-600 leading-relaxed">
                          <p className="mb-2">
                            <strong>Coverage</strong> is the share of weighted evidence available for this match,
                            not a simple count of dimensions. The backend weights are Spatial 35%, Tectonic 25%,
                            Petrological 25%, and Temporal 15%.
                          </p>

                          <div className="bg-white p-2 rounded border border-blue-200 space-y-1">
                            <p className="font-semibold text-gray-700">For this sample:</p>
                            <p>
                              <span className="font-mono text-blue-600">{(coverage * 100).toFixed(0)}%</span> of the total
                              weighted evidence is available.
                            </p>
                            <div className="mt-1">
                              <p className="text-green-700">
                                ✓ Available: {components.map(c => `${c.label} (${(c.weight * 100).toFixed(0)}%)`).join(', ')}
                              </p>
                              {missingComponents.length > 0 && (
                                <p className="text-orange-600">
                                  ✗ Missing: {missingComponents.map(c => `${c.label} (${(c.weight * 100).toFixed(0)}%)`).join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Uncertainty */}
                {quality && (
                  <div className="flex items-start gap-2">
                    <div className="relative group flex-shrink-0">
                      <button
                        onClick={() => setShowUncertaintyExplanation(!showUncertaintyExplanation)}
                        className="hover:bg-blue-50 rounded p-0.5 transition-colors mt-0.5"
                        title="Click to show/hide uncertainty explanation"
                      >
                        <Info className="w-4 h-4 text-blue-500" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Uncertainty</p>
                      <p className="text-sm font-medium font-mono">{(uncertainty * 100).toFixed(0)}%</p>
                      {showUncertaintyExplanation && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-600 leading-relaxed">
                          <p>
                            <strong>Uncertainty</strong> = 1 − Coverage. It represents the share of weighted
                            evidence that is missing from the geological comparison. Lower uncertainty means the
                            backend had a more complete basis for scoring this sample.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Score Gap */}
                {quality && quality.gap !== undefined && (
                  <div className="flex items-start gap-2">
                    <div className="relative group flex-shrink-0">
                      <button
                        onClick={() => setShowGapExplanation(!showGapExplanation)}
                        className="hover:bg-blue-50 rounded p-0.5 transition-colors mt-0.5"
                        title="Click to show/hide score gap explanation"
                      >
                        <Info className="w-4 h-4 text-blue-500" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Score Gap</p>
                      <p className="text-sm font-medium font-mono">{(quality.gap * 100).toFixed(0)}%</p>
                      {showGapExplanation && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-600 leading-relaxed">
                          <p className="mb-2">
                            <strong>Score Gap</strong> is the difference between the best candidate and the
                            second-best candidate for the same sample.
                          </p>
                          <ul className="list-disc ml-4 space-y-0.5">
                            <li><strong>Gap &lt; 10%:</strong> backend treats the result as ambiguous unless explicit literature support exists.</li>
                            <li><strong>Gap ≥ 20%:</strong> can support medium confidence when score and coverage are also sufficient.</li>
                            <li><strong>Gap ≥ 30%:</strong> can support high confidence when the rest of the evidence is strong enough.</li>
                          </ul>
                          <p className="mt-1 text-gray-500 italic">
                            A large gap helps confidence, but gap alone does not determine the final label.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Confidence Level */}
                <div className="flex items-start gap-2">
                  <div className="relative group flex-shrink-0">
                    <button
                      onClick={() => setShowConfidenceExplanation(!showConfidenceExplanation)}
                      className="hover:bg-blue-50 rounded p-0.5 transition-colors mt-0.5"
                      title="Click to show/hide confidence level explanation"
                    >
                      <Info className="w-4 h-4 text-blue-500" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Confidence Level</p>
                     <div 
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
                        style={{ 
                          backgroundColor: `${color}20`,
                          color: color,
                          border: `1px solid ${color}40`
                        }}
                      >
                        <span className="text-sm">{icon}</span>
                        <span>{label}</span>
                      </div>
                    {showConfidenceExplanation && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-600 leading-relaxed space-y-2">
                        <p className="font-semibold text-gray-800">Confidence is not the same thing as score.</p>
                        
                        <p className="text-gray-700">
                          The backend first decides whether a volcano can be assigned at all, then assigns a
                          confidence label based on score strength, weighted coverage, ambiguity, spatial
                          uncertainty, and optional literature support.
                        </p>

                        <div className="bg-white p-2 rounded border border-blue-300">
                          <p className="font-semibold text-blue-800 mb-1">Stage 0: Assignment</p>
                          <ul className="text-[11px] space-y-0.5 ml-3">
                            <li>• <strong>Best candidate score ≥ 40%</strong></li>
                            <li>• <strong>Coverage ≥ 30%</strong></li>
                          </ul>
                          <p className="text-[11px] text-gray-600 mt-1">
                            If either condition fails, the backend keeps the sample unmatched. This is a valid result, not an error.
                          </p>
                        </div>

                        {/* Stage 1: Data Sufficiency */}
                        <div className="bg-white p-2 rounded border border-blue-300">
                          <p className="font-semibold text-blue-800 mb-1">Stage 1: Data Sufficiency (blocking)</p>
                          <ul className="text-[11px] space-y-0.5 ml-3">
                            <li>• <strong>Coverage &lt; 40%</strong> → <span className="text-red-600 font-semibold">Low confidence</span> (cannot be raised)</li>
                            <li className="text-gray-600">→ Missing too many dimensions prevents reliable assessment</li>
                          </ul>
                        </div>

                        {/* Stage 2: Ambiguity */}
                        <div className="bg-white p-2 rounded border border-blue-300">
                          <p className="font-semibold text-blue-800 mb-1">Stage 2: Ambiguity Check (blocking)</p>
                          <ul className="text-[11px] space-y-0.5 ml-3">
                            <li>• <strong>Score Gap &lt; 10%</strong> → <span className="text-orange-600 font-semibold">Low confidence</span> (unless literature)</li>
                            <li className="text-gray-600">→ Multiple similar candidates = uncertain match</li>
                            <li>• <strong>Spatial uncertainty &gt; 70% and coverage &lt; 60%</strong> → <span className="text-orange-600 font-semibold">Low confidence</span></li>
                            <li className="text-gray-600">→ Unreliable location weakens other evidence</li>
                          </ul>
                        </div>

                        {/* Stage 3: Geological Strength */}
                        <div className="bg-white p-2 rounded border border-blue-300">
                          <p className="font-semibold text-blue-800 mb-1">Stage 3: Geological Strength (score thresholds)</p>
                          <p className="text-[11px] text-gray-600 mb-1">Only evaluated if data is sufficient and unambiguous:</p>
                          <ul className="text-[11px] space-y-1 ml-3">
                            <li>
                              <strong className="text-green-700">High:</strong> Score ≥80%, Coverage ≥70%, Gap ≥30%
                              <div className="text-gray-600 ml-3">→ Strong multi-dimensional evidence</div>
                            </li>
                            <li>
                              <strong className="text-blue-700">Medium:</strong> Score ≥50%, Coverage ≥40%, Gap ≥20%
                              <div className="text-gray-600 ml-3">→ Reasonable but incomplete evidence</div>
                            </li>
                            <li>
                              <strong className="text-orange-700">Low:</strong> Below Medium thresholds
                              <div className="text-gray-600 ml-3">→ Weak or inconsistent evidence</div>
                            </li>
                          </ul>
                        </div>

                        {/* Literature Evidence */}
                        <div className="bg-indigo-50 p-2 rounded border border-indigo-300">
                          <p className="font-semibold text-indigo-800 mb-1">📚 Literature Evidence</p>
                          <ul className="text-[11px] space-y-0.5 ml-3">
                            <li>• Can <strong>raise confidence by one level</strong> (Low→Medium or Medium→High)</li>
                            <li>• <strong>Cannot override</strong> missing data or ambiguity blocks</li>
                            <li className="text-gray-600">→ It supports confidence only; it does not change the geological score.</li>
                          </ul>
                        </div>

                        {/* Why This Matters */}
                        <div className="bg-amber-50 p-2 rounded border border-amber-300 mt-2">
                          <p className="font-semibold text-amber-800 mb-1">⚠️ Why this matters</p>
                          <p className="text-[11px] text-gray-700">
                            A sample with <strong>Score=85%</strong> might still be <strong>Low confidence</strong> if:
                          </p>
                          <ul className="text-[11px] ml-3 mt-1">
                            <li>• Too little weighted evidence is available (coverage &lt;40%)</li>
                            <li>• Another volcano scores 82% (ambiguous, gap=3%)</li>
                            <li>• Spatial data is highly uncertain</li>
                          </ul>
                          <p className="text-[11px] text-gray-700 mt-1">
                            <strong>Confidence reflects reliability, not just strength.</strong>
                          </p>
                        </div>

                        <p className="text-[10px] text-gray-500 italic mt-2">
                          Confidence reflects reliability of the assignment, not just the size of the score.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Literature Evidence */}
                {matching_metadata.evidence?.lit && matching_metadata.evidence.lit.match && (
                  <div className="flex items-start gap-2">
                    <div className="relative group flex-shrink-0">
                      <button
                        onClick={() => setShowLiteratureExplanation(!showLiteratureExplanation)}
                        className="hover:bg-blue-50 rounded p-0.5 transition-colors mt-0.5"
                        title="Click to show/hide literature explanation"
                      >
                        <Info className="w-4 h-4 text-blue-500" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Supporting Literature Evidence</p>
                      <p className="text-sm font-medium font-mono">
                        {(matching_metadata.evidence.lit.conf * 100).toFixed(0)}%
                      </p>
                      {showLiteratureExplanation && (
                        <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded text-xs text-gray-600 leading-relaxed">
                          <p className="font-semibold mb-1">Literature Evidence</p>
                          <p>
                            This is supporting text-based evidence derived from the sample citation metadata.
                            It can raise confidence, but it does not modify the geological score and does not
                            force an assignment on its own.
                          </p>
                          {matching_metadata.evidence.lit.type && matching_metadata.evidence.lit.type !== 'none' && (
                            <p className="mt-1.5 text-indigo-600">
                              <strong>Match type:</strong> {matching_metadata.evidence.lit.type}
                            </p>
                          )}
                          {matching_metadata.evidence.lit.src && (
                            <p className="mt-1.5 text-indigo-600">
                              <strong>Source:</strong> {matching_metadata.evidence.lit.src}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Tectonic Setting */}
          {tectonicSettingDisplay && (
            <div className="flex items-start gap-2">
              <Layers className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Tectonic Setting</p>
                <p className="text-sm font-medium">{tectonicSettingDisplay}</p>
              </div>
            </div>
          )}

          {/* References */}
          {references && (
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">References</p>
                <p className="text-sm font-medium">{references}</p>
              </div>
            </div>
          )}
        </div>

        {/* Chemical Composition */}
        {majorOxides.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Chemical Composition</h4>
            <div className="grid grid-cols-2 gap-2">
              {majorOxides.map((oxide) => (
                <div key={oxide.name} className="flex justify-between text-sm">
                  <span className="text-gray-600">{oxide.name}:</span>
                  <span className="font-medium">{formatOxide(oxide.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
          {onAddToSelection && (
            <button
              onClick={() => onAddToSelection(sample)}
              disabled={isSelected}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                isSelected
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-volcano-600 text-white hover:bg-volcano-700'
              }`}
            >
              {isSelected ? 'Already in Selection' : 'Add to Selection'}
            </button>
          )}
          {/* Future: Add "View in TAS/AFM" button for Sprint 2.5 Day 3 */}
        </div>
      </div>
    </div>
  );
};
