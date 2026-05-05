import type { MatchingMetadata, Petro, Sample, TectonicSettingSample } from '../types';

export interface ChemicalAnalysisAllSample {
  sample_code: string;
  sample_id: string;
  db: string;
  petro?: Petro;
  material: string;
  tecto?: TectonicSettingSample;
  geometry?: Sample['geometry'];
  matching_metadata?: MatchingMetadata;
  references?: string;
  SIO2?: number;
  NA2O?: number;
  K2O?: number;
  FEOT?: number;
  MGO?: number;
  TIO2?: number;
  AL2O3?: number;
  CAO?: number;
  P2O5?: number;
  MNO?: number;
}

const OXIDE_KEYS = [
  'SIO2',
  'NA2O',
  'K2O',
  'FEOT',
  'MGO',
  'TIO2',
  'AL2O3',
  'CAO',
  'P2O5',
  'MNO',
] as const;

export const MISSING_SAMPLE_POINT: Sample['geometry'] = {
  type: 'Point',
  coordinates: [Number.NaN, Number.NaN],
};

export const transformChemicalAnalysisSamples = (
  allSamples?: ChemicalAnalysisAllSample[] | null,
): Sample[] => {
  if (!allSamples) {
    return [];
  }

  return allSamples.map(sample => {
    const oxides: Record<string, number> = {};

    OXIDE_KEYS.forEach(oxide => {
      const value = sample[oxide];
      if (value !== undefined) {
        oxides[oxide] = value;
      }
    });

    return {
      _id: sample.sample_id,
      sample_id: sample.sample_id,
      sample_code: sample.sample_code,
      db: sample.db,
      material: sample.material,
      petro: sample.petro,
      tecto: sample.tecto,
      geometry: sample.geometry || MISSING_SAMPLE_POINT,
      matching_metadata: sample.matching_metadata,
      references: sample.references,
      oxides: Object.keys(oxides).length > 0 ? oxides : undefined,
    };
  });
};