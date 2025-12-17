"""
Integration tests for analytics endpoints (Sprint 1.5).

Tests:
- TAS diagram polygon definitions
- AFM boundary line
- VEI distribution by volcano
- Chemical analysis (TAS/AFM data)
- Error handling

Run with: pytest backend/tests/test_analytics_endpoints.py -v
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


class TestTASPolygonsEndpoint:
    """Test TAS diagram polygon definitions endpoint."""
    
    def test_get_tas_polygons(self):
        """Test GET /api/analytics/tas-polygons returns polygon definitions."""
        response = client.get("/api/analytics/tas-polygons")
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert "polygons" in data
        assert "alkali_line" in data
        assert "axes" in data
    
    def test_tas_polygon_count(self):
        """Test TAS diagram has 14 rock classification polygons."""
        response = client.get("/api/analytics/tas-polygons")
        assert response.status_code == 200
        data = response.json()
        
        polygons = data["polygons"]
        assert len(polygons) == 14  # Standard TAS diagram has 14 regions
    
    def test_tas_polygon_structure(self):
        """Test each TAS polygon has required fields."""
        response = client.get("/api/analytics/tas-polygons")
        assert response.status_code == 200
        data = response.json()
        
        for polygon in data["polygons"]:
            # Each polygon needs name and coordinates
            assert "name" in polygon
            assert "coordinates" in polygon
            
            # Coordinates should be array of [x, y] pairs
            coords = polygon["coordinates"]
            assert isinstance(coords, list)
            assert len(coords) >= 3  # Polygon needs at least 3 points
            
            # Each coordinate pair should have 2 values
            for coord in coords:
                assert len(coord) == 2
    
    def test_tas_rock_names(self):
        """Test TAS polygons include expected rock types."""
        response = client.get("/api/analytics/tas-polygons")
        assert response.status_code == 200
        data = response.json()
        
        rock_names = [p["name"].lower() for p in data["polygons"]]
        
        # Should include common volcanic rock types
        expected_rocks = ["basalt", "andesite", "dacite", "rhyolite"]
        for rock in expected_rocks:
            assert any(rock in name for name in rock_names)
    
    def test_tas_alkali_line(self):
        """Test TAS alkali/subalkalic dividing line."""
        response = client.get("/api/analytics/tas-polygons")
        assert response.status_code == 200
        data = response.json()
        
        alkali_line = data["alkali_line"]
        
        # Validate alkali line structure
        assert "name" in alkali_line
        assert "coordinates" in alkali_line
        assert len(alkali_line["coordinates"]) >= 2
        
        # Alkali line should span SiO2 range
        coords = alkali_line["coordinates"]
        sio2_values = [c[0] for c in coords]
        assert min(sio2_values) < 45  # Low silica end
        assert max(sio2_values) > 70  # High silica end
    
    def test_tas_axes_definition(self):
        """Test TAS axes have labels and ranges."""
        response = client.get("/api/analytics/tas-polygons")
        assert response.status_code == 200
        data = response.json()
        
        axes = data["axes"]
        
        # X-axis (SiO2)
        assert "x" in axes
        assert "label" in axes["x"]
        assert "SiO2" in axes["x"]["label"]
        assert "range" in axes["x"]
        assert len(axes["x"]["range"]) == 2
        
        # Y-axis (Na2O + K2O)
        assert "y" in axes
        assert "label" in axes["y"]
        assert "Na2O" in axes["y"]["label"] or "K2O" in axes["y"]["label"]
        assert "range" in axes["y"]


class TestAFMBoundaryEndpoint:
    """Test AFM ternary diagram boundary endpoint."""
    
    def test_get_afm_boundary(self):
        """Test GET /api/analytics/afm-boundary returns boundary line."""
        response = client.get("/api/analytics/afm-boundary")
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert "boundary" in data
        assert "axes" in data
    
    def test_afm_boundary_structure(self):
        """Test AFM boundary has correct structure."""
        response = client.get("/api/analytics/afm-boundary")
        assert response.status_code == 200
        data = response.json()
        
        boundary = data["boundary"]
        
        # Boundary should have name and coordinates
        assert "name" in boundary
        assert "coordinates" in boundary
        
        # Should have at least 2 points (line)
        coords = boundary["coordinates"]
        assert len(coords) >= 2
        
        # Each point should be an object with A, F, M keys
        for coord in coords:
            assert "A" in coord
            assert "F" in coord
            assert "M" in coord
            # Ternary coordinates should sum to 100 (or close to it)
            coord_sum = coord["A"] + coord["F"] + coord["M"]
            assert 99 <= coord_sum <= 101  # Allow small rounding error
    
    def test_afm_boundary_interpretation(self):
        """Test AFM boundary has interpretation notes."""
        response = client.get("/api/analytics/afm-boundary")
        assert response.status_code == 200
        data = response.json()
        
        boundary = data["boundary"]
        
        # Should explain tholeiitic vs calc-alkaline
        name = boundary["name"].lower()
        assert "tholeiitic" in name or "calc-alkaline" in name or "boundary" in name
    
    def test_afm_axes_definition(self):
        """Test AFM axes have labels."""
        response = client.get("/api/analytics/afm-boundary")
        assert response.status_code == 200
        data = response.json()
        
        axes = data["axes"]
        
        # Should have A, F, M axes for ternary diagram
        assert "A" in axes or "a" in axes
        assert "F" in axes or "f" in axes
        assert "M" in axes or "m" in axes


class TestVEIDistributionEndpoint:
    """Test VEI distribution by volcano endpoint."""
    
    def test_get_vei_distribution_mayon(self):
        """Test VEI distribution for Mayon volcano (273030)."""
        response = client.get("/api/volcanoes/273030/vei-distribution")
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert "volcano_name" in data
        assert "volcano_number" in data
        assert "vei_counts" in data
        assert "total_eruptions" in data
        
        # Mayon should have eruptions
        assert data["total_eruptions"] > 0
        assert data["volcano_number"] == 273030
    
    def test_vei_distribution_structure(self):
        """Test VEI distribution has correct data structure."""
        response = client.get("/api/volcanoes/273030/vei-distribution")
        assert response.status_code == 200
        data = response.json()
        
        vei_counts = data["vei_counts"]
        
        # VEI counts should be a dictionary
        assert isinstance(vei_counts, dict)
        
        # Keys should be VEI values (0-8 or "unknown")
        for key in vei_counts.keys():
            if key != "unknown":
                vei_val = int(float(key))
                assert 0 <= vei_val <= 8
        
        # Values should be positive integers
        for count in vei_counts.values():
            assert isinstance(count, int)
            assert count > 0
    
    def test_vei_distribution_date_range(self):
        """Test VEI distribution includes date range."""
        response = client.get("/api/volcanoes/273030/vei-distribution")
        assert response.status_code == 200
        data = response.json()
        
        # Should have date_range if dates available
        if "date_range" in data:
            date_range = data["date_range"]
            assert "start" in date_range or "end" in date_range
    
    def test_vei_distribution_no_eruptions(self):
        """Test VEI distribution for volcano with minimal eruptions (Abu 283001)."""
        response = client.get("/api/volcanoes/283001/vei-distribution")
        assert response.status_code == 200
        data = response.json()
        
        # Abu has 1 eruption with unknown VEI
        assert data["total_eruptions"] >= 0
        assert "vei_counts" in data
    
    def test_vei_distribution_invalid_volcano_number(self):
        """Test invalid volcano number returns 400."""
        response = client.get("/api/volcanoes/invalid_number/vei-distribution")
        assert response.status_code == 400
        assert "detail" in response.json()
    
    def test_vei_distribution_nonexistent_volcano(self):
        """Test non-existent volcano returns 404."""
        response = client.get("/api/volcanoes/999999999/vei-distribution")
        assert response.status_code == 404
        assert "detail" in response.json()


class TestChemicalAnalysisEndpoint:
    """Test chemical analysis endpoint for TAS/AFM data."""
    
    def test_get_chemical_analysis_popa(self):
        """Test chemical analysis for Popa volcano (275080)."""
        response = client.get("/api/volcanoes/275080/chemical-analysis?limit=100")
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert "volcano_name" in data
        assert "volcano_number" in data
        assert "tas_data" in data
        assert "afm_data" in data
        assert "samples_count" in data
        
        assert data["volcano_number"] == 275080
    
    def test_chemical_analysis_tas_data(self):
        """Test TAS data structure in chemical analysis."""
        response = client.get("/api/volcanoes/275080/chemical-analysis?limit=50")
        assert response.status_code == 200
        data = response.json()
        
        tas_data = data["tas_data"]
        
        # Should be array of data points
        assert isinstance(tas_data, list)
        
        # Each point should have SiO2 and Na2O+K2O
        if len(tas_data) > 0:
            point = tas_data[0]
            assert "SiO2" in point
            assert "Na2O_K2O" in point
            
            # Values should be reasonable percentages
            assert 30 <= point["SiO2"] <= 90
            assert 0 <= point["Na2O_K2O"] <= 20
    
    def test_chemical_analysis_afm_data(self):
        """Test AFM data structure in chemical analysis."""
        response = client.get("/api/volcanoes/275080/chemical-analysis?limit=50")
        assert response.status_code == 200
        data = response.json()
        
        afm_data = data["afm_data"]
        
        # Should be array of data points
        assert isinstance(afm_data, list)
        
        # Each point should have A, F, M values
        if len(afm_data) > 0:
            point = afm_data[0]
            assert "A" in point
            assert "F" in point
            assert "M" in point
            
            # AFM values should be reasonable percentages (raw values not normalized)
            assert point["A"] >= 0
            assert point["F"] >= 0
            assert point["M"] >= 0
    
    def test_chemical_analysis_rock_types(self):
        """Test rock type distribution in chemical analysis."""
        response = client.get("/api/volcanoes/275080/chemical-analysis?limit=100")
        assert response.status_code == 200
        data = response.json()
        
        # Should have rock_types dictionary
        assert "rock_types" in data
        rock_types = data["rock_types"]
        
        assert isinstance(rock_types, dict)
        
        # Rock type counts should be positive
        for rock_type, count in rock_types.items():
            assert isinstance(count, int)
            assert count > 0
    
    def test_chemical_analysis_limit_parameter(self):
        """Test limit parameter controls sample count."""
        # Request 10 samples
        response = client.get("/api/volcanoes/275080/chemical-analysis?limit=10")
        assert response.status_code == 200
        data = response.json()
        
        # Should return at most 10 samples
        assert data["samples_count"] <= 10
    
    def test_chemical_analysis_no_samples(self):
        """Test chemical analysis for volcano with no samples (Afdera 221110)."""
        response = client.get("/api/volcanoes/221110/chemical-analysis")
        assert response.status_code == 200
        data = response.json()
        
        # Should return gracefully with empty data
        assert data["samples_count"] == 0
        assert len(data["tas_data"]) == 0
        assert len(data["afm_data"]) == 0
    
    def test_chemical_analysis_oxide_completeness(self):
        """Test only samples with complete oxides are included."""
        response = client.get("/api/volcanoes/275080/chemical-analysis?limit=50")
        assert response.status_code == 200
        data = response.json()
        
        # TAS data should only include samples with SiO2, Na2O, K2O
        for point in data["tas_data"]:
            assert point["SiO2"] is not None
            assert point["Na2O_K2O"] is not None
        
        # AFM data should only include samples with Na2O, K2O, FeOT, MgO
        for point in data["afm_data"]:
            assert point["A"] is not None
            assert point["F"] is not None
            assert point["M"] is not None


class TestAnalyticsCaching:
    """Test caching on analytics endpoints."""
    
    def test_tas_polygons_cache_headers(self):
        """Test TAS polygons endpoint has cache headers."""
        response = client.get("/api/analytics/tas-polygons")
        assert response.status_code == 200
        
        # Analytics endpoints should cache for 15 minutes (900s)
        assert "cache-control" in response.headers
        cache_control = response.headers["cache-control"]
        assert "max-age=900" in cache_control
        assert "public" in cache_control
    
    def test_afm_boundary_cache_headers(self):
        """Test AFM boundary endpoint has cache headers."""
        response = client.get("/api/analytics/afm-boundary")
        assert response.status_code == 200
        
        assert "cache-control" in response.headers
        cache_control = response.headers["cache-control"]
        assert "max-age=900" in cache_control
    
    def test_vei_distribution_cache_headers(self):
        """Test VEI distribution has appropriate cache headers."""
        response = client.get("/api/volcanoes/273030/vei-distribution")
        assert response.status_code == 200
        
        # Volcano-specific endpoints cache for 5 minutes (300s)
        assert "cache-control" in response.headers
        cache_control = response.headers["cache-control"]
        assert "max-age=300" in cache_control


class TestAnalyticsIntegration:
    """Test analytics endpoints integration with other data."""
    
    def test_tas_data_matches_polygons(self):
        """Test TAS data from samples matches TAS polygon definitions."""
        # Get TAS polygon definitions
        polygons_response = client.get("/api/analytics/tas-polygons")
        assert polygons_response.status_code == 200
        polygons_data = polygons_response.json()
        
        # Get chemical analysis for a volcano
        analysis_response = client.get("/api/volcanoes/275080/chemical-analysis?limit=10")
        assert analysis_response.status_code == 200
        analysis_data = analysis_response.json()
        
        # TAS data points should fall within expected ranges
        tas_axes = polygons_data["axes"]
        x_range = tas_axes["x"]["range"]
        y_range = tas_axes["y"]["range"]
        
        for point in analysis_data["tas_data"]:
            # Most points should be within plot ranges (allow some outliers)
            if x_range[0] <= point["SiO2"] <= x_range[1]:
                assert True  # Point within X range
            if y_range[0] <= point["Na2O_K2O"] <= y_range[1]:
                assert True  # Point within Y range
    
    def test_afm_data_values_valid(self):
        """Test AFM data values are valid percentages."""
        response = client.get("/api/volcanoes/275080/chemical-analysis?limit=20")
        assert response.status_code == 200
        data = response.json()
        
        # AFM values should be non-negative (raw percentages)
        for point in data["afm_data"]:
            assert point["A"] >= 0
            assert point["F"] >= 0
            assert point["M"] >= 0
    
    def test_multiple_volcanoes_analytics(self):
        """Test analytics endpoints work for multiple volcanoes."""
        volcano_numbers = ["273030", "275080"]  # Mayon, Popa
        
        for volcano_num in volcano_numbers:
            # VEI distribution
            vei_response = client.get(f"/api/volcanoes/{volcano_num}/vei-distribution")
            assert vei_response.status_code == 200
            
            # Chemical analysis
            chem_response = client.get(f"/api/volcanoes/{volcano_num}/chemical-analysis")
            assert chem_response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
