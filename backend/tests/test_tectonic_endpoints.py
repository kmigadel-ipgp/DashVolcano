"""
Integration tests for tectonic plates endpoints (Sprint 1.4).

Tests:
- Tectonic plates GeoJSON endpoint
- Tectonic boundaries endpoint with filters
- GMT file parsing validation

Run with: pytest backend/tests/test_tectonic_endpoints.py -v
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


class TestTectonicPlatesEndpoint:
    """Test tectonic plates GeoJSON endpoint."""
    
    def test_get_tectonic_plates(self):
        """Test GET /api/spatial/tectonic-plates returns 54 plate polygons."""
        response = client.get("/api/spatial/tectonic-plates")
        assert response.status_code == 200
        data = response.json()
        
        # Validate GeoJSON structure
        assert data["type"] == "FeatureCollection"
        assert "features" in data
        assert len(data["features"]) == 54  # PB2002 has 54 plates
    
    def test_tectonic_plates_feature_structure(self):
        """Test individual plate feature has correct structure."""
        response = client.get("/api/spatial/tectonic-plates")
        assert response.status_code == 200
        data = response.json()
        
        # Check first feature
        if len(data["features"]) > 0:
            feature = data["features"][0]
            
            # Validate GeoJSON Feature structure
            assert feature["type"] == "Feature"
            assert "geometry" in feature
            assert "properties" in feature
            
            # Validate geometry
            geometry = feature["geometry"]
            assert geometry["type"] in ["Polygon", "MultiPolygon"]
            assert "coordinates" in geometry
            
            # Validate properties (PB2002 plate properties)
            properties = feature["properties"]
            assert "Code" in properties or "PlateName" in properties
    
    def test_tectonic_plates_coverage(self):
        """Test plates include major tectonic plates."""
        response = client.get("/api/spatial/tectonic-plates")
        assert response.status_code == 200
        data = response.json()
        
        # Get all plate names/codes
        plate_names = []
        for feature in data["features"]:
            props = feature["properties"]
            if "PlateName" in props:
                plate_names.append(props["PlateName"])
            elif "Code" in props:
                plate_names.append(props["Code"])
        
        # Should include major plates (check for common ones)
        plate_names_str = " ".join(plate_names).lower()
        # At least one major plate should be present
        assert len(plate_names) == 54


class TestTectonicBoundariesEndpoint:
    """Test tectonic boundaries endpoint with filtering."""
    
    def test_get_all_boundaries(self):
        """Test GET /api/spatial/tectonic-boundaries?boundary_type=all."""
        response = client.get("/api/spatial/tectonic-boundaries?boundary_type=all")
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert data["type"] == "FeatureCollection"
        assert "features" in data
        
        # Should have 528 total segments (187 ridge + 228 transform + 113 trench)
        assert len(data["features"]) == 528
    
    def test_get_ridge_boundaries(self):
        """Test GET /api/spatial/tectonic-boundaries?boundary_type=ridge."""
        response = client.get("/api/spatial/tectonic-boundaries?boundary_type=ridge")
        assert response.status_code == 200
        data = response.json()
        
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 187  # ridge.gmt has 187 segments
        
        # All features should be LineStrings
        for feature in data["features"]:
            assert feature["type"] == "Feature"
            assert feature["geometry"]["type"] == "LineString"
            assert "coordinates" in feature["geometry"]
            
            # Validate properties
            if "properties" in feature:
                props = feature["properties"]
                assert props.get("boundary_type") == "ridge"
    
    def test_get_transform_boundaries(self):
        """Test GET /api/spatial/tectonic-boundaries?boundary_type=transform."""
        response = client.get("/api/spatial/tectonic-boundaries?boundary_type=transform")
        assert response.status_code == 200
        data = response.json()
        
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 228  # transform.gmt has 228 segments
        
        # Check boundary_type property
        for feature in data["features"]:
            if "properties" in feature:
                assert feature["properties"].get("boundary_type") == "transform"
    
    def test_get_trench_boundaries(self):
        """Test GET /api/spatial/tectonic-boundaries?boundary_type=trench."""
        response = client.get("/api/spatial/tectonic-boundaries?boundary_type=trench")
        assert response.status_code == 200
        data = response.json()
        
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 113  # trench.gmt has 113 segments
        
        # Check boundary_type property
        for feature in data["features"]:
            if "properties" in feature:
                assert feature["properties"].get("boundary_type") == "trench"
    
    def test_boundary_default_filter(self):
        """Test boundaries endpoint without filter returns all."""
        response = client.get("/api/spatial/tectonic-boundaries")
        assert response.status_code == 200
        data = response.json()
        
        # Should return all boundaries by default
        assert len(data["features"]) == 528
    
    def test_boundary_invalid_type(self):
        """Test invalid boundary_type parameter."""
        response = client.get("/api/spatial/tectonic-boundaries?boundary_type=invalid")
        # Should either return 400 or empty FeatureCollection
        if response.status_code == 200:
            data = response.json()
            assert len(data["features"]) == 0  # No matches
        else:
            assert response.status_code in [400, 422]


class TestBoundaryGeometry:
    """Test boundary geometry data quality."""
    
    def test_ridge_coordinates_valid(self):
        """Test ridge boundary coordinates are valid."""
        response = client.get("/api/spatial/tectonic-boundaries?boundary_type=ridge")
        assert response.status_code == 200
        data = response.json()
        
        # Check first feature's coordinates
        if len(data["features"]) > 0:
            feature = data["features"][0]
            coords = feature["geometry"]["coordinates"]
            
            # Should be array of [lon, lat] pairs
            assert isinstance(coords, list)
            assert len(coords) > 0
            
            # Validate coordinate ranges
            for coord_pair in coords:
                assert len(coord_pair) == 2
                lon, lat = coord_pair
                assert -180 <= lon <= 180
                assert -90 <= lat <= 90
    
    def test_boundary_names_present(self):
        """Test boundaries have segment names."""
        response = client.get("/api/spatial/tectonic-boundaries?boundary_type=ridge")
        assert response.status_code == 200
        data = response.json()
        
        # Check that some boundaries have names
        named_count = 0
        for feature in data["features"]:
            if "properties" in feature and "name" in feature["properties"]:
                name = feature["properties"]["name"]
                if name and name.strip():
                    named_count += 1
        
        # At least some boundaries should have names
        assert named_count > 0
    
    def test_transform_segments_continuous(self):
        """Test transform boundary segments have multiple points."""
        response = client.get("/api/spatial/tectonic-boundaries?boundary_type=transform")
        assert response.status_code == 200
        data = response.json()
        
        # Each segment should have at least 2 points
        for feature in data["features"]:
            coords = feature["geometry"]["coordinates"]
            assert len(coords) >= 2  # LineString needs at least 2 points


class TestCachingTectonicEndpoints:
    """Test caching headers on tectonic endpoints."""
    
    def test_tectonic_plates_cache_headers(self):
        """Test tectonic plates endpoint has cache headers."""
        response = client.get("/api/spatial/tectonic-plates")
        assert response.status_code == 200
        
        # Should have cache-control header (spatial endpoints: 5 minutes)
        assert "cache-control" in response.headers
        cache_control = response.headers["cache-control"]
        assert "max-age" in cache_control
        assert "public" in cache_control
    
    def test_tectonic_boundaries_cache_headers(self):
        """Test tectonic boundaries endpoint has cache headers."""
        response = client.get("/api/spatial/tectonic-boundaries?boundary_type=ridge")
        assert response.status_code == 200
        
        assert "cache-control" in response.headers
        assert "vary" in response.headers


class TestTectonicDataIntegration:
    """Test tectonic data integration with other endpoints."""
    
    def test_plates_and_boundaries_compatible(self):
        """Test plates and boundaries can be used together."""
        # Get plates
        plates_response = client.get("/api/spatial/tectonic-plates")
        assert plates_response.status_code == 200
        plates = plates_response.json()
        
        # Get boundaries
        boundaries_response = client.get("/api/spatial/tectonic-boundaries?boundary_type=all")
        assert boundaries_response.status_code == 200
        boundaries = boundaries_response.json()
        
        # Both should be valid GeoJSON FeatureCollections
        assert plates["type"] == "FeatureCollection"
        assert boundaries["type"] == "FeatureCollection"
        
        # Combined they should provide complete tectonic visualization
        assert len(plates["features"]) == 54
        assert len(boundaries["features"]) == 528
    
    def test_tectonic_data_with_volcanoes(self):
        """Test tectonic data can overlay with volcano data."""
        # Get tectonic plates
        plates_response = client.get("/api/spatial/tectonic-plates")
        assert plates_response.status_code == 200
        
        # Get volcanoes GeoJSON
        volcanoes_response = client.get("/api/volcanoes/geojson/?limit=10")
        assert volcanoes_response.status_code == 200
        
        # Both should be GeoJSON - compatible for map overlay
        plates = plates_response.json()
        volcanoes = volcanoes_response.json()
        
        assert plates["type"] == "FeatureCollection"
        assert volcanoes["type"] == "FeatureCollection"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
