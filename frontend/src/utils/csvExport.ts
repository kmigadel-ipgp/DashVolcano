import type { Sample } from '../types';
import { getMatchingDistance } from './matchingMetadata';
import { getMatchMethod, getMatchMethodLabel } from './matchMethod';
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

  const formatOptionalNumber = (value: number | undefined, digits: number): string => {
    return typeof value === 'number' && Number.isFinite(value)
      ? value.toFixed(digits)
      : '';
  };

  const formatCoordinate = (value: number | undefined): string => formatOptionalNumber(value, 6);

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
    'Volcano Number',
    'Distance (km)',
    'Association Method',
    'Literature Match',
    'Literature Type',
    'Literature Confidence',
    'References',
    // Major oxides (wt%)
    'SIO2',
    'AL2O3',
    'FEOT',
    'MGO',
    'FE2O3',
    'CAO',
    'NA2O',
    'K2O',
    'TIO2',
    'P2O5',
    'MNO',
  ];

  // Convert samples to CSV rows
  const rows = samples.map(sample => {
    const coordinates = sample.geometry?.coordinates;
    const longitude = coordinates?.[0];
    const latitude = coordinates?.[1];
    const metadata = sample.matching_metadata;
    const oxides = sample.oxides || {};

    return [
      sample.sample_id || '',
      sample.db || '',
      sample.material || '',
      sample.petro?.rock_type || '',
      sample.tecto?.volcano_ui || sample.tecto?.ui || '',
      formatCoordinate(latitude),
      formatCoordinate(longitude),
      // Volcano information
      metadata?.volcano?.name || '',
      metadata?.volcano?.number || '',
      formatOptionalNumber(getMatchingDistance(metadata), 2),
      // Association method + literature evidence
      getMatchMethodLabel(getMatchMethod(metadata)),
      metadata?.evid_lit?.match ? 'yes' : 'no',
      metadata?.evid_lit?.type && metadata.evid_lit.type !== 'none' ? metadata.evid_lit.type : '',
      formatOptionalNumber(metadata?.evid_lit?.conf, 3),
      sample.references || '',
      // Oxides (values in wt%)
      formatOptionalNumber(oxides['SIO2'], 2),
      formatOptionalNumber(oxides['AL2O3'], 2),
      formatOptionalNumber(oxides['FEOT'], 2),
      formatOptionalNumber(oxides['MGO'], 2),
      formatOptionalNumber(oxides['FE2O3'], 2),
      formatOptionalNumber(oxides['CAO'], 2),
      formatOptionalNumber(oxides['NA2O'], 2),
      formatOptionalNumber(oxides['K2O'], 2),
      formatOptionalNumber(oxides['TIO2'], 2),
      formatOptionalNumber(oxides['P2O5'], 2),
      formatOptionalNumber(oxides['MNO'], 2),
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

/**
 * Exports an array of eruptions to a CSV file and triggers a browser download
 * 
 * @param eruptions - Array of eruptions to export
 * @param volcanoName - Name of the volcano for the filename
 * @param filename - Optional custom filename
 */
export const exportEruptionsToCSV = (
  eruptions: Array<{
    volcano_name?: string;
    eruption_number?: number;
    start_date?: { year?: number; month?: number; day?: number };
    end_date?: { year?: number; month?: number; day?: number };
    vei?: number;
    eruption_category?: string;
    area_of_activity?: string;
  }>,
  volcanoName: string,
  filename?: string
): void => {
  if (eruptions.length === 0) {
    showError('No eruptions to export');
    return;
  }

  try {
    // Helper to escape CSV fields
    const escapeCSV = (field: string) => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replaceAll('"', '""')}"`;
      }
      return field;
    };

    // Helper to extract year from date info
    const dateToYear = (date?: { year?: number }): string => {
      return date?.year?.toString() || '';
    };

    // Build CSV with headers
    const headers = ['volcano_name', 'eruption_number', 'start_year', 'end_year', 'vei', 'category', 'area'];
    const rows = eruptions.map((e) => [
      escapeCSV(e.volcano_name || ''),
      e.eruption_number?.toString() || '',
      dateToYear(e.start_date),
      dateToYear(e.end_date),
      e.vei?.toString() || '',
      escapeCSV(e.eruption_category || ''),
      escapeCSV(e.area_of_activity || ''),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    
    // Create blob and trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const downloadFilename = filename || `${volcanoName.replaceAll(' ', '_')}_eruptions_timeline.csv`;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    
    // Show success toast
    showSuccess(`Exported ${eruptions.length} eruption${eruptions.length === 1 ? '' : 's'} to ${downloadFilename}`);
  } catch (error) {
    console.error('Error exporting eruptions CSV:', error);
    showError('Failed to export CSV file');
  }
};
