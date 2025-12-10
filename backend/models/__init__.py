"""
Pydantic models for DashVolcano API.

This module exports all data models and response models used throughout the API.
"""

from .entities import (
    Sample,
    Volcano,
    Eruption,
    Event,
    Geometry,
    GeometryType,
    DateInfo,
    GeologicalAge,
    Oxides,
    MatchingMetadata,
    Rocks
)

from .responses import (
    GeoJSONFeature,
    GeoJSONFeatureCollection,
    PaginatedResponse,
    AggregatedData,
    VEIDistribution,
    ChemicalAnalysis,
    TimelineData,
    SpatialAggregation,
    MetadataResponse,
    HealthResponse,
    ErrorResponse
)

__all__ = [
    # Entities
    'Sample',
    'Volcano',
    'Eruption',
    'Event',
    'Geometry',
    'GeometryType',
    'DateInfo',
    'GeologicalAge',
    'Oxides',
    'MatchingMetadata',
    'Rocks',
    # Responses
    'GeoJSONFeature',
    'GeoJSONFeatureCollection',
    'PaginatedResponse',
    'AggregatedData',
    'VEIDistribution',
    'ChemicalAnalysis',
    'TimelineData',
    'SpatialAggregation',
    'MetadataResponse',
    'HealthResponse',
    'ErrorResponse',
]
