"""Unit tests for Pydantic models."""

import pytest
from pydantic import ValidationError
from backend.models import (
    Sample, Volcano, Eruption, Event,
    Geometry, GeometryType, DateInfo, Oxides,
    GeoJSONFeature, GeoJSONFeatureCollection,
    PaginatedResponse, VEIDistribution
)


class TestGeometry:
    """Test Geometry model validation."""
    
    def test_valid_point_geometry(self):
        """Test valid Point geometry."""
        geom = Geometry(
            type=GeometryType.Point,
            coordinates=[131.6, 34.5]
        )
        assert geom.type == "Point"
        assert geom.coordinates == [131.6, 34.5]
    
    def test_invalid_longitude(self):
        """Test that invalid longitude raises error."""
        with pytest.raises(ValidationError) as exc_info:
            Geometry(
                type=GeometryType.Point,
                coordinates=[200.0, 34.5]  # Invalid longitude
            )
        assert "Longitude must be between -180 and 180" in str(exc_info.value)
    
    def test_invalid_latitude(self):
        """Test that invalid latitude raises error."""
        with pytest.raises(ValidationError) as exc_info:
            Geometry(
                type=GeometryType.Point,
                coordinates=[131.6, 100.0]  # Invalid latitude
            )
        assert "Latitude must be between -90 and 90" in str(exc_info.value)
    
    def test_boundary_coordinates(self):
        """Test boundary coordinate values."""
        # Test min boundaries
        geom_min = Geometry(
            type=GeometryType.Point,
            coordinates=[-180.0, -90.0]
        )
        assert geom_min.coordinates == [-180.0, -90.0]
        
        # Test max boundaries
        geom_max = Geometry(
            type=GeometryType.Point,
            coordinates=[180.0, 90.0]
        )
        assert geom_max.coordinates == [180.0, 90.0]


class TestVEIValidation:
    """Test VEI validation in Eruption and Event models."""
    
    def test_valid_vei_values(self):
        """Test all valid VEI values (0-8)."""
        for vei in range(9):
            eruption = Eruption(
                id="test_id",
                eruption_number=12345,
                volcano_number=283001,
                volcano_name="Test Volcano",
                vei=vei,
                geometry=Geometry(type=GeometryType.Point, coordinates=[131.6, 34.5]),
                bbox=[131.6, 34.5, 131.6, 34.5]
            )
            assert eruption.vei == vei
    
    def test_invalid_vei_negative(self):
        """Test that negative VEI raises error."""
        with pytest.raises(ValidationError) as exc_info:
            Eruption(
                id="test_id",
                eruption_number=12345,
                volcano_number=283001,
                volcano_name="Test Volcano",
                vei=-1,
                geometry=Geometry(type=GeometryType.Point, coordinates=[131.6, 34.5]),
                bbox=[131.6, 34.5, 131.6, 34.5]
            )
        assert "VEI must be between 0 and 8" in str(exc_info.value)
    
    def test_invalid_vei_too_high(self):
        """Test that VEI > 8 raises error."""
        with pytest.raises(ValidationError) as exc_info:
            Eruption(
                id="test_id",
                eruption_number=12345,
                volcano_number=283001,
                volcano_name="Test Volcano",
                vei=9,
                geometry=Geometry(type=GeometryType.Point, coordinates=[131.6, 34.5]),
                bbox=[131.6, 34.5, 131.6, 34.5]
            )
        assert "VEI must be between 0 and 8" in str(exc_info.value)
    
    def test_none_vei_allowed(self):
        """Test that None VEI is allowed."""
        eruption = Eruption(
            id="test_id",
            eruption_number=12345,
            volcano_number=283001,
            volcano_name="Test Volcano",
            vei=None,
            geometry=Geometry(type=GeometryType.Point, coordinates=[131.6, 34.5]),
            bbox=[131.6, 34.5, 131.6, 34.5]
        )
        assert eruption.vei is None


class TestSampleModel:
    """Test Sample model."""
    
    def test_complete_sample(self):
        """Test creating a complete sample."""
        sample = Sample(
            _id="69314de43ebcab2676a5558b",
            sample_id="SAMPLE_001",
            sample_code="S001",
            sample_name="Test Sample",
            db="GEOROC",
            rock_type="Basalt",
            tectonic_setting="Intraplate",
            oxides={
                "SIO2(WT%)": 54.5,
                "TIO2(WT%)": 1.2,
                "AL2O3(WT%)": 15.3
            },
            geometry=Geometry(type=GeometryType.Point, coordinates=[131.6, 34.5]),
            bbox=[131.6, 34.5, 131.6, 34.5]
        )
        assert sample.id == "69314de43ebcab2676a5558b"
        assert sample.sample_id == "SAMPLE_001"
        assert sample.db == "GEOROC"
        assert sample.rock_type == "Basalt"
    
    def test_minimal_sample(self):
        """Test creating a minimal sample with only required fields."""
        sample = Sample(
            _id="test_id",
            sample_id="SAMPLE_001",
            db="GEOROC",
            geometry=Geometry(type=GeometryType.Point, coordinates=[131.6, 34.5]),
            bbox=[131.6, 34.5, 131.6, 34.5]
        )
        assert sample.id == "test_id"
        assert sample.sample_id == "SAMPLE_001"
        assert sample.rock_type is None


class TestVolcanoModel:
    """Test Volcano model."""
    
    def test_complete_volcano(self):
        """Test creating a complete volcano."""
        volcano = Volcano(
            _id="69314dd33ebcab2676a466c2",
            volcano_number=283001,
            volcano_name="Abu",
            primary_volcano_type="Shield",
            country="Japan",
            elevation=641,
            tectonic_setting="Subduction zone",
            geometry=Geometry(type=GeometryType.Point, coordinates=[131.6, 34.5]),
            bbox=[131.6, 34.5, 131.6, 34.5]
        )
        assert volcano.id == "69314dd33ebcab2676a466c2"
        assert volcano.volcano_number == 283001
        assert volcano.volcano_name == "Abu"
        assert volcano.country == "Japan"


class TestEruptionModel:
    """Test Eruption model."""
    
    def test_complete_eruption(self):
        """Test creating a complete eruption."""
        eruption = Eruption(
            _id="69314dd63ebcab2676a46bed",
            eruption_number=22521,
            volcano_number=273030,
            volcano_name="Mayon",
            vei=4,
            eruption_category="Confirmed Eruption",
            geometry=Geometry(type=GeometryType.Point, coordinates=[123.685, 13.257]),
            bbox=[123.685, 13.257, 123.685, 13.257]
        )
        assert eruption.id == "69314dd63ebcab2676a46bed"
        assert eruption.eruption_number == 22521
        assert eruption.volcano_name == "Mayon"
        assert eruption.vei == 4


class TestGeoJSONModels:
    """Test GeoJSON response models."""
    
    def test_geojson_feature(self):
        """Test creating a GeoJSON Feature."""
        feature = GeoJSONFeature(
            id="test_id",
            geometry=Geometry(type=GeometryType.Point, coordinates=[131.6, 34.5]),
            properties={"volcano_name": "Abu", "volcano_number": 283001}
        )
        assert feature.type == "Feature"
        assert feature.id == "test_id"
        assert feature.properties["volcano_name"] == "Abu"
    
    def test_geojson_feature_collection(self):
        """Test creating a GeoJSON FeatureCollection."""
        features = [
            GeoJSONFeature(
                id=f"test_{i}",
                geometry=Geometry(type=GeometryType.Point, coordinates=[131.6 + i, 34.5]),
                properties={"name": f"Volcano {i}"}
            )
            for i in range(3)
        ]
        
        collection = GeoJSONFeatureCollection(features=features)
        assert collection.type == "FeatureCollection"
        assert len(collection.features) == 3
        assert collection.features[0].properties["name"] == "Volcano 0"


class TestPaginatedResponse:
    """Test PaginatedResponse model."""
    
    def test_paginated_response(self):
        """Test creating a paginated response."""
        samples = [
            Sample(
                _id=f"id_{i}",
                sample_id=f"SAMPLE_{i}",
                db="GEOROC",
                geometry=Geometry(type=GeometryType.Point, coordinates=[131.6, 34.5]),
                bbox=[131.6, 34.5, 131.6, 34.5]
            )
            for i in range(10)
        ]
        
        response = PaginatedResponse[Sample](
            data=samples,
            total=100,
            limit=10,
            offset=0,
            has_more=True
        )
        
        assert len(response.data) == 10
        assert response.total == 100
        assert response.limit == 10
        assert response.has_more is True


class TestVEIDistribution:
    """Test VEIDistribution model."""
    
    def test_vei_distribution(self):
        """Test creating a VEI distribution."""
        dist = VEIDistribution(
            volcano_number=273030,
            volcano_name="Mayon",
            vei_counts={0: 10, 1: 15, 2: 25, 3: 8, 4: 2},
            total_eruptions=60
        )
        
        assert dist.volcano_number == 273030
        assert dist.volcano_name == "Mayon"
        assert dist.vei_counts[2] == 25
        assert dist.total_eruptions == 60


class TestOxidesModel:
    """Test Oxides model with field aliases."""
    
    def test_oxides_with_parentheses(self):
        """Test that oxide field aliases work correctly."""
        oxides = Oxides(**{
            "SIO2(WT%)": 54.5,
            "TIO2(WT%)": 1.2,
            "AL2O3(WT%)": 15.3
        })
        
        assert oxides.SIO2 == 54.5
        assert oxides.TIO2 == 1.2
        assert oxides.AL2O3 == 15.3
    
    def test_oxides_optional_fields(self):
        """Test that all oxide fields are optional."""
        oxides = Oxides()
        assert oxides.SIO2 is None
        assert oxides.TIO2 is None
