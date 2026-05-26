import React, { useState } from 'react';
import { X, MapPin, Mountain, Database, Layers, FileText, Info } from 'lucide-react';
import type { DateInfo, Sample } from '../../types';
import { formatDateInfo } from '../../utils/dateUtils';
import { 
  normalizeConfidence, 
  getConfidenceColorHex, 
  getConfidenceLabel,
  getConfidenceIcon,
  getVolcanoName,
  getDistance,
  isMatched
} from '../../utils/confidence';
import { getMatchingScoreMeta, getMatchingScoreValue } from '../../utils/matchingMetadata';

const BP_REFERENCE_YEAR = 1950;
const HOLOCENE_MAX_BP = 11700;
const PLEISTOCENE_MAX_BP = 40000;
const TIMELINE_LEFT_LABEL = '>40ka BP';
const PERIOD_WIDTH_PERCENT = 100 / 3;
const TIMELINE_MIN_WIDTH_PERCENT = 1;
const TIMELINE_LABEL_MIN_PERCENT = 12;
const TIMELINE_LABEL_MAX_PERCENT = 88;
const HATCHED_FILL = 'repeating-linear-gradient(135deg, rgba(15, 23, 42, 0.18) 0, rgba(15, 23, 42, 0.18) 4px, transparent 4px, transparent 8px)';

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

type DatePrecision = 'year' | 'month' | 'day';
type TimelineTickAlign = 'left' | 'center' | 'right';

type TimelinePeriod = 'others' | 'pleistocene' | 'holocene';

const TIMELINE_PERIODS: Array<{
  key: TimelinePeriod;
  label: string;
  color: string;
  hatchColor: string;
  startPercent: number;
  widthPercent: number;
}> = [
  {
    key: 'others',
    label: 'OTHERS',
    color: 'rgba(226, 232, 240, 0.95)',
    hatchColor: 'rgba(148, 163, 184, 0.32)',
    startPercent: 0,
    widthPercent: PERIOD_WIDTH_PERCENT,
  },
  {
    key: 'pleistocene',
    label: 'PLEISTOCENE',
    color: 'rgba(254, 240, 138, 0.95)',
    hatchColor: 'rgba(245, 158, 11, 0.22)',
    startPercent: PERIOD_WIDTH_PERCENT,
    widthPercent: PERIOD_WIDTH_PERCENT,
  },
  {
    key: 'holocene',
    label: 'HOLOCENE / RECENT',
    color: 'rgba(191, 219, 254, 0.95)',
    hatchColor: 'rgba(59, 130, 246, 0.22)',
    startPercent: PERIOD_WIDTH_PERCENT * 2,
    widthPercent: PERIOD_WIDTH_PERCENT,
  },
];

const TIMELINE_TICKS: Array<{ left: number; label: string; align: TimelineTickAlign }> = [
  { left: 0, label: TIMELINE_LEFT_LABEL, align: 'left' as const },
  { left: PERIOD_WIDTH_PERCENT, label: '40 ka BP', align: 'center' as const },
  { left: PERIOD_WIDTH_PERCENT * 2, label: '11.7 ka BP', align: 'center' as const },
  { left: 100, label: 'Present', align: 'right' as const },
];

type QuantitativeTemporalTimeline = {
  kind: 'dated-interval' | 'geological-interval';
  sourceKindLabel: string;
  sourceValueLabel: string;
  derivedIntervalLabel?: string;
  summary: string;
  clippedOlder: boolean;
  markerKind: 'point' | 'interval';
  markerLeft: number;
  markerWidth: number;
  labelLeft: number;
  overlapRatio?: number;
  coveredPeriods: TimelinePeriod[];
};

type QualitativeTemporalTimeline = {
  kind: 'geological-label';
  sourceKindLabel: string;
  sourceValueLabel: string;
  category: TimelinePeriod;
  categoryLabel: string;
  fallbackScore?: number;
  summary: string;
};

type TemporalTimeline =
  | QuantitativeTemporalTimeline
  | QualitativeTemporalTimeline
  | {
      kind: 'none';
    };

type QuantitativeTimelineInput = {
  kind: QuantitativeTemporalTimeline['kind'];
  olderBp: number;
  youngerBp: number;
  sourceKindLabel: string;
  sourceValueLabel: string;
  derivedIntervalLabel?: string;
  intro: string;
  markerKind: QuantitativeTemporalTimeline['markerKind'];
};

type TemporalTimelineVisualizationProps = {
  quantitativeTimeline: QuantitativeTemporalTimeline | null;
  qualitativeTimeline: QualitativeTemporalTimeline | null;
};

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const clamp = (value: number, min: number, max: number) => (
  Math.min(Math.max(value, min), max)
);

const formatBp = (value: number) => {
  const normalized = Math.max(0, value);

  if (normalized >= 1000) {
    const scaled = normalized / 1000;
    return `${scaled.toFixed(Number.isInteger(scaled) ? 0 : 1)} ka BP`;
  }

  return `${Math.round(normalized)} BP`;
};

const createHatchedFill = (backgroundColor: string): React.CSSProperties => ({
  backgroundColor,
  backgroundImage: HATCHED_FILL,
});

const getTimelinePeriodByKey = (period: TimelinePeriod) => (
  TIMELINE_PERIODS.find(entry => entry.key === period)
);

const getTimelinePeriodLabel = (period: TimelinePeriod) => (
  getTimelinePeriodByKey(period)?.label ?? period
);

const formatCoveredPeriods = (periods: TimelinePeriod[]) => (
  periods.map(getTimelinePeriodLabel).join(' -> ')
);

const toTimelinePercent = (ageBp: number) => {
  const normalized = Math.max(0, ageBp);

  if (normalized > PLEISTOCENE_MAX_BP) {
    return 0;
  }

  if (normalized > HOLOCENE_MAX_BP) {
    const fraction = (PLEISTOCENE_MAX_BP - normalized) / (PLEISTOCENE_MAX_BP - HOLOCENE_MAX_BP);
    return PERIOD_WIDTH_PERCENT + (fraction * PERIOD_WIDTH_PERCENT);
  }

  const fraction = (HOLOCENE_MAX_BP - normalized) / HOLOCENE_MAX_BP;
  return (PERIOD_WIDTH_PERCENT * 2) + (fraction * PERIOD_WIDTH_PERCENT);
};

const toTimelinePointPercent = (ageBp: number) => (
  clamp(toTimelinePercent(ageBp), 0.75, 99.25)
);

const getMarkerLabelLeft = (markerLeft: number, markerWidth = 0) => (
  clamp(markerLeft + (markerWidth / 2), TIMELINE_LABEL_MIN_PERCENT, TIMELINE_LABEL_MAX_PERCENT)
);

const getTimelinePeriod = (ageBp: number): TimelinePeriod => {
  const normalized = Math.max(0, ageBp);

  if (normalized > PLEISTOCENE_MAX_BP) {
    return 'others';
  }

  if (normalized > HOLOCENE_MAX_BP) {
    return 'pleistocene';
  }

  return 'holocene';
};

const getCoveredPeriods = (olderBp: number, youngerBp: number): TimelinePeriod[] => {
  const normalizedOlderBp = Math.max(olderBp, youngerBp);
  const normalizedYoungerBp = Math.min(olderBp, youngerBp);
  const periods: TimelinePeriod[] = [];

  if (normalizedOlderBp > PLEISTOCENE_MAX_BP) {
    periods.push('others');
  }

  if (normalizedOlderBp > HOLOCENE_MAX_BP && normalizedYoungerBp <= PLEISTOCENE_MAX_BP) {
    periods.push('pleistocene');
  }

  if (normalizedYoungerBp <= HOLOCENE_MAX_BP) {
    periods.push('holocene');
  }

  return periods;
};

const getDateTimelineIntro = (precision: DatePrecision) => {
  if (precision === 'year') {
    return 'Year-only dates are expanded to the full calendar year.';
  }

  if (precision === 'month') {
    return 'Month-only dates are expanded to the full calendar month.';
  }

  return 'Exact dates keep their original precision.';
};

const getTickTransform = (align: TimelineTickAlign): React.CSSProperties['transform'] => {
  if (align === 'center') {
    return 'translateX(-50%)';
  }

  if (align === 'right') {
    return 'translateX(-100%)';
  }

  return undefined;
};

const getTickMaxWidth = (align: TimelineTickAlign) => (
  align === 'left' ? '5.5rem' : '4.5rem'
);

const getTickRuleClass = (align: TimelineTickAlign) => {
  if (align === 'center') {
    return 'mx-auto';
  }

  if (align === 'right') {
    return 'ml-auto';
  }

  return '';
};

const getTickTextClass = (align: TimelineTickAlign) => {
  if (align === 'center') {
    return 'text-center';
  }

  if (align === 'right') {
    return 'text-right';
  }

  return '';
};

const isLeapYear = (year: number) => {
  const astronomicalYear = year < 0 ? year + 1 : year;

  if (astronomicalYear % 4 !== 0) {
    return false;
  }

  if (astronomicalYear % 100 !== 0) {
    return true;
  }

  return astronomicalYear % 400 === 0;
};

const getDaysInMonth = (year: number, month: number) => {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }

  return 31;
};

const getDayOfYear = (date: CalendarDate) => {
  let total = date.day;

  for (let month = 1; month < date.month; month += 1) {
    total += getDaysInMonth(date.year, month);
  }

  return total;
};

const calendarDateToBp = (date: CalendarDate, boundary: 'start' | 'end') => {
  const dayOfYear = getDayOfYear(date);
  const daysInYear = isLeapYear(date.year) ? 366 : 365;
  const continuousYear = date.year < 0 ? date.year + 1 : date.year;
  const decimalYear = boundary === 'start'
    ? continuousYear + ((dayOfYear - 1) / daysInYear)
    : continuousYear + (dayOfYear / daysInYear);

  return Math.max(0, BP_REFERENCE_YEAR - decimalYear);
};

const buildQuantitativeTimeline = ({
  kind,
  olderBp,
  youngerBp,
  sourceKindLabel,
  sourceValueLabel,
  intro,
  markerKind,
}: QuantitativeTimelineInput): QuantitativeTemporalTimeline => {
  const normalizedOlderBp = Math.max(olderBp, youngerBp);
  const normalizedYoungerBp = Math.min(olderBp, youngerBp);
  const clippedOlder = normalizedOlderBp > PLEISTOCENE_MAX_BP;

  const representativeBp = (normalizedOlderBp + normalizedYoungerBp) / 2;
  const markerLeft = markerKind === 'point'
    ? toTimelinePointPercent(representativeBp)
    : toTimelinePercent(normalizedOlderBp);
  const markerRight = markerKind === 'interval'
    ? toTimelinePercent(normalizedYoungerBp)
    : markerLeft;
  const markerWidth = markerKind === 'interval'
    ? Math.max(markerRight - markerLeft, TIMELINE_MIN_WIDTH_PERCENT)
    : 0;
  const coveredPeriods = markerKind === 'point'
    ? [getTimelinePeriod(representativeBp)]
    : getCoveredPeriods(normalizedOlderBp, normalizedYoungerBp);

  let summary = markerKind === 'point'
    ? `${intro} It is shown as a red arrow in ${formatCoveredPeriods(coveredPeriods)}.`
    : `${intro} It is shown as a red interval across ${formatCoveredPeriods(coveredPeriods)}.`;

  if (clippedOlder) {
    summary += ' Values older than 40 ka BP are clipped at the left edge of the timeline.';
  }

  return {
    kind,
    sourceKindLabel,
    sourceValueLabel,
    summary,
    clippedOlder,
    markerKind,
    markerLeft,
    markerWidth,
    labelLeft: getMarkerLabelLeft(markerLeft, markerWidth),
    coveredPeriods,
  };
};

const expandDatePrecisionWindow = (dateInfo: DateInfo | null | undefined): {
  precision: DatePrecision;
  sourceKindLabel: string;
  sourceValueLabel: string;
  start: CalendarDate;
  end: CalendarDate;
} | null => {
  if (!dateInfo?.year && dateInfo?.year !== 0) {
    return null;
  }

  const year = dateInfo.year;
  const month = typeof dateInfo.month === 'number' && dateInfo.month >= 1 && dateInfo.month <= 12
    ? dateInfo.month
    : undefined;
  const maxDay = month ? getDaysInMonth(year, month) : undefined;
  const day = month !== undefined
    && maxDay !== undefined
    && typeof dateInfo.day === 'number'
    && dateInfo.day >= 1
    && dateInfo.day <= maxDay
      ? dateInfo.day
      : undefined;
  const sourceValueLabel = formatDateInfo({ year, month, day }, true);

  if (month && day) {
    const exactDate = { year, month, day };
    return {
      precision: 'day',
      sourceKindLabel: 'Day-precision date',
      sourceValueLabel,
      start: exactDate,
      end: exactDate,
    };
  }

  if (month) {
    return {
      precision: 'month',
      sourceKindLabel: 'Month-only date',
      sourceValueLabel,
      start: { year, month, day: 1 },
      end: { year, month, day: getDaysInMonth(year, month) },
    };
  }

  return {
    precision: 'year',
    sourceKindLabel: 'Year-only date',
    sourceValueLabel,
    start: { year, month: 1, day: 1 },
    end: { year, month: 12, day: 31 },
  };
};

const getGeologicalLabel = (sample: Sample, fallbackLabel?: string) => {
  const labelParts = [sample.geological_age?.age_prefix, sample.geological_age?.age]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map(part => part.trim());

  if (labelParts.length > 0) {
    return labelParts.join(' ');
  }

  return fallbackLabel?.trim() || undefined;
};

const buildDateTimeline = (eruptionDate: DateInfo, evidenceValueLabel?: string): TemporalTimeline => {
  const expanded = expandDatePrecisionWindow(eruptionDate);
  if (!expanded) {
    return { kind: 'none' };
  }

  const olderBp = calendarDateToBp(expanded.start, 'start');
  const youngerBp = calendarDateToBp(expanded.end, 'end');
  const markerKind = expanded.precision === 'day' ? 'point' : 'interval';
  const intro = getDateTimelineIntro(expanded.precision);
  const sourceValueLabel = evidenceValueLabel?.trim() || expanded.sourceValueLabel;

  return buildQuantitativeTimeline({
    kind: 'dated-interval',
    olderBp,
    youngerBp,
    sourceKindLabel: expanded.sourceKindLabel,
    sourceValueLabel,
    intro,
    markerKind,
  });
};

const buildGeologicalIntervalTimeline = (sample: Sample, fallbackLabel?: string): TemporalTimeline => {
  const ageMin = sample.geological_age?.age_min;
  const ageMax = sample.geological_age?.age_max;

  if (!isFiniteNumber(ageMin) && !isFiniteNumber(ageMax)) {
    return { kind: 'none' };
  }

  const firstAge = isFiniteNumber(ageMin) ? Math.max(0, ageMin) : Math.max(0, ageMax!);
  const secondAge = isFiniteNumber(ageMax) ? Math.max(0, ageMax) : Math.max(0, ageMin!);
  const youngerBp = Math.min(firstAge, secondAge);
  const olderBp = Math.max(firstAge, secondAge);
  const hasTwoBounds = isFiniteNumber(ageMin) && isFiniteNumber(ageMax) && Math.abs(ageMax - ageMin) > 1e-6;
  const markerKind = hasTwoBounds ? 'interval' : 'point';
  const sourceValueLabel = getGeologicalLabel(sample, fallbackLabel) ?? (hasTwoBounds
    ? `${formatBp(olderBp)} -> ${formatBp(youngerBp)}`
    : formatBp(olderBp));
  const intro = hasTwoBounds
    ? 'Numeric geological bounds stay as an interval.'
    : 'A single numeric geological age keeps its original precision.';

  return buildQuantitativeTimeline({
    kind: 'geological-interval',
    olderBp,
    youngerBp,
    sourceKindLabel: 'Geological interval',
    sourceValueLabel,
    intro,
    markerKind,
  });
};

const buildGeologicalLabelTimeline = (sourceValueLabel: string): TemporalTimeline => {
  const normalizedLabel = sourceValueLabel.toUpperCase();

  if (normalizedLabel.includes('HOLOCENE') || normalizedLabel.includes('RECENT')) {
    return {
      kind: 'geological-label',
      sourceKindLabel: 'Geological label',
      sourceValueLabel,
      category: 'holocene',
      categoryLabel: 'HOLOCENE / RECENT',
      summary: 'This text label is shown as a hatched band across HOLOCENE / RECENT.',
    };
  }

  if (normalizedLabel.includes('PLEISTOCENE')) {
    return {
      kind: 'geological-label',
      sourceKindLabel: 'Geological label',
      sourceValueLabel,
      category: 'pleistocene',
      categoryLabel: 'PLEISTOCENE',
      summary: 'This text label is shown as a hatched band across PLEISTOCENE.',
    };
  }

  return {
    kind: 'geological-label',
    sourceKindLabel: 'Geological label',
    sourceValueLabel,
    category: 'others',
    categoryLabel: 'OTHERS',
    summary: 'This text label is shown as a hatched band across OTHERS.',
  };
};

const getTemporalTimeline = (sample: Sample, fallbackLabel?: string): TemporalTimeline => {
  if (isFiniteNumber(sample.geological_age?.age_min) || isFiniteNumber(sample.geological_age?.age_max)) {
    return buildGeologicalIntervalTimeline(sample, fallbackLabel);
  }

  if (sample.eruption_date && (sample.eruption_date.year || sample.eruption_date.year === 0)) {
    return buildDateTimeline(sample.eruption_date, fallbackLabel);
  }

  const geologicalLabel = getGeologicalLabel(sample, fallbackLabel);
  if (geologicalLabel) {
    return buildGeologicalLabelTimeline(geologicalLabel);
  }

  return { kind: 'none' };
};

const TemporalTimelineVisualization: React.FC<TemporalTimelineVisualizationProps> = ({
  quantitativeTimeline,
  qualitativeTimeline,
}) => {
  const activeQualitativePeriod = qualitativeTimeline
    ? getTimelinePeriodByKey(qualitativeTimeline.category)
    : undefined;

  return (
    <div className="bg-gray-50 p-2 rounded border border-gray-300 mb-2 space-y-2">
      <p className="font-semibold text-gray-700">Three-period timeline for this sample:</p>
      <div className="flex flex-wrap gap-2 text-[10px] text-gray-600">
        {TIMELINE_PERIODS.map((period) => (
          <span key={period.key} className="inline-flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-sm border border-slate-400"
              style={{ backgroundColor: period.color }}
            />
            <span>{period.label}</span>
          </span>
        ))}

        {quantitativeTimeline && (
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-3 rounded-full border border-red-700 bg-red-500/85" />
            <span>Numeric evidence</span>
          </span>
        )}

        {qualitativeTimeline && activeQualitativePeriod && (
          <span className="inline-flex items-center gap-1">
            <span
              className="h-2 w-3 rounded-sm border border-slate-500"
              style={createHatchedFill(activeQualitativePeriod.hatchColor)}
            />
            <span>Textual evidence</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1 text-[10px] font-semibold tracking-wide text-gray-600">
        {TIMELINE_PERIODS.map((period) => (
          <div key={period.key} className="text-center">
            {period.label}
          </div>
        ))}
      </div>

      <div className="relative pt-6">
        {quantitativeTimeline && (
          <div
            className="absolute top-0 z-10 max-w-40 -translate-x-1/2 text-center text-[10px] font-medium leading-tight text-red-700"
            style={{ left: `${quantitativeTimeline.labelLeft}%` }}
          >
            <span className="inline-block rounded border border-red-200 bg-white/95 px-1.5 py-0.5 shadow-sm">
              {quantitativeTimeline.sourceValueLabel}
            </span>
          </div>
        )}

        <div className="relative h-8 overflow-hidden rounded-md border border-gray-300">
          {TIMELINE_PERIODS.map((period, index) => (
            <div
              key={period.key}
              className={`absolute inset-y-0 ${index < TIMELINE_PERIODS.length - 1 ? 'border-r border-white/70' : ''}`}
              style={{
                left: `${period.startPercent}%`,
                width: `${period.widthPercent}%`,
                backgroundColor: period.color,
              }}
            />
          ))}

          {qualitativeTimeline && activeQualitativePeriod && (
            <div
              className="absolute inset-y-1 rounded-sm border border-slate-600/60"
              style={{
                left: `${activeQualitativePeriod.startPercent}%`,
                width: `${activeQualitativePeriod.widthPercent}%`,
                ...createHatchedFill(activeQualitativePeriod.hatchColor),
              }}
            />
          )}

          {quantitativeTimeline?.markerKind === 'interval' && (
            <div
              className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full border border-red-700 bg-red-500/85"
              style={{
                left: `${quantitativeTimeline.markerLeft}%`,
                width: `${quantitativeTimeline.markerWidth}%`,
              }}
            />
          )}

          {quantitativeTimeline?.markerKind === 'point' && (
            <div
              className="absolute inset-y-0 z-10"
              style={{
                left: `${quantitativeTimeline.markerLeft}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="absolute top-1 bottom-2 w-0.5 bg-red-700" />
              <div className="absolute bottom-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[7px] border-t-red-700" />
            </div>
          )}
        </div>

        <div className="relative mt-2 h-8 text-[10px] text-gray-500">
          {TIMELINE_TICKS.map((tick) => (
            <div
              key={tick.label}
              className="absolute top-0"
              style={{
                left: `${tick.left}%`,
                transform: getTickTransform(tick.align),
                maxWidth: getTickMaxWidth(tick.align),
              }}
            >
              <div className={`h-1 w-px bg-gray-400 ${getTickRuleClass(tick.align)}`} />
              <div className={`${getTickTextClass(tick.align)} leading-tight`}>
                {tick.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {quantitativeTimeline && (
          <>
            <p className="text-[11px] text-gray-700">
              Marker = <span className="font-mono text-gray-800">{quantitativeTimeline.markerKind === 'point' ? 'Red arrow' : 'Red interval'}</span>
            </p>
            <p className="text-[11px] text-gray-600">
              {quantitativeTimeline.summary}
            </p>
          </>
        )}

        {qualitativeTimeline && (
          <>
            <p className="text-[11px] text-gray-700">
              Displayed period = <span className="font-mono text-gray-800">{qualitativeTimeline.categoryLabel}</span>
            </p>
            <p className="text-[11px] text-gray-600">
              {qualitativeTimeline.summary}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

interface SampleDetailsPanelProps {
  /** The selected sample to display */
  sample: Sample | null;
  /** Callback when the panel is closed */
  onClose: () => void;
  /** Callback to add sample to selection */
  onAddToSelection?: (sample: Sample) => void;
  /** Whether the sample is already in selection */
  isSelected?: boolean;
}

/**
 * SampleDetailsPanel displays detailed information about a clicked sample
 * Shows location, rock type, volcano association, tectonic setting, and chemical composition
 */
export const SampleDetailsPanel: React.FC<SampleDetailsPanelProps> = ({
  sample,
  onClose,
  onAddToSelection,
  isSelected = false,
}) => {
  const [showMatchScoreExplanation, setShowMatchScoreExplanation] = useState(false);
  const [showCoverageExplanation, setShowCoverageExplanation] = useState(false);
  const [showUncertaintyExplanation, setShowUncertaintyExplanation] = useState(false);
  const [showConfidenceExplanation, setShowConfidenceExplanation] = useState(false);
  const [showLiteratureExplanation, setShowLiteratureExplanation] = useState(false);
  const [showGapExplanation, setShowGapExplanation] = useState(false);
  const [showSpatialExplanation, setShowSpatialExplanation] = useState(false);
  const [showTectonicExplanation, setShowTectonicExplanation] = useState(false);
  const [showPetrologicalExplanation, setShowPetrologicalExplanation] = useState(false);
  const [showTemporalExplanation, setShowTemporalExplanation] = useState(false);
  
  if (!sample) return null;

  const { sample_id, sample_code, db, petro, tecto, geometry, oxides, matching_metadata, references } = sample;
  const displaySampleCode = sample_code?.trim() || sample_id;
  const rock_type = petro?.rock_type;
  const [longitude, latitude] = geometry.coordinates;
  const temporalEvidenceValue = getMatchingScoreMeta(matching_metadata?.scores, 'ti').evidence_value;

  // Extract tectonic setting display value (support both legacy string and new nested structure)
  const tectonicSettingDisplay = typeof tecto === 'object' 
    ? tecto?.ui ?? 'Unknown'
    : tecto ?? 'Unknown';

  // Format coordinates to 4 decimal places
  const formatCoordinate = (coord: number, isLat: boolean) => {
    let direction: string;
    if (isLat) {
      direction = coord >= 0 ? 'N' : 'S';
    } else {
      direction = coord >= 0 ? 'E' : 'W';
    }
    return `${Math.abs(coord).toFixed(4)}°${direction}`;
  };

  // Format oxide values
  const formatOxide = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  // Get major oxides to display
  const majorOxides = oxides ? [
    { name: 'SiO₂ (wt%)', value: oxides['SIO2'] },
    { name: 'Al₂O₃ (wt%)', value: oxides['AL2O3'] },
    { name: 'FeO(T) (wt%)', value: oxides['FEOT'] },
    { name: 'MgO (wt%)', value: oxides['MGO'] },
    { name: 'CaO (wt%)', value: oxides['CAO'] },
    { name: 'Na₂O (wt%)', value: oxides['NA2O'] },
    { name: 'K₂O (wt%)', value: oxides['K2O'] },
    { name: 'TiO₂ (wt%)', value: oxides['TIO2'] },
  ].filter(oxide => oxide.value !== undefined) : [];
  const temporalTimeline = getTemporalTimeline(sample, temporalEvidenceValue);

  return (
    <div className="absolute top-4 right-4 z-20 w-[22rem] max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-volcano-600 text-white p-4 flex items-center justify-between">
        <h3 className="font-semibold text-lg">Sample Details</h3>
        <button
          onClick={onClose}
          className="hover:bg-volcano-700 rounded p-1 transition-colors"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Basic Information */}
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Database className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Sample Code</p>
              <p className="text-sm font-medium truncate" title={displaySampleCode}>
                {displaySampleCode}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Database className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">Database</p>
              <p className="text-sm font-medium">{db}</p>
            </div>
          </div>

          {rock_type && (
            <div className="flex items-start gap-2">
              <Layers className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Rock Type</p>
                <p className="text-sm font-medium">{rock_type}</p>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-medium">
                {formatCoordinate(latitude, true)}, {formatCoordinate(longitude, false)}
              </p>
            </div>
          </div>

          {/* Volcano Association */}
          {isMatched(matching_metadata) && (
            <div className="flex items-start gap-2">
              <Mountain className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Associated Volcano</p>
                <p className="text-sm font-medium">{getVolcanoName(matching_metadata)}</p>
                {getDistance(matching_metadata) !== undefined && (
                  <p className="text-xs text-gray-500">
                    Distance: {getDistance(matching_metadata)!.toFixed(1)} km
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Match Score Breakdown (dynamic) */}
          {matching_metadata?.scores && (() => {
            const scores = matching_metadata.scores;
            const quality = matching_metadata.quality;
            const coverage = quality?.cov || 0;
            const uncertainty = quality?.unc || 0;
            const confidence = normalizeConfidence(matching_metadata?.confidence_level, matching_metadata);
            const color = getConfidenceColorHex(confidence);
            const label = getConfidenceLabel(confidence);
            const icon = getConfidenceIcon(confidence);

            // Backend score weights from volcano-sample-matcher.
            const allComponents = [
              { key: 'sp', label: 'Spatial', value: getMatchingScoreValue(scores, 'sp'), weight: 0.35 },
              { key: 'te', label: 'Tectonic', value: getMatchingScoreValue(scores, 'te'), weight: 0.25 },
              { key: 'pe', label: 'Petrological', value: getMatchingScoreValue(scores, 'pe'), weight: 0.25 },
              { key: 'ti', label: 'Temporal', value: getMatchingScoreValue(scores, 'ti'), weight: 0.15 },
            ];

            const components = allComponents.filter(c => c.value !== undefined);
            const missingComponents = allComponents.filter(c => c.value === undefined);

            const formulaParts = components.map(c => 
              `(${(c.value! * 100).toFixed(1)}% × ${c.weight})`
            );
            const formulaSum = components.map(c => c.weight).join(' + ');

            return (
              <>
                {/* Match Score */}
                <div className="flex items-start gap-2">
                  <div className="relative group flex-shrink-0">
                    <button
                      onClick={() => setShowMatchScoreExplanation(!showMatchScoreExplanation)}
                      className="hover:bg-blue-50 rounded p-0.5 transition-colors mt-0.5"
                      title="Click to show/hide match score explanation"
                    >
                      <Info className="w-4 h-4 text-blue-500" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Match Score</p>
                    <p className="text-sm font-medium font-mono">{((scores.final ?? 0) * 100).toFixed(0)}%</p>
                    {showMatchScoreExplanation && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-600 leading-relaxed">
                        <p className="font-semibold mb-2">How is this calculated?</p>
                        
                        <p className="mb-2">
                          This score combines four geological dimensions used by the backend:
                          Spatial, Tectonic, Petrological, and Temporal.
                        </p>

                        <p className="mb-2">
                          Each dimension contributes a score between 0 and 1. The final score is a
                          weighted average over the dimensions that are actually available.
                        </p>

                        <p className="mb-2">
                          A volcano is assigned only if the best candidate reaches at least 40% final
                          score and 30% weighted coverage. Literature evidence is excluded from this
                          geological score.
                        </p>
                        
                        {/* Component Scores with Weights and Explanations */}
                        <div className="space-y-2 mb-2">
                          {components.map(c => (
                            <div key={c.key} className="border-b border-blue-100 pb-1">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-700 font-medium">{c.label}:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">
                                    {(c.value! * 100).toFixed(1)}%
                                    <span className="text-gray-400 ml-1">(weight: {c.weight})</span>
                                  </span>
                                  <button
                                    onClick={() => {
                                      if (c.key === 'sp') setShowSpatialExplanation(!showSpatialExplanation);
                                      else if (c.key === 'te') setShowTectonicExplanation(!showTectonicExplanation);
                                      else if (c.key === 'pe') setShowPetrologicalExplanation(!showPetrologicalExplanation);
                                      else if (c.key === 'ti') setShowTemporalExplanation(!showTemporalExplanation);
                                    }}
                                    className="hover:bg-blue-100 rounded p-0.5"
                                    title="Click to show/hide explanation"
                                  >
                                    <Info className="w-3 h-3 text-blue-600" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Spatial Score Explanation */}
                              {c.key === 'sp' && showSpatialExplanation && (() => {
                                const spMeta = getMatchingScoreMeta(scores, 'sp');
                                const distance = spMeta.dist_km ?? getDistance(matching_metadata);
                                const decay = spMeta.decay ?? 50;
                                const finalScore = c.value!;
                                
                                return (
                                  <div className="mt-1 pl-2 text-xs bg-white p-2 rounded border border-blue-200">
                                    <p className="font-semibold mb-1">Spatial Score Calculation:</p>
                                    <p className="mb-1">Uses exponential decay based on distance:</p>
                                    <p className="font-mono text-blue-600 mb-2">
                                      score = exp(-distance_km / decay_constant)
                                    </p>
                                    
                                    {distance === undefined ? (
                                      <p className="mt-1 text-gray-500 italic">
                                        Distance data not available
                                      </p>
                                    ) : (
                                      <div className="bg-blue-50 p-2 rounded border border-blue-300 space-y-1">
                                        <p className="font-semibold text-gray-700">For this sample:</p>
                                        <p className="font-mono text-sm">
                                          Distance = <span className="text-blue-700">{distance.toFixed(2)} km</span>
                                        </p>
                                        <p className="font-mono text-sm">
                                          Decay constant = <span className="text-blue-700">{decay} km</span>
                                        </p>
                                        <p className="font-mono text-sm font-semibold text-blue-700">
                                          score = exp(-{distance.toFixed(2)} / {decay}) = {(finalScore * 100).toFixed(1)}%
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                              
                              {/* Tectonic Score Explanation */}
                              {c.key === 'te' && showTectonicExplanation && (() => {
                                const teMeta = getMatchingScoreMeta(scores, 'te');
                                const regimeScore = teMeta.regime_score;
                                const crustModifier = teMeta.crust_modifier;
                                const finalScore = c.value!;
                                const note = teMeta.note;
                                
                                return (
                                  <div className="mt-1 pl-2 text-xs bg-white p-2 rounded border border-blue-200">
                                    <p className="font-semibold mb-1">Tectonic Score Calculation:</p>
                                    <p className="mb-1">Uses geodynamically correct regime compatibility matrix:</p>
                                    <p className="font-mono text-blue-600 mb-2">
                                      score = regime_score × crust_modifier
                                    </p>
                                    
                                    {/* Regime Compatibility Matrix */}
                                    <div className="bg-gray-50 p-2 rounded border border-gray-300 mb-2">
                                      <p className="font-semibold text-gray-700 mb-1">Regime Compatibility Matrix:</p>
                                      <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
                                        <div className="font-semibold"></div>
                                        <div className="font-semibold text-center">Subduc.</div>
                                        <div className="font-semibold text-center">Rift</div>
                                        <div className="font-semibold text-center">Intraplat.</div>
                                        
                                        <div className="font-semibold">Subduction</div>
                                        <div className="text-center bg-green-100">1.0</div>
                                        <div className="text-center bg-red-100">0.0</div>
                                        <div className="text-center bg-red-100">0.0</div>
                                        
                                        <div className="font-semibold">Rift</div>
                                        <div className="text-center bg-red-100">0.0</div>
                                        <div className="text-center bg-green-100">1.0</div>
                                        <div className="text-center bg-yellow-100">0.7*</div>
                                        
                                        <div className="font-semibold">Intraplate</div>
                                        <div className="text-center bg-red-100">0.0</div>
                                        <div className="text-center bg-yellow-100">0.7*</div>
                                        <div className="text-center bg-green-100">1.0</div>
                                      </div>
                                      <p className="text-[10px] text-gray-600 mt-1">
                                        * 0.7 for plume–ridge systems (Afar, etc.)
                                      </p>
                                      <p className="text-[10px] text-gray-600 mt-1">
                                        • Unknown regime: 0.5 (partial confidence based on crust only)
                                      </p>
                                    </div>
                                    
                                    {/* Crust Modifier */}
                                    <div className="bg-gray-50 p-2 rounded border border-gray-300 mb-2">
                                      <p className="font-semibold text-gray-700 mb-1">Crust Type Modifier:</p>
                                      <ul className="text-[10px] space-y-0.5 ml-3">
                                        <li>• <strong>Same crust type</strong> (oceanic–oceanic or continental–continental): <span className="font-mono">1.0</span></li>
                                        <li>• <strong>Unknown crust</strong> (one or both): <span className="font-mono">0.85</span></li>
                                        <li>• <strong>Different crust</strong> (oceanic vs continental): <span className="font-mono">0.75</span></li>
                                      </ul>
                                    </div>
                                    
                                    {regimeScore !== undefined && crustModifier !== undefined ? (
                                      <div className="bg-blue-50 p-2 rounded border border-blue-300 space-y-1">
                                        <p className="font-semibold text-gray-700">For this sample:</p>
                                        <p className="font-mono text-sm">
                                          Regime compatibility = <span className="text-blue-700">{regimeScore.toFixed(2)}</span>
                                          {note === 'partial_regime_unknown' && (
                                            <span className="text-amber-600 text-[10px]"> (regime unknown, partial score)</span>
                                          )}
                                        </p>
                                        <p className="font-mono text-sm">
                                          Crust modifier = <span className="text-blue-700">{crustModifier.toFixed(2)}</span>
                                          {crustModifier === 1 && <span className="text-gray-500 text-[10px]"> (same crust type)</span>}
                                          {crustModifier === 0.85 && <span className="text-gray-500 text-[10px]"> (unknown crust)</span>}
                                          {crustModifier === 0.75 && <span className="text-gray-500 text-[10px]"> (different crust type)</span>}
                                        </p>
                                        <p className="font-mono text-sm font-semibold text-blue-700">
                                          score = {regimeScore.toFixed(2)} × {crustModifier.toFixed(2)} = {(finalScore * 100).toFixed(1)}%
                                        </p>
                                        
                                        {regimeScore === 0 && (
                                          <p className="text-red-600 text-[10px] mt-1">
                                            ⚠️ Incompatible tectonic regimes (geodynamically inconsistent)
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="mt-1 text-gray-500 italic">
                                        Tectonic matching data not available
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                              
                              {/* Petrological Score Explanation */}
                              {c.key === 'pe' && showPetrologicalExplanation && (() => {
                                const peMeta = getMatchingScoreMeta(scores, 'pe');
                                const matchType = peMeta.match_type;
                                const finalScore = c.value!;
                                
                                return (
                                  <div className="mt-1 pl-2 text-xs bg-white p-2 rounded border border-blue-200">
                                    <p className="font-semibold mb-1">Petrological Score Calculation:</p>
                                    <p className="mb-1">Based on rock type compatibility:</p>
                                    <ul className="list-disc ml-4 space-y-0.5 mb-2">
                                      <li><strong>Direct match:</strong> same rock type = 1.0</li>
                                      <li><strong>Family match:</strong> same family (e.g., BASALTIC) = 0.7</li>
                                      <li><strong>No match:</strong> = 0.0</li>
                                    </ul>
                                    
                                    {matchType ? (
                                      <div className="bg-blue-50 p-2 rounded border border-blue-300 space-y-1">
                                        <p className="font-semibold text-gray-700">For this sample:</p>
                                        <p className="font-mono text-sm">
                                          Match type = <span className="text-blue-700">{matchType}</span>
                                        </p>
                                        <p className="font-mono text-sm font-semibold text-blue-700">
                                          score = {(finalScore * 100).toFixed(1)}%
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="mt-1 text-gray-500 italic">
                                        Rock type matching data not available
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                              
                              {/* Temporal Score Explanation */}
                              {c.key === 'ti' && showTemporalExplanation && (
                                <div className="mt-1 pl-2 text-xs bg-white p-2 rounded border border-blue-200">
                                  <p className="font-semibold mb-1">Temporal Score Calculation:</p>
                                  {(() => {
                                    const tiMeta = getMatchingScoreMeta(scores, 'ti');
                                    const evidenceValue = tiMeta.evidence_value ?? temporalEvidenceValue;
                                    const finalScore = c.value;
                                    const quantitativeTimeline = temporalTimeline.kind === 'dated-interval' || temporalTimeline.kind === 'geological-interval'
                                      ? temporalTimeline
                                      : null;
                                    const qualitativeTimeline = temporalTimeline.kind === 'geological-label'
                                      ? temporalTimeline
                                      : null;
                                    const sourceValueLabel = temporalTimeline.kind === 'none'
                                      ? undefined
                                      : temporalTimeline.sourceValueLabel;
                                    const shouldShowStoredValue = evidenceValue !== undefined
                                      && evidenceValue !== sourceValueLabel
                                      && evidenceValue.trim() !== sourceValueLabel?.trim();

                                    return (
                                      <>
                                        <p className="mb-2">
                                          This timeline shows the temporal evidence used for this sample.
                                          In this dataset, that evidence is usually an exact date, a partial date,
                                          a year or BCE year, a single age in Ma, or a geological label. Dates
                                          and numeric ages are shown in red. Textual geological ages are shown as
                                          a hatched band on the matching period.
                                        </p>

                                        <p className="mb-2 text-[11px] text-gray-500">
                                          The temporal score below is the value returned by the backend.
                                        </p>

                                        {(quantitativeTimeline || qualitativeTimeline) && (
                                          <TemporalTimelineVisualization
                                            quantitativeTimeline={quantitativeTimeline}
                                            qualitativeTimeline={qualitativeTimeline}
                                          />
                                        )}

                                        <div className="bg-gray-50 p-2 rounded border border-gray-300 mb-2 space-y-1">
                                          <p className="font-semibold text-gray-700">How this display works:</p>
                                          <ul className="list-disc ml-4 space-y-0.5">
                                            <li><strong>Exact dates</strong> and <strong>single numeric ages</strong> are shown as red arrows.</li>
                                            <li><strong>Month-only</strong> and <strong>year-only</strong> dates are shown as red intervals because their precision is broader.</li>
                                            <li><strong>Geological labels</strong> such as HOLOCENE or PLEISTOCENE are shown as hatched bands.</li>
                                            <li><strong>Values older than 40 ka BP</strong> are clipped at the left edge for readability.</li>
                                          </ul>
                                        </div>

                                        <p className="text-[11px] text-gray-500 mb-2">
                                          Ages are normalized in years BP with 1950 as the reference year.
                                        </p>

                                        {(temporalTimeline.kind !== 'none' || shouldShowStoredValue || finalScore !== undefined) && (
                                          <div className="bg-blue-50 p-2 rounded border border-blue-300 mt-2 space-y-1">
                                            <p className="font-semibold text-gray-700">This sample:</p>
                                            {temporalTimeline.kind !== 'none' && (
                                              <p className="font-mono text-sm">
                                                Evidence used = <span className="text-blue-700">{temporalTimeline.sourceKindLabel}</span>
                                              </p>
                                            )}
                                            {sourceValueLabel !== undefined && (
                                              <p className="font-mono text-sm">
                                                Input value = <span className="text-blue-700">{sourceValueLabel}</span>
                                              </p>
                                            )}
                                            {qualitativeTimeline && (
                                              <p className="font-mono text-sm">
                                                Displayed period = <span className="text-blue-700">{qualitativeTimeline.categoryLabel}</span>
                                              </p>
                                            )}
                                            {shouldShowStoredValue && (
                                              <p className="font-mono text-sm">
                                                Stored value = <span className="text-blue-700">{evidenceValue}</span>
                                              </p>
                                            )}
                                            {finalScore !== undefined && (
                                              <p className="font-mono text-sm font-semibold text-blue-700">
                                                Temporal score = {(finalScore * 100).toFixed(1)}%
                                              </p>
                                            )}
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Formula */}
                        <div className="font-mono bg-white p-2 rounded mb-2 border border-gray-200">
                          <div className="mb-1 text-gray-700">Overall Score = </div>
                          <div className="pl-2 text-blue-600 text-[11px]">
                            [{formulaParts.join(' + ')}] / ({formulaSum})
                          </div>
                          <div className="mt-1 text-gray-500">
                            = {((scores.final ?? 0) * 100).toFixed(1)}%
                          </div>
                        </div>

                        {components.length < 4 && (
                          <p className="text-amber-600 mt-1 italic text-[11px]">
                            ⚠️ Missing dimensions are excluded from the denominator, so coverage falls as weighted evidence is missing.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Coverage */}
                {quality && (
                  <div className="flex items-start gap-2">
                    <div className="relative group flex-shrink-0">
                      <button
                        onClick={() => setShowCoverageExplanation(!showCoverageExplanation)}
                        className="hover:bg-blue-50 rounded p-0.5 transition-colors mt-0.5"
                        title="Click to show/hide coverage explanation"
                      >
                        <Info className="w-4 h-4 text-blue-500" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Coverage</p>
                      <p className="text-sm font-medium font-mono">{(coverage * 100).toFixed(0)}%</p>
                      {showCoverageExplanation && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-600 leading-relaxed">
                          <p className="mb-2">
                            <strong>Coverage</strong> is the share of weighted evidence available for this match,
                            not a simple count of dimensions. The backend weights are Spatial 35%, Tectonic 25%,
                            Petrological 25%, and Temporal 15%.
                          </p>

                          <div className="bg-white p-2 rounded border border-blue-200 space-y-1">
                            <p className="font-semibold text-gray-700">For this sample:</p>
                            <p>
                              <span className="font-mono text-blue-600">{(coverage * 100).toFixed(0)}%</span> of the total
                              weighted evidence is available.
                            </p>
                            <div className="mt-1">
                              <p className="text-green-700">
                                ✓ Available: {components.map(c => `${c.label} (${(c.weight * 100).toFixed(0)}%)`).join(', ')}
                              </p>
                              {missingComponents.length > 0 && (
                                <p className="text-orange-600">
                                  ✗ Missing: {missingComponents.map(c => `${c.label} (${(c.weight * 100).toFixed(0)}%)`).join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Uncertainty */}
                {quality && (
                  <div className="flex items-start gap-2">
                    <div className="relative group flex-shrink-0">
                      <button
                        onClick={() => setShowUncertaintyExplanation(!showUncertaintyExplanation)}
                        className="hover:bg-blue-50 rounded p-0.5 transition-colors mt-0.5"
                        title="Click to show/hide uncertainty explanation"
                      >
                        <Info className="w-4 h-4 text-blue-500" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Uncertainty</p>
                      <p className="text-sm font-medium font-mono">{(uncertainty * 100).toFixed(0)}%</p>
                      {showUncertaintyExplanation && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-600 leading-relaxed">
                          <p>
                            <strong>Uncertainty</strong> = 1 − Coverage. It represents the share of weighted
                            evidence that is missing from the geological comparison. Lower uncertainty means the
                            backend had a more complete basis for scoring this sample.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Score Gap */}
                {quality?.gap !== undefined && (
                  <div className="flex items-start gap-2">
                    <div className="relative group flex-shrink-0">
                      <button
                        onClick={() => setShowGapExplanation(!showGapExplanation)}
                        className="hover:bg-blue-50 rounded p-0.5 transition-colors mt-0.5"
                        title="Click to show/hide score gap explanation"
                      >
                        <Info className="w-4 h-4 text-blue-500" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Score Gap</p>
                      <p className="text-sm font-medium font-mono">{(quality.gap * 100).toFixed(0)}%</p>
                      {showGapExplanation && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-600 leading-relaxed">
                          <p className="mb-2">
                            <strong>Score Gap</strong> is the difference between the best candidate and the
                            second-best candidate for the same sample.
                          </p>
                          <ul className="list-disc ml-4 space-y-0.5">
                            <li><strong>Gap &lt; 10%:</strong> backend treats the result as ambiguous unless explicit literature support exists.</li>
                            <li><strong>Gap ≥ 10%:</strong> can support medium confidence when score and coverage are also sufficient.</li>
                            <li><strong>Gap ≥ 20%:</strong> can support high confidence when the rest of the evidence is strong enough.</li>
                          </ul>
                          <p className="mt-1 text-gray-500 italic">
                            A large gap helps confidence, but gap alone does not determine the final label.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Confidence Level */}
                <div className="flex items-start gap-2">
                  <div className="relative group flex-shrink-0">
                    <button
                      onClick={() => setShowConfidenceExplanation(!showConfidenceExplanation)}
                      className="hover:bg-blue-50 rounded p-0.5 transition-colors mt-0.5"
                      title="Click to show/hide confidence level explanation"
                    >
                      <Info className="w-4 h-4 text-blue-500" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Confidence Level</p>
                     <div 
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
                        style={{ 
                          backgroundColor: `${color}20`,
                          color: color,
                          border: `1px solid ${color}40`
                        }}
                      >
                        <span className="text-sm">{icon}</span>
                        <span>{label}</span>
                      </div>
                    {showConfidenceExplanation && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-600 leading-relaxed space-y-2">
                        <p className="font-semibold text-gray-800">Confidence is not the same thing as score.</p>
                        
                        <p className="text-gray-700">
                          The backend first decides whether a volcano can be assigned at all, then assigns a
                          confidence label based on score strength, weighted coverage, ambiguity, spatial
                          uncertainty, and optional literature support.
                        </p>

                        <div className="bg-white p-2 rounded border border-blue-300">
                          <p className="font-semibold text-blue-800 mb-1">Stage 0: Assignment</p>
                          <ul className="text-[11px] space-y-0.5 ml-3">
                            <li>• <strong>Best candidate score ≥ 40%</strong></li>
                            <li>• <strong>Coverage ≥ 30%</strong></li>
                          </ul>
                          <p className="text-[11px] text-gray-600 mt-1">
                            If either condition fails, the backend keeps the sample unmatched.
                          </p>
                        </div>

                        {/* Stage 1: Data Sufficiency */}
                        <div className="bg-white p-2 rounded border border-blue-300">
                          <p className="font-semibold text-blue-800 mb-1">Stage 1: Data Sufficiency (blocking)</p>
                          <ul className="text-[11px] space-y-0.5 ml-3">
                            <li>• <strong>Coverage &lt; 40%</strong> → <span className="text-orange-700 font-semibold">Low confidence</span> (cannot be raised)</li>
                            <li className="text-gray-600">→ Missing too many dimensions prevents reliable assessment</li>
                          </ul>
                        </div>

                        {/* Stage 2: Ambiguity */}
                        <div className="bg-white p-2 rounded border border-blue-300">
                          <p className="font-semibold text-blue-800 mb-1">Stage 2: Ambiguity Check (blocking)</p>
                          <ul className="text-[11px] space-y-0.5 ml-3">
                            <li>• <strong>Score Gap &lt; 10%</strong> → <span className="text-orange-700 font-semibold">Low confidence</span> (unless literature)</li>
                            <li className="text-gray-600">→ Multiple similar candidates = uncertain match</li>
                            <li>• <strong>Spatial uncertainty &gt; 70% and coverage &lt; 60%</strong> → <span className="text-orange-700 font-semibold">Low confidence</span></li>
                            <li className="text-gray-600">→ Spatial uncertainty is computed as <span className="font-mono">min(distance_to_best_match / decay_constant, 1.0)</span>.</li>
                          </ul>
                        </div>

                        {/* Stage 3: Geological Strength */}
                        <div className="bg-white p-2 rounded border border-blue-300">
                          <p className="font-semibold text-blue-800 mb-1">Stage 3: Geological Strength (score thresholds)</p>
                          <p className="text-[11px] text-gray-600 mb-1">Only evaluated if data is sufficient and unambiguous:</p>
                          <ul className="text-[11px] space-y-1 ml-3">
                            <li>
                              <strong className="text-green-700">High:</strong> Score ≥80%, Coverage ≥70%, Gap ≥20%
                              <div className="text-gray-600 ml-3">→ Strong multi-dimensional evidence</div>
                            </li>
                            <li>
                              <strong className="text-blue-700">Medium:</strong> Score ≥50%, Coverage ≥40%, Gap ≥10%
                              <div className="text-gray-600 ml-3">→ Reasonable but incomplete evidence</div>
                            </li>
                            <li>
                              <strong className="text-orange-700">Low:</strong> Below Medium thresholds
                              <div className="text-gray-600 ml-3">→ Weak or inconsistent evidence</div>
                            </li>
                          </ul>
                        </div>

                        {/* Literature Evidence */}
                        <div className="bg-indigo-50 p-2 rounded border border-indigo-300">
                          <p className="font-semibold text-indigo-800 mb-1">📚 Literature Evidence</p>
                          <p className="text-[11px] text-gray-700">
                            If the name of the volcano appears in the title of the reference, then we <strong>raise confidence by one level</strong> (Low→Medium or Medium→High)
                          </p>
                        </div>

                        {/* Why This Matters */}
                        <div className="bg-amber-50 p-2 rounded border border-amber-300 mt-2">
                          <p className="font-semibold text-amber-800 mb-1">⚠️ Why this matters</p>
                          <p className="text-[11px] text-gray-700">
                            A sample with <strong>Score=85%</strong> might still be <strong>Low confidence</strong> if:
                          </p>
                          <ul className="text-[11px] ml-3 mt-1">
                            <li>• Too little evidence is available(coverage &lt;40%); e.g. only the spatial data is available</li>
                            <li>• Another volcano scores 82% (ambiguous, gap=3%)</li>
                            <li>• The spatial uncertainty is &gt;70%</li>
                          </ul>
                          <p className="text-[11px] text-gray-700 mt-1">
                            <strong>Confidence reflects reliability, not just strength.</strong>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Literature Evidence */}
                {matching_metadata.evidence?.lit && matching_metadata.evidence.lit.match && (
                  <div className="flex items-start gap-2">
                    <div className="relative group flex-shrink-0">
                      <button
                        onClick={() => setShowLiteratureExplanation(!showLiteratureExplanation)}
                        className="hover:bg-blue-50 rounded p-0.5 transition-colors mt-0.5"
                        title="Click to show/hide literature explanation"
                      >
                        <Info className="w-4 h-4 text-blue-500" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Supporting Literature Evidence</p>
                      <p className="text-sm font-medium font-mono">
                        {(matching_metadata.evidence.lit.conf * 100).toFixed(0)}%
                      </p>
                      {showLiteratureExplanation && (
                        <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded text-xs text-gray-600 leading-relaxed">
                          <p className="font-semibold mb-1">Literature Evidence</p>
                          <p>
                            This is supporting text-based evidence derived from the sample citation metadata.
                            It can raise confidence, but it does not modify the geological score and does not
                            force an assignment on its own.
                          </p>
                          {matching_metadata.evidence.lit.type && matching_metadata.evidence.lit.type !== 'none' && (
                            <p className="mt-1.5 text-indigo-600">
                              <strong>Match type:</strong> {matching_metadata.evidence.lit.type}
                            </p>
                          )}
                          {matching_metadata.evidence.lit.src && (
                            <p className="mt-1.5 text-indigo-600">
                              <strong>Source:</strong> {matching_metadata.evidence.lit.src}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Tectonic Setting */}
          {tectonicSettingDisplay && (
            <div className="flex items-start gap-2">
              <Layers className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Tectonic Setting</p>
                <p className="text-sm font-medium">{tectonicSettingDisplay}</p>
              </div>
            </div>
          )}

          {/* References */}
          {references && (
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-volcano-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">References</p>
                <p className="text-sm font-medium">{references}</p>
              </div>
            </div>
          )}
        </div>

        {/* Chemical Composition */}
        {majorOxides.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Chemical Composition</h4>
            <div className="grid grid-cols-2 gap-2">
              {majorOxides.map((oxide) => (
                <div key={oxide.name} className="flex justify-between text-sm">
                  <span className="text-gray-600">{oxide.name}:</span>
                  <span className="font-medium">{formatOxide(oxide.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
          {onAddToSelection && (
            <button
              onClick={() => onAddToSelection(sample)}
              disabled={isSelected}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                isSelected
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-volcano-600 text-white hover:bg-volcano-700'
              }`}
            >
              {isSelected ? 'Already in Selection' : 'Add to Selection'}
            </button>
          )}
          {/* Future: Add "View in TAS/AFM" button for Sprint 2.5 Day 3 */}
        </div>
      </div>
    </div>
  );
};
