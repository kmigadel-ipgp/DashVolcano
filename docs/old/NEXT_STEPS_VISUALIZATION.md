# Next Steps: High-Performance Geospatial Visualization

**Date:** December 4, 2025  
**Purpose:** Guide for building efficient, interactive map-based website v3.0  
**Current Status:** 100,000 samples ready in MongoDB with spatial indexes

---

## 🎯 Project Context

You have:
- ✅ 100,000 georeferenced samples (can scale to 297,000)
- ✅ MongoDB with 2dsphere spatial indexes (5ms query performance)
- ✅ GeoJSON Point format: `{"type": "Point", "coordinates": [lon, lat]}`
- ✅ Rich metadata: rock types, chemical composition, references, volcano links

**Goal:** Build a fast, interactive website for exploring volcanic rock samples on a map

---

## 🗺️ Technology Stack Recommendations

### Architecture Overview

```
Frontend (Map + UI) ←→ API Layer ←→ Database (MongoDB)
      ↓                   ↓              ↓
  Leaflet/Deck.gl    FastAPI/Flask   Spatial Indexes
  + Datashader        + Caching      + Aggregation
```

---

## 1️⃣ **Backend API Layer** (Critical for Performance)

### 🚀 **FastAPI** (Highly Recommended)
**Why:** Modern, fast, async Python web framework

**Pros:**
- ⚡ Async/await support for concurrent requests
- 📊 Automatic API documentation (Swagger/OpenAPI)
- 🔧 Built-in data validation (Pydantic)
- 🐍 Native Python - easy integration with MongoDB
- 🚄 Performance comparable to Node.js/Go

**Use Cases:**
- Serve geospatial data via REST API
- Handle filtering, pagination, aggregation
- Cache frequent queries (Redis/in-memory)

**Example API Endpoints:**
```python
# FastAPI example
from fastapi import FastAPI
from pymongo import MongoClient

app = FastAPI()

@app.get("/api/samples")
async def get_samples(
    rock_type: str = None,
    bounds: str = None,  # "lon1,lat1,lon2,lat2"
    limit: int = 1000
):
    """Get samples with spatial filtering"""
    query = {}
    if rock_type:
        query["rock_type"] = rock_type
    if bounds:
        # Parse bounds and use $geoWithin
        lon1, lat1, lon2, lat2 = map(float, bounds.split(','))
        query["geometry"] = {
            "$geoWithin": {
                "$box": [[lon1, lat1], [lon2, lat2]]
            }
        }
    samples = db.samples.find(query).limit(limit)
    return list(samples)

@app.get("/api/samples/aggregate")
async def aggregate_samples(zoom_level: int):
    """Aggregate samples by grid cells for clustering"""
    # Use MongoDB aggregation pipeline
    # Return clustered/binned data for map display
```

**Alternatives:**
- **Flask** - Simpler but not async (good for smaller datasets)
- **Django REST Framework** - Full-featured but heavier

---

## 2️⃣ **Frontend Visualization**

### 🗺️ **Option A: Leaflet + MarkerCluster** (Simple, Good for <10k points)

**Why:** Lightweight, mature, easy to use

**Pros:**
- 📦 Small bundle size (~40KB)
- 🎨 Extensive plugin ecosystem
- 📱 Mobile-friendly
- 🆓 Open source, widely used

**Best For:**
- < 10,000 visible points
- Interactive popups/tooltips
- Basic clustering

**Example:**
```javascript
// Leaflet with MarkerCluster
const map = L.map('map').setView([63.98, -19.70], 6);
const markers = L.markerClusterGroup();

// Fetch data from API
fetch('/api/samples?bounds=-25,63,-13,67&limit=1000')
  .then(r => r.json())
  .then(samples => {
    samples.forEach(s => {
      const [lon, lat] = s.geometry.coordinates;
      markers.addLayer(L.marker([lat, lon])
        .bindPopup(`${s.rock_type} - ${s.sample_id}`));
    });
    map.addLayer(markers);
  });
```

**Limitations:**
- Performance degrades with >50k points
- Re-rendering on zoom/pan can be slow

---

### 🚀 **Option B: Deck.gl** (High-Performance, 100k+ points)

**Why:** WebGL-based, handles massive datasets

**Pros:**
- ⚡ Renders millions of points smoothly (60 FPS)
- 🎨 Beautiful visualizations (heatmaps, hexbins, arcs)
- 📊 Built-in aggregation layers
- 🔄 Smooth transitions and animations
- 🗺️ Integrates with Mapbox/Google Maps

**Best For:**
- > 10,000 points
- Heatmaps, density visualizations
- Smooth zoom/pan with large datasets

**Example:**
```javascript
// Deck.gl ScatterplotLayer
import {Deck} from '@deck.gl/core';
import {ScatterplotLayer} from '@deck.gl/layers';

const layer = new ScatterplotLayer({
  id: 'samples',
  data: samples,  // All 100k samples
  getPosition: d => d.geometry.coordinates,
  getRadius: 1000,
  getFillColor: d => getRockTypeColor(d.rock_type),
  pickable: true,
  radiusScale: 6,
  radiusMinPixels: 3,
  radiusMaxPixels: 30,
  updateTriggers: {
    getFillColor: [filterState]
  }
});

const deckgl = new Deck({
  mapStyle: 'mapbox://styles/mapbox/dark-v10',
  initialViewState: {longitude: -19.70, latitude: 63.98, zoom: 6},
  layers: [layer]
});
```

**Advanced Layers:**
- `HexagonLayer` - Aggregate into hexagonal bins
- `HeatmapLayer` - Density visualization
- `ScreenGridLayer` - Fast grid-based aggregation

**Cost:** Free, but may need Mapbox API key ($0 for moderate usage)

---

### 🎨 **Option C: Datashader + HoloViews** (Server-Side Rendering)

**Why:** Pre-render large datasets on server, send images to client

**Pros:**
- 🚀 Handles billions of points
- 🖼️ Server-side rendering reduces client load
- 📊 Integrates with Python data science stack
- 🎭 Dynamic aggregation (zoom-dependent)

**Best For:**
- Extremely large datasets (>1M points)
- Heatmap-style visualizations
- When client devices are low-powered

**How It Works:**
```python
# Server-side datashader rendering
import datashader as ds
import pandas as pd

# Fetch all samples
samples = pd.DataFrame(list(db.samples.find()))
samples['lat'] = samples['geometry'].apply(lambda g: g['coordinates'][1])
samples['lon'] = samples['geometry'].apply(lambda g: g['coordinates'][0])

# Create canvas for current viewport
cvs = ds.Canvas(plot_width=800, plot_height=600, 
                x_range=(-25, -13), y_range=(63, 67))

# Aggregate points
agg = cvs.points(samples, 'lon', 'lat')

# Render as image
img = ds.tf.shade(agg, cmap=['lightblue', 'darkred'])
# Send image to frontend
```

**Frontend receives:**
- PNG/WebP image tiles
- Updates on zoom/pan via AJAX

**Limitations:**
- Less interactive (harder to show individual point details)
- Requires server-side processing power
- Good for overview, less good for detail inspection

---

### 🌐 **Option D: Mapbox GL JS** (Professional, Feature-Rich)

**Why:** Production-grade mapping platform

**Pros:**
- 🎨 Beautiful default styles
- ⚡ WebGL performance
- 🗺️ Vector tiles support
- 📱 Excellent mobile support
- 🔧 Powerful data-driven styling

**Best For:**
- Professional, polished look
- Custom base map styles
- Integration with Mapbox ecosystem

**Cost:** Free tier (50k map loads/month), then $5/1000 loads

**Example:**
```javascript
// Mapbox GL with GeoJSON source
mapboxgl.accessToken = 'YOUR_TOKEN';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-19.70, 63.98],
  zoom: 6
});

map.on('load', () => {
  map.addSource('samples', {
    type: 'geojson',
    data: '/api/samples/geojson',  // Serve as GeoJSON
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50
  });
  
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'samples',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step', ['get', 'point_count'],
        '#51bbd6', 100,
        '#f1f075', 750,
        '#f28cb1'
      ],
      'circle-radius': [
        'step', ['get', 'point_count'],
        20, 100, 30, 750, 40
      ]
    }
  });
});
```

---

## 3️⃣ **Other Notable Technologies**

### **SensorThings API / OGC APIs**
**What:** Standardized APIs for IoT/sensor data

**Pros:**
- 🌐 International standard (OGC)
- 🔗 Interoperable with GIS tools
- 📊 Built-in filtering, pagination

**Cons:**
- 🔧 Complex to implement
- 🎯 Overkill for single-application use case
- 📚 Steeper learning curve

**Recommendation:** Skip unless you need interoperability with other systems

---

### **PostGIS (PostgreSQL Extension)**
**What:** Spatial database (alternative to MongoDB)

**Should You Switch?**

**Pros:**
- 🚀 Extremely mature spatial support
- 📊 Advanced spatial operations (buffer, intersection, union)
- ⚡ Very fast spatial queries with proper indexes
- 🔧 GeoJSON native support

**Cons:**
- 🔄 Requires migration from MongoDB
- 🗃️ Relational model (less flexible for nested data)

**Recommendation:** 
- ⏸️ **Stick with MongoDB for now** - your spatial indexes work well (5ms)
- 🔮 Consider PostGIS if you need advanced spatial operations (polygon intersections, etc.)

**When to switch:**
- Need complex spatial joins
- Require geometric operations (not just point queries)
- Want to use QGIS/ArcGIS integration

---

## 4️⃣ **Performance Optimization Strategies**

### A. **Database Level**

#### 1. **Viewport-Based Queries** (Already Possible)
```python
# Only query what's visible on map
def get_samples_in_viewport(bounds, zoom_level):
    lon1, lat1, lon2, lat2 = bounds
    
    # Adjust limit based on zoom
    limit = get_limit_for_zoom(zoom_level)
    
    query = {
        "geometry": {
            "$geoWithin": {
                "$box": [[lon1, lat1], [lon2, lat2]]
            }
        }
    }
    
    # Only return necessary fields
    projection = {
        "_id": 0,
        "sample_id": 1,
        "geometry": 1,
        "rock_type": 1,
        "db": 1
    }
    
    return db.samples.find(query, projection).limit(limit)
```

#### 2. **Aggregation Pipeline for Clustering**
```python
# Pre-aggregate samples into grid cells
def get_aggregated_samples(bounds, grid_size=0.1):
    """Bin samples into grid cells for clustering"""
    pipeline = [
        {"$match": {
            "geometry": {
                "$geoWithin": {
                    "$box": [[bounds[0], bounds[1]], [bounds[2], bounds[3]]]
                }
            }
        }},
        {"$project": {
            "grid_lon": {
                "$floor": {
                    "$divide": [
                        {"$arrayElemAt": ["$geometry.coordinates", 0]},
                        grid_size
                    ]
                }
            },
            "grid_lat": {
                "$floor": {
                    "$divide": [
                        {"$arrayElemAt": ["$geometry.coordinates", 1]},
                        grid_size
                    ]
                }
            },
            "rock_type": 1
        }},
        {"$group": {
            "_id": {
                "lon": "$grid_lon",
                "lat": "$grid_lat"
            },
            "count": {"$sum": 1},
            "rock_types": {"$push": "$rock_type"}
        }},
        {"$project": {
            "lon": {"$multiply": ["$_id.lon", grid_size]},
            "lat": {"$multiply": ["$_id.lat", grid_size]},
            "count": 1,
            "dominant_rock": {"$arrayElemAt": ["$rock_types", 0]}
        }}
    ]
    
    return list(db.samples.aggregate(pipeline))
```

#### 3. **Additional Indexes**
```python
# Add compound indexes for common queries
db.samples.create_index([("rock_type", 1), ("geometry", "2dsphere")])
db.samples.create_index([("db", 1), ("geometry", "2dsphere")])
db.samples.create_index([("matching_metadata.volcano_number", 1)])
```

### B. **API Level**

#### 1. **Response Caching**
```python
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache

@app.get("/api/samples")
@cache(expire=3600)  # Cache for 1 hour
async def get_samples(rock_type: str = None):
    # Expensive query cached
    return query_samples(rock_type)
```

#### 2. **Pagination & Streaming**
```python
from fastapi.responses import StreamingResponse

@app.get("/api/samples/stream")
async def stream_samples(bounds: str):
    """Stream large result sets"""
    async def generate():
        cursor = db.samples.find(query).batch_size(100)
        for batch in cursor:
            yield json.dumps(batch) + '\n'
    
    return StreamingResponse(generate(), media_type="application/x-ndjson")
```

#### 3. **GeoJSON Output Format**
```python
@app.get("/api/samples/geojson")
async def get_samples_geojson(bounds: str):
    """Return data in GeoJSON format for direct map consumption"""
    samples = query_samples_in_bounds(bounds)
    
    features = []
    for s in samples:
        features.append({
            "type": "Feature",
            "geometry": s["geometry"],
            "properties": {
                "sample_id": s["sample_id"],
                "rock_type": s["rock_type"],
                "db": s["db"]
            }
        })
    
    return {
        "type": "FeatureCollection",
        "features": features
    }
```

### C. **Frontend Level**

#### 1. **Progressive Loading**
```javascript
// Load data in zoom-level chunks
async function loadSamplesForZoom(zoom) {
  if (zoom < 5) {
    // Load aggregated/clustered data
    return fetch('/api/samples/aggregate?zoom=5');
  } else if (zoom < 10) {
    // Load sampled data (every Nth point)
    return fetch('/api/samples?sample_rate=0.5');
  } else {
    // Load full detail
    return fetch('/api/samples');
  }
}
```

#### 2. **Virtual Scrolling for Lists**
```javascript
// Only render visible samples in sidebar
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={samples.length}
  itemSize={50}
>
  {({ index, style }) => (
    <div style={style}>
      {samples[index].sample_id}
    </div>
  )}
</FixedSizeList>
```

---

## 5️⃣ **Recommended Database Structure**

### Current Structure: ✅ Already Good!

Your current MongoDB schema is well-designed:

```javascript
// Samples - Current (Good!)
{
  "sample_id": "55392",
  "geometry": {
    "type": "Point",
    "coordinates": [-104.281, 9.852]
  },
  "rock_type": "Basalt",
  "db": "PetDB",
  "matching_metadata": {...},
  "oxides": {...}
}
```

**Why it works:**
- ✅ GeoJSON format (standard)
- ✅ Spatial indexes enabled
- ✅ Flexible nested documents
- ✅ All data in one query (no joins)

### Optional Enhancements

#### 1. **Add Pre-Computed Display Fields**
```javascript
{
  "sample_id": "55392",
  "geometry": {...},
  
  // Add these for faster frontend display
  "display": {
    "title": "JS20268-019 (Basalt)",
    "subtitle": "East Pacific Rise - PetDB",
    "color": "#FF5733",  // Pre-computed color for rock type
    "icon": "basalt"
  },
  
  // Keep full data for detail views
  "rock_type": "Basalt",
  "oxides": {...}
}
```

#### 2. **Add Zoom-Level Collections** (Advanced)
For extreme scale (millions of points):

```javascript
// samples_z5 - Aggregated for zoom level 5
{
  "grid_id": "z5_x123_y456",
  "geometry": {"type": "Point", "coordinates": [-19.7, 63.9]},
  "count": 1523,
  "rock_types": {
    "Basalt": 1200,
    "Andesite": 323
  }
}

// samples_z10 - More detail for zoom 10
{
  "grid_id": "z10_x1234_y5678",
  "samples": [...],  // Up to 100 samples per cell
  "count": 45
}

// samples - Full detail (keep as is)
```

**When needed:** Only if you scale to >1M samples and notice slowdowns

---

## 6️⃣ **Recommended Tech Stack**

### 🥇 **Best for Your Use Case**

```
┌─────────────────────────────────────────────┐
│           RECOMMENDED STACK                 │
├─────────────────────────────────────────────┤
│ Backend:   FastAPI + Python                 │
│ Database:  MongoDB (keep current)           │
│ Cache:     Redis (optional)                 │
│ API:       RESTful + GeoJSON responses      │
├─────────────────────────────────────────────┤
│ Frontend:  React/Vue/Svelte                 │
│ Map:       Deck.gl + Mapbox basemap         │
│ Fallback:  Leaflet + MarkerCluster          │
│ UI:        Material-UI / Tailwind           │
└─────────────────────────────────────────────┘
```

### Why This Stack?

1. **FastAPI**: Fast, async, great with MongoDB, auto-documentation
2. **MongoDB**: Already set up, spatial indexes working, flexible schema
3. **Deck.gl**: Handles 100k+ points smoothly, beautiful visualizations
4. **React**: Large ecosystem, easy to find developers
5. **Mapbox**: Free tier sufficient, professional look

### Alternative Stack (Simpler)

```
Backend:   Flask + Python
Database:  MongoDB (keep)
Frontend:  Plain JavaScript
Map:       Leaflet + MarkerCluster
```

**When to use:** Smaller scope, faster development, <10k visible points

---

## 7️⃣ **Implementation Roadmap**

### Phase 1: MVP (2-3 weeks)
- [ ] Set up FastAPI backend
  - `/api/samples` - Get samples with filtering
  - `/api/samples/geojson` - GeoJSON format
  - `/api/volcanoes` - Get volcano list
- [ ] Basic frontend with Leaflet
  - Display samples on map
  - Simple clustering
  - Click for sample details
- [ ] Deploy to cloud (Heroku/Railway/Fly.io)

### Phase 2: Performance (1-2 weeks)
- [ ] Switch to Deck.gl for rendering
- [ ] Add viewport-based queries
- [ ] Implement caching (Redis)
- [ ] Add aggregation endpoints

### Phase 3: Features (2-3 weeks)
- [ ] Advanced filtering UI
- [ ] Sample detail pages
- [ ] Volcano detail pages
- [ ] Download data functionality
- [ ] Search functionality

### Phase 4: Polish (1-2 weeks)
- [ ] Performance monitoring
- [ ] Mobile optimization
- [ ] Documentation
- [ ] User analytics

---

## 8️⃣ **Code Examples**

### FastAPI Backend Structure
```
backend/
├── main.py              # FastAPI app entry point
├── routers/
│   ├── samples.py       # Sample endpoints
│   ├── volcanoes.py     # Volcano endpoints
│   └── spatial.py       # Spatial queries
├── models/
│   ├── sample.py        # Pydantic models
│   └── volcano.py
├── database.py          # MongoDB connection
└── utils/
    ├── geojson.py       # GeoJSON formatting
    └── cache.py         # Caching utilities
```

### React Frontend Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── Map.jsx           # Deck.gl map component
│   │   ├── SampleList.jsx    # Sample sidebar
│   │   ├── FilterPanel.jsx   # Filters
│   │   └── SampleDetail.jsx  # Detail view
│   ├── hooks/
│   │   ├── useSamples.js     # Fetch samples
│   │   └── useMapBounds.js   # Track viewport
│   ├── utils/
│   │   └── colors.js         # Rock type colors
│   └── App.jsx
└── package.json
```

---

## 9️⃣ **Key Decisions to Make**

### 1. **Backend Framework**
- ✅ FastAPI (recommended) - Modern, fast, async
- ⏸️ Flask - Simpler, but not async
- ⏸️ Django - Full-featured, but heavier

### 2. **Map Library**
- ✅ Deck.gl (recommended) - High performance, 100k+ points
- ⏸️ Leaflet - Simpler, <10k points
- ⏸️ Mapbox GL JS - Professional, paid tier for scale

### 3. **Rendering Strategy**
- ✅ Client-side (Deck.gl) - Interactive, fast with WebGL
- ⏸️ Server-side (Datashader) - For >1M points or low-power clients
- ✅ Hybrid - Server aggregation + client rendering

### 4. **Database Changes**
- ✅ Keep MongoDB - Working well, no need to migrate
- ⏸️ Add PostGIS - Only if you need complex spatial operations
- ⏸️ Add pre-computed collections - Only if scaling beyond 1M samples

---

## 🎯 **Action Items**

### Immediate (This Week)
1. ✅ Review this document
2. ⏸️ Choose your tech stack (recommend: FastAPI + Deck.gl + MongoDB)
3. ⏸️ Set up development environment
4. ⏸️ Create basic FastAPI backend with 2-3 endpoints
5. ⏸️ Create basic map view with Leaflet (quick prototype)

### Next Week
6. ⏸️ Test API with frontend
7. ⏸️ Switch to Deck.gl if Leaflet is slow
8. ⏸️ Implement filtering UI
9. ⏸️ Add sample detail views

### Month 2
10. ⏸️ Performance optimization
11. ⏸️ Deploy to production
12. ⏸️ User testing
13. ⏸️ Iterate based on feedback

---

## 📚 **Resources**

### Documentation
- **FastAPI**: https://fastapi.tiangolo.com/
- **Deck.gl**: https://deck.gl/
- **Leaflet**: https://leafletjs.com/
- **MongoDB Geospatial**: https://www.mongodb.com/docs/manual/geospatial-queries/
- **Datashader**: https://datashader.org/

### Tutorials
- FastAPI with MongoDB: https://www.mongodb.com/languages/python/pymongo-tutorial
- Deck.gl + React: https://deck.gl/docs/get-started/using-with-react
- GeoJSON Specification: https://geojson.org/

### Example Projects
- Kepler.gl (Uber): https://kepler.gl/ - Excellent reference for geospatial viz
- CesiumJS: https://cesium.com/ - 3D globe (overkill but impressive)

---

## ✅ **Final Recommendations**

### For Your Project (100k samples, volcano data):

**Backend:** FastAPI + MongoDB (keep current)  
**Frontend:** React + Deck.gl  
**Deployment:** Docker + Cloud provider (Render/Railway/AWS)  

**Why:**
- ✅ Proven tech stack
- ✅ Handles your data size easily
- ✅ Room to scale to 1M+ samples
- ✅ Great developer experience
- ✅ Active communities & support

**Database:** Keep MongoDB
- Your spatial indexes work well (5ms queries)
- No need to migrate unless you need PostGIS-specific features
- Consider adding more compound indexes as usage patterns emerge

**Don't overthink it:**
- Your database structure is good
- Start simple (Leaflet + Flask) if you want
- Upgrade to high-performance tools (Deck.gl + FastAPI) when needed
- Focus on features first, optimization second

---

## 🚀 **Ready to Start?**

The database is ready. Your next steps:

1. Choose stack (FastAPI + Deck.gl recommended)
2. Create basic API (3-5 endpoints)
3. Create map view (start with Leaflet, upgrade to Deck.gl)
4. Iterate and improve

**Your data is well-structured and ready for any of these approaches!**

Good luck with website v3.0! 🌋
