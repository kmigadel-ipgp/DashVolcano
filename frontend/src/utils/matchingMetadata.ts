import type {
  MatchingMetadata,
  MatchingScoreKey,
  MatchingScores,
  PetrologicalScoreDetail,
  SpatialScoreDetail,
  TectonicScoreDetail,
  TemporalScoreDetail,
} from '../types';

type MatchingScoreMetaByKey = {
  sp: SpatialScoreDetail;
  te: TectonicScoreDetail;
  ti: TemporalScoreDetail;
  pe: PetrologicalScoreDetail;
};

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isObject = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object'
);

export const getMatchingScoreValue = (
  scores: MatchingScores | undefined,
  key: MatchingScoreKey,
): number | undefined => {
  const component = scores?.[key];

  if (isFiniteNumber(component)) {
    return component;
  }

  if (isObject(component) && isFiniteNumber(component.final)) {
    return component.final;
  }

  return undefined;
};

export const getMatchingScoreMeta = <K extends MatchingScoreKey>(
  scores: MatchingScores | undefined,
  key: K,
): Partial<MatchingScoreMetaByKey[K]> => {
  const component = scores?.[key];
  return isObject(component) ? component as MatchingScoreMetaByKey[K] : {};
};

export const getMatchingDistance = (metadata?: MatchingMetadata): number | undefined => {
  const spatialMeta = getMatchingScoreMeta(metadata?.scores, 'sp');
  const distKm = spatialMeta.dist_km;

  if (isFiniteNumber(distKm)) {
    return distKm;
  }

  return metadata?.volcano?.dist_km ?? metadata?.distance_km;
};