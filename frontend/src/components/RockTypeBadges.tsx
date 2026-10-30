import React from 'react';
import type { RockType } from '../types';

interface RockTypeBadgesProps {
  rockTypes: RockType[];
  color: string;
  volcanoName?: string;
}

/** Dark or white text, whichever reads better on a filled badge of this colour */
const textOn = (hex: string): string => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.18 ? '#0f141c' : '#ffffff';
};

/**
 * Display GVP major rock types as colored badges
 * Primary (maj_1) shows as larger badge, secondary/tertiary are smaller
 */
export const RockTypeBadges: React.FC<RockTypeBadgesProps> = ({ 
  rockTypes, 
  color,
  volcanoName 
}) => {
  if (!rockTypes || rockTypes.length === 0) {
    return (
      <div className="mt-3">
        <div className="text-xs text-gray-600 mb-1.5 font-medium">
          GVP Major Rock Types{volcanoName ? ` - ${volcanoName}` : ''}:
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`px-3 py-1 rounded-full font-medium transition-all text-white text-sm shadow-sm`}
            style={{backgroundColor: color, opacity: '1'}}
            title={`Primary rock type from GVP`}
          >
            No rock type available
          </span>
        
        </div>
      <div className="text-xs text-gray-500 mt-1.5 italic">
        Source: Global Volcanism Program (GVP)
      </div>
    </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="text-xs text-gray-600 mb-1.5 font-medium">
        GVP Major Rock Types{volcanoName ? ` - ${volcanoName}` : ''}:
      </div>
      <div className="flex flex-wrap gap-2">
        {rockTypes.map((rt, idx) => {
          const isPrimary = rt.rank === 1;
          return (
            <span
              key={idx}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                isPrimary 
                  ? 'text-sm shadow-sm' 
                  : 'text-gray-700 text-xs'
              }`}
              style={{
                backgroundColor: isPrimary 
                  ? color 
                  : `${color}40`, // 40 is hex for 25% opacity
                color: isPrimary ? textOn(color) : undefined,
              }}
              title={`${isPrimary ? 'Primary' : rt.rank === 2 ? 'Secondary' : 'Tertiary'} rock type from GVP`}
            >
              {rt.type}
              {!isPrimary && (
                <span className="ml-1.5 text-xs">
                  (#{rt.rank})
                </span>
              )}
            </span>
          );
        })}
      </div>
      <div className="text-xs text-gray-500 mt-1.5 italic">
        Source: Global Volcanism Program (GVP)
      </div>
    </div>
  );
};
