"""
Samples router - API endpoints for rock sample data
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from pymongo.database import Database
from bson import ObjectId
from typing import Optional, List

from backend.dependencies import get_database

router = APIRouter()


@router.get("/")
async def get_samples(
    db: Database = Depends(get_database),
    rock_type: Optional[str] = Query(None, description="Filter by rock type (comma-separated for multiple)"),
    database: Optional[str] = Query(None, description="Filter by database (GEOROC, PetDB, GVP)"),
    tectonic_setting: Optional[str] = Query(None, description="Filter by tectonic setting (comma-separated for multiple)"),
    min_sio2: Optional[float] = Query(None, description="Minimum SiO2 content (%)"),
    max_sio2: Optional[float] = Query(None, description="Maximum SiO2 content (%)"),
    volcano_number: Optional[str] = Query(None, description="Filter by volcano number"),
    limit: Optional[int] = Query(None, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Pagination offset")
):
    """
    Get list of rock samples with optional filters
    """
    query = {}
    sio2_field = "oxides.SIO2(WT%)"
    
    # Rock type filter - support multiple values with OR logic
    if rock_type:
        rock_types = [rt.strip() for rt in rock_type.split(',')]
        if len(rock_types) > 1:
            query["rock_type"] = {"$in": rock_types}
        else:
            query["rock_type"] = rock_types[0]
    
    if database:
        query["db"] = database
    
    # Tectonic setting filter - support multiple values with OR logic
    if tectonic_setting:
        settings = [s.strip() for s in tectonic_setting.split(',')]
        if len(settings) > 1:
            query["tectonic_setting"] = {"$in": settings}
        else:
            query["tectonic_setting"] = settings[0]
    
    # SiO2 filter - only apply if samples have oxides data
    if min_sio2 is not None or max_sio2 is not None:
        sio2_filter = {"$exists": True, "$ne": None}
        if min_sio2 is not None:
            sio2_filter["$gte"] = min_sio2
        if max_sio2 is not None:
            sio2_filter["$lte"] = max_sio2
        query[sio2_field] = sio2_filter
    
    if volcano_number:
        query["matching_metadata.volcano_number"] = volcano_number
    
    # Project only necessary fields for performance
    projection = {
        "_id": 1,
        "sample_id": 1,
        "sample_code": 1,
        "rock_type": 1,
        "db": 1,
        "geometry": 1,
        "oxides": 1,
        "tectonic_setting": 1,
        "references": 1,
        "geographic_location": 1,
        "material": 1,
        "matching_metadata": 1
    }
    
    # Build query with optional limit and offset
    cursor = db.samples.find(query, projection)
    if limit is not None:
        cursor = cursor.limit(limit)
    if offset > 0:
        cursor = cursor.skip(offset)
    
    samples = list(cursor)
    
    # Convert ObjectId to string for JSON serialization
    for sample in samples:
        if "_id" in sample:
            sample["_id"] = str(sample["_id"])
    
    return {
        "count": len(samples),
        "limit": limit,
        "offset": offset,
        "data": samples
    }


@router.get("/{id}")
async def get_sample_by_id(
    id: str,
    db: Database = Depends(get_database)
):
    """
    Get a single sample by MongoDB _id
    """
    try:
        object_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid sample ID format")
    
    sample = db.samples.find_one({"_id": object_id})
    
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    if "_id" in sample:
        sample["_id"] = str(sample["_id"])
    
    return sample


@router.get("/geojson/")
async def get_samples_geojson(
    db: Database = Depends(get_database),
    rock_type: Optional[str] = Query(None),
    database: Optional[str] = Query(None),
    limit: Optional[int] = Query(None)
):
    """
    Get samples in GeoJSON format for map visualization
    """
    query = {}
    
    if rock_type:
        query["rock_type"] = rock_type
    if database:
        query["db"] = database
    
    # Build query with optional limit
    cursor = db.samples.find(query)
    if limit is not None:
        cursor = cursor.limit(limit)
    
    samples = list(cursor)
    
    features = []
    for sample in samples:
        if "geometry" in sample:
            features.append({
                "type": "Feature",
                "geometry": sample["geometry"],
                "properties": {
                    "sample_id": sample.get("sample_id"),
                    "rock_type": sample.get("rock_type"),
                    "db": sample.get("db"),
                }
            })
    
    return {
        "type": "FeatureCollection",
        "features": features
    }
