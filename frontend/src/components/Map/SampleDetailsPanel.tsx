import React from 'react';
import { X, MapPin, Mountain, Database, Layers, FileText, CheckCircle, AlertCircle, HelpCircle, MinusCircle } from 'lucide-react';
import type { Sample } from '../../types';
import { 
  normalizeConfidence, 
  getConfidenceColorHex, 
  getConfidenceLabel,
  getConfidenceDescription,
  getConfidenceIcon 
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
  if (!sample) return null;

  const { sample_id, db, rock_type, tectonic_setting, geometry, oxides, matching_metadata, references } = sample;
  const [longitude, latitude] = geometry.coordinates;

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
    { name: 'SiO₂', value: oxides['SIO2(WT%)'] },
    { name: 'Al₂O₃', value: oxides['AL2O3(WT%)'] },
    { name: 'FeO(T)', value: oxides['FEOT(WT%)'] },
    { name: 'MgO', value: oxides['MGO(WT%)'] },
    { name: 'CaO', value: oxides['CAO(WT%)'] },
    { name: 'Na₂O', value: oxides['NA2O(WT%)'] },
    { name: 'K₂O', value: oxides['K2O(WT%)'] },
    { name: 'TiO₂', value: oxides['TIO2(WT%)'] },
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
          {matching_metadata?.volcano_name && (
            <div className="flex items-start gap-2">
              <Mountain className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Associated Volcano</p>
                <p className="text-sm font-medium">{matching_metadata.volcano_name}</p>
                {matching_metadata.distance_km !== undefined && (
                  <p className="text-xs text-gray-500">
                    Distance: {matching_metadata.distance_km.toFixed(1)} km
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Confidence Score Badge */}
          {matching_metadata?.volcano_name && (() => {
            const confidence = normalizeConfidence(matching_metadata.confidence_level);
            const color = getConfidenceColorHex(confidence);
            const label = getConfidenceLabel(confidence);
            const description = getConfidenceDescription(confidence);
            const icon = getConfidenceIcon(confidence);
            
            // Icon component based on confidence level
            const ConfidenceIconComponent = confidence === 'high' ? CheckCircle :
                                           confidence === 'medium' ? AlertCircle :
                                           confidence === 'low' ? HelpCircle :
                                           MinusCircle;
            
            return (
              <div className="flex items-start gap-2">
                <ConfidenceIconComponent 
                  className="w-4 h-4 mt-0.5 flex-shrink-0" 
                  style={{ color }}
                />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Match Confidence</p>
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
                  <p className="text-xs text-gray-500 mt-1 italic">
                    {description}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Tectonic Setting */}
          {tectonic_setting && (
            <div className="flex items-start gap-2">
              <Layers className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Tectonic Setting</p>
                <p className="text-sm font-medium">{tectonic_setting}</p>
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
