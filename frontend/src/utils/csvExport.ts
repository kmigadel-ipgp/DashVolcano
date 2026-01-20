import type { Sample } from '../types';
import { showSuccess, showError } from './toast';
import { formatConfidenceForCSV } from './confidence';

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
    'Rock Family',
    'Tectonic Setting',
    'Latitude',
    'Longitude',
    'Volcano Name',
    'Volcano Number',
    'Distance (km)',
    'Matching Confidence',
    'Coverage',
    'Uncertainty',
    'Spatial Score',
    'Tectonic Score',
    'Temporal Score',
    'Petrological Score',
    'Final Score',
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
    const [longitude, latitude] = sample.geometry.coordinates;
    const metadata = sample.matching_metadata;
    const oxides = sample.oxides || {};

    return [
      sample.sample_id || '',
      sample.db || '',
      sample.material || '',
      sample.petro?.rock_type || '',
      sample.petro?.rock_family || '',
      sample.tecto?.ui || '',
      latitude.toFixed(6),
      longitude.toFixed(6),
      // Use new structure: volcano.name, volcano.number, volcano.dist_km
      metadata?.volcano?.name || metadata?.volcano_name || '',
      metadata?.volcano?.number || metadata?.volcano_number || '',
      metadata?.volcano?.dist_km !== undefined ? metadata.volcano.dist_km.toFixed(2) : (metadata?.distance_km !== undefined ? metadata.distance_km.toFixed(2) : ''),
      // Confidence and quality metrics
      metadata?.quality?.conf || formatConfidenceForCSV(metadata?.confidence_level) || '',
      metadata?.quality?.cov !== undefined ? metadata.quality.cov.toFixed(3) : '',
      metadata?.quality?.unc !== undefined ? metadata.quality.unc.toFixed(3) : '',
      // Individual matching scores - access nested .final field
      metadata?.scores?.sp?.final !== undefined ? metadata.scores.sp.final.toFixed(3) : '',
      metadata?.scores?.te?.final !== undefined ? metadata.scores.te.final.toFixed(3) : '',
      metadata?.scores?.ti?.final !== undefined ? metadata.scores.ti.final.toFixed(3) : '',
      metadata?.scores?.pe?.final !== undefined ? metadata.scores.pe.final.toFixed(3) : '',
      metadata?.scores?.final !== undefined ? metadata.scores.final.toFixed(3) : '',
      sample.references || '',
      // Oxides (values in wt%)
      oxides['SIO2'] === undefined ? '' : oxides['SIO2'].toFixed(2),
      oxides['AL2O3'] === undefined ? '' : oxides['AL2O3'].toFixed(2),
      oxides['FEOT'] === undefined ? '' : oxides['FEOT'].toFixed(2),
      oxides['MGO'] === undefined ? '' : oxides['MGO'].toFixed(2),
      oxides['FE2O3'] === undefined ? '' : oxides['FE2O3'].toFixed(2),
      oxides['CAO'] === undefined ? '' : oxides['CAO'].toFixed(2),
      oxides['NA2O'] === undefined ? '' : oxides['NA2O'].toFixed(2),
      oxides['K2O'] === undefined ? '' : oxides['K2O'].toFixed(2),
      oxides['TIO2'] === undefined ? '' : oxides['TIO2'].toFixed(2),
      oxides['P2O5'] === undefined ? '' : oxides['P2O5'].toFixed(2),
      oxides['MNO'] === undefined ? '' : oxides['MNO'].toFixed(2),
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
