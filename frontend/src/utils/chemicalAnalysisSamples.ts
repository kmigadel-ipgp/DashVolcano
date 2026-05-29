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
  FE2O3?: number;
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
  'FE2O3',
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

export const hasTasOxides = (sample: Pick<Sample, 'oxides'>): boolean => (
  sample.oxides?.['SIO2'] !== undefined
  && sample.oxides?.['NA2O'] !== undefined
  && sample.oxides?.['K2O'] !== undefined
);

export const hasAfmOxides = (sample: Pick<Sample, 'oxides'>): boolean => (
  sample.oxides?.['FEOT'] !== undefined
  && sample.oxides?.['MGO'] !== undefined
  && sample.oxides?.['NA2O'] !== undefined
  && sample.oxides?.['K2O'] !== undefined
);

const HARKER_OXIDE_KEYS = [
  'TIO2',
  'AL2O3',
  'FEOT',
  'MNO',
  'MGO',
  'CAO',
  'NA2O',
  'K2O',
  'P2O5',
] as const;

export const toHarkerDataPoint = (sample: Sample, volcanoName?: string) => {
  const sio2 = sample.oxides?.['SIO2'];
  if (sio2 === undefined || sample.material !== 'WR' || sio2 < 35 || sio2 > 80) {
    return null;
  }

  const hasComparableOxide = HARKER_OXIDE_KEYS.some(
    oxide => sample.oxides?.[oxide] !== undefined,
  );
  if (!hasComparableOxide) {
    return null;
  }

  return {
    sample_code: sample.sample_code || sample.sample_id,
    SIO2: sio2,
    petro: sample.petro,
    material: sample.material,
    TIO2: sample.oxides?.['TIO2'],
    AL2O3: sample.oxides?.['AL2O3'],
    FEOT: sample.oxides?.['FEOT'],
    MNO: sample.oxides?.['MNO'],
    MGO: sample.oxides?.['MGO'],
    CAO: sample.oxides?.['CAO'],
    NA2O: sample.oxides?.['NA2O'],
    K2O: sample.oxides?.['K2O'],
    P2O5: sample.oxides?.['P2O5'],
    volcano_name: volcanoName,
    matching_metadata: sample.matching_metadata,
  };
};