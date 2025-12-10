import type { Sample } from '../types';
import { showSuccess, showError } from './toast';

/**
 * Exports an array of samples to a CSV file and triggers a browser download
 * 
 * @param samples - Array of samples to export
 * @param filename - Optional filename (default: dashvolcano_samples_[timestamp].csv)
 */
export const exportSamplesToCSV = (samples: Sample[], filename?: string): void => {
  if (samples.length === 0) {
    showError('No samples to export');
    return;
  }

  // Define CSV headers
  const headers = [
    'Sample ID',
    'Database',
    'Material',
    'Rock Type',
    'Tectonic Setting',
    'Latitude',
    'Longitude',
    'Volcano Name',
    'Distance (km)',
    'VEI',
    'Location',
    'References',
    // Major oxides
    'SIO2(WT%)',
    'AL2O3(WT%)',
    'FEOT(WT%)',
    'MGO(WT%)',
    'CAO(WT%)',
    'NA2O(WT%)',
    'K2O(WT%)',
    'TIO2(WT%)',
    'P2O5(WT%)',
    'MNO(WT%)',
  ];

  // Convert samples to CSV rows
  const rows = samples.map(sample => {
    const [longitude, latitude] = sample.geometry.coordinates;
    const metadata = sample.matching_metadata;
    const oxides = sample.oxides || {};

    return [
      sample.sample_id || '',
      sample.db || '',
      sample.material || '',
      sample.rock_type || '',
      sample.tectonic_setting || '',
      latitude.toFixed(6),
      longitude.toFixed(6),
      metadata?.volcano_name || '',
      metadata?.distance_km === undefined ? '' : metadata.distance_km.toFixed(2),
      metadata?.vei === undefined ? '' : metadata.vei.toString(),
      sample.geographic_location || '',
      sample.references || '',
      // Oxides
      oxides['SIO2(WT%)'] === undefined ? '' : oxides['SIO2(WT%)'].toFixed(2),
      oxides['AL2O3(WT%)'] === undefined ? '' : oxides['AL2O3(WT%)'].toFixed(2),
      oxides['FEOT(WT%)'] === undefined ? '' : oxides['FEOT(WT%)'].toFixed(2),
      oxides['MGO(WT%)'] === undefined ? '' : oxides['MGO(WT%)'].toFixed(2),
      oxides['CAO(WT%)'] === undefined ? '' : oxides['CAO(WT%)'].toFixed(2),
      oxides['NA2O(WT%)'] === undefined ? '' : oxides['NA2O(WT%)'].toFixed(2),
      oxides['K2O(WT%)'] === undefined ? '' : oxides['K2O(WT%)'].toFixed(2),
      oxides['TIO2(WT%)'] === undefined ? '' : oxides['TIO2(WT%)'].toFixed(2),
      oxides['P2O5(WT%)'] === undefined ? '' : oxides['P2O5(WT%)'].toFixed(2),
      oxides['MNO(WT%)'] === undefined ? '' : oxides['MNO(WT%)'].toFixed(2),
    ];
  });

  // Escape CSV values (handle commas, quotes, newlines)
  const escapeCSVValue = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replaceAll('"', '""')}"`;
    }
    return value;
  };

  // Build CSV content
  const csvContent = [
    headers.map(escapeCSVValue).join(','),
    ...rows.map(row => row.map(v => escapeCSVValue(v.toString())).join(',')),
  ].join('\n');

  // Create blob and trigger download
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const downloadFilename = filename || `dashvolcano_samples_${Date.now()}.csv`;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    
    // Show success toast
    showSuccess(`Exported ${samples.length} sample${samples.length === 1 ? '' : 's'} to ${downloadFilename}`);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    showError('Failed to export CSV file');
  }
};

/**
 * Formats sample count for display
 * 
 * @param count - Number of samples
 * @returns Formatted string (e.g., "1.2k samples", "45 samples")
 */
export const formatSampleCount = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k samples`;
  }
  return `${count} ${count === 1 ? 'sample' : 'samples'}`;
};
