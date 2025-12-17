# Confidence Score Implementation Guide

## Overview

This document describes the implementation of confidence score visualization and export across the DashVolcano application. The confidence score indicates the reliability of sample-volcano associations based on spatial proximity and metadata quality.

## Design Philosophy

### Core Principles

1. **Non-Intrusive**: Confidence is SECONDARY to existing visual encodings (database, rock type)
2. **Transparency**: Users can see data quality without it dominating the interface
3. **Context-Aware**: Confidence appears where it's most useful (tooltips, details, exports)
4. **Selective Visibility**: Map shows confidence more explicitly; plots use hover-only

### Visual Hierarchy

```
Priority 1: Selected volcano highlighting (orange) → ALWAYS VISIBLE
Priority 2: Rock type / Database colors → PRIMARY ENCODING
Priority 3: Confidence score → SUBTLE/CONTEXTUAL
```

## Implementation Details

### 1. Confidence Levels

The system recognizes four confidence levels:

| Level | Value | Color | Meaning |
|-------|-------|-------|---------|
| **High** | `high`, `3` | Green (#22C55E) | Sample very close to volcano, high certainty |
| **Medium** | `medium`, `2` | Amber (#FBBF24) | Moderately close, reasonable association |
| **Low** | `low`, `1` | Red (#EF4444) | Far from volcano, uncertain association |
| **Unknown** | `null`, `undefined` | Gray (#9CA3AF) | No confidence metadata available |

### 2. Color Strategy

#### Map View (ScatterplotLayer)

```javascript
// Color logic for sample points
getFillColor: (sample) => {
  // PRIORITY 1: Selected volcano (always orange)
  if (isSelectedVolcano(sample)) {
    return [255, 140, 0, 200]; // Orange
  }
  
  // PRIORITY 2: Confidence-based coloring
  const confidence = normalizeConfidence(sample.matching_metadata?.confidence_score);
  return getConfidenceColor(confidence);
}

// Confidence color mapping
getConfidenceColor(level) {
  high:    [34, 197, 94, 180]   // Green with transparency
  medium:  [251, 191, 36, 180]  // Amber with transparency
  low:     [239, 68, 68, 180]   // Red with transparency
  unknown: [156, 163, 175, 140] // Gray with more transparency
}
```

**Rationale**: 
- Selected samples use **solid orange** for maximum visibility
- Non-selected samples use **semi-transparent confidence colors** that don't compete with selection
- Traffic-light metaphor (green=good, yellow=caution, red=uncertain) is intuitive
- Transparency ensures samples don't overwhelm the map at high densities

#### Plot Views (Harker, TAS, AFM)

Confidence is **NOT** encoded visually in plots because:
- Color is already used for database/rock type
- Shape encodes additional categorical data
- Adding a third visual dimension creates cognitive overload
- Plots focus on geochemical patterns, not data quality

Instead, confidence appears in:
- **Hover tooltips**: Shows confidence when user inspects a point
- **Click details**: Displays in the sample detail panel

### 3. Tooltip Structure

#### Map Tooltip (Enhanced)

```
┌─────────────────────────────────┐
│ Sample                          │ ← Header
├─────────────────────────────────┤
│ Volcano: Etna                   │
│ Rock: Basalt                    │
│ Location: 37.75°, 15.00°        │
│ Tectonic Setting: Continental   │
├─────────────────────────────────┤ ← Confidence Section
│ ✓ High Confidence               │ ← Icon + Label
│ Sample location is very close   │ ← Description
│ to volcano, high certainty      │
├─────────────────────────────────┤
│ References: Smith et al. 2020   │ ← Footer
└─────────────────────────────────┘
   ▲
   └─ Left border colored by confidence
```

**Features**:
- Left border accent matches confidence color (subtle visual cue)
- Icon provides quick visual reference (✓, ~, ?, −)
- Description explains what the confidence means
- Collapsible if confidence is unknown

#### Plot Tooltip (Hover)

```javascript
// Example for Harker diagram
hovertemplate: 
  '<b>%{text}</b><br>' +
  'SiO2: %{x:.2f}%<br>' +
  'MgO: %{y:.2f}%<br>' +
  'Database: %{customdata[0]}<br>' +
  'Volcano: %{customdata[1]}<br>' +
  'Confidence: %{customdata[2]}<br>' +  // NEW
  '<extra></extra>'
```

### 4. CSV Export

#### Column Structure

```csv
Sample ID,Database,Material,Rock Type,Tectonic Setting,Latitude,Longitude,Volcano Name,Distance (km),Matching Confidence,Location,References,...
GEOROC-001,GEOROC,WR,Basalt,Continental Arc,37.75,15.00,Etna,0.5,high,Sicily,Smith 2020,...
```

**Key Features**:
- **Column Name**: "Matching Confidence" (clear, descriptive)
- **Position**: After distance, before location (logical grouping with volcano metadata)
- **Values**: Standardized strings (`high`, `medium`, `low`, `unknown`)
- **Consistency**: Matches UI labels exactly

#### Implementation

```javascript
// csvExport.ts
import { formatConfidenceForCSV } from './confidence';

const rows = samples.map(sample => {
  const metadata = sample.matching_metadata;
  
  return [
    sample.sample_id,
    sample.db,
    // ... other fields ...
    metadata?.distance_km?.toFixed(2) || '',
    formatConfidenceForCSV(metadata?.confidence_score), // NEW
    sample.geographic_location,
    // ... remaining fields ...
  ];
});
```

### 5. Backend Integration

#### API Projection

```python
# samples.py - Ensure confidence_score is included
projection = {
    "_id": 1,
    "sample_id": 1,
    "rock_type": 1,
    "db": 1,
    "geometry": 1,
    "tectonic_setting": 1,
    "material": 1,
    "geographic_location": 1,
    "matching_metadata.volcano_number": 1,
    "matching_metadata.volcano_name": 1,
    "matching_metadata.distance_km": 1,
    "matching_metadata.confidence_score": 1,  # CRITICAL
    "references": 1,
    "oxides.SIO2(WT%)": 1,
    # ... other oxide fields ...
}
```

**Note**: The backend already includes `confidence_score` in the projection, but it's now explicitly documented and additional oxide fields are included for CSV export.

## UX Rationale

### Why This Approach Avoids Visual Overload

1. **Hierarchical Information Architecture**
   - Critical info (selected volcano) uses strongest visual encoding (solid color)
   - Secondary info (confidence) uses weaker encoding (transparency, tooltips)
   - Tertiary info (references) appears only on demand (hover/click)

2. **Progressive Disclosure**
   - Map: Confidence visible as subtle point color
   - Hover: Detailed confidence explanation appears
   - Click: Full sample details with all metadata
   - Export: Complete data for offline analysis

3. **Context-Appropriate Display**
   - **Map**: Spatial relationships matter → show confidence spatially
   - **Plots**: Chemical patterns matter → show confidence on demand
   - **Export**: All data matters → include everything

4. **Cognitive Load Management**
   - Users can **ignore** confidence if they trust the data
   - Users can **check** confidence when they need to assess quality
   - Users can **filter** by confidence in future iterations (low-priority feature)

### Accessibility Considerations

- **Color-blind friendly**: Uses saturation and transparency in addition to hue
- **Text labels**: All colors have corresponding text labels in tooltips
- **Icons**: Visual symbols (✓, ~, ?) supplement color coding
- **Export**: Text-based values in CSV work with assistive technologies

## Usage Examples

### Example 1: Exploring High-Quality Samples

```typescript
// User workflow:
1. Open map view
2. See green points → high confidence samples
3. Hover over green point → confirms "High Confidence"
4. Click to view details → volcano association is reliable
5. Export CSV → filter by "high" confidence in external tools
```

### Example 2: Investigating Uncertain Associations

```typescript
// User workflow:
1. Open map view
2. Notice red points far from volcanoes
3. Hover → "Low Confidence - Sample location is far from volcano"
4. User understands: This sample might not belong to this volcano
5. Can decide to exclude low-confidence samples from analysis
```

### Example 3: Analytical Plot Usage

```typescript
// User workflow:
1. Create TAS diagram with samples from multiple databases
2. See interesting outlier point
3. Hover → tooltip shows "Confidence: low"
4. User knows: This outlier might be a misassociation, not a real geochemical trend
5. Can verify by checking map view for spatial context
```

## Technical Architecture

### File Structure

```
frontend/src/
├── utils/
│   ├── confidence.ts          # NEW: Core confidence utilities
│   └── csvExport.ts           # UPDATED: Includes confidence column
├── components/
│   └── Map/
│       └── Map.tsx            # UPDATED: Confidence coloring + tooltips
└── components/Charts/
    ├── HarkerDiagram.tsx      # FUTURE: Add confidence to hover
    ├── TASChart.tsx           # FUTURE: Add confidence to hover
    └── AFMChart.tsx           # FUTURE: Add confidence to hover

backend/routers/
└── samples.py                 # UPDATED: Projection includes confidence_score
```

### Dependencies

- **deck.gl**: ScatterplotLayer for confidence-colored map points
- **Plotly**: Customdata for confidence in plot tooltips (future)
- **TypeScript**: Type-safe confidence level handling
- **MongoDB**: confidence_score field in matching_metadata

## Future Enhancements

### Phase 2: Interactive Filtering

```typescript
// Future feature: Filter samples by confidence level
<ConfidenceFilter
  value={['high', 'medium']}
  onChange={(levels) => filterSamples(levels)}
/>
```

### Phase 3: Confidence-Based Statistics

```typescript
// Future feature: Show data quality metrics
<DataQualitySummary
  samples={samples}
  metrics={{
    high: 1234,      // 45%
    medium: 890,     // 32%
    low: 567,        // 21%
    unknown: 89      // 2%
  }}
/>
```

### Phase 4: Batch Confidence Recalculation

```python
# Future backend feature: Recalculate confidence for all samples
POST /api/samples/recalculate-confidence
{
  "algorithm": "distance-based",
  "parameters": {
    "high_threshold_km": 5,
    "medium_threshold_km": 20
  }
}
```

## Testing Checklist

- [ ] Map displays confidence colors correctly
- [ ] Selected volcano samples always show orange (not confidence color)
- [ ] Hover tooltips show confidence information
- [ ] CSV export includes "Matching Confidence" column
- [ ] All confidence levels normalize correctly (high, medium, low, unknown)
- [ ] Backend API returns confidence_score field
- [ ] Color-blind users can distinguish levels via text labels
- [ ] Tooltips display helpful descriptions
- [ ] Export matches UI exactly (no discrepancies)

## Conclusion

This implementation provides **transparent data quality indicators** without overwhelming users with visual complexity. Confidence scores are available where they matter most (map, tooltips, exports) while staying out of the way during primary analytical workflows (plots, geochemical analysis).

The design follows best practices for:
- **Information hierarchy**: Critical info first, details on demand
- **Progressive disclosure**: Simple overview, detailed explanation available
- **Accessibility**: Multiple modalities (color, text, icons)
- **Data integrity**: Consistent representation across UI and exports
