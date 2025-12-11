import React from 'react';
import type { RockType } from '../types';

interface RockTypeBadgesProps {
  rockTypes: RockType[];
  color: string;
  volcanoName?: string;
}

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
      <div className="text-sm text-gray-500 italic mt-2">
        No rock type data available
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
          const opacity = isPrimary ? '1' : '0.6';
          
          return (
            <span
              key={idx}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                isPrimary 
                  ? 'text-white text-sm shadow-sm' 
                  : 'text-gray-700 text-xs'
              }`}
              style={{
                backgroundColor: isPrimary 
                  ? color 
                  : `${color}40`, // 40 is hex for 25% opacity
                opacity: opacity
              }}
              title={`${isPrimary ? 'Primary' : rt.rank === 2 ? 'Secondary' : 'Tertiary'} rock type from GVP`}
            >
              {rt.type}
              {!isPrimary && (
                <span className="ml-1.5 text-xs opacity-70">
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
