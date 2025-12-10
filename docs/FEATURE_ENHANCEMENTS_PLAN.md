# DashVolcano v3.1 - Feature Enhancements Plan

**Created**: December 10, 2025  
**Status**: Planning Phase  
**Target Version**: 3.1.0  
**Estimated Duration**: 12-15 hours

---

## Overview

This document outlines planned feature enhancements across four existing pages based on user feedback and requirements. All features focus on improving data visualization, comparison capabilities, and analytical insights.

---

## Feature Summary

| Page | Features | Complexity | Priority | Est. Time |
|------|----------|------------|----------|-----------|
| **Map** | Bounding box search widget | Medium | Critical | 3-4h |
| **Compare Volcanoes** | Rock type percentages + Harker diagrams | High | High | 4-5h |
| **Timeline** | Sample collection timeline | Medium | Medium | 2-3h |
| **Analyze Volcano** | TAS by VEI + Rock type percentages | Medium | High | 3-4h |
| **Compare VEI** | Major rock types from GVP | Medium | Medium | 3-4h |
| **About** | Publications, Contributors, Enhanced Citations | Low | High | 1-2h |

**Total Estimated Time**: 17-23 hours

---

## 1. Map Page Enhancement - Bounding Box Search

### 1.1 Spatial Search Widget

**Requirement**: Allow users to define a bounding box (bbox) to query samples within a specific geographic area

**Problem Statement**:
- Current implementation loads ALL samples globally (up to 10,000 limit)
- Causes performance issues with large datasets
- Map becomes cluttered with too many points
- Users cannot focus on specific regions of interest
- High latency for data transfer and rendering

**Proposed Solution**: Implement interactive bounding box search with map-based selection

**Current State**:
- Map loads samples based on filters (rock type, tectonic setting, etc.)
- No spatial query parameter in API
- Backend samples endpoint has limit/offset but no bbox filtering
- Frontend Map component uses Deck.gl ScatterplotLayer

---

#### Backend Implementation

**API Endpoint Extension**:

```python
# backend/routers/samples.py - Update get_samples endpoint

@router.get("/")
async def get_samples(
    db: Database = Depends(get_database),
    # Existing filters...
    rock_type: Optional[str] = Query(None),
    tectonic_setting: Optional[str] = Query(None),
    # ... other filters ...
    
    # NEW: Bounding box parameters
    bbox: Optional[str] = Query(
        None, 
        description="Bounding box as 'min_lon,min_lat,max_lon,max_lat' (e.g., '-10,35,20,60')",
        regex=r'^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$'
    ),
    limit: int = Query(10000, le=50000),
    offset: int = Query(0, ge=0)
):
    """
    Get samples with optional bounding box filtering.
    
    Bounding box format: min_lon,min_lat,max_lon,max_lat
    Example: bbox=-10,35,20,60 (covers Western Europe)
    """
    query = {}
    
    # Existing filter logic...
    # ... rock_type, tectonic_setting, etc. ...
    
    # NEW: Bounding box filter using MongoDB geospatial query
    if bbox:
        try:
            coords = [float(x) for x in bbox.split(',')]
            if len(coords) != 4:
                raise HTTPException(status_code=400, detail="bbox must have 4 values")
            
            min_lon, min_lat, max_lon, max_lat = coords
            
            # Validate coordinate ranges
            if not (-180 <= min_lon <= 180 and -180 <= max_lon <= 180):
                raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")
            if not (-90 <= min_lat <= 90 and -90 <= max_lat <= 90):
                raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
            if min_lon >= max_lon or min_lat >= max_lat:
                raise HTTPException(status_code=400, detail="Invalid bounding box: min values must be less than max values")
            
            # MongoDB geospatial query
            # Note: MongoDB uses [longitude, latitude] order
            query["geometry"] = {
                "$geoWithin": {
                    "$box": [
                        [min_lon, min_lat],  # Southwest corner
                        [max_lon, max_lat]   # Northeast corner
                    ]
                }
            }
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid bbox format. Use: min_lon,min_lat,max_lon,max_lat")
    
    # Execute query with geospatial index
    samples = list(db.samples.find(query).limit(limit).skip(offset))
    
    # Transform _id to string
    for sample in samples:
        if "_id" in sample:
            sample["_id"] = str(sample["_id"])
    
    return {
        "count": len(samples),
        "total": db.samples.count_documents(query),
        "limit": limit,
        "offset": offset,
        "bbox": bbox,
        "data": samples
    }
```

**Database Index** (for performance):

```python
# backend/database.py - Add geospatial index on startup

async def init_database():
    """Initialize database indexes"""
    db = await get_database()
    
    # Existing indexes...
    
    # NEW: Create 2dsphere index for geospatial queries
    await db.samples.create_index([("geometry", "2dsphere")])
    
    logger.info("Geospatial index created on samples.geometry")
```

**Performance Considerations**:
- MongoDB `$geoWithin` with `$box` is efficient with 2dsphere index
- Typical query time: 50-200ms for 100K samples
- Response size: ~50KB for 500 samples (vs 2MB for 10,000)
- 40x reduction in data transfer

---

#### Frontend Implementation

**Option A: Draw Rectangle Tool (Recommended)**

Interactive drawing tool allowing users to define bbox by dragging on map:

```tsx
// frontend/src/components/Map/BboxSearchWidget.tsx

import React, { useState, useCallback } from 'react';
import { Box, Search, X, Info } from 'lucide-react';
import { BBox } from '../../types';

interface BboxSearchWidgetProps {
  onBboxChange: (bbox: BBox | null) => void;
  currentBbox: BBox | null;
  isDrawing: boolean;
  onToggleDrawing: () => void;
  sampleCount: number;
}

const BboxSearchWidget: React.FC<BboxSearchWidgetProps> = ({
  onBboxChange,
  currentBbox,
  isDrawing,
  onToggleDrawing,
  sampleCount
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatBbox = (bbox: BBox): string => {
    return `${bbox.minLon.toFixed(2)}, ${bbox.minLat.toFixed(2)} → ${bbox.maxLon.toFixed(2)}, ${bbox.maxLat.toFixed(2)}`;
  };
  
  const clearBbox = () => {
    onBboxChange(null);
    if (isDrawing) onToggleDrawing();
  };
  
  return (
    <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg border border-gray-200 w-80">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 border-b border-gray-200 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-volcano-600" />
          <h3 className="font-semibold text-gray-900">Area Search</h3>
        </div>
        <button
          className="text-gray-400 hover:text-gray-600"
          aria-label="Toggle area search"
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Click "Draw Area" then drag on the map to select a region. 
                Only samples within this area will be displayed.
              </p>
            </div>
          </div>
          
          {/* Draw Button */}
          <button
            onClick={onToggleDrawing}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-medium transition-colors ${
              isDrawing
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-volcano-600 text-white hover:bg-volcano-700'
            }`}
          >
            <Box className="w-4 h-4" />
            {isDrawing ? 'Cancel Drawing' : 'Draw Area'}
          </button>
          
          {/* Current Bbox Display */}
          {currentBbox && (
            <div className="space-y-2">
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">Selected Area:</div>
                <div className="text-sm font-mono text-gray-800">
                  {formatBbox(currentBbox)}
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  📍 <strong>{sampleCount.toLocaleString()}</strong> samples in this area
                </div>
              </div>
              
              <button
                onClick={clearBbox}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear Area
              </button>
            </div>
          )}
          
          {/* Preset Areas (Optional) */}
          <div className="border-t border-gray-200 pt-3">
            <div className="text-xs text-gray-500 mb-2">Quick Select:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onBboxChange({ minLon: -130, minLat: 24, maxLon: -60, maxLat: 50 })}
                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                🇺🇸 North America
              </button>
              <button
                onClick={() => onBboxChange({ minLon: -10, minLat: 35, maxLon: 40, maxLat: 71 })}
                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                🇪🇺 Europe
              </button>
              <button
                onClick={() => onBboxChange({ minLon: 100, minLat: -10, maxLon: 150, maxLat: 25 })}
                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                🌏 SE Asia
              </button>
              <button
                onClick={() => onBboxChange({ minLon: -80, minLat: -55, maxLon: -35, maxLat: 15 })}
                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                🌎 South America
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BboxSearchWidget;
```

**Map Component Integration**:

```tsx
// frontend/src/components/Map/Map.tsx - Add bbox drawing

import { EditableGeoJsonLayer } from '@deck.gl/layers';
import { DrawRectangleMode } from '@nebula.gl/edit-modes';

const Map: React.FC<MapProps> = ({ samples, volcanoes, ... }) => {
  const [bbox, setBbox] = useState<BBox | null>(null);
  const [isDrawingBbox, setIsDrawingBbox] = useState(false);
  const [drawingFeatures, setDrawingFeatures] = useState<any[]>([]);
  
  const handleBboxComplete = useCallback((features: any[]) => {
    if (features.length > 0) {
      const coords = features[0].geometry.coordinates[0];
      const lons = coords.map((c: number[]) => c[0]);
      const lats = coords.map((c: number[]) => c[1]);
      
      const newBbox = {
        minLon: Math.min(...lons),
        minLat: Math.min(...lats),
        maxLon: Math.max(...lons),
        maxLat: Math.max(...lats)
      };
      
      setBbox(newBbox);
      setIsDrawingBbox(false);
      
      // Trigger API refetch with bbox parameter
      onBboxChange(newBbox);
    }
  }, [onBboxChange]);
  
  const layers = [
    // Existing layers...
    
    // NEW: Drawing layer for bbox selection
    isDrawingBbox && new EditableGeoJsonLayer({
      id: 'bbox-drawing-layer',
      data: { type: 'FeatureCollection', features: drawingFeatures },
      mode: DrawRectangleMode,
      selectedFeatureIndexes: [],
      onEdit: ({ updatedData }: any) => {
        setDrawingFeatures(updatedData.features);
        if (updatedData.features.length > 0) {
          handleBboxComplete(updatedData.features);
        }
      },
      pickable: true,
      getFillColor: [255, 87, 34, 50],
      getLineColor: [255, 87, 34, 255],
      getLineWidth: 2,
      lineWidthMinPixels: 2
    }),
    
    // Bbox rectangle overlay (when not drawing)
    bbox && !isDrawingBbox && new PolygonLayer({
      id: 'bbox-display-layer',
      data: [{
        polygon: [
          [bbox.minLon, bbox.minLat],
          [bbox.maxLon, bbox.minLat],
          [bbox.maxLon, bbox.maxLat],
          [bbox.minLon, bbox.maxLat],
          [bbox.minLon, bbox.minLat]
        ]
      }],
      getPolygon: (d: any) => d.polygon,
      getFillColor: [255, 87, 34, 20],
      getLineColor: [255, 87, 34, 200],
      getLineWidth: 2,
      lineWidthMinPixels: 2,
      pickable: false
    })
  ];
  
  return (
    <>
      <DeckGL
        initialViewState={viewState}
        controller={true}
        layers={layers}
        // ...
      >
        <Map {...mapStyle} />
      </DeckGL>
      
      <BboxSearchWidget
        onBboxChange={setBbox}
        currentBbox={bbox}
        isDrawing={isDrawingBbox}
        onToggleDrawing={() => setIsDrawingBbox(!isDrawingBbox)}
        sampleCount={samples.length}
      />
    </>
  );
};
```

**API Client Update**:

```typescript
// frontend/src/api/samples.ts

export interface BBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export const fetchSamples = async (filters: {
  rockType?: string[];
  tectonicSetting?: string[];
  bbox?: BBox;
  limit?: number;
}): Promise<Sample[]> => {
  const params = new URLSearchParams();
  
  // Existing filters...
  
  // NEW: Add bbox parameter
  if (filters.bbox) {
    const { minLon, minLat, maxLon, maxLat } = filters.bbox;
    params.append('bbox', `${minLon},${minLat},${maxLon},${maxLat}`);
  }
  
  const response = await fetch(`${API_BASE_URL}/samples?${params}`);
  const data = await response.json();
  return data.data;
};
```

---

**Option B: Text Input for Coordinates**

Simple form for manual coordinate entry:

```tsx
const BboxInput: React.FC = () => {
  const [minLon, setMinLon] = useState('');
  const [minLat, setMinLat] = useState('');
  const [maxLon, setMaxLon] = useState('');
  const [maxLat, setMaxLat] = useState('');
  
  const handleSubmit = () => {
    const bbox = {
      minLon: parseFloat(minLon),
      minLat: parseFloat(minLat),
      maxLon: parseFloat(maxLon),
      maxLat: parseFloat(maxLat)
    };
    onBboxChange(bbox);
  };
  
  return (
    <div className="grid grid-cols-2 gap-2">
      <input type="number" placeholder="Min Lon" value={minLon} onChange={e => setMinLon(e.target.value)} />
      <input type="number" placeholder="Min Lat" value={minLat} onChange={e => setMinLat(e.target.value)} />
      <input type="number" placeholder="Max Lon" value={maxLon} onChange={e => setMaxLon(e.target.value)} />
      <input type="number" placeholder="Max Lat" value={maxLat} onChange={e => setMaxLat(e.target.value)} />
      <button onClick={handleSubmit}>Apply</button>
    </div>
  );
};
```

**Recommended Approach**: **Option A (Draw Rectangle)** with Option B as alternative input method

---

#### UI/UX Considerations

1. **Visual Feedback**:
   - Orange rectangle overlay showing selected area
   - Semi-transparent fill (20% opacity)
   - Solid border (2px)
   - Display bbox coordinates and sample count

2. **Drawing Interaction**:
   - Click and drag to draw rectangle
   - ESC key cancels drawing
   - Clear button removes bbox
   - Drawing cursor changes to crosshair

3. **Preset Regions**:
   - Quick-select buttons for major regions
   - North America, Europe, Asia-Pacific, South America
   - Antarctica, Africa, Caribbean, Mediterranean

4. **Performance Indicators**:
   - Show loading spinner during fetch
   - Display "X samples loaded" message
   - Warn if bbox is too large (>10,000 samples)
   - Suggest smaller area if needed

5. **Error Handling**:
   - Validate bbox coordinates
   - Show error if bbox crosses dateline (-180/180)
   - Handle empty results gracefully
   - Provide helpful error messages

---

#### Integration with Existing Filters

Bbox search should work **in combination** with existing filters:

```typescript
// Combined query example
const filters = {
  bbox: { minLon: -10, minLat: 35, maxLon: 20, maxLat: 60 },  // Europe
  rockType: ['BASALT', 'ANDESITE'],  // Only basalt and andesite
  tectonicSetting: ['CONVERGENT_MARGIN']  // Only convergent margins
};

// Result: Basalt and andesite samples from convergent margins in Europe
```

**Query Priority**:
1. Bbox (spatial filter - most restrictive)
2. Rock type filter
3. Tectonic setting filter
4. Other filters (SiO2 range, etc.)

---

#### Files to Modify

**Backend**:
- `backend/routers/samples.py` - Add bbox parameter to get_samples endpoint
- `backend/database.py` - Create 2dsphere geospatial index
- `backend/tests/test_api_endpoints.py` - Add bbox query tests

**Frontend**:
- `frontend/src/components/Map/Map.tsx` - Add bbox drawing layer
- `frontend/src/components/Map/BboxSearchWidget.tsx` - New widget component
- `frontend/src/api/samples.ts` - Add bbox parameter to API client
- `frontend/src/store/index.ts` - Add bbox state management
- `frontend/src/types/index.ts` - Add BBox type definition

**Dependencies**:
- `@nebula.gl/edit-modes` - For rectangle drawing (already available in deck.gl ecosystem)
- `@deck.gl/layers` - EditableGeoJsonLayer

---

#### Testing Strategy

**Backend Tests**:
```python
def test_bbox_query_europe():
    """Test bbox query for European region"""
    response = client.get("/api/samples?bbox=-10,35,20,60")
    assert response.status_code == 200
    data = response.json()
    
    # Verify all samples are within bbox
    for sample in data["data"]:
        lon, lat = sample["geometry"]["coordinates"]
        assert -10 <= lon <= 20
        assert 35 <= lat <= 60

def test_bbox_invalid_format():
    """Test invalid bbox format returns 400"""
    response = client.get("/api/samples?bbox=invalid")
    assert response.status_code == 400
    
def test_bbox_with_filters():
    """Test bbox combined with rock type filter"""
    response = client.get("/api/samples?bbox=-10,35,20,60&rock_type=BASALT")
    assert response.status_code == 200
    data = response.json()
    
    for sample in data["data"]:
        assert sample["rock_type"] == "BASALT"
        lon, lat = sample["geometry"]["coordinates"]
        assert -10 <= lon <= 20
```

**Frontend Tests**:
- Bbox drawing interaction (Cypress)
- API request with bbox parameter
- Clear bbox functionality
- Preset region selection
- Combined filters + bbox

---

#### Performance Metrics

**Before (no bbox)**:
- API Response: ~2MB (10,000 samples)
- Transfer Time: 500-800ms
- Rendering: 200-300ms
- Total: 700-1100ms

**After (with bbox)**:
- API Response: ~50KB (500 samples avg)
- Transfer Time: 50-100ms
- Rendering: 20-30ms
- Total: 70-130ms

**Performance Gain**: 85-90% reduction in load time

---

#### Future Enhancements

1. **Polygon Selection**: Allow arbitrary polygon shapes (not just rectangles)
2. **Multiple Bboxes**: Support multiple non-contiguous regions
3. **Saved Regions**: Let users save and name custom regions
4. **Geofence Alerts**: Notify users when new samples are added to their region
5. **Heatmap Mode**: Show sample density heatmap for large areas

**Estimated Time**: 3-4 hours
- Backend endpoint + index: 1 hour
- Frontend widget UI: 1.5 hours
- Drawing integration: 1 hour
- Testing: 0.5 hours

---

## 2. Compare Volcanoes Page Enhancements

### 1.1 Rock Type Distribution Visualization

**Requirement**: Display percentage distribution of rock types for each selected volcano

**Current State**:
- Data already available in API response (`rock_types` field in `ChemicalAnalysisData`)
- Currently not visualized in UI
- Data format: `{ "ANDESITE": 45, "BASALT": 32, "DACITE": 15, ... }`

**Proposed Implementation**:

#### Backend Changes
- ✅ **No changes required** - `rock_types` already available in `/api/analytics/volcano/{volcano_number}/chemical-analysis` response

#### Frontend Changes

**Option A: Donut/Pie Charts (Recommended)**
- **Pros**: 
  - Clear percentage visualization
  - Easy to compare proportions
  - Plotly.js already available in project
  - Compact space usage
- **Cons**: 
  - Difficult to compare across multiple volcanoes side-by-side
  - Can be cluttered with many rock types

**Implementation**:
```tsx
// New component: RockTypeDistributionChart.tsx
import Plot from 'react-plotly.js';

interface RockTypeDistributionChartProps {
  volcanoName: string;
  rockTypes: Record<string, number>;
  color: string;
}

const RockTypeDistributionChart: React.FC<RockTypeDistributionChartProps> = ({
  volcanoName, rockTypes, color
}) => {
  const total = Object.values(rockTypes).reduce((a, b) => a + b, 0);
  const labels = Object.keys(rockTypes);
  const values = Object.values(rockTypes);
  const percentages = values.map(v => ((v / total) * 100).toFixed(1));

  return (
    <Plot
      data={[{
        type: 'pie',
        labels: labels,
        values: values,
        text: percentages.map(p => `${p}%`),
        textposition: 'inside',
        hovertemplate: '<b>%{label}</b><br>Count: %{value}<br>Percentage: %{text}<extra></extra>',
        marker: {
          colors: generateColorScale(labels.length, color)
        }
      }]}
      layout={{
        title: `${volcanoName} - Rock Types`,
        showlegend: true,
        height: 350
      }}
    />
  );
};
```

**Option B: Stacked Bar Charts**
- **Pros**:
  - Easy side-by-side comparison
  - Clear proportions
  - Better for multiple volcanoes
- **Cons**:
  - Takes more horizontal space

**Implementation**:
```tsx
// Stacked horizontal bar showing percentages for each volcano
const RockTypeComparisonChart: React.FC<Props> = ({ volcanoes }) => {
  const data = volcanoes.map((v, idx) => {
    const total = Object.values(v.rockTypes).reduce((a, b) => a + b, 0);
    return {
      name: v.name,
      y: Object.keys(v.rockTypes),
      x: Object.values(v.rockTypes).map(count => (count / total) * 100),
      type: 'bar',
      orientation: 'h',
      marker: { color: VOLCANO_COLORS[idx] }
    };
  });
  
  return (
    <Plot
      data={data}
      layout={{
        barmode: 'group',
        title: 'Rock Type Distribution (%)',
        xaxis: { title: 'Percentage (%)' },
        yaxis: { title: 'Rock Type' }
      }}
    />
  );
};
```

**Option C: Summary Statistics Table**
- **Pros**:
  - Precise values
  - Sortable
  - Compact
- **Cons**:
  - Less visual impact
  - Harder to see patterns

**Recommended Approach**: **Option B (Stacked Bar Charts)** for main comparison + Option C (table) for detailed values

**UI/UX Considerations**:
- Display below TAS/AFM diagrams in a new section
- Use volcano-specific colors (matching existing `VOLCANO_COLORS`)
- Show both count and percentage in tooltips
- Sort rock types by frequency (most common first)
- Collapse minor rock types (<5%) into "Other" category if >10 types
- Add export to CSV functionality

**Files to Modify**:
- `frontend/src/pages/CompareVolcanoesPage.tsx` - Add rock type distribution section
- `frontend/src/components/Charts/RockTypeDistributionChart.tsx` - New chart component
- `frontend/src/utils/index.ts` - Add rock type percentage calculation helper

**Estimated Time**: 2-3 hours

---

### 1.2 Harker Diagrams

**Requirement**: Add Harker variation diagrams comparing major oxides vs SiO2

**Diagrams Required**:
1. TiO2 vs SiO2
2. Al2O3 vs SiO2
3. FeOT vs SiO2
4. MgO vs SiO2
5. CaO vs SiO2
6. Na2O vs SiO2
7. K2O vs SiO2
8. P2O5 vs SiO2

**Current State**:
- Backend provides oxide data through `/api/analytics/volcano/{volcano_number}/chemical-analysis`
- All required oxides available in `tas_data` and `afm_data` responses
- Need to fetch additional oxides (TiO2, Al2O3, CaO, P2O5)

**Proposed Implementation**:

#### Backend Changes

**Required**: Extend chemical analysis endpoint to include all major oxides

```python
# backend/routers/analytics.py - Update get_volcano_chemical_analysis

@router.get("/volcano/{volcano_number}/chemical-analysis")
async def get_volcano_chemical_analysis(
    volcano_number: int,
    db: Database = Depends(get_database)
):
    """Get chemical analysis data including Harker diagram oxides"""
    
    # ... existing code ...
    
    # Add Harker diagram data aggregation
    harker_pipeline = [
        {"$match": {"matching_metadata.volcano_number": str(volcano_number)}},
        {"$project": {
            "sample_code": 1,
            "rock_type": 1,
            "material": 1,
            "SiO2": "$oxides.SIO2(WT%)",
            "TiO2": "$oxides.TIO2(WT%)",
            "Al2O3": "$oxides.AL2O3(WT%)",
            "FeOT": "$oxides.FEOT(WT%)",
            "MgO": "$oxides.MGO(WT%)",
            "CaO": "$oxides.CAO(WT%)",
            "Na2O": "$oxides.NA2O(WT%)",
            "K2O": "$oxides.K2O(WT%)",
            "P2O5": "$oxides.P2O5(WT%)"
        }},
        {"$match": {
            "SiO2": {"$ne": None, "$gte": 35, "$lte": 80},
            # At least one other oxide must be present
            "$or": [
                {"TiO2": {"$ne": None}},
                {"Al2O3": {"$ne": None}},
                {"FeOT": {"$ne": None}},
                {"MgO": {"$ne": None}},
                {"CaO": {"$ne": None}},
                {"Na2O": {"$ne": None}},
                {"K2O": {"$ne": None}},
                {"P2O5": {"$ne": None}}
            ]
        }}
    ]
    
    harker_data = list(db.samples.aggregate(harker_pipeline))
    
    return {
        # ... existing response fields ...
        "harker_data": harker_data
    }
```

**Response Schema Update**:
```python
# backend/models/responses.py - Add Harker data model

class HarkerData(BaseModel):
    """Harker diagram data point"""
    sample_code: str
    rock_type: Optional[str]
    material: Optional[str]
    SiO2: float
    TiO2: Optional[float]
    Al2O3: Optional[float]
    FeOT: Optional[float]
    MgO: Optional[float]
    CaO: Optional[float]
    Na2O: Optional[float]
    K2O: Optional[float]
    P2O5: Optional[float]

class ChemicalAnalysisResponse(BaseModel):
    """Extended with Harker data"""
    # ... existing fields ...
    harker_data: List[HarkerData]
```

#### Frontend Changes

**New Component**: `HarkerDiagrams.tsx`

```tsx
import React from 'react';
import Plot from 'react-plotly.js';

interface HarkerDiagramsProps {
  volcanoes: Array<{
    name: string;
    color: string;
    harkerData: HarkerData[];
  }>;
}

const HARKER_DIAGRAMS = [
  { oxide: 'TiO2', yaxis: 'TiO₂ (wt%)', range: [0, 4] },
  { oxide: 'Al2O3', yaxis: 'Al₂O₃ (wt%)', range: [10, 25] },
  { oxide: 'FeOT', yaxis: 'FeO<sup>T</sup> (wt%)', range: [0, 15] },
  { oxide: 'MgO', yaxis: 'MgO (wt%)', range: [0, 20] },
  { oxide: 'CaO', yaxis: 'CaO (wt%)', range: [0, 15] },
  { oxide: 'Na2O', yaxis: 'Na₂O (wt%)', range: [0, 8] },
  { oxide: 'K2O', yaxis: 'K₂O (wt%)', range: [0, 6] },
  { oxide: 'P2O5', yaxis: 'P₂O₅ (wt%)', range: [0, 1.5] },
];

const HarkerDiagrams: React.FC<HarkerDiagramsProps> = ({ volcanoes }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {HARKER_DIAGRAMS.map(({ oxide, yaxis, range }) => (
        <div key={oxide} className="bg-white rounded-lg shadow p-4">
          <Plot
            data={volcanoes.map((volcano) => {
              const validData = volcano.harkerData.filter(
                (d) => d[oxide] !== null && d[oxide] !== undefined
              );
              return {
                type: 'scatter',
                mode: 'markers',
                name: volcano.name,
                x: validData.map((d) => d.SiO2),
                y: validData.map((d) => d[oxide]),
                marker: {
                  color: volcano.color,
                  size: 6,
                  opacity: 0.6,
                  line: { color: volcano.color, width: 0.5 }
                },
                hovertemplate:
                  `<b>${volcano.name}</b><br>` +
                  `SiO₂: %{x:.2f} wt%<br>` +
                  `${yaxis}: %{y:.2f} wt%<br>` +
                  `<extra></extra>`
              };
            })}
            layout={{
              title: { text: `${yaxis} vs SiO₂`, font: { size: 12 } },
              xaxis: { 
                title: 'SiO₂ (wt%)', 
                range: [40, 80],
                showgrid: true,
                gridcolor: '#e5e7eb'
              },
              yaxis: { 
                title: yaxis,
                range: range,
                showgrid: true,
                gridcolor: '#e5e7eb'
              },
              height: 280,
              margin: { l: 50, r: 20, t: 40, b: 50 },
              showlegend: false,
              hovermode: 'closest',
              paper_bgcolor: 'white',
              plot_bgcolor: 'white'
            }}
            config={{
              displayModeBar: false,
              responsive: true
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default HarkerDiagrams;
```

**UI/UX Considerations**:
- Display as 4x2 grid (8 diagrams)
- Responsive layout: 4 columns on desktop, 2 on tablet, 1 on mobile
- Consistent SiO2 axis range (40-80 wt%)
- Volcano-specific colors matching existing design
- Shared legend at top
- Export all diagrams to PDF/PNG
- Option to toggle individual volcanoes on/off
- Add trendline option (linear regression)

**Files to Modify**:
- `backend/routers/analytics.py` - Extend chemical analysis endpoint
- `backend/models/responses.py` - Add Harker data models
- `frontend/src/pages/CompareVolcanoesPage.tsx` - Add Harker section
- `frontend/src/components/Charts/HarkerDiagrams.tsx` - New component
- `frontend/src/api/analytics.ts` - Update response type

**Estimated Time**: 3-4 hours

---

## 2. Timeline Page Enhancement

### 2.1 Sample Collection Timeline

**Requirement**: Display timeline showing when samples were collected from the selected volcano

**Current State**:
- Timeline page currently shows **eruption dates** from GVP database
- Sample collection dates **NOT currently available** in API or database schema
- `Sample` model in `backend/models/entities.py` has `eruption_date` but no `collection_date` or `sampling_date`

**Data Availability Investigation**:

**Database Schema Check**:
```python
# backend/models/entities.py - Sample model
class Sample(BaseModel):
    # ... other fields ...
    eruption_date: Optional[DateInfo] = None  # Eruption date, not collection date
    # No collection_date field exists
```

**Potential Issues**:
1. ❌ **Sample collection dates not in current database schema**
2. ❌ **GEOROC/PetDB raw data may not include collection dates**
3. ❌ **Would require database migration to add field**

**Proposed Solutions**:

#### Option A: Use Eruption Date as Proxy (Quick Win)
- Use existing `eruption_date` from samples
- Acknowledge limitation in UI
- Filter samples by volcano from samples collection

**Backend Implementation**:
```python
# backend/routers/samples.py - Add new endpoint

@router.get("/volcano/{volcano_number}/timeline")
async def get_volcano_sample_timeline(
    volcano_number: int,
    db: Database = Depends(get_database)
):
    """Get sample timeline by eruption dates"""
    
    pipeline = [
        {
            "$match": {
                "matching_metadata.volcano_number": str(volcano_number),
                "eruption_date.year": {"$ne": None}
            }
        },
        {
            "$project": {
                "sample_code": 1,
                "rock_type": 1,
                "material": 1,
                "eruption_year": "$eruption_date.year",
                "eruption_month": "$eruption_date.month",
                "eruption_day": "$eruption_date.day"
            }
        },
        {"$sort": {"eruption_year": 1}}
    ]
    
    samples = list(db.samples.aggregate(pipeline))
    
    return {
        "volcano_number": volcano_number,
        "sample_count": len(samples),
        "samples": samples,
        "date_range": {
            "min_year": min(s["eruption_year"] for s in samples) if samples else None,
            "max_year": max(s["eruption_year"] for s in samples) if samples else None
        }
    }
```

**Frontend Implementation**:
```tsx
// Add to TimelinePage.tsx

const SampleCollectionTimeline: React.FC<{ volcanoNumber: number }> = ({ volcanoNumber }) => {
  const [samples, setSamples] = useState([]);
  
  useEffect(() => {
    fetchSampleTimeline(volcanoNumber).then(setSamples);
  }, [volcanoNumber]);
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">
        Sample Collection Timeline
        <span className="text-sm text-gray-500 ml-2">
          (Based on eruption dates)
        </span>
      </h3>
      
      <Plot
        data={[{
          type: 'scatter',
          mode: 'markers',
          x: samples.map(s => s.eruption_year),
          y: samples.map((_, idx) => idx),
          marker: {
            size: 8,
            color: samples.map(s => ROCK_TYPE_COLORS[s.rock_type] || '#94a3b8'),
            line: { width: 1, color: 'white' }
          },
          text: samples.map(s => `${s.sample_code} - ${s.rock_type}`),
          hovertemplate: 
            '<b>%{text}</b><br>' +
            'Year: %{x}<br>' +
            '<extra></extra>'
        }]}
        layout={{
          xaxis: { title: 'Year', showgrid: true },
          yaxis: { title: 'Sample Index', showticklabels: false },
          height: 400,
          hovermode: 'closest'
        }}
      />
    </div>
  );
};
```

**Estimated Time**: 1.5-2 hours

#### Option B: Database Migration to Add Collection Dates (Comprehensive)
- Parse collection dates from original GEOROC/PetDB data if available
- Migrate database to add `collection_date` field
- Update API schema and endpoints

**Requirements**:
1. Access to raw GEOROC/PetDB data files
2. Parse collection date fields (if they exist)
3. Database migration script
4. Schema updates

**Estimated Time**: 6-8 hours (includes data investigation + migration)

**Recommended Approach**: **Option A** (use eruption dates) with clear UI labeling, then **Option B** as future enhancement if collection dates become available.

---

#### UI/UX Recommendations for Sample Timeline

**Option 1: Scatter Plot Timeline**
- X-axis: Year
- Y-axis: Jittered random position (or rock type category)
- Color: Rock type
- Size: Sample importance (fixed or by data quality)

**Option 2: Histogram with Stacked Rock Types**
- X-axis: Time bins (year, decade, century)
- Y-axis: Sample count
- Stacked by rock type

**Option 3: Interactive Timeline with Zoom**
- Horizontal timeline with draggable range selector
- Click to see sample details
- Filter by rock type, material

**Recommended**: **Option 2** (histogram) for overview + **Option 1** (scatter) for detail

**Estimated Time**: 2-3 hours total

---

## 3. Analyze Volcano Page Enhancements

### 3.1 TAS Diagram by VEI

**Requirement**: Display TAS diagram with points colored by VEI instead of rock type

**Current State**:
- TAS diagram shows samples colored by rock type
- VEI data exists in eruptions collection, not samples collection
- Samples don't have direct VEI association

**Challenge**: **Samples and eruptions are separate datasets**
- Samples have geochemical data
- Eruptions have VEI data
- No direct link between sample and eruption VEI

**Proposed Solutions**:

#### Option A: Link Samples to Eruptions by Date (Complex)
- Match sample `eruption_date` to eruption records
- Requires temporal matching logic
- May have low match rate

#### Option B: Average VEI by Rock Type (Approximation)
- Calculate average VEI for each rock type at volcano
- Color TAS by this averaged VEI
- Add disclaimer about approximation

#### Option C: Dual View Toggle
- Button to switch between "Color by Rock Type" and "Color by VEI"
- Only show samples with matched VEI
- Show count of samples with/without VEI

**Backend Implementation** (Option C - Recommended):

```python
# backend/routers/analytics.py

@router.get("/volcano/{volcano_number}/samples-with-vei")
async def get_volcano_samples_with_vei(
    volcano_number: int,
    db: Database = Depends(get_database)
):
    """Get samples matched with eruption VEI by date"""
    
    pipeline = [
        # Join samples with eruptions by volcano and date
        {
            "$match": {
                "matching_metadata.volcano_number": str(volcano_number)
            }
        },
        {
            "$lookup": {
                "from": "eruptions",
                "let": {
                    "sample_volcano": "$matching_metadata.volcano_number",
                    "sample_year": "$eruption_date.year"
                },
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {"$eq": [{"$toString": "$volcano_number"}, "$$sample_volcano"]},
                                    {"$eq": ["$start_date.year", "$$sample_year"]},
                                    {"$ne": ["$vei", None]}
                                ]
                            }
                        }
                    }
                ],
                "as": "matching_eruptions"
            }
        },
        {
            "$match": {
                "matching_eruptions.0": {"$exists": True}  # Has at least one match
            }
        },
        {
            "$project": {
                "sample_code": 1,
                "rock_type": 1,
                "material": 1,
                "SiO2": "$oxides.SIO2(WT%)",
                "Na2O": "$oxides.NA2O(WT%)",
                "K2O": "$oxides.K2O(WT%)",
                "vei": {"$arrayElemAt": ["$matching_eruptions.vei", 0]}
            }
        }
    ]
    
    samples = list(db.samples.aggregate(pipeline))
    
    return {
        "volcano_number": volcano_number,
        "samples_with_vei": samples,
        "match_rate": len(samples) / max(db.samples.count_documents({
            "matching_metadata.volcano_number": str(volcano_number)
        }), 1)
    }
```

**Frontend Implementation**:

```tsx
// Extend TASPlot component with VEI color mode

interface TASPlotProps {
  samples: Sample[];
  colorBy?: 'rock_type' | 'vei';
  title?: string;
}

const TASPlot: React.FC<TASPlotProps> = ({ 
  samples, 
  colorBy = 'rock_type',
  title 
}) => {
  const getColor = (sample: Sample) => {
    if (colorBy === 'vei' && sample.vei !== undefined) {
      return VEI_COLORS[sample.vei];
    }
    return ROCK_TYPE_COLORS[sample.rock_type] || '#94a3b8';
  };
  
  const legendItems = colorBy === 'vei' 
    ? VEI_LEGEND  // [0-8] with colors
    : ROCK_TYPE_LEGEND;
  
  // ... rest of TAS plot implementation
};

// In AnalyzeVolcanoPage.tsx
const [colorMode, setColorMode] = useState<'rock_type' | 'vei'>('rock_type');
const [samplesWithVEI, setSamplesWithVEI] = useState([]);

<div className="flex items-center gap-2 mb-4">
  <label className="text-sm font-medium">Color by:</label>
  <button
    onClick={() => setColorMode('rock_type')}
    className={colorMode === 'rock_type' ? 'btn-primary' : 'btn-secondary'}
  >
    Rock Type
  </button>
  <button
    onClick={() => setColorMode('vei')}
    className={colorMode === 'vei' ? 'btn-primary' : 'btn-secondary'}
  >
    VEI {samplesWithVEI.length > 0 && `(${samplesWithVEI.length} samples)`}
  </button>
</div>

<TASPlot 
  samples={colorMode === 'vei' ? samplesWithVEI : samples}
  colorBy={colorMode}
  title={`TAS Diagram - ${volcanoName}`}
/>
```

**VEI Color Scheme**:
```typescript
const VEI_COLORS: Record<number, string> = {
  0: '#f0f9ff', // Very light blue
  1: '#bae6fd',
  2: '#7dd3fc',
  3: '#38bdf8',
  4: '#0ea5e9',
  5: '#0284c7',
  6: '#0369a1',
  7: '#075985',
  8: '#0c4a6e'  // Dark blue
};
```

**UI/UX Considerations**:
- Toggle button between "Color by Rock Type" and "Color by VEI"
- Show match statistics (e.g., "145/320 samples matched with VEI")
- Add legend showing VEI scale (0-8)
- Tooltip shows both rock type AND VEI when available
- Disable VEI mode if <10 samples have matches

**Files to Modify**:
- `backend/routers/analytics.py` - Add VEI-matching endpoint
- `frontend/src/components/Charts/TASPlot.tsx` - Add colorBy prop
- `frontend/src/pages/AnalyzeVolcanoPage.tsx` - Add toggle UI
- `frontend/src/utils/colors.ts` - Add VEI color scheme

**Estimated Time**: 2-3 hours

---

### 3.2 Rock Type Distribution

**Requirement**: Same as Compare Volcanoes page - show percentage of each rock type

**Implementation**: Reuse components from Compare Volcanoes enhancement

**Backend**: Already available in chemical analysis endpoint

**Frontend**:
```tsx
// In AnalyzeVolcanoPage.tsx - reuse RockTypeDistributionChart

{chemicalData && (
  <div className="bg-white rounded-lg shadow p-6 mt-6">
    <h3 className="text-lg font-semibold mb-4">Rock Type Distribution</h3>
    <RockTypeDistributionChart
      volcanoName={selectedVolcano}
      rockTypes={chemicalData.rock_types}
      color="#DC2626"
    />
    <RockTypeTable rockTypes={chemicalData.rock_types} />
  </div>
)}
```

**Estimated Time**: 1 hour (reusing existing components)

---

## 4. Compare VEI Page Enhancement

### 4.1 Major Rock Types from GVP

**Requirement**: Display major rock types for each volcano according to GVP data

**Current State**:
- Volcano data includes `rocks` field with `maj_1`, `maj_2`, `maj_3`
- Currently comparing VEI distributions only
- GVP rock classification is categorical (not from sample analysis)

**Data Schema**:
```python
class Rocks(BaseModel):
    maj_1: Optional[str] = None  # Primary rock type
    maj_2: Optional[str] = None  # Secondary rock type
    maj_3: Optional[str] = None  # Tertiary rock type
```

**Example Data**:
```json
{
  "volcano_name": "Kilauea",
  "rocks": {
    "maj_1": "Basalt",
    "maj_2": "Picro-Basalt",
    "maj_3": null
  }
}
```

**Proposed Implementation**:

#### Backend Changes

```python
# backend/routers/volcanoes.py - Add endpoint for volcano rock types

@router.get("/{volcano_number}/rock-types")
async def get_volcano_rock_types(
    volcano_number: int,
    db: Database = Depends(get_database)
):
    """Get GVP major rock types for volcano"""
    
    volcano = db.volcanoes.find_one(
        {"volcano_number": volcano_number},
        {"volcano_name": 1, "volcano_number": 1, "rocks": 1}
    )
    
    if not volcano:
        raise HTTPException(status_code=404, detail="Volcano not found")
    
    # Extract major rock types
    rock_types = []
    if volcano.get("rocks"):
        rocks = volcano["rocks"]
        if rocks.get("maj_1"):
            rock_types.append({"type": rocks["maj_1"], "rank": 1})
        if rocks.get("maj_2"):
            rock_types.append({"type": rocks["maj_2"], "rank": 2})
        if rocks.get("maj_3"):
            rock_types.append({"type": rocks["maj_3"], "rank": 3})
    
    return {
        "volcano_number": volcano["volcano_number"],
        "volcano_name": volcano["volcano_name"],
        "rock_types": rock_types
    }
```

#### Frontend Changes

**Option A: Badge Display (Recommended)**
- Show rock types as colored badges below volcano name
- Primary rock type: Large badge
- Secondary/tertiary: Smaller badges

```tsx
// In CompareVEIPage.tsx

interface RockTypeBadgesProps {
  rockTypes: Array<{ type: string; rank: number }>;
  color: string;
}

const RockTypeBadges: React.FC<RockTypeBadgesProps> = ({ rockTypes, color }) => {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {rockTypes.map((rt, idx) => (
        <span
          key={idx}
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            rt.rank === 1 
              ? 'text-white text-base' 
              : 'text-gray-700 bg-opacity-50'
          }`}
          style={{
            backgroundColor: rt.rank === 1 ? color : `${color}40`
          }}
        >
          {rt.type}
          {rt.rank > 1 && (
            <span className="ml-1 text-xs opacity-70">
              (#{rt.rank})
            </span>
          )}
        </span>
      ))}
    </div>
  );
};

// Usage in volcano selection card
{selections.map((selection, idx) => (
  <div key={idx} className="bg-white rounded-lg shadow p-4">
    <h3 className="text-lg font-semibold" style={{ color: VOLCANO_COLORS[idx] }}>
      {selection.name || `Volcano ${idx + 1}`}
    </h3>
    
    {selection.rockTypes && (
      <RockTypeBadges 
        rockTypes={selection.rockTypes} 
        color={VOLCANO_COLORS[idx]}
      />
    )}
    
    {/* ... rest of selection card */}
  </div>
))}
```

**Option B: Comparison Table**
```tsx
const RockTypeComparisonTable: React.FC<{ volcanoes: Volcano[] }> = ({ volcanoes }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Major Rock Types (GVP)</h3>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Rank</th>
            {volcanoes.map((v, idx) => (
              <th key={idx} className="text-left py-2" style={{ color: v.color }}>
                {v.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map(rank => (
            <tr key={rank} className="border-b">
              <td className="py-2 font-medium">#{rank}</td>
              {volcanoes.map((v, idx) => {
                const rockType = v.rockTypes.find(rt => rt.rank === rank);
                return (
                  <td key={idx} className="py-2">
                    {rockType ? (
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {rockType.type}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

**Option C: Visual Card Grid**
- Each volcano has a card showing rock types as visual elements
- Use rock type icons or colors
- Most prominent for primary rock type

**Recommended Approach**: **Option A (Badges)** for in-card display + **Option B (Table)** for comprehensive comparison

**UI/UX Considerations**:
- Display rock types prominently under volcano name
- Use volcano-specific colors for primary rock type
- Dim secondary/tertiary rock types
- Show "No data" if GVP doesn't list rock types
- Add info icon explaining GVP classification vs geochemical analysis
- Include note: "Major rock types from Global Volcanism Program classification"

**Files to Modify**:
- `backend/routers/volcanoes.py` - Add rock types endpoint
- `frontend/src/pages/CompareVEIPage.tsx` - Add rock type display
- `frontend/src/components/RockTypeBadges.tsx` - New component
- `frontend/src/api/volcanoes.ts` - Add fetch function

**Estimated Time**: 2-3 hours

---

## 5. About Page Enhancements

### 5.1 Latest Publications Section

**Requirement**: Add dedicated section showcasing key publications related to DashVolcano and integrated datasets

**Current State**:
- About page has basic data attribution
- No dedicated publications section
- Citation information is minimal

**Proposed Implementation**:

```tsx
// frontend/src/pages/AboutPage.tsx - Add Publications section

{/* Latest Publications - NEW SECTION */}
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
  <div className="flex items-center gap-3 mb-4">
    <FileText className="w-6 h-6 text-volcano-600" />
    <h2 className="text-2xl font-bold text-gray-900">Latest Publications</h2>
  </div>
  <div className="space-y-4">
    <div className="border-l-4 border-volcano-500 pl-4 bg-gray-50 p-4 rounded">
      <p className="text-gray-700 leading-relaxed">
        Oggier, F., Widiwijayanti, C., & Costa, F. (2023). 
        <strong> Integrating global geochemical volcano rock composition with eruption history datasets</strong>. 
        <em> Frontiers in Earth Science</em>, 11, 1108056.{' '}
        <a 
          href="https://www.frontiersin.org/articles/10.3389/feart.2023.1108056"
          target="_blank"
          rel="noopener noreferrer"
          className="text-volcano-600 hover:text-volcano-700 underline inline-flex items-center gap-1"
        >
          doi: 10.3389/feart.2023.1108056
          <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </div>
    <p className="text-sm text-gray-600">
      This publication describes the methodology for integrating global geochemical datasets 
      (GEOROC, PetDB) with the Global Volcanism Program's eruption history database, forming 
      the foundation of DashVolcano's data infrastructure.
    </p>
  </div>
</div>
```

**Estimated Time**: 15 minutes

---

### 5.2 Contributors Section

**Requirement**: Add dedicated contributors section with ORCID links for team members

**Current State**:
- Generic "Team & Development" section
- No individual contributor recognition
- No ORCID links

**Proposed Implementation**:

```tsx
// frontend/src/pages/AboutPage.tsx - Update Team section

{/* Contributors - ENHANCED */}
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
  <div className="flex items-center gap-3 mb-4">
    <Users className="w-6 h-6 text-volcano-600" />
    <h2 className="text-2xl font-bold text-gray-900">Contributors</h2>
  </div>
  <div className="space-y-4">
    <p className="text-gray-700">
      <strong>DashVolcano</strong> was designed and developed by:
    </p>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Contributor 1 */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-2">Fidel Costa</h3>
        <p className="text-sm text-gray-600 mb-2">Project Principal Investigator</p>
        <a 
          href="https://orcid.org/0000-0002-1409-5325"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-volcano-600 hover:text-volcano-700"
        >
          <img 
            src="https://orcid.org/sites/default/files/images/orcid_16x16.png" 
            alt="ORCID logo"
            className="w-4 h-4"
          />
          ORCID: 0000-0002-1409-5325
        </a>
      </div>
      
      {/* Contributor 2 */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-2">Frederique Elise Oggier</h3>
        <p className="text-sm text-gray-600 mb-2">
          Project Principal Investigator, Coordinator, Web Developer
        </p>
        <a 
          href="https://orcid.org/0000-0003-3141-3118"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-volcano-600 hover:text-volcano-700"
        >
          <img 
            src="https://orcid.org/sites/default/files/images/orcid_16x16.png" 
            alt="ORCID logo"
            className="w-4 h-4"
          />
          ORCID: 0000-0003-3141-3118
        </a>
      </div>
      
      {/* Contributor 3 */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-2">Kévin Migadel</h3>
        <p className="text-sm text-gray-600 mb-2">Coordinator, Web Developer</p>
        <a 
          href="https://orcid.org/0009-0006-0147-3354"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-volcano-600 hover:text-volcano-700"
        >
          <img 
            src="https://orcid.org/sites/default/files/images/orcid_16x16.png" 
            alt="ORCID logo"
            className="w-4 h-4"
          />
          ORCID: 0009-0006-0147-3354
        </a>
      </div>
    </div>
    
    <p className="text-gray-700 mt-4">
      This project is developed and maintained at the{' '}
      <a 
        href="https://www.ipgp.fr/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-volcano-600 hover:text-volcano-700 underline font-semibold"
      >
        Institut de Physique du Globe de Paris (IPGP)
      </a>
      , a leading research institution in Earth sciences and volcanology.
    </p>
  </div>
</div>
```

**Estimated Time**: 20 minutes

---

### 5.3 Enhanced Data Sources and Citation

**Requirement**: Expand citation section with comprehensive attribution including all GEOROC DOIs and PetDB details

**Current State**:
- Basic citation info for GEOROC and GVP
- Missing: PetDB details, individual GEOROC DOIs, license information
- No download dates or query parameters

**Proposed Implementation**:

```tsx
// frontend/src/pages/AboutPage.tsx - Replace License & Usage section with comprehensive citation

{/* Data Sources and Citation - COMPREHENSIVE VERSION */}
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <div className="flex items-center gap-3 mb-4">
    <FileText className="w-6 h-6 text-volcano-600" />
    <h2 className="text-2xl font-bold text-gray-900">Data Sources and Citation</h2>
  </div>
  
  <div className="space-y-6 text-gray-700">
    <p className="text-lg font-medium">
      This platform integrates data from three major databases: <strong>GEOROC</strong>, 
      <strong> PetDB</strong>, and the <strong>Global Volcanism Program (GVP)</strong>. 
      Each source has specific citation requirements outlined below.
    </p>
    
    {/* GEOROC Section */}
    <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-gray-900">🔸 GEOROC</h3>
        <a 
          href="https://georoc.eu/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-volcano-600 hover:text-volcano-700"
        >
          <ExternalLink className="w-5 h-5" />
        </a>
      </div>
      
      <p className="mb-3">
        The <strong>GEOROC</strong> (Geochemistry of Rocks of the Oceans and Continents) 
        database compiles peer-reviewed geochemical data from the literature. Data use is 
        licensed under{' '}
        <a 
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-volcano-600 hover:text-volcano-700 underline"
        >
          CC BY-SA 4.0
        </a>.
      </p>
      
      <p className="mb-3">
        Data were downloaded from the GEOROC database (
        <a 
          href="https://georoc.eu/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-volcano-600 hover:text-volcano-700 underline"
        >
          https://georoc.eu/
        </a>
        ) on <strong>June 2023</strong>, using precompiled files from the GEOROC repository 
        corresponding to the following tectonic/geologic settings:
      </p>
      
      <ul className="space-y-1 text-sm ml-4">
        <li>• Archaean Cratons: <a href="https://doi.org/10.25625/1KRR1P" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">DOI</a></li>
        <li>• Continental Flood Basalts: <a href="https://doi.org/10.25625/WSTPOX" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">DOI</a></li>
        <li>• Convergent Margins: <a href="https://doi.org/10.25625/PVFZCE" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">DOI</a></li>
        <li>• Complex Volcanic Settings: <a href="https://doi.org/10.25625/1VOFM5" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">DOI</a></li>
        <li>• Intraplate Volcanic Rocks: <a href="https://doi.org/10.25625/RZZ9VM" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">DOI</a></li>
        <li>• Rift Volcanics: <a href="https://doi.org/10.25625/KAIVCT" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">DOI</a></li>
        <li>• Oceanic Plateaus: <a href="https://doi.org/10.25625/JRZIJF" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">DOI</a></li>
        <li>• Ocean Basin Flood Basalts: <a href="https://doi.org/10.25625/AVLFC2" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">DOI</a></li>
        <li>• Ocean Island Groups: <a href="https://doi.org/10.25625/WFJZKY" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">DOI</a></li>
        <li>• Seamounts: <a href="https://doi.org/10.25625/JUQK7N" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">DOI</a></li>
      </ul>
      
      <div className="bg-volcano-50 border border-volcano-200 rounded p-3 mt-4">
        <p className="text-sm font-semibold mb-2">Citing GEOROC:</p>
        <p className="text-sm italic mb-2">
          Data were downloaded from the GEOROC database (https://georoc.eu/) in June 2023. 
          See individual DOIs for detailed provenance.
        </p>
        <p className="text-sm">
          Lehnert, K., Su, Y., Langmuir, C. H., Sarbas, B., & Nohl, U. (2000). 
          A global geochemical database structure for rocks. <em>Geochemistry, Geophysics, Geosystems</em>, 
          1(5), 1012.{' '}
          <a 
            href="https://doi.org/10.1029/1999GC000026"
            target="_blank"
            rel="noopener noreferrer"
            className="text-volcano-600 hover:underline"
          >
            https://doi.org/10.1029/1999GC000026
          </a>
        </p>
      </div>
      
      <p className="text-sm text-gray-600 mt-3">
        <strong>Note:</strong> Original references are included in the data downloads and displayed 
        in plots when applicable. The complete dataset can be downloaded directly from{' '}
        <a 
          href="https://doi.org/10.21979/N9/BJENCK"
          target="_blank"
          rel="noopener noreferrer"
          className="text-volcano-600 hover:underline"
        >
          DOI: 10.21979/N9/BJENCK
        </a>.
      </p>
    </div>
    
    {/* PetDB Section */}
    <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-gray-900">🔸 PetDB</h3>
        <a 
          href="https://search.earthchem.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-volcano-600 hover:text-volcano-700"
        >
          <ExternalLink className="w-5 h-5" />
        </a>
      </div>
      
      <p className="mb-3">
        <strong>PetDB</strong> (Petrological Database of the Ocean Floor) is hosted by the 
        EarthChem Library and licensed under{' '}
        <a 
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-volcano-600 hover:text-volcano-700 underline"
        >
          CC BY-SA 4.0
        </a>.
      </p>
      
      <p className="mb-3">
        Data were downloaded from the PetDB Database (
        <a 
          href="https://search.earthchem.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-volcano-600 hover:text-volcano-700 underline"
        >
          https://search.earthchem.org/
        </a>
        ) on <strong>7 June 2023</strong>, using the following parameters:
      </p>
      
      <ul className="text-sm ml-4 space-y-1">
        <li>
          <strong>Location types:</strong> CONTINENTAL_RIFT, OCEAN_ISLAND, INTRAPLATE_OFF-CRATON, 
          INTRAPLATE_CRATON, FRACTURE_ZONE, VOLCANIC_ARC, CONVERGENT_MARGIN, OCEANIC_PLATEAU, 
          RIFT VALLEY, BACK-ARC_BASIN, INCIPIENT_RIFT, OLD_OCEANIC_CRUST, OPHIOLITE, SEAMOUNT, 
          SPREADING_CENTER, TRANSFORM_FAULT, TRIPLE_JUNCTION, N/A
        </li>
        <li><strong>Classification:</strong> igneous</li>
        <li><strong>Material:</strong> rock_samples</li>
      </ul>
      
      <div className="bg-volcano-50 border border-volcano-200 rounded p-3 mt-4">
        <p className="text-sm font-semibold mb-2">Citing PetDB:</p>
        <p className="text-sm">
          Original references are included in the data downloads and displayed in plots when applicable.
        </p>
      </div>
      
      <p className="text-sm text-gray-600 mt-3">
        <strong>Note:</strong> PetDB does not guarantee the accuracy of identification, navigation, 
        or metadata. Users are encouraged to report errors or concerns.
      </p>
      
      <p className="text-sm text-gray-600 mt-2">
        <strong>Acknowledgement:</strong> PetDB is supported by the U.S. National Science Foundation 
        (NSF) as part of the IEDA data facility.
      </p>
    </div>
    
    {/* GVP Section */}
    <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-gray-900">🔸 Global Volcanism Program (GVP)</h3>
        <a 
          href="https://volcano.si.edu/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-volcano-600 hover:text-volcano-700"
        >
          <ExternalLink className="w-5 h-5" />
        </a>
      </div>
      
      <p className="mb-3">
        The <strong>GVP</strong> (Global Volcanism Program, Smithsonian Institution) is maintained 
        by the Smithsonian Institution to support the mission of increasing and diffusing knowledge 
        about global volcanism.
      </p>
      
      <p className="mb-3">
        <strong>Content license:</strong> All GVP content is governed by the{' '}
        <a 
          href="https://www.si.edu/termsofuse"
          target="_blank"
          rel="noopener noreferrer"
          className="text-volcano-600 hover:text-volcano-700 underline"
        >
          Smithsonian Terms of Use
        </a>, and is available for personal, educational, and non-commercial use.
      </p>
      
      <div className="bg-volcano-50 border border-volcano-200 rounded p-3">
        <p className="text-sm font-semibold mb-2">Citing GVP:</p>
        <p className="text-sm">
          Global Volcanism Program, 2024. <em>Volcanoes of the World</em> (v. 5.1.0; 9 June 2023). 
          Smithsonian Institution.{' '}
          <a 
            href="https://doi.org/10.5479/si.GVP.VOTW5-2023.5.1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-volcano-600 hover:underline"
          >
            https://doi.org/10.5479/si.GVP.VOTW5-2023.5.1
          </a>
        </p>
      </div>
    </div>
  </div>
</div>
```

**Estimated Time**: 30 minutes

---

### 5.4 About Page Summary

**Total Changes**:
1. ✅ Add Latest Publications section (15 min)
2. ✅ Add Contributors with ORCID links (20 min)
3. ✅ Enhance Data Sources and Citation section (30 min)

**Files to Modify**:
- `frontend/src/pages/AboutPage.tsx` - Add/update sections

**Estimated Time**: 1-1.5 hours

---

## Implementation Roadmap

### Phase 1: Critical + Quick Wins (6-9 hours)
**Priority**: Critical/High  
**Goal**: Performance improvements and content updates

1. **Map Page - Bounding Box Search** (3-4h) - **CRITICAL**
   - Backend: bbox parameter + geospatial index
   - Frontend: Drawing widget + API integration
   - **Impact**: 85-90% performance improvement

2. **About Page - Content Updates** (1-1.5h) - **HIGH**
   - Add publications section
   - Add contributors with ORCID
   - Enhance citations (GEOROC, PetDB, GVP)

3. **Analyze Volcano - Rock Type Distribution** (1h)
   - Reuse component from Compare Volcanoes
   - Minimal backend work

4. **Compare VEI - Major Rock Types** (2-3h)
   - Simple data fetch from existing schema
   - Badge/table UI

### Phase 2: Analytical Enhancements (7-9 hours)
**Priority**: High  
**Goal**: Add analytical depth and comparison tools

5. **Compare Volcanoes - Rock Type Distribution** (2-3h)
   - Bar chart implementation
   - Already have data in API

6. **Analyze Volcano - TAS by VEI** (2-3h)
   - Requires sample-eruption matching
   - Toggle UI component

7. **Timeline - Sample Collection Timeline** (2-3h)
   - Use eruption dates as proxy
   - Scatter/histogram visualization

### Phase 3: Complex Features (4-5 hours)
**Priority**: Medium  
**Goal**: Advanced geochemical analysis

8. **Compare Volcanoes - Harker Diagrams** (4-5h)
   - Backend: Extend chemical analysis endpoint
   - Frontend: 8 new charts in responsive grid
   - Most complex feature

---

## Technical Considerations

### Performance
- **Harker Diagrams**: May have 8 charts × 3 volcanoes = 24 traces
  - Use Plotly's WebGL mode for >1000 points
  - Implement virtualization if needed
  - Cache API responses

### Data Quality
- **VEI Matching**: Low match rate expected (10-30%)
  - Show clear statistics
  - Allow fallback to rock type coloring

- **Sample Timeline**: Using eruption date as proxy
  - Add disclaimer in UI
  - Consider future migration to actual collection dates

### Browser Compatibility
- All charts use Plotly.js (already in project)
- Responsive design for mobile/tablet
- Test on Chrome, Firefox, Safari, Edge

### API Response Size
- **Harker Data**: ~8 oxides × thousands of samples
  - Typical response: 50-200 KB
  - Consider pagination if >5000 samples
  - Add compression middleware

### Error Handling
- Gracefully handle missing data (no rock types, no VEI, etc.)
- Show empty states with helpful messages
- Provide fallback visualizations

---

## Testing Strategy

### Unit Tests
- Rock type percentage calculations
- VEI color mapping
- Harker data transformation
- CSV export with new fields

### Integration Tests
- New API endpoints
- Data aggregation pipelines
- Frontend component rendering

### Visual Regression Tests
- Chart layouts
- Responsive breakpoints
- Color schemes

### User Acceptance Tests
1. Compare 3 volcanoes with different rock type distributions
2. Verify Harker diagrams show expected correlations
3. Test VEI coloring with sample data
4. Validate rock type badges display correctly
5. Confirm timeline shows chronological pattern

---

## Documentation Updates

### User Guide
- Add section on rock type distribution interpretation
- Explain Harker diagram usage for geochemical analysis
- Document VEI coloring feature and limitations
- Update timeline page documentation

### API Examples
- Add new endpoints to `API_EXAMPLES.md`
- Document response schemas
- Provide curl examples

### Deployment Guide
- No infrastructure changes needed
- Database migration notes (if Option B chosen for timeline)

---

## Future Enhancements

### Post v3.1 Considerations

1. **Database Migration for Collection Dates**
   - Parse GEOROC/PetDB source files
   - Add `collection_date` field to samples
   - Proper sample timeline feature

2. **Advanced Harker Features**
   - Trendlines (linear, polynomial)
   - Statistical correlation coefficients
   - Export all diagrams to single PDF
   - Custom oxide selection

3. **Rock Type Analysis**
   - Rock type evolution over time
   - Spatial distribution of rock types
   - Correlation with VEI

4. **VEI-Sample Matching**
   - Improve matching algorithm
   - Machine learning for probabilistic matching
   - Manual curation interface

5. **Comparative Statistics**
   - ANOVA tests between volcanoes
   - Principal component analysis (PCA)
   - Cluster analysis

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low VEI match rate | High | Medium | Show clear statistics, provide toggle |
| Missing collection dates | High | Medium | Use eruption dates with disclaimer |
| Performance with Harker diagrams | Medium | Medium | Use WebGL, implement caching |
| Complex UI overwhelming users | Low | Medium | Progressive disclosure, clear labeling |
| GVP rock type data incomplete | Medium | Low | Handle nulls gracefully, show "No data" |

---

## Success Metrics

### Quantitative
- All 6 features implemented and tested
- <500ms API response time for new endpoints
- >90% test coverage for new code
- Zero critical bugs in production

### Qualitative
- Users can easily compare rock type distributions
- Harker diagrams provide clear geochemical insights
- VEI coloring enhances TAS interpretation
- GVP rock types aid in volcano classification

---

## Conclusion

This feature enhancement plan adds significant analytical value to DashVolcano v3.1 with manageable complexity:

- **Quick wins**: Rock type distributions and GVP rock types (5-7 hours)
- **Medium complexity**: VEI coloring and sample timeline (5-6 hours)
- **Advanced features**: Harker diagrams (4-5 hours)

**Total Estimated Time**: 17-23 hours

All features build on existing infrastructure and follow established patterns. The phased approach allows for iterative delivery and user feedback.

**Recommended Start**: 
1. **Phase 1** (critical): Map bbox search for immediate performance gains (3-4h)
2. **Phase 1** (content): About page updates for proper attribution (1-1.5h)
3. **Phases 2-3**: Analytical features based on user priorities

**Priority Ranking**:
1. 🔴 **Critical**: Map bbox search (performance + UX)
2. 🟠 **High**: About page content (attribution + recognition)
3. 🟡 **Medium**: Rock type distributions, VEI coloring, sample timeline
4. 🟢 **Nice-to-have**: Harker diagrams (advanced analysis)
