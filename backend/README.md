# DashVolcano v3.0 Backend

FastAPI backend for DashVolcano volcanic data visualization application.

## Setup

### 1. Install dependencies

Using uv (recommended):
```bash
cd backend
uv sync
```

Using pip:
```bash
cd backend
pip install -e .
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your MongoDB credentials:
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Run the development server

```bash
# From the backend directory
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Or using Python directly:
```bash
python -m backend.main
```

### 4. Access the API

- **API Documentation (Swagger):** http://localhost:8000/docs
- **API Documentation (ReDoc):** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/health

## API Endpoints

### Health
- `GET /health` - Health check

### Samples
- `GET /api/samples` - List samples with filters
- `GET /api/samples/{id}` - Get sample by ID
- `GET /api/samples/geojson` - Get samples as GeoJSON

### Volcanoes
- `GET /api/volcanoes` - List volcanoes with filters
- `GET /api/volcanoes/{volcano_number}` - Get volcano by number
- `GET /api/volcanoes/geojson` - Get volcanoes as GeoJSON

### Eruptions
- `GET /api/eruptions` - List eruptions with filters
- `GET /api/eruptions/{eruption_number}` - Get eruption by number

### Spatial
- `GET /api/spatial/bounds` - Get samples in bounding box
- `GET /api/spatial/nearby` - Get samples near a point

### Metadata
- `GET /api/metadata/countries` - List all countries
- `GET /api/metadata/tectonic-settings` - List tectonic settings
- `GET /api/metadata/rock-types` - List rock types
- `GET /api/metadata/databases` - List available databases

## Development

### Run tests
```bash
pytest
```

### Code formatting
```bash
black .
ruff check .
```

## Project Structure

```
backend/
├── main.py              # FastAPI app entry point
├── config.py            # Configuration settings
├── dependencies.py      # FastAPI dependencies
├── routers/             # API route handlers
│   ├── samples.py
│   ├── volcanoes.py
│   ├── eruptions.py
│   ├── spatial.py
│   ├── analytics.py
│   └── metadata.py
├── models/              # Pydantic models
├── services/            # Business logic
└── utils/               # Utilities
```

## License

Same as parent project.
