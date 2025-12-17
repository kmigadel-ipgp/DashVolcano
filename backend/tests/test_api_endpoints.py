"""
Integration tests for DashVolcano API endpoints.

Tests all Phase 1 endpoints including:
- Samples CRUD and GeoJSON
- Volcanoes CRUD and GeoJSON
- Eruptions CRUD
- Spatial queries (bounds, nearby)
- Metadata endpoints
- Health check

Run with: pytest backend/tests/test_api_endpoints.py -v
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


class TestHealthEndpoint:
    """Test health check endpoint."""
    
    def test_health_check(self):
        """Test health check returns 200 and correct structure."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "3.0.0"
        assert data["service"] == "DashVolcano API"


class TestRootEndpoint:
    """Test root endpoint."""
    
    def test_root(self):
        """Test root endpoint returns API info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "docs" in data
        assert "api_base" in data


class TestSamplesEndpoints:
    """Test samples CRUD and GeoJSON endpoints."""
    
    def test_list_samples(self):
        """Test GET /api/samples/ returns paginated list."""
        response = client.get("/api/samples/?limit=2")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "count" in data
        assert "limit" in data
        assert "offset" in data
        assert data["limit"] == 2
        assert len(data["data"]) <= 2
    
    def test_list_samples_with_filters(self):
        """Test samples endpoint with filters."""
        response = client.get("/api/samples/?db=GEOROC&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 5
        # Filter should work (check we get results)
        assert "data" in data
        assert isinstance(data["data"], list)
    
    def test_get_sample_by_id(self):
        """Test GET /api/samples/{id} returns single sample."""
        # First get a sample ID
        list_response = client.get("/api/samples/?limit=1")
        assert list_response.status_code == 200
        samples = list_response.json()["data"]
        
        if len(samples) > 0:
            sample_id = samples[0]["_id"]
            
            # Get that specific sample
            response = client.get(f"/api/samples/{sample_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["_id"] == sample_id
    
    def test_get_sample_invalid_id(self):
        """Test invalid sample ID returns 400."""
        response = client.get("/api/samples/invalid_id")
        assert response.status_code == 400
        assert "detail" in response.json()
    
    def test_samples_geojson(self):
        """Test GET /api/samples/geojson returns GeoJSON FeatureCollection."""
        response = client.get("/api/samples/geojson/?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "FeatureCollection"
        assert "features" in data
        assert len(data["features"]) <= 5
        
        # Validate GeoJSON structure
        if len(data["features"]) > 0:
            feature = data["features"][0]
            assert feature["type"] == "Feature"
            assert "geometry" in feature
            assert "properties" in feature
            assert feature["geometry"]["type"] == "Point"
            assert len(feature["geometry"]["coordinates"]) == 2


class TestVolcanoesEndpoints:
    """Test volcanoes CRUD and GeoJSON endpoints."""
    
    def test_list_volcanoes(self):
        """Test GET /api/volcanoes/ returns paginated list."""
        response = client.get("/api/volcanoes/?limit=3")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "count" in data
        assert data["limit"] == 3
        assert len(data["data"]) <= 3
    
    def test_list_volcanoes_with_filters(self):
        """Test volcanoes endpoint with country filter."""
        response = client.get("/api/volcanoes/?country=Japan&limit=5")
        assert response.status_code == 200
        data = response.json()
        # All volcanoes should be from Japan
        for volcano in data["data"]:
            assert volcano.get("country") == "Japan"
    
    def test_get_volcano_by_number(self):
        """Test GET /api/volcanoes/{volcano_number} returns single volcano."""
        # Test with known volcano (Abu - 283001)
        response = client.get("/api/volcanoes/283001")
        assert response.status_code == 200
        data = response.json()
        assert data["volcano_number"] == 283001
        assert "volcano_name" in data
    
    def test_get_volcano_invalid_number(self):
        """Test invalid volcano number returns 400."""
        response = client.get("/api/volcanoes/invalid")
        assert response.status_code == 400
        assert "detail" in response.json()
    
    def test_get_volcano_not_found(self):
        """Test non-existent volcano returns 404."""
        response = client.get("/api/volcanoes/999999999")
        assert response.status_code == 404
        assert "detail" in response.json()
    
    def test_volcanoes_geojson(self):
        """Test GET /api/volcanoes/geojson returns GeoJSON FeatureCollection."""
        response = client.get("/api/volcanoes/geojson/?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "FeatureCollection"
        assert "features" in data
        assert len(data["features"]) <= 5
        
        # Validate structure
        if len(data["features"]) > 0:
            feature = data["features"][0]
            assert feature["type"] == "Feature"
            assert feature["geometry"]["type"] == "Point"


class TestEruptionsEndpoints:
    """Test eruptions CRUD endpoints."""
    
    def test_list_eruptions(self):
        """Test GET /api/eruptions/ returns paginated list."""
        response = client.get("/api/eruptions/?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "count" in data
        assert len(data["data"]) <= 5
    
    def test_list_eruptions_with_vei_filter(self):
        """Test eruptions endpoint with VEI filter."""
        response = client.get("/api/eruptions/?vei=4&limit=10")
        assert response.status_code == 200
        data = response.json()
        # All eruptions should have VEI=4
        for eruption in data["data"]:
            assert eruption.get("vei") == 4
    
    def test_get_eruption_by_number(self):
        """Test GET /api/eruptions/{eruption_number} returns single eruption."""
        # First get an eruption number
        list_response = client.get("/api/eruptions/?limit=1")
        assert list_response.status_code == 200
        eruptions = list_response.json()["data"]
        
        if len(eruptions) > 0:
            eruption_number = eruptions[0]["eruption_number"]
            
            # Get that specific eruption
            response = client.get(f"/api/eruptions/{eruption_number}")
            assert response.status_code == 200
            data = response.json()
            assert data["eruption_number"] == eruption_number


class TestSpatialEndpoints:
    """Test spatial query endpoints."""
    
    def test_spatial_bounds(self):
        """Test GET /api/spatial/bounds with bounding box."""
        # Query India region
        response = client.get(
            "/api/spatial/bounds?min_lon=76&min_lat=14&max_lon=86&max_lat=24"
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "count" in data
        assert "bounds" in data
        
        # Validate bounds in response
        bounds = data["bounds"]
        assert bounds["min_lon"] == 76.0
        assert bounds["min_lat"] == 14.0
        assert bounds["max_lon"] == 86.0
        assert bounds["max_lat"] == 24.0
    
    def test_spatial_nearby(self):
        """Test GET /api/spatial/nearby with radius search."""
        # Search near a point with 100km radius
        response = client.get(
            "/api/spatial/nearby?lon=81.475&lat=18.85&radius=100000"
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "count" in data
        assert "center" in data
        assert "radius" in data
        
        # Validate center and radius
        assert data["center"]["lon"] == 81.475
        assert data["center"]["lat"] == 18.85
        assert data["radius"] == 100000
    
    def test_spatial_bounds_invalid_coordinates(self):
        """Test spatial bounds with invalid coordinates."""
        response = client.get(
            "/api/spatial/bounds?min_lon=200&min_lat=14&max_lon=86&max_lat=24"
        )
        # Should return 200 but with no results or error in data
        assert response.status_code in [200, 400, 422]
    
    def test_spatial_nearby_invalid_radius(self):
        """Test spatial nearby with invalid radius."""
        response = client.get(
            "/api/spatial/nearby?lon=81.475&lat=18.85&radius=-100"
        )
        # MongoDB rejects negative radius - expect error response
        assert response.status_code >= 400


class TestMetadataEndpoints:
    """Test metadata endpoints for filters."""
    
    def test_get_countries(self):
        """Test GET /api/metadata/countries returns list of countries."""
        response = client.get("/api/metadata/countries")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "count" in data
        assert isinstance(data["data"], list)
        assert data["count"] > 0
        # Should include common countries
        countries = data["data"]
        assert any("Japan" in c for c in countries)
    
    def test_get_tectonic_settings(self):
        """Test GET /api/metadata/tectonic-settings returns list."""
        response = client.get("/api/metadata/tectonic-settings")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "count" in data
        assert data["count"] > 0
    
    def test_get_rock_types(self):
        """Test GET /api/metadata/rock-types returns list."""
        response = client.get("/api/metadata/rock-types")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "count" in data
        # Should include common rock types
        rock_types = data["data"]
        assert any("basalt" in rt.lower() for rt in rock_types)
    
    def test_get_databases(self):
        """Test GET /api/metadata/databases returns database list."""
        response = client.get("/api/metadata/databases")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "count" in data
        # Should have at least GEOROC
        databases = data["data"]
        assert "GEOROC" in databases
        assert data["count"] >= 1


class TestPagination:
    """Test pagination across endpoints."""
    
    def test_samples_pagination(self):
        """Test samples pagination with offset."""
        # Get first page
        response1 = client.get("/api/samples/?limit=2&offset=0")
        assert response1.status_code == 200
        page1 = response1.json()
        
        # Get second page
        response2 = client.get("/api/samples/?limit=2&offset=2")
        assert response2.status_code == 200
        page2 = response2.json()
        
        # Pages should have different data
        if len(page1["data"]) > 0 and len(page2["data"]) > 0:
            assert page1["data"][0]["_id"] != page2["data"][0]["_id"]
    
    def test_volcanoes_pagination(self):
        """Test volcanoes pagination."""
        response = client.get("/api/volcanoes/?limit=10&offset=5")
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 10
        assert data["offset"] == 5


class TestCacheHeaders:
    """Test HTTP caching headers on responses."""
    
    def test_metadata_cache_headers(self):
        """Test metadata endpoint has 1 hour cache."""
        response = client.get("/api/metadata/countries")
        assert response.status_code == 200
        assert "cache-control" in response.headers
        cache_control = response.headers["cache-control"]
        assert "max-age=3600" in cache_control  # 1 hour
        assert "public" in cache_control
    
    def test_samples_cache_headers(self):
        """Test samples endpoint has 5 minute cache."""
        response = client.get("/api/samples/?limit=1")
        assert response.status_code == 200
        assert "cache-control" in response.headers
        cache_control = response.headers["cache-control"]
        assert "max-age=300" in cache_control  # 5 minutes
    
    def test_geojson_cache_headers(self):
        """Test GeoJSON endpoints have 10 minute cache."""
        response = client.get("/api/samples/geojson/?limit=1")
        assert response.status_code == 200
        assert "cache-control" in response.headers
        cache_control = response.headers["cache-control"]
        assert "max-age=600" in cache_control  # 10 minutes
    
    def test_vary_header(self):
        """Test responses include Vary header."""
        response = client.get("/api/metadata/countries")
        assert response.status_code == 200
        assert "vary" in response.headers
        vary = response.headers["vary"]
        assert "Accept" in vary
        assert "Accept-Encoding" in vary


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
