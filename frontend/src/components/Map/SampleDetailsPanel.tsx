import React, { useState } from 'react';
import { X, MapPin, Mountain, Database, Layers, FileText, Info, BookOpen, Ruler } from 'lucide-react';
import type { Sample } from '../../types';
import {
  getMatchMethod,
  getMatchMethodLabel,
  getMatchMethodColorHex,
  getMatchMethodIcon,
  getVolcanoName,
  getVolcanoNumber,
  getDistance,
  isMatched,
} from '../../utils/matchMethod';

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
 * SampleDetailsPanel displays detailed information about a clicked sample.
 *
 * Volcano association follows the distance + literature model:
 * a sample is linked to the nearest volcano within 15 km, unless a volcano is
 * explicitly named in the publication (literature override, at any distance).
 */
export const SampleDetailsPanel: React.FC<SampleDetailsPanelProps> = ({
  sample,
  onClose,
  onAddToSelection,
  isSelected = false,
}) => {
  const [showMethodExplanation, setShowMethodExplanation] = useState(false);
  const [showLiteratureExplanation, setShowLiteratureExplanation] = useState(false);

  if (!sample) return null;

  const { sample_id, sample_code, db, petro, tecto, geometry, oxides, matching_metadata, references } = sample;
  const displaySampleCode = sample_code?.trim() || sample_id;
  const rock_type = petro?.rock_type;
  const [longitude, latitude] = geometry.coordinates;

  const matched = isMatched(matching_metadata);
  const method = getMatchMethod(matching_metadata);
  const methodLabel = getMatchMethodLabel(method);
  const methodColor = getMatchMethodColorHex(method);
  const methodIcon = getMatchMethodIcon(method);
  const volcanoName = getVolcanoName(matching_metadata);
  const volcanoNumber = getVolcanoNumber(matching_metadata);
  const distance = getDistance(matching_metadata);
  const litEvidence = matching_metadata?.evid_lit;

  // Extract tectonic setting display value (support both legacy string and new nested structure)
  const tectonicSettingDisplay = typeof tecto === 'object'
    ? tecto?.ui ?? 'Unknown'
    : tecto ?? 'Unknown';

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
    <div className="absolute top-4 right-4 z-20 w-[22rem] max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-2xl overflow-hidden">
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
              <p className="text-xs text-gray-500">Sample Code</p>
              <p className="text-sm font-medium truncate" title={displaySampleCode}>
                {displaySampleCode}
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
          {matched && (
            <div className="flex items-start gap-2">
              <Mountain className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Associated Volcano</p>
                <p className="text-sm font-medium">
                  {volcanoName}
                  {volcanoNumber && (
                    <span className="text-gray-400 font-normal"> (#{volcanoNumber})</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Distance */}
          {matched && distance !== undefined && (
            <div className="flex items-start gap-2">
              <Ruler className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Distance to volcano</p>
                <p className="text-sm font-medium font-mono">{distance.toFixed(1)} km</p>
              </div>
            </div>
          )}

          {/* Association Method */}
          <div className="flex items-start gap-2">
            <div className="relative group flex-shrink-0">
              <button
                onClick={() => setShowMethodExplanation(!showMethodExplanation)}
                className="hover:bg-blue-50 rounded p-0.5 transition-colors mt-0.5"
                title="Click to show/hide association method explanation"
              >
                <Info className="w-4 h-4 text-blue-500" />
              </button>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Association Method</p>
              <div
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: `${methodColor}20`,
                  color: methodColor,
                  border: `1px solid ${methodColor}40`,
                }}
              >
                <span className="text-sm">{methodIcon}</span>
                <span>{methodLabel}</span>
              </div>
              {showMethodExplanation && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-600 leading-relaxed space-y-2">
                  <p className="font-semibold text-gray-800">How is a sample linked to a volcano?</p>
                  <p>
                    Association is deliberately simple and explainable. A sample is linked to
                    the <strong>nearest volcano within 15 km</strong>, unless the publication
                    explicitly names a volcano — in which case the sample is linked directly to
                    that <strong>named volcano at any distance</strong> (literature override).
                  </p>
                  <div className="bg-white p-2 rounded border border-blue-200 space-y-1">
                    <p>
                      <span className="font-mono text-green-700">📚 Literature match</span> — a
                      volcano named in the publication title which is located at ≤ 50 km to avoid false positives matching
                      due to volcano name ambiguity (eg.: "Late" (243090)).
                    </p>
                    <p>
                      <span className="font-mono text-blue-700">📍 Nearest (≤ 15 km)</span> — the
                      closest volcano within range.
                    </p>
                    <p>
                      <span className="font-mono text-gray-600">− Unmatched</span> — no volcano
                      within range and no literature evidence.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Literature Evidence */}
          {litEvidence?.match && (
            <div className="flex items-start gap-2">
              <div className="relative group flex-shrink-0">
                <button
                  onClick={() => setShowLiteratureExplanation(!showLiteratureExplanation)}
                  className="hover:bg-blue-50 rounded p-0.5 transition-colors mt-0.5"
                  title="Click to show/hide literature evidence explanation"
                >
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                </button>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Literature Evidence</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {litEvidence.type && litEvidence.type !== 'none' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 capitalize">
                      {litEvidence.type}
                    </span>
                  )}
                  <span className="text-sm font-medium font-mono">
                    {(litEvidence.conf * 100).toFixed(0)}%
                  </span>
                </div>
                {showLiteratureExplanation && (
                  <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded text-xs text-gray-600 leading-relaxed">
                    <p className="font-semibold mb-1">Literature Evidence</p>
                    <p>
                      Text-based evidence derived from the sample's publication metadata.
                      An <strong>explicit</strong> match names the volcano in the publication
                      title (and overrides distance); a <strong>partial</strong> match is a
                      weaker textual signal recorded on a nearest-based association.
                    </p>
                    {litEvidence.src && litEvidence.src !== 'none' && (
                      <p className="mt-1.5 text-indigo-600">
                        <strong>Source:</strong> {litEvidence.src}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

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
        </div>
      </div>
    </div>
  );
};
