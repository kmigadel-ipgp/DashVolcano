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
    bbox: Optional[str] = Query(
        None, 
        description="Bounding box as 'min_lon,min_lat,max_lon,max_lat' (e.g., '-10,35,20,60')",
        pattern=r"^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$"
    ),
    limit: Optional[int] = Query(None, ge=1, le=100000, description="Maximum number of results (default: None = no limit, max: 100000)"),
    offset: int = Query(0, ge=0, description="Pagination offset")
):
    """
    Get list of rock samples with optional filters.
    
    Bounding box format: min_lon,min_lat,max_lon,max_lat
    Example: bbox=-10,35,20,60 (covers Western Europe)
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
    
    # Bounding box filter - MongoDB geospatial query
    if bbox:
        try:
            coords = [float(x) for x in bbox.split(',')]
            if len(coords) != 4:
                raise HTTPException(status_code=400, detail="bbox must have 4 values: min_lon,min_lat,max_lon,max_lat")
            
            min_lon, min_lat, max_lon, max_lat = coords
            
            # Validate coordinate ranges
            if not (-180 <= min_lon <= 180 and -180 <= max_lon <= 180):
                raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")
            if not (-90 <= min_lat <= 90 and -90 <= max_lat <= 90):
                raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
            if min_lon >= max_lon:
                raise HTTPException(status_code=400, detail="min_lon must be less than max_lon")
            if min_lat >= max_lat:
                raise HTTPException(status_code=400, detail="min_lat must be less than max_lat")
            
            # MongoDB geospatial query using $geoIntersects with $geometry (Polygon)
            # $geoIntersects uses the 2dsphere index efficiently (unlike $geoWithin)
            # Note: MongoDB uses [longitude, latitude] order
            query["geometry"] = {
                "$geoIntersects": {
                    "$geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [min_lon, min_lat],  # Southwest corner
                            [max_lon, min_lat],  # Southeast corner
                            [max_lon, max_lat],  # Northeast corner
                            [min_lon, max_lat],  # Northwest corner
                            [min_lon, min_lat]   # Close the polygon
                        ]]
                    }
                }
            }
        except ValueError as e:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid bbox format. Use: min_lon,min_lat,max_lon,max_lat. Error: {str(e)}"
            )
    
    # Project only necessary fields for performance
    # Minimize data transfer by excluding large nested objects unless specifically needed
    projection = {
        "_id": 1,
        "sample_id": 1,
        "rock_type": 1,
        "db": 1,
        "geometry": 1,
        "tectonic_setting": 1,
        "material": 1,
        "matching_metadata.volcano_number": 1,
        "matching_metadata.volcano_name": 1,
        "matching_metadata.distance_km": 1,
        "matching_metadata.confidence_level": 1,  # CRITICAL: Data quality indicator
        "references": 1,
        # Include key oxides for TAS/AFM plots (only what's needed)
        "oxides.SIO2(WT%)": 1,
        "oxides.NA2O(WT%)": 1,
        "oxides.K2O(WT%)": 1,
        "oxides.MGO(WT%)": 1,
        "oxides.FE2O3(WT%)": 1,
        "oxides.FEOT(WT%)": 1,
        "oxides.CAO(WT%)": 1,
        "oxides.AL2O3(WT%)": 1,
        "oxides.TIO2(WT%)": 1,
        "oxides.P2O5(WT%)": 1,
        "oxides.MNO(WT%)": 1
    }
    
    # Build query with limit and offset
    # Use larger batch size (10000) to reduce network round-trips to MongoDB Atlas
    cursor = db.samples.find(query, projection)
    if limit is not None:
        cursor = cursor.limit(limit)
    if offset > 0:
        cursor = cursor.skip(offset)
    cursor = cursor.batch_size(10000)
    
    samples = list(cursor)
    
    # Convert ObjectId to string for JSON serialization
    for sample in samples:
        if "_id" in sample:
            sample["_id"] = str(sample["_id"])
    
    # Get total count for the query (useful for pagination)
    total_count = db.samples.count_documents(query)
    
    return {
        "count": len(samples),
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "bbox": bbox,
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
