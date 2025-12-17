"""
Response models for API endpoints.

These models define the structure of API responses including GeoJSON,
pagination, and aggregated data formats.
"""

from typing import List, Optional, Any, Dict, Generic, TypeVar
from pydantic import BaseModel, Field, ConfigDict
from .entities import Sample, Volcano, Eruption, Geometry


T = TypeVar('T')


class GeoJSONProperties(BaseModel):
    """Generic properties for GeoJSON features."""
    model_config = ConfigDict(extra='allow')


class GeoJSONFeature(BaseModel):
    """GeoJSON Feature model."""
    type: str = "Feature"
    id: Optional[str] = None
    geometry: Geometry
    properties: Dict[str, Any]
    bbox: Optional[List[float]] = None


class GeoJSONFeatureCollection(BaseModel):
    """GeoJSON FeatureCollection model."""
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]
    bbox: Optional[List[float]] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [131.6, 34.5]
                        },
                        "properties": {
                            "volcano_name": "Abu",
                            "volcano_number": 283001,
                            "country": "Japan"
                        }
                    }
                ]
            }
        }
    )


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response model."""
    data: List[T]
    total: int
    limit: int
    offset: int
    has_more: bool
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "data": [],
                "total": 1000,
                "limit": 100,
                "offset": 0,
                "has_more": True
            }
        }
    )


class AggregatedData(BaseModel):
    """Generic aggregated data response."""
    field: str
    values: List[Dict[str, Any]]
    total_count: int
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "field": "rock_type",
                "values": [
                    {"value": "Basalt", "count": 45000},
                    {"value": "Andesite", "count": 30000}
                ],
                "total_count": 100000
            }
        }
    )


class VEIDistribution(BaseModel):
    """VEI distribution for a volcano."""
    volcano_number: int
    volcano_name: str
    vei_counts: Dict[int, int]  # {vei: count}
    total_eruptions: int
    date_range: Optional[Dict[str, str]] = None  # {"start": "2000-01-01", "end": "2023-12-31"}
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "volcano_number": 273030,
                "volcano_name": "Mayon",
                "vei_counts": {
                    "0": 10,
                    "1": 15,
                    "2": 25,
                    "3": 8,
                    "4": 2
                },
                "total_eruptions": 60,
                "date_range": {
                    "start": "1616-07-22",
                    "end": "2023-06-06"
                }
            }
        }
    )


class ChemicalAnalysis(BaseModel):
    """Chemical analysis data for plotting."""
    volcano_number: int
    volcano_name: str
    samples_count: int
    tas_data: List[Dict[str, float]]  # List of {SiO2, Na2O+K2O, sample_id}
    afm_data: Optional[List[Dict[str, float]]] = None  # List of {A, F, M, sample_id}
    rock_types: Dict[str, int]  # Rock type distribution
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "volcano_number": 283001,
                "volcano_name": "Abu",
                "samples_count": 150,
                "tas_data": [
                    {"SiO2": 54.5, "Na2O_K2O": 3.2, "sample_id": "SAMPLE_001"},
                    {"SiO2": 58.3, "Na2O_K2O": 4.1, "sample_id": "SAMPLE_002"}
                ],
                "rock_types": {
                    "Basalt": 80,
                    "Andesite": 70
                }
            }
        }
    )


class TimelineData(BaseModel):
    """Timeline data for volcano eruptions and samples."""
    volcano_number: int
    volcano_name: str
    eruptions: List[Dict[str, Any]]  # Eruption timeline entries
    samples: List[Dict[str, Any]]  # Sample timeline entries
    date_range: Dict[str, str]
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "volcano_number": 273030,
                "volcano_name": "Mayon",
                "eruptions": [
                    {
                        "eruption_number": 22521,
                        "start_date": "2023-04-27",
                        "end_date": "2023-06-06",
                        "vei": None,
                        "uncertainty_days": 2
                    }
                ],
                "samples": [],
                "date_range": {
                    "start": "1616-07-22",
                    "end": "2023-06-06"
                }
            }
        }
    )


class SpatialAggregation(BaseModel):
    """Spatial aggregation for map clustering."""
    zoom_level: int
    clusters: List[Dict[str, Any]]
    total_points: int
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "zoom_level": 5,
                "clusters": [
                    {
                        "centroid": [131.6, 34.5],
                        "count": 1500,
                        "bounds": [[131.0, 34.0], [132.0, 35.0]]
                    }
                ],
                "total_points": 100000
            }
        }
    )


class MetadataResponse(BaseModel):
    """Metadata response for filters."""
    field: str
    values: List[str]
    counts: Optional[Dict[str, int]] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "field": "countries",
                "values": ["Japan", "Indonesia", "USA"],
                "counts": {
                    "Japan": 15000,
                    "Indonesia": 25000,
                    "USA": 8000
                }
            }
        }
    )


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    database: Optional[str] = None
    timestamp: Optional[str] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "healthy",
                "version": "3.0.0",
                "database": "connected",
                "timestamp": "2025-12-04T12:00:00Z"
            }
        }
    )


class ErrorResponse(BaseModel):
    """Error response model."""
    detail: str
    status_code: int
    timestamp: Optional[str] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "detail": "Sample not found",
                "status_code": 404,
                "timestamp": "2025-12-04T12:00:00Z"
            }
        }
    )
