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

  const { sample_id, db, rock_type, tectonic_setting, geometry, oxides, matching_metadata, references } = sample;
  const [longitude, latitude] = geometry.coordinates;

  // Extract tectonic setting display value (support both legacy string and new nested structure)
  const tectonicSettingDisplay = typeof tectonic_setting === 'string' 
    ? tectonic_setting 
    : tectonic_setting?.ui || 'Unknown';
  
  const tectonicSettingSample = typeof tectonic_setting === 'object' && tectonic_setting !== null
    ? tectonic_setting.sample
    : undefined;

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

            // Determine which components are available
            const components = [
              { key: 'sp', label: 'Spatial', value: scores.sp, weight: 0.4 },
              { key: 'te', label: 'Tectonic', value: scores.te, weight: 0.2 },
              { key: 'pe', label: 'Petrological', value: scores.pe, weight: 0.3 },
              { key: 'ti', label: 'Temporal', value: scores.ti, weight: 0.1 },
            ].filter(c => c.value !== undefined);

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
                    <p className="text-sm font-medium font-mono">{(scores.final * 100).toFixed(0)}%</p>
                    {showMatchScoreExplanation && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-600 leading-relaxed">
                        <p className="font-semibold mb-2">How is this calculated?</p>
                        
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
                              {c.key === 'sp' && showSpatialExplanation && (
                                <div className="mt-1 pl-2 text-xs bg-white p-2 rounded border border-blue-200">
                                  <p className="font-semibold mb-1">Spatial Score Calculation:</p>
                                  <p className="mb-1">Uses exponential decay based on distance:</p>
                                  <p className="font-mono text-blue-600">
                                    score = exp(-distance_km / decay_constant)
                                  </p>
                                  
                                  {/* Dynamic Example */}
                                  {(() => {
                                    const distance = getDistance(matching_metadata);
                                    const decayConstant = 30; // km
                                    if (distance !== undefined) {
                                      const calculatedScore = Math.exp(-distance / decayConstant);
                                      return (
                                        <div className="bg-blue-50 p-2 rounded border border-blue-300 mt-2 space-y-1">
                                          <p className="font-semibold text-gray-700">For this sample:</p>
                                          <p>
                                            Distance = <span className="font-mono text-blue-600">{distance.toFixed(1)} km</span>
                                          </p>
                                          <p className="font-mono text-sm">
                                            score = exp(-{distance.toFixed(1)} / {decayConstant})
                                          </p>
                                          <p className="font-mono text-sm">
                                            = exp({(-distance / decayConstant).toFixed(3)})
                                          </p>
                                          <p className="font-mono text-sm font-semibold text-blue-700">
                                            = {calculatedScore.toFixed(3)} = {(calculatedScore * 100).toFixed(1)}%
                                          </p>
                                        </div>
                                      );
                                    }
                                    return (
                                      <p className="mt-1 text-gray-500 italic">
                                        Distance data not available
                                      </p>
                                    );
                                  })()}
                                </div>
                              )}
                              
                              {/* Tectonic Score Explanation */}
                              {c.key === 'te' && showTectonicExplanation && (
                                <div className="mt-1 pl-2 text-xs bg-white p-2 rounded border border-blue-200">
                                  <p className="font-semibold mb-1">Tectonic Score Calculation:</p>
                                  <p className="mb-1">Based on regime compatibility matrix:</p>
                                  <ul className="list-disc ml-4 space-y-0.5">
                                    <li><strong>Regime match:</strong> subduction-subduction = 1.0, rift-intraplate = 0.7, incompatible = 0.0</li>
                                    <li><strong>Crust modifier:</strong> same crust = ×1.0, different = ×0.75, unknown = ×0.85</li>
                                  </ul>
                                  
                                  {/* Dynamic Example */}
                                  {(() => {
                                    // Normalize volcano tectonic setting (matching backend logic)
                                    const normalizeTectonicSetting = (rawTectonic: string | undefined): {regime: string, crust: string, subtype: string} | null => {
                                      if (!rawTectonic || rawTectonic === 'unknown' || rawTectonic === 'nan') {
                                        return {regime: 'unknown', crust: 'unknown', subtype: 'unknown'};
                                      }
                                      
                                      let s = rawTectonic.toLowerCase().trim();
                                      
                                      // Handle GEOROC "nan / <actual_setting>" prefix
                                      if (s.startsWith('nan / ')) {
                                        s = s.substring(6);
                                      }
                                      
                                      // Split GEOROC "DOMAIN / DETAIL" structure
                                      let domain = s;
                                      let detail = '';
                                      if (s.includes(' / ')) {
                                        const parts = s.split(' / ', 2);
                                        domain = parts[0].trim();
                                        detail = parts[1].trim();
                                      }
                                      
                                      // --- REGIME DETECTION (precedence-based) ---
                                      let regime = 'unknown';
                                      
                                      // 1. Strong domain-based mapping (highest priority)
                                      if (['convergent margin', 'volcanic arc', 'forearc', 'back-arc basin', 'subduction zone'].includes(domain)) {
                                        regime = 'subduction';
                                      } else if (['rift volcanics', 'continental rift', 'rift valley', 'spreading center', 'divergent margin', 'transform fault', 'fracture zone'].includes(domain)) {
                                        regime = 'rift';
                                      } else if (['intraplate volcanics', 'ocean island', 'seamount', 'oceanic plateau', 'continental flood basalt', 'ocean-basin flood basalt'].includes(domain)) {
                                        regime = 'intraplate';
                                      }
                                      // 2. Keyword-based inference
                                      else if (/subduction|trench|forearc|back-arc|backarc|volcanic arc|island arc|continental arc|convergent/.test(s)) {
                                        regime = 'subduction';
                                      } else if (/rift|spreading|ridge|divergent|triple junction/.test(s)) {
                                        regime = 'rift';
                                      } else if (/traps|igneous province|large igneous|flood basalt|hotspot|hot spot|seamount|ocean island|plume|craton|shield|intraplate|abyssal|ocean basin|ophiolite|old oceanic/.test(s)) {
                                        regime = 'intraplate';
                                      }
                                      // 3. Named features (last resort)
                                      else {
                                        const namedArcs = ['andean arc', 'sunda arc', 'izu-bonin arc', 'mariana arc', 'kamchatka arc', 'aleutian arc', 'kermadec arc', 'tonga arc', 'cascades', 'lesser antilles', 'scotia arc', 'ryukyu arc', 'honshu arc', 'kurile arc', 'luzon arc', 'banda arc', 'new hebrides arc', 'vanuatu arc', 'bismarck arc', 'aegean arc', 'aeolian arc', 'calabrian arc'];
                                        const namedLIPs = ['deccan', 'siberian', 'parana', 'karoo', 'etendeka', 'ontong java', 'kerguelen', 'caribbean-colombian plateau', 'emeishan', 'ethiopian plateau', 'north atlantic igneous'];
                                        const knownHotspots = ['iceland', 'azores', 'canary', 'cape verde', 'ascension', 'galapagos', 'hawaiian', 'reunion', 'mascarene', 'comoros', 'society islands', 'samoan', 'marquesas', 'austral-cook'];
                                        
                                        if (namedArcs.some(arc => s.includes(arc))) regime = 'subduction';
                                        else if (namedLIPs.some(lip => s.includes(lip))) regime = 'intraplate';
                                        else if (knownHotspots.some(hs => s.includes(hs))) regime = 'intraplate';
                                      }
                                      
                                      // --- CRUST DETECTION ---
                                      let crust = 'unknown';
                                      
                                      // 1. Explicit thickness markers
                                      if (/< 15 km|<15 km/.test(s)) {
                                        crust = 'oceanic';
                                      } else if (/> 25 km|>25 km/.test(s)) {
                                        crust = 'continental';
                                      } else if (/15-25 km|15-25/.test(s)) {
                                        crust = 'intermediate';
                                      }
                                      // 2. Strong geological indicators
                                      else if (/craton|shield|archean|continental/.test(s)) {
                                        crust = 'continental';
                                      } else if (/abyssal|ocean basin|seamount|oceanic|ophiolite/.test(s)) {
                                        crust = 'oceanic';
                                      }
                                      
                                      if (regime === 'unknown') {
                                        return {regime: 'unknown', crust: 'unknown', subtype: 'unknown'};
                                      }
                                      
                                      return {regime, crust, subtype: domain};
                                    };
                                    
                                    // Sample tectonic data (already normalized by backend)
                                    const sampleTectonicRaw = tectonicSettingDisplay;
                                    const sampleRegime = tectonicSettingSample?.r; // r = regime
                                    const sampleCrust = tectonicSettingSample?.c || 'unknown'; // c = crust
                                    
                                    // Volcano tectonic data - check tectonic_setting.volcano or tectonic_setting.volcano.ui
                                    let volcanoTectonicRaw: string | undefined;
                                    if (typeof tectonic_setting === 'object' && tectonic_setting !== null) {
                                      // Check for volcano field in tectonic_setting
                                      if (typeof (tectonic_setting as any).volcano === 'string') {
                                        volcanoTectonicRaw = (tectonic_setting as any).volcano;
                                      } else if (typeof (tectonic_setting as any).volcano === 'object' && (tectonic_setting as any).volcano?.ui) {
                                        volcanoTectonicRaw = (tectonic_setting as any).volcano.ui;
                                      }
                                    }
                                    
                                    // Fallback to matching_metadata
                                    if (!volcanoTectonicRaw) {
                                      volcanoTectonicRaw = tectonic_setting?.ui;
                                    }
                                    
                                    // Check if we have the required data
                                    if (!sampleRegime) {
                                      return (
                                        <div className="mt-2 text-gray-500 italic space-y-1">
                                          <p>Sample tectonic regime not available</p>
                                          <p className="text-[10px]">tectonicSettingSample: {JSON.stringify(tectonicSettingSample)}</p>
                                          <p className="text-[10px]">Full tectonic_setting: {JSON.stringify(tectonic_setting)}</p>
                                        </div>
                                      );
                                    }
                                    
                                    if (!volcanoTectonicRaw) {
                                      return (
                                        <div className="mt-2 text-gray-500 italic space-y-1">
                                          <p>Volcano tectonic setting not available in API response</p>
                                          <p className="text-[10px]">tectonic_setting object: {JSON.stringify(tectonic_setting)}</p>
                                          <p className="text-[10px]">volcano object: {JSON.stringify(matching_metadata?.volcano)}</p>
                                          <p className="text-xs text-amber-600 mt-1">⚠️ The API needs to include volcano tectonic setting data</p>
                                        </div>
                                      );
                                    }
                                    
                                    // Normalize volcano tectonic setting
                                    const volcanoNorm = normalizeTectonicSetting(volcanoTectonicRaw);
                                    
                                    if (!volcanoNorm || volcanoNorm.regime === 'unknown') {
                                      return (
                                        <p className="mt-2 text-gray-500 italic">
                                          Unable to normalize volcano tectonic data
                                        </p>
                                      );
                                    }
                                    
                                    const volcanoRegime = volcanoNorm.regime;
                                    const volcanoCrust = volcanoNorm.crust;
                                    
                                    // Regime compatibility lookup
                                    const regimeCompatibilityMap: {[key: string]: {[key: string]: number}} = {
                                      'subduction': {'subduction': 1.0, 'rift': 0.0, 'intraplate': 0.0},
                                      'rift': {'subduction': 0.0, 'rift': 1.0, 'intraplate': 0.7},
                                      'intraplate': {'subduction': 0.0, 'rift': 0.7, 'intraplate': 1.0}
                                    };
                                    
                                    const regimeScore = regimeCompatibilityMap[sampleRegime]?.[volcanoRegime] ?? 0;
                                    
                                    // Crust modifier
                                    let crustModifier = 0.85;
                                    if (sampleCrust === 'unknown' || volcanoCrust === 'unknown') {
                                      crustModifier = 0.85;
                                    } else if (sampleCrust === volcanoCrust) {
                                      crustModifier = 1.0;
                                    } else {
                                      crustModifier = 0.75;
                                    }
                                    
                                    const finalScore = regimeScore * crustModifier;
                                    
                                    return (
                                      <div className="bg-blue-50 p-2 rounded border border-blue-300 mt-2 space-y-1">
                                        <p className="font-semibold text-gray-700">For this sample:</p>
                                        <p className="text-[10px] text-gray-500">
                                          Raw: "{sampleTectonicRaw}"
                                        </p>
                                        <p>
                                          Sample (normalized): <span className="font-mono text-blue-600">{sampleRegime}</span> / 
                                          <span className="font-mono text-blue-600">{sampleCrust}</span>
                                        </p>
                                        <p className="text-[10px] text-gray-500">
                                          Volcano raw: "{volcanoTectonicRaw}"
                                        </p>
                                        <p>
                                          Volcano (normalized): <span className="font-mono text-green-600">{volcanoRegime}</span> / 
                                          <span className="font-mono text-green-600">{volcanoCrust}</span>
                                        </p>
                                        <p className="font-mono text-sm">
                                          regime_compatibility = {regimeScore.toFixed(2)}
                                        </p>
                                        <p className="font-mono text-sm">
                                          crust_modifier = {crustModifier.toFixed(2)}
                                        </p>
                                        <p className="font-mono text-sm font-semibold text-blue-700">
                                          score = {regimeScore.toFixed(2)} × {crustModifier.toFixed(2)} = {finalScore.toFixed(3)} = {(finalScore * 100).toFixed(1)}%
                                        </p>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                              
                              {/* Petrological Score Explanation */}
                              {c.key === 'pe' && showPetrologicalExplanation && (
                                <div className="mt-1 pl-2 text-xs bg-white p-2 rounded border border-blue-200">
                                  <p className="font-semibold mb-1">Petrological Score Calculation:</p>
                                  <p className="mb-1">Based on rock type compatibility:</p>
                                  <ul className="list-disc ml-4 space-y-0.5">
                                    <li><strong>Direct match:</strong> same rock type = 1.0</li>
                                    <li><strong>Family match:</strong> same family (e.g., BASALTIC) = 0.7</li>
                                    <li><strong>No match:</strong> = 0.0</li>
                                  </ul>
                                  
                                  {/* Dynamic Example */}
                                  {(() => {
                                    if (!rock_type) {
                                      return (
                                        <p className="mt-2 text-gray-500 italic">
                                          Rock type data not available
                                        </p>
                                      );
                                    }
                                    
                                    // Function to normalize rock type (from Python backend logic)
                                    const normalizeRockType = (rock: string): string | null => {
                                      if (!rock) return null;
                                      let normalized = rock.toUpperCase().trim();
                                      
                                      // Handle special cases
                                      if (['NO DATA (CHECKED)', 'NO DATA', 'UNKNOWN', 'NAN'].includes(normalized)) {
                                        return null;
                                      }
                                      
                                      // Preserve hyphen for TEPHRI-PHONOLITE
                                      if (normalized.includes('TEPHRI') && normalized.includes('PHONOLITE')) {
                                        // Keep as-is
                                      } else {
                                        normalized = normalized.replace(/-/g, '');
                                      }
                                      
                                      // Map specific variations to canonical forms
                                      const mapping: {[key: string]: string} = {
                                        'PICROBASALT': 'BASALT',
                                        'BASALTIC ANDESITE': 'BASALTIC ANDESITE',
                                        'TRACHYBASALT': 'TRACHYBASALT',
                                        'TEPHRITE BASANITE': 'TEPHRITE/BASANITE',
                                        'TEPHRITE/BASANITE': 'TEPHRITE/BASANITE',
                                        'TEPHRIPHONE': 'TEPHRI-PHONOLITE',
                                        'TEPHRIPHANOLITE': 'TEPHRI-PHONOLITE',
                                        'PHONOTEPHRITE': 'PHONOTEPHRITE',
                                        'TRACHYDACITE': 'TRACHYTE/TRACHYDACITE',
                                      };
                                      
                                      return mapping[normalized] || normalized;
                                    };
                                    
                                    // Rock families (from Python backend)
                                    const rockFamilies: {[key: string]: string[]} = {
                                      'BASALTIC': ['BASALT', 'PICROBASALT', 'BASALTIC ANDESITE', 'TRACHYBASALT', 'BASALTIC TRACHYANDESITE'],
                                      'ANDESITIC': ['ANDESITE', 'DACITE', 'TRACHYANDESITE', 'TRACHYTE/TRACHYDACITE'],
                                      'FELSIC': ['RHYOLITE', 'PHONOLITE', 'PHONO-TEPHRITE', 'TEPHRI-PHONOLITE', 'TRACHYTE/TRACHYDACITE'],
                                      'FOIDITE': ['FOIDITE'],
                                      'BASANITE': ['TEPHRITE/BASANITE', 'TRACHYBASALT', 'TEPHRITE', 'BASANITE']
                                    };
                                    
                                    // Get volcano rock type from matching_metadata
                                    const volcanoRockTypeRaw = matching_metadata?.volcano?.rock_type;
                                    
                                    if (!volcanoRockTypeRaw) {
                                      return (
                                        <p className="mt-2 text-gray-500 italic">
                                          Volcano rock type not available
                                        </p>
                                      );
                                    }
                                    
                                    // Normalize sample rock type
                                    const normalizedSample = normalizeRockType(rock_type);
                                    if (!normalizedSample) {
                                      return (
                                        <p className="mt-2 text-gray-500 italic">
                                          Sample rock type invalid
                                        </p>
                                      );
                                    }
                                    
                                    // Split volcano rock type by "/" and normalize each part
                                    const volcanoParts = volcanoRockTypeRaw.split('/').map(p => p.trim());
                                    const normalizedVolcanoTypes = volcanoParts
                                      .map(part => normalizeRockType(part))
                                      .filter(t => t !== null) as string[];
                                    
                                    if (normalizedVolcanoTypes.length === 0) {
                                      return (
                                        <p className="mt-2 text-gray-500 italic">
                                          Volcano rock type invalid
                                        </p>
                                      );
                                    }
                                    
                                    // Calculate score and match type
                                    let bestScore = 0;
                                    let matchType = 'no match';
                                    let matchedFamily = '';
                                    
                                    for (const normalizedVolcano of normalizedVolcanoTypes) {
                                      // Direct match
                                      if (normalizedSample === normalizedVolcano) {
                                        bestScore = 1.0;
                                        matchType = 'direct match';
                                        break;
                                      }
                                      
                                      // Family match
                                      for (const [family, rocks] of Object.entries(rockFamilies)) {
                                        if (rocks.includes(normalizedSample) && rocks.includes(normalizedVolcano)) {
                                          if (bestScore < 0.7) {
                                            bestScore = 0.7;
                                            matchType = 'family match';
                                            matchedFamily = family;
                                          }
                                          break;
                                        }
                                      }
                                    }
                                    
                                    return (
                                      <div className="bg-blue-50 p-2 rounded border border-blue-300 mt-2 space-y-1">
                                        <p className="font-semibold text-gray-700">For this sample:</p>
                                        <p>
                                          Sample rock: <span className="font-mono text-blue-600">{rock_type}</span>
                                          {normalizedSample !== rock_type.toUpperCase() && (
                                            <span className="text-gray-500 text-[10px]"> (normalized: {normalizedSample})</span>
                                          )}
                                        </p>
                                        <p>
                                          Volcano rock: <span className="font-mono text-green-600">{volcanoRockTypeRaw}</span>
                                          {normalizedVolcanoTypes.length > 1 && (
                                            <span className="text-gray-500 text-[10px]"> (multiple types)</span>
                                          )}
                                        </p>
                                        <p className="font-mono text-sm">
                                          Match type: {matchType}
                                          {matchedFamily && <span className="text-gray-600"> ({matchedFamily} family)</span>}
                                        </p>
                                        <p className="font-mono text-sm font-semibold text-blue-700">
                                          score = {bestScore.toFixed(1)} = {(bestScore * 100).toFixed(0)}%
                                        </p>
                                        
                                        {/* Show rock families for reference */}
                                        {matchedFamily && (
                                          <div className="mt-2 pt-2 border-t border-blue-200">
                                            <p className="text-[10px] text-gray-600 font-semibold">{matchedFamily} family includes:</p>
                                            <p className="text-[10px] text-gray-500">{rockFamilies[matchedFamily].join(', ')}</p>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                              
                              {/* Temporal Score Explanation */}
                              {c.key === 'ti' && showTemporalExplanation && (
                                <div className="mt-1 pl-2 text-xs bg-white p-2 rounded border border-blue-200">
                                  <p className="font-semibold mb-1">Temporal Score Calculation:</p>
                                  <p className="mb-1">All GVP volcanoes are Holocene (0-11,700 years BP). Score measures temporal compatibility:</p>
                                  <ul className="list-disc ml-4 space-y-0.5">
                                    <li><strong>Dated eruptions:</strong> within Holocene = 1.0, outside = 0.0</li>
                                    <li><strong>Age classes:</strong> Holocene/Recent = 1.0, Pleistocene = 0.7, Neogene = 0.3, older = 0.0</li>
                                    <li><strong>Precision modifier:</strong> applies gentle adjustment (0.85-1.15) based on data quality</li>
                                  </ul>
                                  
                                  {/* Dynamic Example */}
                                  {(() => {
                                    const HOLOCENE_MIN = 0;
                                    const HOLOCENE_MAX = 11700;
                                    
                                    // Extract temporal data from sample
                                    const geologicalAge = sample.geological_age;
                                    const eruptionDate = sample.eruption_date;
                                    
                                    // Helper function to normalize age strings (from Python backend)
                                    const normalizeAgeString = (ageText: string | undefined): string | null => {
                                      if (!ageText) return null;
                                      const normalized = ageText.toUpperCase().trim();
                                      
                                      // Skip invalid values
                                      if (['NO DATA (CHECKED)', 'NO DATA', 'UNKNOWN', 'NAN'].includes(normalized)) {
                                        return null;
                                      }
                                      
                                      // Basic normalization
                                      return normalized
                                        .replace(/[^\w\s]/g, '')  // Remove special chars
                                        .replace(/\s+/g, ' ');    // Normalize spaces
                                    };
                                    
                                    // Try dated eruption first (point measurement)
                                    if (eruptionDate?.year !== undefined) {
                                      const yearsBP = 2026 - eruptionDate.year;
                                      const withinHolocene = yearsBP >= HOLOCENE_MIN && yearsBP <= HOLOCENE_MAX;
                                      const baseScore = withinHolocene ? 1.0 : 0.0;
                                      
                                      // Calculate precision (high for dated eruptions)
                                      let precision = 0.95; // Very high precision for dated eruptions
                                      
                                      // Bonus for month/day precision (GEOROC style)
                                      if (eruptionDate.month !== undefined) {
                                        precision += 0.02;
                                      }
                                      if (eruptionDate.day !== undefined) {
                                        precision += 0.03;
                                      }
                                      
                                      // Penalize future dates slightly
                                      const currentYear = 2026;
                                      // Database-specific minimum precision (GEOROC tends to be more precise)

                                      const min_precision_db = db === 'GEOROC' ? 0.3 : 0.2;

                                      if (eruptionDate.year > currentYear) {
                                        precision = Math.max(min_precision_db, precision - 0.10);
                                      }
                                      
                                      // Clamp precision using database-specific minimum
                                      precision = Math.max(min_precision_db, Math.min(1.0, precision));
                                      
                                      // Apply precision modifier (gentle adjustment)
                                      // modifier range: 0.85 to 1.15 (when precision varies from 0.0 to 1.0)
                                      const modifier = 1.0 + (precision - 0.5) * 0.3;
                                      const finalScore = baseScore * modifier;
                                      
                                      // Clamp final score
                                      const clampedScore = Math.max(0.0, Math.min(1.0, finalScore));
                                      
                                      return (
                                        <div className="bg-blue-50 p-2 rounded border border-blue-300 mt-2 space-y-1">
                                          <p className="font-semibold text-gray-700">For this sample (dated eruption):</p>
                                          <p className="text-[10px] text-gray-500">Data source: eruption_date</p>
                                          <p>
                                            Eruption year: <span className="font-mono text-blue-600">{eruptionDate.year}</span>
                                            {eruptionDate.month && eruptionDate.day && (
                                              <span className="text-gray-500"> ({eruptionDate.month}/{eruptionDate.day})</span>
                                            )}
                                          </p>
                                          <p>
                                            Age: <span className="font-mono text-blue-600">{yearsBP.toFixed(0)} years BP</span>
                                          </p>
                                          <p>
                                            Holocene range: <span className="font-mono text-green-600">{HOLOCENE_MIN}-{HOLOCENE_MAX} years BP</span>
                                          </p>
                                          <p className="font-mono text-sm">
                                            Point {withinHolocene ? 'within' : 'outside'} Holocene → base score = {baseScore.toFixed(1)}
                                          </p>
                                          
                                          {/* Precision calculation */}
                                          <div className="mt-2 pt-2 border-t border-blue-200">
                                            <p className="font-semibold text-gray-700 mb-1">Precision modifier:</p>
                                            <p>
                                              Data quality: <span className="font-mono text-blue-600">{precision.toFixed(2)}</span>
                                              <span className="text-gray-500 text-[10px]">
                                                {' '}(0.95 base
                                                {eruptionDate.month && ' +0.02 month'}
                                                {eruptionDate.day && ' +0.03 day'})
                                              </span>
                                            </p>
                                            <p className="font-mono text-sm">
                                              modifier = 1.0 + ({precision.toFixed(2)} - 0.5) × 0.3 = {modifier.toFixed(3)}
                                            </p>
                                            <p className="font-mono text-sm">
                                              final = {baseScore.toFixed(1)} × {modifier.toFixed(3)} = {finalScore.toFixed(3)}
                                            </p>
                                          </div>
                                          
                                          <p className="font-mono text-sm font-semibold text-blue-700 pt-2 border-t border-blue-200">
                                            Final score = {clampedScore.toFixed(3)} = {(clampedScore * 100).toFixed(0)}%
                                          </p>
                                        </div>
                                      );
                                    }
                                    
                                    // Fallback to geological age classification
                                    if (geologicalAge?.age) {
                                      const agePrefix = geologicalAge.age_prefix || '';
                                      const fullAge = agePrefix ? `${agePrefix} ${geologicalAge.age}` : geologicalAge.age;
                                      const normalized = normalizeAgeString(fullAge);
                                      
                                      if (!normalized) {
                                        return (
                                          <p className="mt-2 text-gray-500 italic">
                                            Invalid geological age data
                                          </p>
                                        );
                                      }
                                      
                                      // Score by geological period (from Python backend logic)
                                      let baseScore = 0;
                                      let scoreReason = '';
                                      
                                      if (normalized.includes('HOLOCENE') || normalized.includes('RECENT')) {
                                        baseScore = 1.0;
                                        scoreReason = 'Holocene/Recent period';
                                      } else if (normalized.includes('PLEISTOCENE')) {
                                        baseScore = 0.7;
                                        scoreReason = 'Pleistocene (potentially compatible)';
                                      } else if (normalized.includes('PLIOCENE') || normalized.includes('MIOCENE') || normalized.includes('NEOGENE')) {
                                        baseScore = 0.3;
                                        scoreReason = 'Neogene (unlikely but possible)';
                                      } else {
                                        baseScore = 0.0;
                                        scoreReason = 'Pre-Neogene (incompatible)';
                                      }
                                      
                                      // Calculate precision (low for textual ages, with prefix refinement)
                                      // Database-specific minimum precision (GEOROC tends to be more precise)
                                      const min_precision_db = db === 'GEOROC' ? 0.3 : 0.2;
                                      let precision = min_precision_db; // Base precision for textual data (database-specific)
                                      
                                      // Refinement by age prefix (PetDB style)
                                      if (agePrefix) {
                                        const prefixUpper = agePrefix.toUpperCase();
                                        if (['LATE', 'UPPER', 'RECENT'].includes(prefixUpper)) {
                                          precision += 0.05;
                                        } else if (['EARLY', 'LOWER'].includes(prefixUpper)) {
                                          precision -= 0.05;
                                        }
                                      }
                                      
                                      // Clamp precision using database-specific minimum
                                      precision = Math.max(min_precision_db, Math.min(0.95, precision));
                                      
                                      // Apply precision modifier
                                      const modifier = 1.0 + (precision - 0.5) * 0.3;
                                      let finalScore = baseScore * modifier;
                                      
                                      // Textual age class scores are capped at 0.8 to avoid overconfidence
                                      const cappedScore = Math.min(finalScore, 0.8);
                                      
                                      // Clamp to valid range
                                      const clampedScore = Math.max(0.0, Math.min(1.0, cappedScore));
                                      
                                      return (
                                        <div className="bg-blue-50 p-2 rounded border border-blue-300 mt-2 space-y-1">
                                          <p className="font-semibold text-gray-700">For this sample (age class):</p>
                                          <p className="text-[10px] text-gray-500">Data source: geological_age (textual)</p>
                                          <p>
                                            Age: <span className="font-mono text-blue-600">{fullAge}</span>
                                            {normalized !== fullAge.toUpperCase() && (
                                              <span className="text-gray-500 text-[10px]"> (normalized: {normalized})</span>
                                            )}
                                          </p>
                                          <p className="font-mono text-sm">
                                            {scoreReason} → base score = {baseScore.toFixed(1)}
                                          </p>
                                          
                                          {/* Precision calculation */}
                                          <div className="mt-2 pt-2 border-t border-blue-200">
                                            <p className="font-semibold text-gray-700 mb-1">Precision modifier:</p>
                                            <p>
                                              Data quality: <span className="font-mono text-blue-600">{precision.toFixed(2)}</span>
                                              <span className="text-gray-500 text-[10px]">
                                                {' '}({min_precision_db.toFixed(2)} {db} base
                                                {agePrefix && (['LATE', 'UPPER', 'RECENT'].includes(agePrefix.toUpperCase()) ? ' +0.05 prefix' : 
                                                               ['EARLY', 'LOWER'].includes(agePrefix.toUpperCase()) ? ' -0.05 prefix' : '')})
                                              </span>
                                            </p>
                                            <p className="font-mono text-sm">
                                              modifier = 1.0 + ({precision.toFixed(2)} - 0.5) × 0.3 = {modifier.toFixed(3)}
                                            </p>
                                            <p className="font-mono text-sm">
                                              score = {baseScore.toFixed(1)} × {modifier.toFixed(3)} = {finalScore.toFixed(3)}
                                            </p>
                                          </div>
                                          
                                          {cappedScore < finalScore && (
                                            <p className="text-amber-600 text-[10px] pt-1">
                                              ⚠️ Textual age capped at 0.8 to avoid overconfidence
                                            </p>
                                          )}
                                          
                                          <p className="font-mono text-sm font-semibold text-blue-700 pt-2 border-t border-blue-200">
                                            Final score = {clampedScore.toFixed(3)} = {(clampedScore * 100).toFixed(0)}%
                                          </p>
                                          
                                          {/* Reference scale */}
                                          <div className="mt-2 pt-2 border-t border-blue-200">
                                            <p className="text-[10px] text-gray-600 font-semibold">Age class scoring:</p>
                                            <ul className="text-[10px] text-gray-500 list-disc ml-4">
                                              <li>Holocene/Recent: 1.0 (compatible)</li>
                                              <li>Pleistocene: 0.7 (potentially compatible)</li>
                                              <li>Neogene: 0.3 (unlikely)</li>
                                              <li>Older: 0.0 (incompatible)</li>
                                              <li>Textual ages capped at 0.8 max</li>
                                            </ul>
                                          </div>
                                        </div>
                                      );
                                    }
                                    
                                    // No temporal data available
                                    return (
                                      <p className="mt-2 text-gray-500 italic">
                                        No temporal data available (geological_age or eruption_date missing)
                                      </p>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Formula */}
                        <div className="font-mono bg-white p-2 rounded mb-2 border border-gray-200">
                          <div className="mb-1">Overall Score = </div>
                          <div className="pl-2 text-blue-600 text-[11px]">
                            [{formulaParts.join(' + ')}] / ({formulaSum})
                          </div>
                          <div className="mt-1 text-gray-500">
                            = {(scores.final * 100).toFixed(1)}%
                          </div>
                        </div>

                        {components.length < 4 && (
                          <p className="text-amber-600 mt-1 italic">
                            ⚠️ Some dimensions are missing, so they're excluded from the calculation.
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
                            <strong>Coverage</strong> shows how many data dimensions (spatial, tectonic, petrological, temporal) 
                            are available for this match. Higher coverage = more reliable match.
                          </p>
                          
                          {/* Dynamic Example */}
                          <div className="bg-white p-2 rounded border border-blue-200 space-y-1">
                            <p className="font-semibold text-gray-700">For this sample:</p>
                            <p>
                              <span className="font-mono text-blue-600">{components.length}/4 dimensions</span> are available 
                              = <span className="font-mono text-blue-600">{(coverage * 100).toFixed(0)}%</span> coverage
                            </p>
                            <div className="mt-1">
                              <p className="text-green-700">✓ Available: {components.map(c => c.label).join(', ')}</p>
                              {components.length < 4 && (
                                <p className="text-orange-600">✗ Missing: {['Spatial', 'Tectonic', 'Petrological', 'Temporal'].filter(d => !components.some(c => c.label === d)).join(', ')}</p>
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
                            <strong>Uncertainty</strong> = 1 − Coverage. It represents the proportion of missing data dimensions. 
                            Lower uncertainty = more complete evidence.
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
                            <strong>Score Gap</strong> is the difference between the best match score and the second-best match score. 
                            A larger gap indicates a clearer, more unambiguous match.
                          </p>
                          <ul className="list-disc ml-4 space-y-0.5">
                            <li><strong>High gap (≥30%):</strong> Clear winner, unambiguous match</li>
                            <li><strong>Medium gap (≥20%):</strong> Good distinction between matches</li>
                            <li><strong>Low gap (&lt;20%):</strong> Ambiguous, multiple similar candidates</li>
                          </ul>
                          <p className="mt-1 text-gray-500 italic">
                            Used in confidence calculation to detect ambiguous matches
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
                        <p className="font-semibold text-gray-800">Confidence is not just about score — it's a geological decision tree</p>
                        
                        <p className="text-gray-700">
                          The confidence assessment follows a <strong>hierarchical logic</strong> with blocking rules. 
                          High match scores can still result in low confidence if fundamental criteria are not met.
                        </p>

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
                            <li>• <strong>High spatial uncertainty + low coverage</strong> → <span className="text-orange-600 font-semibold">Low confidence</span></li>
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
                              <strong className="text-blue-700">Medium:</strong> Score ≥50%, Coverage ≥50%, Gap ≥20%
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
                            <li className="text-gray-600">→ Literature validates but doesn't replace geological evidence</li>
                          </ul>
                        </div>

                        {/* Why This Matters */}
                        <div className="bg-amber-50 p-2 rounded border border-amber-300 mt-2">
                          <p className="font-semibold text-amber-800 mb-1">⚠️ Why this matters</p>
                          <p className="text-[11px] text-gray-700">
                            A sample with <strong>Score=85%</strong> might still be <strong>Low confidence</strong> if:
                          </p>
                          <ul className="text-[11px] ml-3 mt-1">
                            <li>• Only 2/4 dimensions available (coverage &lt;40%)</li>
                            <li>• Another volcano scores 82% (ambiguous, gap=3%)</li>
                            <li>• Spatial data is highly uncertain</li>
                          </ul>
                          <p className="text-[11px] text-gray-700 mt-1">
                            <strong>Confidence reflects reliability, not just strength.</strong>
                          </p>
                        </div>

                        <p className="text-[10px] text-gray-500 italic mt-2">
                          This hierarchical approach prevents overconfidence when fundamental geological criteria are not met.
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
                      <p className="text-xs text-gray-500">Literature confirms association</p>
                      <p className="text-sm font-medium font-mono">
                        {(matching_metadata.evidence.lit.conf * 100).toFixed(0)}%
                      </p>
                      {showLiteratureExplanation && (
                        <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded text-xs text-gray-600 leading-relaxed">
                          <p className="font-semibold mb-1">Literature Evidence</p>
                          <p>
                            Published scientific literature confirms this sample-volcano association. 
                            This provides independent validation of the geological match.
                          </p>
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
