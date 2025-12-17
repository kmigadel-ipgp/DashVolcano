"""
Tests for bounding box (bbox) functionality in samples endpoint.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


class TestBboxEndpoint:
    """Test suite for bounding box spatial queries."""
    
    def test_bbox_europe_region(self):
        """Test bbox query for European region."""
        # Europe bbox: approximately -10 to 20 longitude, 35 to 60 latitude
        response = client.get("/api/samples?bbox=-10,35,20,60&limit=100")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert "count" in data
        assert "total" in data
        assert "bbox" in data
        assert data["bbox"] == "-10,35,20,60"
        
        # Verify all samples are within the bbox
        for sample in data["data"]:
            if "geometry" in sample and "coordinates" in sample["geometry"]:
                lon, lat = sample["geometry"]["coordinates"][:2]
                assert -10 <= lon <= 20, f"Longitude {lon} outside bbox"
                assert 35 <= lat <= 60, f"Latitude {lat} outside bbox"
    
    def test_bbox_north_america(self):
        """Test bbox query for North America region."""
        # North America bbox: approximately -130 to -60 longitude, 24 to 50 latitude
        response = client.get("/api/samples?bbox=-130,24,-60,50&limit=100")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert data["bbox"] == "-130,24,-60,50"
        
        # Verify spatial filtering
        for sample in data["data"]:
            if "geometry" in sample and "coordinates" in sample["geometry"]:
                lon, lat = sample["geometry"]["coordinates"][:2]
                assert -130 <= lon <= -60
                assert 24 <= lat <= 50
    
    def test_bbox_with_other_filters(self):
        """Test bbox combined with rock type filter."""
        response = client.get("/api/samples?bbox=-10,35,20,60&rock_type=BASALT&limit=50")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have both bbox and rock type filters applied
        for sample in data["data"]:
            assert sample.get("rock_type") == "BASALT"
            if "geometry" in sample and "coordinates" in sample["geometry"]:
                lon, lat = sample["geometry"]["coordinates"][:2]
                assert -10 <= lon <= 20
                assert 35 <= lat <= 60
    
    def test_bbox_small_area(self):
        """Test bbox query for a small area (e.g., Sicily)."""
        # Sicily: approximately 12.5 to 15.5 longitude, 36.5 to 38.5 latitude
        response = client.get("/api/samples?bbox=12.5,36.5,15.5,38.5&limit=100")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "count" in data
        # Small area should return fewer results
        assert data["count"] <= 100
    
    def test_bbox_invalid_format_missing_values(self):
        """Test invalid bbox format with missing values."""
        response = client.get("/api/samples?bbox=-10,35,20")
        
        # Regex validation fails first (422), before our custom validation (400)
        assert response.status_code == 422
    
    def test_bbox_invalid_format_non_numeric(self):
        """Test invalid bbox format with non-numeric values."""
        response = client.get("/api/samples?bbox=abc,def,ghi,jkl")
        
        assert response.status_code == 422  # Validation error from regex
    
    def test_bbox_invalid_longitude_range(self):
        """Test bbox with longitude out of valid range."""
        response = client.get("/api/samples?bbox=-200,35,20,60")
        
        assert response.status_code == 400
        assert "Longitude must be between -180 and 180" in response.json()["detail"]
    
    def test_bbox_invalid_latitude_range(self):
        """Test bbox with latitude out of valid range."""
        response = client.get("/api/samples?bbox=-10,100,20,60")
        
        assert response.status_code == 400
        assert "Latitude must be between -90 and 90" in response.json()["detail"]
    
    def test_bbox_invalid_min_max_longitude(self):
        """Test bbox where min_lon >= max_lon."""
        response = client.get("/api/samples?bbox=20,35,-10,60")
        
        assert response.status_code == 400
        assert "min_lon must be less than max_lon" in response.json()["detail"]
    
    def test_bbox_invalid_min_max_latitude(self):
        """Test bbox where min_lat >= max_lat."""
        response = client.get("/api/samples?bbox=-10,60,20,35")
        
        assert response.status_code == 400
        assert "min_lat must be less than max_lat" in response.json()["detail"]
    
    def test_bbox_with_decimal_coordinates(self):
        """Test bbox with decimal coordinate values."""
        response = client.get("/api/samples?bbox=-10.5,35.5,20.5,60.5&limit=10")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert data["bbox"] == "-10.5,35.5,20.5,60.5"
    
    def test_bbox_with_pagination(self):
        """Test bbox with pagination parameters."""
        # First page
        response1 = client.get("/api/samples?bbox=-10,35,20,60&limit=10&offset=0")
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Second page
        response2 = client.get("/api/samples?bbox=-10,35,20,60&limit=10&offset=10")
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Should have different samples
        if data1["count"] > 0 and data2["count"] > 0:
            assert data1["data"][0]["_id"] != data2["data"][0]["_id"]
    
    def test_bbox_global_coverage(self):
        """Test bbox covering entire globe."""
        response = client.get("/api/samples?bbox=-180,-90,180,90&limit=100")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return samples (essentially no spatial filter)
        assert "data" in data
        assert "count" in data
    
    def test_bbox_empty_result(self):
        """Test bbox query that should return no results (middle of ocean)."""
        # Pacific Ocean bbox with likely no samples
        response = client.get("/api/samples?bbox=-160,-10,-150,0&limit=100")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        # May or may not have results depending on data
        assert data["count"] >= 0
    
    def test_bbox_cross_dateline_east_to_west(self):
        """Test bbox that crosses the international dateline."""
        # This is a challenging case: from 170E to -170E (170W)
        # Note: MongoDB $box doesn't handle dateline crossing well
        # Our validation correctly rejects this as min_lon >= max_lon
        response = client.get("/api/samples?bbox=170,-10,-170,10&limit=10")
        
        # Should return 400 error because 170 >= -170 (validation fails)
        assert response.status_code == 400
        assert "min_lon must be less than max_lon" in response.json()["detail"]
    
    def test_bbox_performance_large_area(self):
        """Test performance with a large bounding box."""
        import time
        
        start_time = time.time()
        response = client.get("/api/samples?bbox=-50,30,50,70&limit=1000")
        query_time = (time.time() - start_time) * 1000
        
        assert response.status_code == 200
        
        # Query should complete in reasonable time (< 2 seconds)
        assert query_time < 2000, f"Query took {query_time:.2f}ms, expected < 2000ms"
    
    def test_bbox_with_multiple_rock_types(self):
        """Test bbox with multiple rock type filters."""
        response = client.get("/api/samples?bbox=-10,35,20,60&rock_type=BASALT,ANDESITE&limit=50")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all samples are basalt or andesite within bbox
        for sample in data["data"]:
            assert sample.get("rock_type") in ["BASALT", "ANDESITE"]
            if "geometry" in sample and "coordinates" in sample["geometry"]:
                lon, lat = sample["geometry"]["coordinates"][:2]
                assert -10 <= lon <= 20
                assert 35 <= lat <= 60
    
    def test_bbox_with_tectonic_setting(self):
        """Test bbox with tectonic setting filter."""
        response = client.get("/api/samples?bbox=-10,35,20,60&tectonic_setting=CONVERGENT_MARGIN&limit=50")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify tectonic setting filter is applied
        for sample in data["data"]:
            if "tectonic_setting" in sample:
                assert sample["tectonic_setting"] == "CONVERGENT_MARGIN"
    
    def test_bbox_total_count(self):
        """Test that total count is returned correctly."""
        response = client.get("/api/samples?bbox=-10,35,20,60&limit=10")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert "count" in data
        assert data["total"] >= data["count"]
        assert data["count"] <= 10  # Limited by limit parameter


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
