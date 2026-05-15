import React from 'react';
import { FileText } from 'lucide-react';
import type { Sample } from '../../types';
import { getUniquePublicationReferences } from '../../utils/mapStats';

interface PublicationsTabProps {
  /** Samples in the current chart scope after confidence filtering */
  samples: Sample[];
  /** Samples in the current chart scope before confidence filtering */
  totalSamplesInScope: number;
}

export const PublicationsTab: React.FC<PublicationsTabProps> = ({
  samples,
  totalSamplesInScope,
}) => {
  const uniquePublications = getUniquePublicationReferences(samples);

  if (totalSamplesInScope === 0) {
    return (
      <div className="border rounded-lg p-6 bg-gray-50 w-full">
        <div className="flex items-center justify-center h-72 text-center text-gray-500">
          <div>
            <p className="text-lg font-medium">No samples in scope</p>
            <p className="text-sm mt-2">Select samples, a volcano, or a search area to view publications.</p>
          </div>
        </div>
      </div>
    );
  }

  if (samples.length === 0) {
    return (
      <div className="border rounded-lg p-6 bg-gray-50 w-full">
        <div className="flex items-center justify-center h-72 text-center text-gray-500">
          <div>
            <p className="text-lg font-medium">No samples match the confidence filter</p>
            <p className="text-sm mt-2">Adjust the selected confidence levels to show publication references.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-gray-50 w-full">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h4 className="text-base font-semibold text-gray-700">Publications</h4>
          <p className="text-sm text-gray-500 mt-1">
            Unique raw references attached to the current chart sample scope.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs uppercase tracking-wide text-gray-500">Unique References</p>
          <p className="text-2xl font-semibold text-gray-900">{uniquePublications.length}</p>
        </div>
      </div>

      {uniquePublications.length === 0 ? (
        <div className="flex items-center justify-center h-72 text-center text-gray-500">
          <div>
            <p className="text-lg font-medium">No publication references found</p>
            <p className="text-sm mt-2">Samples are available, but none contain a non-empty references field.</p>
          </div>
        </div>
      ) : (
        <div className="max-h-[560px] overflow-y-auto divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {uniquePublications.map((reference, index) => (
            <div key={reference} className="flex items-start gap-3 p-4">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-volcano-100 text-volcano-700">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Reference {index + 1}
                </p>
                <p className="mt-1 break-words text-sm text-gray-800">{reference}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicationsTab;