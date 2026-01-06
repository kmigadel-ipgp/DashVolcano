import React from 'react';
import { Info, AlertTriangle, TrendingUp, MapPin, Calendar, Layers, FileText } from 'lucide-react';
import type { MatchingMetadata } from '../../types';
import { getMatchExplanation, getMatchFlags } from '../../utils/confidence';

interface MatchExplanationProps {
  metadata?: MatchingMetadata;
}

/**
 * MatchExplanation Component
 * 
 * Displays detailed scientific explanation of why a sample is (or is not) 
 * associated with a volcano. Shows multi-dimensional evidence including:
 * - Spatial proximity
 * - Tectonic setting compatibility
 * - Temporal concordance
 * - Petrological compatibility
 * - Literature evidence
 * 
 * Implements transparent, human-readable explanations from compact tokens.
 */
export const MatchExplanation: React.FC<MatchExplanationProps> = ({ metadata }) => {
  if (!metadata) return null;

  const reasons = getMatchExplanation(metadata);
  const flags = getMatchFlags(metadata);
  const scores = metadata.scores;
  const quality = metadata.quality;
  const isMatched = !!metadata.volcano;

  // Get emoji icon based on reason category
  const getReasonIcon = (reason: string): string => {
    if (reason.includes('📍')) return '📍';
    if (reason.includes('🌍')) return '🌍';
    if (reason.includes('📅')) return '📅';
    if (reason.includes('🪨')) return '🪨';
    if (reason.includes('📚')) return '📚';
    return '•';
  };

  // Remove emoji from reason text for cleaner display
  const cleanReason = (reason: string): string => {
    return reason.replace(/^[📍🌍📅🪨📚]\s*/, '');
  };

  // Determine the category color
  const getCategoryColor = (reason: string): string => {
    if (reason.includes('📍')) return 'text-blue-700';
    if (reason.includes('🌍')) return 'text-green-700';
    if (reason.includes('📅')) return 'text-purple-700';
    if (reason.includes('🪨')) return 'text-orange-700';
    if (reason.includes('📚')) return 'text-indigo-700';
    return 'text-gray-700';
  };

  // Get score display with color coding
  const getScoreDisplay = (score: number): { text: string; color: string } => {
    if (score >= 0.9) return { text: `${(score * 100).toFixed(0)}%`, color: 'text-green-600 font-semibold' };
    if (score >= 0.7) return { text: `${(score * 100).toFixed(0)}%`, color: 'text-green-600' };
    if (score >= 0.4) return { text: `${(score * 100).toFixed(0)}%`, color: 'text-yellow-600' };
    if (score > 0) return { text: `${(score * 100).toFixed(0)}%`, color: 'text-orange-600' };
    return { text: 'N/A', color: 'text-gray-400' };
  };

  // Get confidence level for UI styling
  const confidenceLevel = quality?.conf || 'none';
  const confidenceColors = {
    high: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600' },
    medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-600' },
    low: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-600' },
    none: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: 'text-gray-600' }
  };
  const colors = confidenceColors[confidenceLevel as keyof typeof confidenceColors] || confidenceColors.none;

  return (
    <div className="space-y-3">
      {/* Match Status Header with Confidence Badge */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Info className={`w-4 h-4 ${colors.icon}`} />
          <h4 className="text-sm font-semibold text-gray-700">
            {isMatched ? 'Why This Association?' : 'Why No Match?'}
          </h4>
        </div>
        {isMatched && quality && (
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
            {confidenceLevel.toUpperCase()} confidence
          </span>
        )}
      </div>

      {/* Evidence Reasons */}
      {reasons.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Evidence</p>
          <div className="space-y-1.5">
            {reasons.map((reason, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-base mt-0.5 flex-shrink-0">{getReasonIcon(reason)}</span>
                <p className={`text-sm ${getCategoryColor(reason)}`}>
                  {cleanReason(reason)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning Flags */}
      {flags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-orange-600 uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Limitations
          </p>
          <div className="space-y-1.5">
            {flags.map((flag, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-base mt-0.5 flex-shrink-0">⚠️</span>
                <p className="text-sm text-orange-700">
                  {flag.replace(/^⚠️\s*/, '')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Score Summary (only for matched samples) */}
      {isMatched && scores && (
        <div className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Overall Match Score</span>
            <span className={`text-lg font-bold ${getScoreDisplay(scores.final).color}`}>
              {getScoreDisplay(scores.final).text}
            </span>
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all ${
                scores.final >= 0.7 ? 'bg-green-600' : 
                scores.final >= 0.4 ? 'bg-yellow-600' : 
                'bg-orange-600'
              }`}
              style={{ width: `${scores.final * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2 italic">
            Weighted average: Spatial (35%) + Tectonic (25%) + Petrological (25%) + Temporal (15%)
          </p>
        </div>
      )}

      {/* Dimension Scores (only for matched samples) */}
      {isMatched && scores && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Match Scores
          </p>
          <div className="grid grid-cols-2 gap-2">
            {/* Spatial Score */}
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs text-blue-700">Spatial</span>
              </div>
              <span className={`text-xs ${getScoreDisplay(scores.sp).color}`}>
                {getScoreDisplay(scores.sp).text}
              </span>
            </div>

            {/* Tectonic Score */}
            <div className="flex items-center justify-between p-2 bg-green-50 rounded-md">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs text-green-700">Tectonic</span>
              </div>
              <span className={`text-xs ${getScoreDisplay(scores.te).color}`}>
                {getScoreDisplay(scores.te).text}
              </span>
            </div>

            {/* Temporal Score */}
            <div className="flex items-center justify-between p-2 bg-purple-50 rounded-md">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-xs text-purple-700">Temporal</span>
              </div>
              <span className={`text-xs ${getScoreDisplay(scores.ti).color}`}>
                {getScoreDisplay(scores.ti).text}
              </span>
            </div>

            {/* Petrological Score */}
            <div className="flex items-center justify-between p-2 bg-orange-50 rounded-md">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-orange-600">🪨</span>
                <span className="text-xs text-orange-700">Petro</span>
              </div>
              <span className={`text-xs ${getScoreDisplay(scores.pe).color}`}>
                {getScoreDisplay(scores.pe).text}
              </span>
            </div>
          </div>

          {/* Literature Evidence */}
          {metadata.evidence?.lit && metadata.evidence.lit.match && (
            <div className="p-2 bg-indigo-50 rounded-md">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs text-indigo-700">Literature confirms</span>
                <span className={`text-xs ml-auto ${getScoreDisplay(metadata.evidence.lit.conf).color}`}>
                  {getScoreDisplay(metadata.evidence.lit.conf).text}
                </span>
              </div>
              {metadata.evidence.lit.src && (
                <p className="text-xs text-indigo-600 mt-1">
                  Source: {metadata.evidence.lit.src}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quality Metrics */}
      {quality && (
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">
              Coverage: <span className="font-medium text-gray-700">{(quality.cov * 100).toFixed(0)}%</span>
            </span>
            <span className="text-gray-600">
              Uncertainty: <span className="font-medium text-gray-700">{(quality.unc * 100).toFixed(0)}%</span>
            </span>
          </div>
        </div>
      )}

      {/* Confidence Level Explanation */}
      {isMatched && quality && (
        <div className={`pt-2 border-t border-gray-200 ${colors.bg} ${colors.border} border rounded-md p-3`}>
          <p className={`text-xs font-medium ${colors.text} mb-1`}>
            {confidenceLevel === 'high' && '✓ HIGH CONFIDENCE MATCH'}
            {confidenceLevel === 'medium' && '⚠ MEDIUM CONFIDENCE MATCH'}
            {confidenceLevel === 'low' && '⚡ LOW CONFIDENCE MATCH'}
          </p>
          <p className="text-xs text-gray-600">
            {confidenceLevel === 'high' && 'Strong multi-dimensional evidence supports this association. The sample is very likely from this volcano.'}
            {confidenceLevel === 'medium' && 'Moderate evidence supports this association. Some dimensions show good agreement, but others are uncertain.'}
            {confidenceLevel === 'low' && 'Weak evidence for this association. Consider this as a possible match that requires further investigation.'}
          </p>
        </div>
      )}

      {/* Explanation Footer */}
      <div className="pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500 italic">
          {isMatched 
            ? 'This association is based on multi-dimensional geochemical and geological evidence.'
            : 'No suitable volcano was found within acceptable matching criteria.'
          }
        </p>
      </div>
    </div>
  );
};

export default MatchExplanation;
