"""
Pydantic models for API responses.

These models provide type safety and validation for all API data structures.
"""

from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, field_validator, ConfigDict
from enum import Enum


class GeometryType(str, Enum):
    """GeoJSON geometry types."""
    Point = "Point"
    LineString = "LineString"
    Polygon = "Polygon"
    MultiPoint = "MultiPoint"
    MultiLineString = "MultiLineString"
    MultiPolygon = "MultiPolygon"


class Geometry(BaseModel):
    """GeoJSON geometry model."""
    type: GeometryType
    coordinates: List[float] | List[List[float]] | List[List[List[float]]]
    
    model_config = ConfigDict(use_enum_values=True)
    
    @field_validator('coordinates')
    @classmethod
    def validate_coordinates(cls, v, info):
        """Validate coordinate ranges."""
        geom_type = info.data.get('type')
        
        if geom_type == GeometryType.Point:
            if len(v) < 2:
                raise ValueError("Point coordinates must have at least [lon, lat]")
            lon, lat = v[0], v[1]
            if not (-180 <= lon <= 180):
                raise ValueError(f"Longitude must be between -180 and 180, got {lon}")
            if not (-90 <= lat <= 90):
                raise ValueError(f"Latitude must be between -90 and 90, got {lat}")
        
        return v


class DateInfo(BaseModel):
    """Date information with uncertainty."""
    year: Optional[int] = None
    month: Optional[int] = None
    day: Optional[int] = None
    uncertainty_days: Optional[int] = None
    iso8601: Optional[str] = None


class GeologicalAge(BaseModel):
    """Geological age information."""
    age: Optional[str] = None
    age_prefix: Optional[str] = None
    age_min: Optional[float] = None
    age_max: Optional[float] = None


class Oxides(BaseModel):
    """Chemical oxide composition (weight %)."""
    SIO2: Optional[float] = Field(None, alias="SIO2(WT%)")
    TIO2: Optional[float] = Field(None, alias="TIO2(WT%)")
    AL2O3: Optional[float] = Field(None, alias="AL2O3(WT%)")
    FEOT: Optional[float] = Field(None, alias="FEOT(WT%)")
    FE2O3: Optional[float] = Field(None, alias="FE2O3(WT%)")
    FEO: Optional[float] = Field(None, alias="FEO(WT%)")
    MNO: Optional[float] = Field(None, alias="MNO(WT%)")
    CAO: Optional[float] = Field(None, alias="CAO(WT%)")
    MGO: Optional[float] = Field(None, alias="MGO(WT%)")
    K2O: Optional[float] = Field(None, alias="K2O(WT%)")
    NA2O: Optional[float] = Field(None, alias="NA2O(WT%)")
    P2O5: Optional[float] = Field(None, alias="P2O5(WT%)")
    LOI: Optional[float] = Field(None, alias="LOI(WT%)")
    
    model_config = ConfigDict(populate_by_name=True)


class MatchingMetadata(BaseModel):
    """Volcano matching metadata for samples."""
    volcano_name: Optional[str] = None
    volcano_number: Optional[str] = None
    distance_km: Optional[float] = None
    confidence_level: Optional[str] = None
    refined_score: Optional[float] = None
    final_decision: Optional[str] = None
    rejection_reasons: Optional[str] = None
    match_reasons: Optional[str] = None
    match_timestamp: Optional[str] = None


class Rocks(BaseModel):
    """Major rock types for volcano."""
    maj_1: Optional[str] = None
    maj_2: Optional[str] = None
    maj_3: Optional[str] = None


class Sample(BaseModel):
    """Rock sample model."""
    id: str = Field(alias="_id")
    sample_id: str
    sample_code: Optional[str] = None
    sample_name: Optional[str] = None
    citations: Optional[str] = None
    references: Optional[str] = None
    db: str
    geographic_location: Optional[str] = None
    material: Optional[str] = None
    rock_type: Optional[str] = None
    tectonic_setting: Optional[str] = None
    geological_age: Optional[GeologicalAge] = None
    eruption_date: Optional[DateInfo] = None
    oxides: Optional[Oxides] = None
    matching_metadata: Optional[MatchingMetadata] = None
    geometry: Geometry
    bbox: List[float]
    
    model_config = ConfigDict(populate_by_name=True)


class Volcano(BaseModel):
    """Volcano model."""
    id: str = Field(alias="_id")
    volcano_number: int
    volcano_name: str
    primary_volcano_type: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    subregion: Optional[str] = None
    elevation: Optional[int] = None
    tectonic_setting: Optional[str] = None
    evidence_category: Optional[str] = None
    rocks: Optional[Rocks] = None
    geometry: Geometry
    bbox: List[float]
    
    model_config = ConfigDict(populate_by_name=True)


class Eruption(BaseModel):
    """Eruption model."""
    id: str = Field(alias="_id")
    eruption_number: int
    volcano_number: int
    volcano_name: str
    start_date: Optional[DateInfo] = None
    end_date: Optional[DateInfo] = None
    eruption_category: Optional[str] = None
    area_of_activity: Optional[str] = None
    vei: Optional[int] = None
    evidence_method_dating: Optional[str] = None
    geometry: Geometry
    bbox: List[float]
    
    model_config = ConfigDict(populate_by_name=True)
    
    @field_validator('vei')
    @classmethod
    def validate_vei(cls, v):
        """Validate VEI is between 0 and 8."""
        if v is not None and not (0 <= v <= 8):
            raise ValueError(f"VEI must be between 0 and 8, got {v}")
        return v


class Event(BaseModel):
    """Volcanic event model (for timeline/activity tracking)."""
    id: str = Field(alias="_id")
    volcano_number: int
    volcano_name: str
    event_type: str  # "eruption", "observation", "seismic", etc.
    event_date: DateInfo
    description: Optional[str] = None
    vei: Optional[int] = None
    
    model_config = ConfigDict(populate_by_name=True)
    
    @field_validator('vei')
    @classmethod
    def validate_vei(cls, v):
        """Validate VEI is between 0 and 8."""
        if v is not None and not (0 <= v <= 8):
            raise ValueError(f"VEI must be between 0 and 8, got {v}")
        return v
