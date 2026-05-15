import type { Sample, Volcano } from '../types';

const normalizeDisplayValue = (value: string): string => value.trim().replace(/\s+/g, ' ');

const getNonEmptyDisplayValue = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = normalizeDisplayValue(value);
  return normalized.length > 0 ? normalized : null;
};

const deduplicateDisplayValues = (values: Array<string | null>): string[] => {
  const uniqueValues = new Map<string, string>();

  for (const value of values) {
    if (!value) {
      continue;
    }

    const key = value.toLowerCase();
    if (!uniqueValues.has(key)) {
      uniqueValues.set(key, value);
    }
  }

  return Array.from(uniqueValues.values()).sort((left, right) => left.localeCompare(right));
};

export const getSampleMapTectonicSetting = (sample: Sample): string | null => {
  return getNonEmptyDisplayValue(sample.tecto?.volcano_ui);
};

export const getVolcanoMapTectonicSetting = (volcano: Volcano): string | null => {
  return getNonEmptyDisplayValue(volcano.tectonic_setting?.ui);
};

export const getUniqueMapTectonicSettings = (
  samples: Sample[],
  volcanoes: Volcano[]
): string[] => {
  return deduplicateDisplayValues([
    ...samples.map(getSampleMapTectonicSetting),
    ...volcanoes.map(getVolcanoMapTectonicSetting),
  ]);
};

export const getUniquePublicationReferences = (samples: Sample[]): string[] => {
  return deduplicateDisplayValues(samples.map((sample) => getNonEmptyDisplayValue(sample.references)));
};

export const getUniquePublicationCount = (samples: Sample[]): number => {
  return getUniquePublicationReferences(samples).length;
};