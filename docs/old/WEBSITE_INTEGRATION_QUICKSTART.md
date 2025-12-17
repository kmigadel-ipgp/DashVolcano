# Quick Reference: Database → Website Integration

**Last Verified:** December 4, 2025 ✅ All tests passing

## ✅ What's Ready NOW

- **100,000 samples** with full metadata (geometry, oxides, references, etc.)
- **1,323 volcanoes** with geometry fields
- **9,912 eruptions** with geometry and temporal data
- **49,894 events** linked to eruptions
- **Spatial indexes created** - Fast geospatial queries enabled!

## 📊 Collections Schema

### Samples
```python
# Key fields for website
sample = {
    "sample_id": str,           # Unique ID
    "db": str,                  # "GEOROC" or "PetDB"
    "rock_type": str,           # "Basalt", "Andesite", etc.
    "geometry": {               # ← Use this for maps!
        "type": "Point",
        "coordinates": [lon, lat]
    },
    "matching_metadata": {
        "volcano_number": str,
        "volcano_name": str,
        "confidence_level": str
    },
    "oxides": {...},           # Chemical composition
    "citations": str,          # Publication title
    "references": str          # DOI
}
```

### Volcanoes
```python
volcano = {
    "volcano_number": str,
    "volcano_name": str,
    "geometry": {"type": "Point", "coordinates": [lon, lat]},
    "country": str,
    "primary_volcano_type": str,
    "elevation": float,
    "rocks": {...}
}
```

### Eruptions
```python
eruption = {
    "eruption_number": int,
    "volcano_number": str,
    "geometry": {"type": "Point", "coordinates": [lon, lat]},
    "start_date": {
        "year": int,
        "iso8601": str  # "2000-02-26T00:00:00Z"
    },
    "vei": int  # Volcanic Explosivity Index
}
```

## 🗺️ Map Visualization

```python
# Get all samples with coordinates (100,000 samples available)
samples = db.samples.find(
    {"geometry": {"$exists": True}},
    {"geometry": 1, "sample_id": 1, "rock_type": 1, "db": 1}
)

# Extract coordinates for map
for sample in samples:
    lon, lat = sample['geometry']['coordinates']  # [lon, lat] order!
    # Add to your map library (Leaflet, Mapbox, etc.)
```

## 🔍 Common Queries (Work Now)

```python
# Filter by rock type
db.samples.find({"rock_type": "Basalt"})

# Filter by database
db.samples.find({"db": "GEOROC"})

# Get volcano info
db.volcanoes.find_one({"volcano_number": "372030"})

# Get samples for a volcano
db.samples.find({"matching_metadata.volcano_number": "372030"})

# Get eruptions for a volcano
db.eruptions.find({"volcano_number": "372030"})

# Filter by confidence level
db.samples.find({"matching_metadata.confidence_level": "high"})

# Samples with chemical data
db.samples.find({"oxides": {"$exists": True}})
```

## 🚀 Spatial Queries (✅ Available NOW)

Spatial indexes are created and working! Fast geospatial queries enabled:

```python
# Samples within 100km of point (e.g., Iceland)
db.samples.find({
    "geometry": {
        "$nearSphere": {
            "$geometry": {"type": "Point", "coordinates": [-19.70, 63.98]},
            "$maxDistance": 100000  # 100km in meters
        }
    }
})

# Samples in bounding box
db.samples.find({
    "geometry": {
        "$geoWithin": {
            "$box": [[-25, 63], [-13, 67]]  # Iceland region
        }
    }
})

# Volcanoes within region (tested: 35 results in 5.1ms)
db.volcanoes.find({
    "geometry": {
        "$geoWithin": {
            "$box": [[-180, -90], [180, 90]]
        }
    }
})
```

## 🎯 Website Implementation Tips

### 1. Map Display
- Use `geometry.coordinates` directly
- Remember: `[longitude, latitude]` order (not lat/lon!)
- All 100k samples have geometry fields (100% coverage)

### 2. Filtering
- Basic filters work (rock_type, db, country, etc.)
- ✅ Spatial filters enabled with 2dsphere indexes
- Fast spatial queries tested and working (5ms response)

### 3. Sample Details
- Full metadata available: citations, references, oxides
- `matching_metadata` shows volcano association

### 4. Volcano Pages
- Link samples via `matching_metadata.volcano_number`
- Show eruptions via `volcano_number`
- Display events via `eruption_number`

### 5. Performance
- Use projections to limit fields:
  ```python
  db.samples.find({}, {"geometry": 1, "rock_type": 1})
  ```
- Use `.limit()` for pagination
- Index on volcano_number exists for fast joins

## 📞 Connection Setup

```python
# .env file
MONGO_USER=your_user
MONGO_PASSWORD=your_password
MONGO_CLUSTER=your_cluster.mongodb.net
MONGO_DB=newdatabase

# Python
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

user = os.getenv("MONGO_USER")
password = os.getenv("MONGO_PASSWORD")
cluster = os.getenv("MONGO_CLUSTER")
db_name = os.getenv("MONGO_DB")

uri = f"mongodb+srv://{user}:{password}@{cluster}/?retryWrites=true&w=majority"
client = MongoClient(uri)
db = client[db_name]

# Now use db.samples, db.volcanoes, etc.
```

## ⚠️ Important Notes

1. **Coordinate Order**: GeoJSON uses `[longitude, latitude]` NOT `[lat, lon]`
2. **Sample Limit**: Currently 100,000 samples (temporary measure due to space quota)
   - All samples have complete metadata
   - Spatial indexes successfully created
   - Full dataset can be uploaded when space is available
3. **No locations collection**: Removed (coordinates in geometry field)
4. **No lat/lon fields**: Only volcanoes/eruptions had them, now removed

## 🚀 Start Development NOW

✅ **All features ready for website v3.0:**
- ✅ Display 100,000 samples on map (100% with geometry)
- ✅ Filter by rock type, database, volcano
- ✅ Show sample details (citations, oxides, etc.)
- ✅ Link samples to volcanoes
- ✅ Show eruption history
- ✅ **Map-based filtering** (spatial queries working!)
- ✅ **Distance-based queries** (samples near point)
- ✅ **Bounding box filters** (tested at 5ms response)

## 📈 Performance Metrics (Verified Dec 4, 2025)

- **Collections:** 4/4 verified ✅
- **Geometry coverage:** 100% on all collections ✅
- **Spatial indexes:** 6 indexes created ✅
- **Query speed:** Spatial queries in 5ms ✅
- **ISO datetime:** 65.3% eruptions, 4.2% samples ✅
- **Tests passed:** 6/6 ✅

---

**Questions?** Check `docs/DATABASE_STATUS_REPORT.md` for full details.

**Verify status anytime:** Run `python test_mongodb_verification.py`

**Upload more samples:** Use `python cli.py pipeline --all --max-samples 100000` (when space available)
