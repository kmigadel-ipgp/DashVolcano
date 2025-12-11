# DashVolcano API Documentation

Complete API reference with request/response examples for the DashVolcano v3.0 backend.

## Base URL

```
http://localhost:8000
```

For production deployments, replace with your server URL.

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible.

## Response Format

All endpoints return JSON. Successful responses follow this general structure:

```json
{
  "count": 100,
  "limit": 100,
  "offset": 0,
  "data": [...]
}
```

Error responses follow this structure:

```json
{
  "detail": "Error message describing what went wrong"
}
```

## Common HTTP Status Codes

- **200 OK** - Request successful
- **400 Bad Request** - Invalid parameters or malformed request
- **404 Not Found** - Resource not found
- **422 Unprocessable Entity** - Validation error (invalid parameter types)
- **500 Internal Server Error** - Server error

---

## Health Endpoint

### GET /health

Check if the API server is running and healthy.

**Request:**
```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

## Samples Endpoints

### GET /api/samples

Get list of rock samples with optional filtering.

**Query Parameters:**
- `rock_type` (string, optional) - Filter by rock type. Use comma-separated values for multiple types.
  - Examples: `"Basalt"`, `"Basalt,Andesite"`
- `database` (string, optional) - Filter by source database
  - Values: `GEOROC`, `PetDB`, `GVP`
- `tectonic_setting` (string, optional) - Filter by tectonic setting. Use comma-separated values for multiple.
  - Examples: `"Island Arc"`, `"Island Arc,Oceanic Island"`
- `min_sio2` (float, optional) - Minimum SiO2 content (%)
- `max_sio2` (float, optional) - Maximum SiO2 content (%)
- `volcano_number` (string, optional) - Filter by volcano number
- `limit` (integer, optional) - Maximum number of results (default: unlimited)
- `offset` (integer, optional) - Pagination offset (default: 0)

**Example 1: Get first 100 basalt samples**
```bash
curl "http://localhost:8000/api/samples?rock_type=Basalt&limit=100"
```

**Example 2: Get samples from specific volcano**
```bash
curl "http://localhost:8000/api/samples?volcano_number=213004&limit=50"
```

**Example 3: Get high-silica samples (dacite to rhyolite range)**
```bash
curl "http://localhost:8000/api/samples?min_sio2=63&max_sio2=80&limit=100"
```

**Example 4: Multiple rock types and tectonic settings**
```bash
curl "http://localhost:8000/api/samples?rock_type=Basalt,Andesite&tectonic_setting=Island%20Arc,Oceanic%20Island&limit=100"
```

**Response:**
```json
{
  "count": 100,
  "limit": 100,
  "offset": 0,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "sample_id": "SAMPLE123",
      "sample_code": "ABC-001",
      "rock_type": "Basalt",
      "db": "GEOROC",
      "geometry": {
        "type": "Point",
        "coordinates": [-122.4194, 37.7749]
      },
      "oxides": {
        "SIO2(WT%)": 48.5,
        "AL2O3(WT%)": 15.2,
        "FEO(WT%)": 10.8,
        "MGO(WT%)": 7.5,
        "CAO(WT%)": 11.2,
        "NA2O(WT%)": 2.8,
        "K2O(WT%)": 0.5,
        "TIO2(WT%)": 1.8
      },
      "tectonic_setting": "Island Arc",
      "geographic_location": "Cascade Range",
      "material": "Lava",
      "matching_metadata": {
        "volcano_number": "213004",
        "volcano_name": "Mount St. Helens"
      },
      "references": {
        "authors": "Smith et al.",
        "year": 2020,
        "title": "Geochemistry of Mount St. Helens basalts"
      }
    }
  ]
}
```

### GET /api/samples/geojson

Get samples as GeoJSON format for mapping applications.

**Query Parameters:** Same as `/api/samples`

**Example:**
```bash
curl "http://localhost:8000/api/samples/geojson?rock_type=Basalt&limit=1000"
```

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-122.4194, 37.7749]
      },
      "properties": {
        "_id": "507f1f77bcf86cd799439011",
        "sample_id": "SAMPLE123",
        "rock_type": "Basalt",
        "db": "GEOROC",
        "sio2": 48.5,
        "na2o_k2o": 3.3,
        "volcano_number": "213004",
        "volcano_name": "Mount St. Helens"
      }
    }
  ]
}
```

### GET /api/samples/{id}

Get a single sample by MongoDB ObjectId.

**Example:**
```bash
curl http://localhost:8000/api/samples/507f1f77bcf86cd799439011
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "sample_id": "SAMPLE123",
  "rock_type": "Basalt",
  "oxides": {...},
  "geometry": {...}
}
```

**Error Response (404):**
```json
{
  "detail": "Sample not found"
}
```

---

## Volcanoes Endpoints

### GET /api/volcanoes

Get list of volcanoes with optional filtering.

**Query Parameters:**
- `country` (string, optional) - Filter by country name
- `subregion` (string, optional) - Filter by subregion
- `primary_volcano_type` (string, optional) - Filter by volcano type
- `limit` (integer, optional) - Maximum number of results
- `offset` (integer, optional) - Pagination offset

**Example:**
```bash
curl "http://localhost:8000/api/volcanoes?country=United%20States&limit=50"
```

**Response:**
```json
{
  "count": 50,
  "limit": 50,
  "offset": 0,
  "data": [
    {
      "volcano_number": "213004",
      "volcano_name": "Mount St. Helens",
      "country": "United States",
      "region": "North America",
      "subregion": "Cascade Range",
      "primary_volcano_type": "Stratovolcano",
      "geometry": {
        "type": "Point",
        "coordinates": [-122.1944, 46.2]
      },
      "elevation": 2549,
      "last_known_eruption": "2008",
      "tectonic_setting": "Subduction zone"
    }
  ]
}
```

### GET /api/volcanoes/{volcano_number}

Get details of a single volcano by GVP volcano number.

**Example:**
```bash
curl http://localhost:8000/api/volcanoes/213004
```

**Response:**
```json
{
  "volcano_number": "213004",
  "volcano_name": "Mount St. Helens",
  "country": "United States",
  "region": "North America",
  "subregion": "Cascade Range",
  "primary_volcano_type": "Stratovolcano",
  "geometry": {
    "type": "Point",
    "coordinates": [-122.1944, 46.2]
  },
  "elevation": 2549,
  "last_known_eruption": "2008",
  "tectonic_setting": "Subduction zone",
  "dominant_rock_type": "Andesite / Basaltic Andesite",
  "eruption_history": [...]
}
```

### GET /api/volcanoes/geojson

Get volcanoes as GeoJSON format.

**Query Parameters:** Same as `/api/volcanoes`

**Example:**
```bash
curl "http://localhost:8000/api/volcanoes/geojson?country=Japan&limit=100"
```

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [138.5299, 36.4]
      },
      "properties": {
        "volcano_number": "283030",
        "volcano_name": "Asama",
        "country": "Japan",
        "elevation": 2568,
        "volcano_type": "Stratovolcano"
      }
    }
  ]
}
```

---

## Eruptions Endpoints

### GET /api/eruptions

Get list of historical eruptions with optional filtering.

**Query Parameters:**
- `volcano_number` (string, optional) - Filter by volcano number
- `start_year` (integer, optional) - Filter eruptions starting from this year
- `end_year` (integer, optional) - Filter eruptions up to this year
- `min_vei` (integer, optional) - Minimum VEI (0-8)
- `max_vei` (integer, optional) - Maximum VEI (0-8)
- `eruption_category` (string, optional) - Filter by eruption type
- `limit` (integer, optional) - Maximum number of results
- `offset` (integer, optional) - Pagination offset

**Example 1: Get eruptions from Mount St. Helens**
```bash
curl "http://localhost:8000/api/eruptions?volcano_number=213004"
```

**Example 2: Get major eruptions (VEI 5+) since 1900**
```bash
curl "http://localhost:8000/api/eruptions?min_vei=5&start_year=1900"
```

**Response:**
```json
{
  "count": 15,
  "data": [
    {
      "eruption_number": "213004-001",
      "volcano_number": "213004",
      "volcano_name": "Mount St. Helens",
      "start_year": 1980,
      "start_month": 5,
      "start_day": 18,
      "end_year": 1980,
      "end_month": 10,
      "vei": 5,
      "eruption_category": "Confirmed Eruption",
      "evidence": "Observations",
      "area_of_activity": "Main crater"
    }
  ]
}
```

### GET /api/eruptions/{eruption_number}

Get details of a single eruption.

**Example:**
```bash
curl http://localhost:8000/api/eruptions/213004-001
```

---

## Analytics Endpoints

### GET /api/analytics/tas-polygons

Get TAS (Total Alkali-Silica) diagram polygon definitions for rock classification.

**Example:**
```bash
curl http://localhost:8000/api/analytics/tas-polygons
```

**Response:**
```json
{
  "polygons": [
    {
      "name": "basalt",
      "coordinates": [[45, 0], [45, 5], [52, 5], [52, 0], [45, 0]]
    },
    {
      "name": "andesite",
      "coordinates": [[57, 0], [57, 5.9], [63, 7], [63, 0], [57, 0]]
    }
  ],
  "alkali_line": {
    "name": "Alkali/Subalkalic Line",
    "coordinates": [
      [39.2, 0], [40, 0.4], [43.2, 2], [45, 2.8],
      [48, 4], [50, 4.75], [53.7, 6], [55, 6.4],
      [60, 8], [65, 8.8], [74.4, 10]
    ]
  },
  "axes": {
    "x": {"label": "SiO2 (WT%)", "range": [39, 80]},
    "y": {"label": "Na2O+K2O (WT%)", "range": [0, 16]}
  }
}
```

### GET /api/analytics/afm-boundary

Get AFM (Alkali-Iron-Magnesium) diagram boundary line.

**Example:**
```bash
curl http://localhost:8000/api/analytics/afm-boundary
```

**Response:**
```json
{
  "boundary": {
    "name": "Tholeiitic/Calc-alkaline boundary (Irvine & Baragar, 1971)",
    "coordinates": [
      [0, 100], [10, 90], [20, 80], [30, 70],
      [40, 60], [50, 50], [60, 40], [70, 30],
      [80, 20], [90, 10], [100, 0]
    ]
  },
  "axes": {
    "A": {"label": "Na2O+K2O", "position": "top"},
    "F": {"label": "FeO", "position": "bottom-right"},
    "M": {"label": "MgO", "position": "bottom-left"}
  }
}
```

### GET /api/analytics/tas-data

Get TAS plot data for samples (SiO2 vs Na2O+K2O).

**Query Parameters:** Same as `/api/samples`

**Example:**
```bash
curl "http://localhost:8000/api/analytics/tas-data?volcano_number=213004"
```

**Response:**
```json
{
  "count": 234,
  "data": [
    {
      "sample_id": "SAMPLE123",
      "sio2": 48.5,
      "na2o_k2o": 3.3,
      "rock_type": "Basalt"
    }
  ]
}
```

### GET /api/analytics/afm-data

Get AFM plot data for samples (normalized Alkali-Iron-Magnesium ternary).

**Query Parameters:** Same as `/api/samples`

**Example:**
```bash
curl "http://localhost:8000/api/analytics/afm-data?rock_type=Basalt&limit=500"
```

**Response:**
```json
{
  "count": 500,
  "data": [
    {
      "sample_id": "SAMPLE123",
      "A": 15.2,
      "F": 58.3,
      "M": 26.5,
      "rock_type": "Basalt"
    }
  ]
}
```

### GET /api/analytics/vei-distribution

Get VEI (Volcanic Explosivity Index) distribution for volcanoes.

**Query Parameters:**
- `volcano_number` (string, optional) - Filter by volcano number
- `start_year` (integer, optional) - Start year for eruptions
- `end_year` (integer, optional) - End year for eruptions

**Example:**
```bash
curl "http://localhost:8000/api/analytics/vei-distribution?volcano_number=213004"
```

**Response:**
```json
{
  "volcano_number": "213004",
  "volcano_name": "Mount St. Helens",
  "distribution": {
    "VEI 0": 5,
    "VEI 1": 12,
    "VEI 2": 23,
    "VEI 3": 15,
    "VEI 4": 8,
    "VEI 5": 2,
    "VEI 6": 0
  },
  "total_eruptions": 65
}
```

---

## Spatial Endpoints

### GET /api/spatial/bounds

Get samples within a geographic bounding box.

**Query Parameters:**
- `min_lon` (float, required) - Minimum longitude
- `min_lat` (float, required) - Minimum latitude
- `max_lon` (float, required) - Maximum longitude
- `max_lat` (float, required) - Maximum latitude
- `limit` (integer, optional) - Maximum results (default: 5000, max: 10000)

**Example: Get samples in Pacific Northwest**
```bash
curl "http://localhost:8000/api/spatial/bounds?min_lon=-125&min_lat=42&max_lon=-120&max_lat=49&limit=1000"
```

**Response:**
```json
{
  "count": 847,
  "bounds": {
    "min_lon": -125,
    "min_lat": 42,
    "max_lon": -120,
    "max_lat": 49
  },
  "data": [...]
}
```

### GET /api/spatial/nearby

Get samples near a specific point.

**Query Parameters:**
- `lon` (float, required) - Center longitude
- `lat` (float, required) - Center latitude
- `max_distance` (float, required) - Maximum distance in meters
- `limit` (integer, optional) - Maximum results (default: 1000)

**Example: Get samples within 50km of Mount Fuji**
```bash
curl "http://localhost:8000/api/spatial/nearby?lon=138.7274&lat=35.3606&max_distance=50000&limit=500"
```

**Response:**
```json
{
  "count": 423,
  "center": {"lon": 138.7274, "lat": 35.3606},
  "max_distance": 50000,
  "data": [...]
}
```

### GET /api/spatial/tectonic-plates

Get tectonic plate boundary data as GeoJSON.

**Example:**
```bash
curl http://localhost:8000/api/spatial/tectonic-plates
```

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-122.5, 40.0],
          [-122.4, 40.1],
          [-122.3, 40.2]
        ]
      },
      "properties": {
        "type": "ridge",
        "name": "Juan de Fuca Ridge"
      }
    }
  ]
}
```

---

## Metadata Endpoints

### GET /api/metadata/countries

Get list of all countries with volcanic samples.

**Example:**
```bash
curl http://localhost:8000/api/metadata/countries
```

**Response:**
```json
{
  "count": 85,
  "countries": [
    "Argentina",
    "Chile",
    "Indonesia",
    "Italy",
    "Japan",
    "United States"
  ]
}
```

### GET /api/metadata/tectonic-settings

Get list of all tectonic settings.

**Example:**
```bash
curl http://localhost:8000/api/metadata/tectonic-settings
```

**Response:**
```json
{
  "count": 12,
  "settings": [
    "Convergent Boundary",
    "Island Arc",
    "Oceanic Island",
    "Rift Zone",
    "Subduction Zone"
  ]
}
```

### GET /api/metadata/rock-types

Get list of all rock types in the database.

**Example:**
```bash
curl http://localhost:8000/api/metadata/rock-types
```

**Response:**
```json
{
  "count": 45,
  "rock_types": [
    "Andesite",
    "Basalt",
    "Basaltic Andesite",
    "Dacite",
    "Phonolite",
    "Rhyolite",
    "Trachyandesite",
    "Trachybasalt"
  ]
}
```

### GET /api/metadata/databases

Get list of source databases.

**Example:**
```bash
curl http://localhost:8000/api/metadata/databases
```

**Response:**
```json
{
  "databases": [
    {"name": "GEOROC", "description": "Geochemistry of Rocks of the Oceans and Continents"},
    {"name": "PetDB", "description": "Petrological Database"},
    {"name": "GVP", "description": "Global Volcanism Program"}
  ]
}
```

---

## Interactive Documentation

For interactive API exploration with live request testing:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Both interfaces provide:
- Full endpoint documentation
- Request/response schemas
- "Try it out" functionality for live testing
- Parameter validation
- Example responses

---

## Rate Limiting

Currently, no rate limiting is enforced. For production deployments, consider implementing rate limiting via nginx or a reverse proxy.

---

## Error Handling

### 400 Bad Request

Returned when query parameters are invalid or malformed.

**Example:**
```bash
curl "http://localhost:8000/api/samples?min_sio2=invalid"
```

**Response:**
```json
{
  "detail": "Invalid parameter type for min_sio2"
}
```

### 404 Not Found

Returned when a specific resource doesn't exist.

**Example:**
```bash
curl http://localhost:8000/api/volcanoes/999999
```

**Response:**
```json
{
  "detail": "Volcano not found"
}
```

### 422 Unprocessable Entity

Returned when request validation fails (FastAPI automatic validation).

**Example:**
```bash
curl "http://localhost:8000/api/spatial/bounds?min_lon=-200"
```

**Response:**
```json
{
  "detail": [
    {
      "loc": ["query", "min_lon"],
      "msg": "ensure this value is greater than or equal to -180",
      "type": "value_error"
    }
  ]
}
```

### 500 Internal Server Error

Returned when an unexpected server error occurs (database connection failure, etc.).

**Response:**
```json
{
  "detail": "Internal server error"
}
```

---

## Best Practices

### Pagination

For large result sets, use `limit` and `offset` parameters:

```bash
# Get first page (100 results)
curl "http://localhost:8000/api/samples?limit=100&offset=0"

# Get second page (next 100 results)
curl "http://localhost:8000/api/samples?limit=100&offset=100"

# Get third page
curl "http://localhost:8000/api/samples?limit=100&offset=200"
```

### Filtering

Combine multiple filters for precise queries:

```bash
curl "http://localhost:8000/api/samples?rock_type=Basalt&tectonic_setting=Island%20Arc&min_sio2=45&max_sio2=52&limit=500"
```

### GeoJSON Endpoints

Use `/geojson` variants for map visualization to get properly formatted GeoJSON:

```bash
# For Deck.gl or Mapbox
curl "http://localhost:8000/api/samples/geojson?limit=10000"
```

### Caching

The API implements Redis caching for frequently accessed endpoints. Repeated identical requests will be faster.

---

## Need Help?

- **Backend README**: See `backend/README.md` for setup instructions
- **Frontend README**: See `frontend/README.md` for client usage
- **User Guide**: See `docs/USER_GUIDE.md` for application workflows
- **Deployment**: See `docs/DEPLOYMENT_GUIDE.md` for production setup
