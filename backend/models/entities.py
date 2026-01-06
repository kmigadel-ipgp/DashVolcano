"""
Pydantic models for API responses.

These models provide type safety and validation for all API data structures.
"""

from datetime import datetime
from typing import Optional, List, Any, Dict, Union
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
    SIO2: Optional[float] = None
    TIO2: Optional[float] = None
    AL2O3: Optional[float] = None
    FEOT: Optional[float] = None
    FE2O3: Optional[float] = None
    FEO: Optional[float] = None
    MNO: Optional[float] = None
    CAO: Optional[float] = None
    MGO: Optional[float] = None
    K2O: Optional[float] = None
    NA2O: Optional[float] = None
    P2O5: Optional[float] = None
    LOI: Optional[float] = None
    
    model_config = ConfigDict(populate_by_name=True)


class VolcanoInfo(BaseModel):
    """Volcano information in matching metadata."""
    name: str
    number: str
    dist_km: float


class MatchingScores(BaseModel):
    """Multi-dimensional matching scores."""
    sp: float = Field(description="Spatial score (0.0-1.0)")
    te: float = Field(description="Tectonic score (0.0-1.0)")
    ti: float = Field(description="Temporal score (0.0-1.0)")
    pe: float = Field(description="Petrological score (0.0-1.0)")
    final: float = Field(description="Final weighted score (0.0-1.0)")


class MatchingQuality(BaseModel):
    """Quality metrics for the match."""
    cov: float = Field(description="Coverage - proportion of dimensions evaluated (0.0-1.0)")
    unc: float = Field(description="Uncertainty level (0.0-1.0)")
    conf: str = Field(description="Confidence level: high, medium, low, or none")


class LiteratureEvidence(BaseModel):
    """Literature evidence for the match."""
    match: bool = Field(description="Whether literature match was found")
    type: str = Field(description="Type of match: explicit, partial, regional, or none")
    conf: float = Field(description="Confidence in literature match (0.0-1.0)")
    src: Optional[str] = Field(None, description="Source of match: title, abstract, or none")


class MatchingEvidence(BaseModel):
    """Evidence supporting the match."""
    lit: LiteratureEvidence


class MatchingExplanation(BaseModel):
    """Human-readable explanation of the match."""
    status: str = Field(description="Overall status: matched or rejected")
    r: List[str] = Field(description="Reasons for/against match (tokens)")
    f: List[str] = Field(default_factory=list, description="Flags indicating warnings or special cases")


class MatchingMeta(BaseModel):
    """Metadata about the matching process."""
    method: str = Field(description="Matching method used")
    ts: str = Field(description="Timestamp of matching (ISO 8601)")


class MatchingMetadata(BaseModel):
    """
    Complete volcano matching metadata for samples.
    
    This structure provides transparency about how samples were associated with volcanoes,
    including scores, quality metrics, evidence, and human-readable explanations.
    
    Structure variants:
    - With match: Contains volcano, scores, quality, evidence, expl, meta
    - Without match: Contains quality, evidence, expl, meta (no volcano/scores)
    
    Legacy fields (deprecated, for backward compatibility):
    - volcano_name, volcano_number, distance_km, confidence_level
    """
    # New nested structure (canonical)
    volcano: Optional[VolcanoInfo] = Field(None, description="Associated volcano (only if matched)")
    scores: Optional[MatchingScores] = Field(None, description="Matching scores (only if matched)")
    quality: MatchingQuality = Field(description="Quality metrics (always present)")
    evidence: MatchingEvidence = Field(description="Evidence supporting the match (always present)")
    expl: MatchingExplanation = Field(description="Human-readable explanation (always present)")
    meta: MatchingMeta = Field(description="Metadata about matching process (always present)")
    
    # Legacy fields (deprecated, for backward compatibility during transition)
    volcano_name: Optional[str] = Field(None, description="DEPRECATED: Use volcano.name")
    volcano_number: Optional[Union[int, str]] = Field(None, description="DEPRECATED: Use volcano.number")
    distance_km: Optional[float] = Field(None, description="DEPRECATED: Use volcano.dist_km")
    confidence_level: Optional[Union[str, int]] = Field(None, description="DEPRECATED: Use quality.conf")


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
