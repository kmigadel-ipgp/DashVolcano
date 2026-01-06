# MongoDB Samples Collection - Complete Field Reference

**Generated**: January 6, 2026  
**Total Documents**: 512,395 samples  
**Source**: GEOROC and PetDB databases

---

## Table of Contents

1. [Document Structure Overview](#document-structure-overview)
2. [Root Level Fields](#root-level-fields)
3. [Nested Structures](#nested-structures)
4. [Enumerated Values](#enumerated-values)
5. [Example Documents](#example-documents)
6. [Frontend Integration Guide](#frontend-integration-guide)

---

## Document Structure Overview

Each sample document contains:
- **Identification**: `sample_id`, `sample_code`, `db`
- **Scientific Data**: `references`, `material`, `rock_type`, `tectonic_setting`, `oxides`
- **Geospatial**: `geometry` (GeoJSON Point)
- **Volcano Matching**: `matching_metadata` (detailed association with volcano)

**Match Statistics** (from 100,000 samples):
- Matched to volcano: **22.9%** (22,868 samples)
- Not matched: **77.1%** (77,132 samples)

---

## Root Level Fields

### `sample_id`
- **Type**: `string`
- **Required**: Yes
- **Description**: Unique identifier for the sample
- **Format**: `"SAMPLE_{index}_{sample_code}"`
- **Example**: `"SAMPLE_000251_s_13JN12-1 [21984]"`

### `sample_code`
- **Type**: `string`
- **Required**: Yes
- **Description**: Original sample code from the source database
- **Example**: `"s_13JN12-1 [21984]"`

### `db`
- **Type**: `string`
- **Required**: Yes
- **Description**: Source database
- **Possible Values**:
  - `"GEOROC"` - GEOROC database
  - `"PETDB"` - PetDB database
- **Distribution**: GEOROC (~362k), PetDB (~80k)

### `references`
- **Type**: `string`
- **Required**: Yes
- **Description**: Scientific publication references (DOI links or citations)
- **Format**: Semicolon-separated DOIs or bibliographic text
- **Examples**:
  - `"10.1016/j.gr.2018.02.013"`
  - `"10.2343/geochemj.40.15; 10.1007/s00710-009-0103-0"`
- **Note**: DOI links are preserved intact (not truncated)

### `material`
- **Type**: `string`
- **Required**: Yes
- **Description**: Type of material analyzed
- **Most Common Value**: `"WR"` (Whole Rock) - ~100% of samples
- **Other Values**: GL (Glass), MIN (Mineral), INC (Inclusion)

### `rock_type`
- **Type**: `string`
- **Required**: Yes
- **Description**: Petrological classification of the rock
- **Top Values** (from 5,000 samples):
  - `"BASALT"` - 35.5% (1,774 samples)
  - `"DACITE"` - 23.8% (1,189 samples)
  - `"BASALTIC ANDESITE"` - 15.9% (796 samples)
  - `"RHYOLITE"` - 8.9% (444 samples)
  - `"ANDESITE"` - 5.5% (275 samples)
  - `"PICROBASALT"` - 4.1% (207 samples)
  - `"TRACHYTE/TRACHYDACITE"` - 2.5%
  - `"TRACHYANDESITE"` - 1.3%
  - Other: BASALTIC TRACHYANDESITE, TRACHYBASALT, TEPHRITE/BASANITE, TEPHRI-PHONOLITE, PHONO-TEPHRITE, FOIDITE, PHONOLITE

### `tectonic_setting`
- **Type**: `string`
- **Required**: No (may be absent)
- **Description**: Tectonic context where the sample was collected
- **Common Values**:
  - `"Intraplate / Continental"`
  - `"Convergent margin / Arc"`
  - `"Rift zone / Continental"`
  - Other variations

### `oxides`
- **Type**: `object`
- **Required**: Yes
- **Description**: Major element oxide compositions in weight percent (WT%)
- **Available Oxides** (13 total):
  - `SIO2` - Silicon dioxide (silica)
  - `TIO2` - Titanium dioxide
  - `AL2O3` - Aluminum oxide (alumina)
  - `FEOT` - Total iron as FeO
  - `FE2O3` - Ferric iron oxide
  - `FEO` - Ferrous iron oxide
  - `MNO` - Manganese oxide
  - `CAO` - Calcium oxide
  - `MGO` - Magnesium oxide
  - `K2O` - Potassium oxide
  - `NA2O` - Sodium oxide
  - `P2O5` - Phosphorus pentoxide
  - `LOI` - Loss on ignition
- **Data Type**: `float` (rounded to 3 decimals)
- **Example**:
  ```json
  {
    "SIO2": 75.386,
    "TIO2": 0.122,
    "AL2O3": 13.952,
    "FEOT": 1.005,
    "MGO": 0.386,
    "CAO": 2.102,
    "K2O": 3.513,
    "NA2O": 3.513
  }
  ```

### `geometry`
- **Type**: `object` (GeoJSON Point)
- **Required**: Yes
- **Description**: Geographic location of the sample
- **Format**: GeoJSON Point with [longitude, latitude] coordinates
- **Structure**:
  ```json
  {
    "type": "Point",
    "coordinates": [126.764, 42.428]
  }
  ```
- **Coordinate Order**: `[longitude, latitude]` (GeoJSON standard)
- **Usage**: For MongoDB 2dsphere spatial queries

### `eruption_date`
- **Type**: `object`
- **Required**: No (present only if eruption date known)
- **Description**: Date of the eruption associated with this sample
- **Structure**:
  ```json
  {
    "year": 2021,
    "month": 5,
    "day": 15,
    "iso8601": "2021-05-15T00:00:00Z"
  }
  ```
- **Fields**:
  - `year` (int): Year of eruption
  - `month` (int): Month (1-12), optional
  - `day` (int): Day (1-31), optional
  - `iso8601` (string): ISO 8601 formatted datetime

### `eruption_numbers`
- **Type**: `array` or `null`
- **Required**: No
- **Description**: List of eruption event numbers from GVP database
- **Structure**:
  ```json
  [
    {"eruption_number": 12345},
    {"eruption_number": 12346}
  ]
  ```
- **Note**: Links sample to specific eruption events in the `eruptions` collection

---

## Nested Structures

### `matching_metadata`

**Type**: `object`  
**Required**: Yes  
**Description**: Complete information about the volcano association process

This is the **core metadata** that shows how (and if) a sample was associated with a volcano. It contains all the scoring, quality metrics, and reasoning for transparency.

#### Structure Variants

1. **With Volcano Match** (22.9% of samples)
   - Contains: `volcano`, `scores`, `quality`, `evidence`, `expl`, `meta`
   - Confidence: `"high"`, `"medium"`, or `"low"`

2. **Without Match** (77.1% of samples)
   - Contains: `quality`, `evidence`, `expl`, `meta`
   - No `volcano` or `scores` fields
   - Confidence: `"none"`

---

#### `matching_metadata.volcano`

**Present**: Only when sample is matched to a volcano  
**Type**: `object`

```json
{
  "name": "Etna",
  "number": "305050",
  "dist_km": 24.259
}
```

**Fields**:
- `name` (string): Volcano name from GVP database
- `number` (string): GVP volcano number (unique identifier)
- `dist_km` (float): Distance in kilometers between sample and volcano summit

**Frontend Usage**:
```javascript
const volcano = sample.matching_metadata.volcano;
if (volcano) {
  console.log(`Associated with ${volcano.name} (${volcano.dist_km.toFixed(1)} km away)`);
}
```

---

#### `matching_metadata.scores`

**Present**: Only when sample is matched to a volcano  
**Type**: `object`

```json
{
  "sp": 0.935,
  "te": 0.0,
  "ti": 1.0,
  "pe": 0.0,
  "final": 0.477
}
```

**Fields** (all float, range 0.0-1.0):
- `sp` - **Spatial score**: Geographic proximity (0 = far, 1 = very close)
- `te` - **Tectonic score**: Tectonic setting match (0 = mismatch, 1 = perfect match)
- `ti` - **Temporal score**: Eruption date concordance (0 = no match, 1 = perfect match)
- `pe` - **Petrological score**: Rock type compatibility (0 = incompatible, 1 = perfect match)
- `final` - **Final score**: Weighted combination of all dimensions

**Score Interpretation**:
- `0.0-0.2`: Very weak/no evidence
- `0.2-0.4`: Weak evidence
- `0.4-0.7`: Moderate evidence
- `0.7-0.9`: Strong evidence
- `0.9-1.0`: Very strong evidence

**Note**: Score of `0.0` often means **data not available** (e.g., no eruption date → ti=0.0)

**Frontend Usage**:
```javascript
const scores = sample.matching_metadata.scores;
if (scores) {
  const spatialPercent = (scores.sp * 100).toFixed(0);
  const temporalPercent = (scores.ti * 100).toFixed(0);
  console.log(`Spatial: ${spatialPercent}%, Temporal: ${temporalPercent}%`);
}
```

---

#### `matching_metadata.quality`

**Present**: Always  
**Type**: `object`

```json
{
  "cov": 1.0,
  "unc": 0.0,
  "conf": "high"
}
```

**Fields**:
- `cov` (float, 0.0-1.0): **Coverage** - Proportion of dimensions evaluated
  - `1.0` = All dimensions evaluated
  - `0.75` = 75% of dimensions evaluated
  - `0.0` = No dimensions evaluated (no match)

- `unc` (float, 0.0-1.0): **Uncertainty** - Level of uncertainty in the match
  - `0.0` = Very certain
  - `0.5` = Moderate uncertainty
  - `1.0` = Maximum uncertainty (no match)

- `conf` (string): **Confidence level** - Overall match confidence
  - `"high"` - Strong match (score > 0.7, coverage > 0.75)
  - `"medium"` - Moderate match (score 0.4-0.7, coverage > 0.5)
  - `"low"` - Weak match (score 0.2-0.4)
  - `"none"` - No match found

**Distribution** (from 100k samples):
- `"none"`: 77.1% (77,132 samples)
- `"high"`: 7.9% (7,853 samples)
- `"low"`: 7.7% (7,714 samples)
- `"medium"`: 7.3% (7,301 samples)

**Frontend Usage**:
```javascript
const quality = sample.matching_metadata.quality;
const badgeColor = {
  'high': 'green',
  'medium': 'yellow',
  'low': 'orange',
  'none': 'gray'
}[quality.conf];

const coveragePercent = (quality.cov * 100).toFixed(0);
console.log(`Confidence: ${quality.conf} (${coveragePercent}% coverage)`);
```

---

#### `matching_metadata.evidence`

**Present**: Always  
**Type**: `object`

```json
{
  "lit": {
    "match": false,
    "type": "none",
    "conf": 0.0,
    "src": "none"
  }
}
```

**Structure**: `evidence.lit` (literature evidence)

**Fields**:
- `match` (boolean): Literature match found
  - `true` - Volcano name mentioned in reference
  - `false` - No literature match

- `type` (string): Type of literature match
    - `"explicit"` - Explicit mention in literature
    - `"partial"` - Partial mention in literature
    - `"regional"` - Mention of the region in literature
    - `"none"` - No literature evidence

- `conf` (float, 0.0-1.0): Confidence in literature match
  - `0.95` - Explicit match in title
  - `0.75` - Partial match
  - `0.3` - Regional match 
  - `0.0` - No match

- `src` (string, optional): Source of match
  - `"title"` - Found in publication title
  - `"none"` - No match found

**Frontend Usage**:
```javascript
const lit = sample.matching_metadata.evidence.lit;
if (lit.match) {
  console.log(`Literature confirms: ${lit.type} match (${(lit.conf * 100).toFixed(0)}%)`);
}
```

---

#### `matching_metadata.expl`

**Present**: Always  
**Type**: `object`

```json
{
  "status": "matched",
  "r": [
    "space:very_close",
    "tecto:match",
    "time:strong",
    "petro:weak",
    "lit:explicit"
  ],
  "f": ["time:low_precision"]
}
```

**Fields**:

- `status` (string): Overall matching status
  - `"matched"` - Successfully matched to a volcano
  - `"rejected"` - No suitable volcano found

- `r` (array of strings): **Reasons** - List of evidence for/against match
  - Format: `"{dimension}:{level}"`
  
- `f` (array of strings): **Flags** - Additional notes or warnings
  - Format: `"{dimension}:{flag_type}"`

**REASONS (`r`) - Possible Values**:

**Spatial reasons**:
- `"space:very_close"` - < 5 km from volcano
- `"space:near"` - 5-25 km from volcano
- `"space:moderate"` - 25-50 km from volcano
- `"space:far"` - > 50 km from volcano
- `"space:no_data"` - No spatial data available

**Tectonic reasons**:
- `"tecto:match"` - Tectonic settings match (score 1.0)
- `"tecto:likely"` - Tectonic settings match (score >= 0.8)
- `"tecto:partial"` - Tectonic settings match (score >= 0.5)
- `"tecto:mismatch"` - Tectonic settings don't match
- `"tecto:no_data"` - No tectonic data available

**Temporal reasons**:
- `"time:strong"` - Eruption date closely matches (score >= 0.8)
- `"time:partial"` - Eruption date moderately matches (score >= 0.6)
- `"time:marginal"` - Eruption date weakly matches (score > 0)
- `"time:pre_holocene"` - Sample from pre-Holocene eruption
- `"time:no_data"` - No temporal data available

**Petrological reasons**:
- `"petro:match"` - Rock type strongly matches volcano (score >= 0.9)
- `"petro:compatible"` - Rock type moderately matches (score >= 0.6)
- `"petro:weak"` - Rock type weakly matches (score > 0.6)
- `"petro:no_data"` - No petrological data available

**Literature reasons**:
- `"lit:explicit"` - Explicit mention in literature
- `"lit:partial"` - Partial mention in literature
- `"lit:regional"` - Mention of the region in literature
- `"lit:none"` - No literature evidence

**FLAGS (`f`) - Possible Values**:
- `"space:high_uncertainty"` - High spatial uncertainty
- `"time:low_precision"` - Low temporal precision
- `"time:wide_interval"` - Wide interval of time between volcano eruptions history and sample datation
- `"time:zero_bp"` - Sample dated to 0 years before present (BP)
- `"score:competing_candidates"` - Multiple volcanoes possible
- Additional flags as needed

**Frontend Usage**:
```javascript
const expl = sample.matching_metadata.expl;

// Translate reasons for display
const reasonText = expl.r.map(r => {
  const [dim, level] = r.split(':');
  return translateReason(dim, level);
}).join(', ');

console.log(`Match explanation: ${reasonText}`);

// Show warnings
if (expl.f.length > 0) {
  console.log(`Warnings: ${expl.f.join(', ')}`);
}
```

---

#### `matching_metadata.meta`

**Present**: Always  
**Type**: `object`

```json
{
  "method": "multi-dimensional",
  "ts": "2026-01-06T15:08:41.482546"
}
```

**Fields**:
- `method` (string): Matching method used
  - `"multi-dimensional"` - Full multi-dimensional matching (spatial + tectonic + temporal + petrological + literature)
  - `"no_match"` - No match found

- `ts` (string): Timestamp of when the matching was performed
  - Format: ISO 8601 (YYYY-MM-DDTHH:MM:SS.ffffff)

**Frontend Usage**:
```javascript
const meta = sample.matching_metadata.meta;
const matchDate = new Date(meta.ts);
console.log(`Matched using ${meta.method} on ${matchDate.toLocaleDateString()}`);
```

---

## Enumerated Values

### Database (`db`)
- `"GEOROC"` (~71% of samples)
- `"PETDB"` (~29% of samples)

### Material (`material`)
- `"WR"` (Whole Rock) - ~100%
- `"GL"` (Glass) - rare
- `"MIN"` (Mineral) - rare
- `"INC"` (Inclusion) - rare

### Rock Type (`rock_type`)
Top 15 types:
1. `"BASALT"` (35.5%)
2. `"DACITE"` (23.8%)
3. `"BASALTIC ANDESITE"` (15.9%)
4. `"RHYOLITE"` (8.9%)
5. `"ANDESITE"` (5.5%)
6. `"PICROBASALT"` (4.1%)
7. `"TRACHYTE/TRACHYDACITE"` (2.5%)
8. `"TRACHYANDESITE"` (1.3%)
9. `"BASALTIC TRACHYANDESITE"` (1.1%)
10. `"TRACHYBASALT"` (0.6%)
11. `"TEPHRITE/BASANITE"` (0.5%)
12. `"TEPHRI-PHONOLITE"` (0.2%)
13. `"PHONO-TEPHRITE"` (0.1%)
14. `"FOIDITE"` (<0.1%)
15. `"PHONOLITE"` (<0.1%)

### Confidence Level (`quality.conf`)
- `"none"` - 77.1% (no match found)
- `"high"` - 7.9% (strong match)
- `"low"` - 7.7% (weak match)
- `"medium"` - 7.3% (moderate match)

### Matching Method (`meta.method`)
- `"multi-dimensional"` - Standard matching process
- `"no_match"` - No volcano association

### Literature Type (`evidence.lit.type`)
- `"none"` - No literature evidence (~100% currently)
- `"explicit"` - Explicit volcano mention (rare)
- `"partial"` - Implicit evidence (rare)
- `"regional"` - Implicit evidence (rare)

### Explanation Status (`expl.status`)
- `"matched"` - Successfully matched to volcano
- `"rejected"` - No suitable match found

---

## Example Documents

### Example 1: High Confidence Match

```json
{
  "sample_id": "SAMPLE_000022_s_A1(TOP) [20691]",
  "sample_code": "s_A1(TOP) [20691]",
  "references": "10.1016/j.jvolgeores.2021.107123",
  "db": "GEOROC",
  "material": "WR",
  "rock_type": "BASALT",
  "tectonic_setting": "Rift zone / Continental",
  "oxides": {
    "SIO2": 47.2,
    "TIO2": 1.8,
    "AL2O3": 16.5,
    "FEOT": 10.2,
    "MGO": 6.3,
    "CAO": 11.1,
    "NA2O": 3.2,
    "K2O": 1.9
  },
  "geometry": {
    "type": "Point",
    "coordinates": [15.0, 37.75]
  },
  "matching_metadata": {
    "volcano": {
      "name": "Etna",
      "number": "211060",
      "dist_km": 2.0
    },
    "scores": {
      "sp": 0.98,
      "te": 0.0,
      "ti": 1.0,
      "pe": 0.85,
      "final": 0.82
    },
    "quality": {
      "cov": 1.0,
      "unc": 0.0,
      "conf": "high"
    },
    "evidence": {
      "lit": {
        "match": true,
        "type": "explicit",
        "conf": 0.95,
        "src": "title"
      }
    },
    "expl": {
      "status": "matched",
      "r": [
        "space:very_close",
        "tecto:mismatch",
        "time:strong",
        "petro:weak",
        "lit:explicit"
      ],
      "f": []
    },
    "meta": {
      "method": "multi-dimensional",
      "ts": "2026-01-06T15:08:41.482546"
    }
  }
}
```

**Interpretation**:
- ✅ **Very close** to Etna (2 km)
- ✅ **Excellent spatial score** (0.98)
- ✅ **Perfect temporal match** (1.0)
- ✅ **Good petrological match** (0.85)
- ✅ **Literature confirms** (explicit mention)
- ⚠️ Tectonic setting mismatch (but other evidence strong)
- **Result**: High confidence match (final score 0.82)

---

### Example 2: Medium Confidence Match

```json
{
  "sample_id": "SAMPLE_000251_s_13JN12-1 [21984]",
  "sample_code": "s_13JN12-1 [21984]",
  "references": "10.1016/j.gr.2018.02.013",
  "db": "GEOROC",
  "material": "WR",
  "rock_type": "DACITE",
  "tectonic_setting": "Intraplate / Continental",
  "oxides": {
    "SIO2": 75.386,
    "TIO2": 0.122,
    "AL2O3": 13.952,
    "FEOT": 1.005,
    "MGO": 0.386,
    "CAO": 2.102,
    "K2O": 3.513,
    "NA2O": 3.513
  },
  "geometry": {
    "type": "Point",
    "coordinates": [126.764, 42.428]
  },
  "matching_metadata": {
    "volcano": {
      "name": "Longgang Group",
      "number": "305050",
      "dist_km": 24.259
    },
    "scores": {
      "sp": 0.445,
      "te": 1.0,
      "ti": 0.0,
      "pe": 0.0,
      "final": 0.406
    },
    "quality": {
      "cov": 1.0,
      "unc": 0.0,
      "conf": "medium"
    },
    "evidence": {
      "lit": {
        "match": false,
        "type": "none",
        "conf": 0.0
      }
    },
    "expl": {
      "status": "matched",
      "r": [
        "space:near",
        "tecto:match",
        "time:pre_holocene",
        "petro:weak"
      ],
      "f": [
        "time:low_precision"
      ]
    },
    "meta": {
      "method": "multi-dimensional",
      "ts": "2026-01-06T15:08:41.482546"
    }
  }
}
```

**Interpretation**:
- ⚠️ **Moderate distance** (24.3 km)
- ✅ **Tectonic setting matches** (1.0)
- ❌ **No temporal data** (ti=0.0, pre-Holocene)
- ⚠️ **Weak petrological match** (pe=0.0)
- ❌ **No literature evidence**
- ⚠️ **Low temporal precision flag**
- **Result**: Medium confidence match (final score 0.406)

---

### Example 3: No Match (Rejected)

```json
{
  "sample_id": "SAMPLE_000000_s_97/160 [9689] / s_160 [14227]",
  "sample_code": "s_97/160 [9689] / s_160 [14227]",
  "references": "10.2343/geochemj.40.15; 10.1007/s00710-009-0103-0",
  "db": "GEOROC",
  "material": "WR",
  "rock_type": "BASALTIC ANDESITE",
  "oxides": {
    "SIO2": 54.592,
    "TIO2": 0.325,
    "AL2O3": 9.107,
    "FEOT": 8.471,
    "MGO": 13.3,
    "CAO": 12.569,
    "K2O": 0.213,
    "NA2O": 1.208
  },
  "geometry": {
    "type": "Point",
    "coordinates": [81.475, 18.85]
  },
  "matching_metadata": {
    "quality": {
      "cov": 0.0,
      "unc": 1.0,
      "conf": "none"
    },
    "evidence": {
      "lit": {
        "match": false,
        "type": "none",
        "conf": 0.0
      }
    },
    "expl": {
      "status": "rejected",
      "r": [
        "space:no_data",
        "tecto:no_data",
        "time:no_data",
        "petro:no_data"
      ],
      "f": [
        "space:high_uncertainty"
      ]
    },
    "meta": {
      "method": "no_match",
      "ts": "2026-01-06T15:08:41.482546"
    }
  }
}
```

**Interpretation**:
- ❌ **No volcano field** (not matched)
- ❌ **No spatial data available**
- ❌ **No tectonic data**
- ❌ **No temporal data**
- ❌ **No petrological data**
- ❌ **High spatial uncertainty**
- **Result**: No match (confidence = none)

---

## Frontend Integration Guide

### 1. Checking if Sample is Matched

```javascript
function isMatched(sample) {
  return sample.matching_metadata.volcano !== undefined;
}

function getConfidence(sample) {
  return sample.matching_metadata.quality.conf;
}

// Usage
if (isMatched(sample)) {
  const volcano = sample.matching_metadata.volcano;
  const confidence = getConfidence(sample);
  console.log(`Matched to ${volcano.name} (confidence: ${confidence})`);
} else {
  console.log('No volcano match');
}
```

### 2. Displaying Match Quality

```javascript
function getQualityBadge(confidence) {
  const badges = {
    'high': { color: 'green', text: 'High Confidence', icon: '✓✓' },
    'medium': { color: 'yellow', text: 'Medium Confidence', icon: '✓' },
    'low': { color: 'orange', text: 'Low Confidence', icon: '?' },
    'none': { color: 'gray', text: 'No Match', icon: '✗' }
  };
  return badges[confidence] || badges.none;
}

// Usage
const badge = getQualityBadge(sample.matching_metadata.quality.conf);
console.log(`${badge.icon} ${badge.text}`);
```

### 3. Displaying Scores

```javascript
function formatScores(scores) {
  if (!scores) return null;
  
  return {
    spatial: `${(scores.sp * 100).toFixed(0)}%`,
    tectonic: `${(scores.te * 100).toFixed(0)}%`,
    temporal: `${(scores.ti * 100).toFixed(0)}%`,
    petrological: `${(scores.pe * 100).toFixed(0)}%`,
    final: `${(scores.final * 100).toFixed(0)}%`
  };
}

// Usage
const scores = formatScores(sample.matching_metadata.scores);
if (scores) {
  console.log(`Final Score: ${scores.final}`);
  console.log(`- Spatial: ${scores.spatial}`);
  console.log(`- Temporal: ${scores.temporal}`);
}
```

### 4. Translating Explanation Reasons

```javascript
function translateReason(reason) {
  const translations = {
    // Spatial
    'space:very_close': '📍 Very close (<5 km)',
    'space:near': '📍 Near (5-25 km)',
    'space:moderate': '📍 Moderate (25-50 km)',
    'space:far': '📍 Far (>50 km)',
    'space:no_data': '📍 No spatial data',
    
    // Tectonic
    'tecto:match': '🌍 Tectonic setting matches',
    'tecto:likely': '🌍 Tectonic setting likely matches',
    'tecto:partial': '🌍 Tectonic setting partially matches',
    'tecto:mismatch': '🌍 Tectonic mismatch',
    'tecto:no_data': '🌍 No tectonic data',
    
    // Temporal
    'time:strong': '📅 Date strongly matches Holocene area (score >= 0.9)',
    'time:partial': '📅 Date partialy matches Holocene area (score >= 0.6)',
    'time:marginal': '📅 Date is marginal to Holocene area (score < 0.6)',
    'time:pre_holocene': '📅 Pre-Holocene eruption',
    'time:no_data': '📅 No date data',
    
    // Petrological
    'petro:strong': '🪨 Rock type matches (score >= 0.9)',
    'petro:compatible': '🪨 Rock type somewhat matches (score >= 0.6)',
    'petro:weak': '🪨 Rock type differs (score < 0.6)',
    'petro:no_data': '🪨 No rock type data',
    
    // Literature
    'lit:explicit': '📚 Explicitly mentioned in literature',
    'lit:partial': '📚 Partially mentioned in literature',
    'lit:regional': '📚 Region mentioned in literature',
    'lit:none': '📚 No literature mention'
  };
  
  return translations[reason] || reason;
}

// Usage
const expl = sample.matching_metadata.expl;
const reasonsText = expl.r.map(translateReason).join('\n');
console.log('Match based on:\n' + reasonsText);
```

### 5. Filtering Samples

```javascript
// Filter by confidence
const highConfidenceSamples = samples.filter(s => 
  s.matching_metadata.quality.conf === 'high'
);

// Filter by volcano
const etnaSamples = samples.filter(s => 
  s.matching_metadata.volcano?.name === 'Etna'
);

// Filter by rock type
const basaltSamples = samples.filter(s => 
  s.rock_type === 'BASALT'
);

// Filter by database
const georocSamples = samples.filter(s => s.db === 'GEOROC');

// Complex filter: High confidence basalts from Etna
const etnaBasalts = samples.filter(s => 
  s.matching_metadata.volcano?.name === 'Etna' &&
  s.rock_type === 'BASALT' &&
  s.matching_metadata.quality.conf === 'high'
);
```

### 6. Spatial Queries (MongoDB)

```javascript
// Find samples near a point (using MongoDB)
db.samples.find({
  geometry: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [15.0, 37.75]  // Etna coordinates
      },
      $maxDistance: 50000  // 50 km in meters
    }
  }
});

// Find samples within a bounding box
db.samples.find({
  geometry: {
    $geoWithin: {
      $box: [
        [14.0, 37.0],  // Southwest corner [lon, lat]
        [16.0, 38.0]   // Northeast corner [lon, lat]
      ]
    }
  }
});
```

### 7. Aggregation Examples

```javascript
// Count samples by confidence level
db.samples.aggregate([
  {
    $group: {
      _id: "$matching_metadata.quality.conf",
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } }
]);

// Average final score by rock type
db.samples.aggregate([
  { $match: { "matching_metadata.scores": { $exists: true } } },
  {
    $group: {
      _id: "$rock_type",
      avg_score: { $avg: "$matching_metadata.scores.final" },
      count: { $sum: 1 }
    }
  },
  { $sort: { avg_score: -1 } }
]);

// Top volcanoes by sample count
db.samples.aggregate([
  { $match: { "matching_metadata.volcano": { $exists: true } } },
  {
    $group: {
      _id: "$matching_metadata.volcano.name",
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } },
  { $limit: 10 }
]);
```

---

## Backend API Examples

### REST API Endpoints

```javascript
// GET /api/samples/:id
// Get single sample by ID
app.get('/api/samples/:id', async (req, res) => {
  const sample = await db.samples.findOne({ sample_id: req.params.id });
  res.json(sample);
});

// GET /api/samples
// Search samples with filters
app.get('/api/samples', async (req, res) => {
  const {
    db_source,        // "GEOROC" or "PETDB"
    rock_type,        // "BASALT", "DACITE", etc.
    confidence,       // "high", "medium", "low", "none"
    volcano_name,     // "Etna", etc.
    min_score,        // 0.0-1.0
    limit = 100,
    offset = 0
  } = req.query;
  
  const query = {};
  if (db_source) query.db = db_source;
  if (rock_type) query.rock_type = rock_type;
  if (confidence) query['matching_metadata.quality.conf'] = confidence;
  if (volcano_name) query['matching_metadata.volcano.name'] = volcano_name;
  if (min_score) query['matching_metadata.scores.final'] = { $gte: parseFloat(min_score) };
  
  const samples = await db.samples
    .find(query)
    .skip(offset)
    .limit(limit)
    .toArray();
  
  res.json({
    samples,
    total: await db.samples.countDocuments(query),
    offset,
    limit
  });
});

// GET /api/samples/near
// Find samples near coordinates
app.get('/api/samples/near', async (req, res) => {
  const { lon, lat, radius = 50000 } = req.query;  // radius in meters
  
  const samples = await db.samples.find({
    geometry: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(lon), parseFloat(lat)]
        },
        $maxDistance: parseInt(radius)
      }
    }
  }).limit(100).toArray();
  
  res.json(samples);
});

// GET /api/volcanoes/:volcano_id/samples
// Get all samples for a volcano
app.get('/api/volcanoes/:volcano_id/samples', async (req, res) => {
  const samples = await db.samples.find({
    'matching_metadata.volcano.number': req.params.volcano_id
  }).toArray();
  
  res.json(samples);
});
```

---

## Key Points for Development

### ✅ Always Check

1. **Volcano presence**: Always check if `matching_metadata.volcano` exists before accessing
2. **Scores presence**: Scores only exist if volcano matched
3. **Confidence level**: Use `quality.conf` to determine match quality
4. **GeoJSON format**: Coordinates are `[longitude, latitude]` (not lat/lon)
5. **Score of 0.0**: Often means "no data" rather than "bad match"

### ⚠️ Common Pitfalls

1. **Don't assume all samples have volcano**: 77% have no match
2. **Don't treat 0.0 score as "bad"**: It usually means missing data
3. **Don't ignore flags**: `expl.f` contains important warnings
4. **Don't use only final score**: Check individual dimension scores for context
5. **Don't forget to handle null values**: Some fields may be absent

### 💡 Best Practices

1. **Use explanation reasons** for user-friendly messages
2. **Show quality metrics** (coverage, uncertainty) for transparency
3. **Display flags as warnings** to inform users of limitations
4. **Provide filtering** by confidence level
5. **Enable spatial search** using geometry field
6. **Link to references** (DOI links) for scientific traceability

---

## Document Size Statistics

- **Average**: ~766 bytes per document
- **Maximum**: ~1,084 bytes
- **Target**: < 1 KB per document ✅
- **Total storage**: ~374 MB for 512,395 samples
- **Compliance**: 99.965% of documents under 1 KB

---

**Last Updated**: January 6, 2026  
**Version**: 1.0  
**Contact**: DashVolcano Development Team
