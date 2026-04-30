"""
Samples router - API endpoints for rock sample data
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from pymongo.database import Database
from bson import ObjectId
from typing import Optional, List

from backend.dependencies import get_database
from backend.services.sample_filters import build_sample_match_query

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
    query = build_sample_match_query(
        rock_type=rock_type,
        database=database,
        tectonic_setting=tectonic_setting,
        min_sio2=min_sio2,
        max_sio2=max_sio2,
        volcano_number=volcano_number,
        bbox=bbox,
    )
    
    # Project only necessary fields for performance
    # Minimize data transfer by excluding large nested objects unless specifically needed
    projection = {
        "_id": 1,
        "sample_id": 1,
        "sample_code": 1,
        "petro": 1,
        "db": 1,
        "geometry": 1,
        "tecto": 1,
        "material": 1,
        "matching_metadata": 1,  # Include full matching_metadata structure
        "references": 1,
        "geo_age": 1,  # Include temporal data for score explanations
        "eruption_date": 1,   # Include eruption date for temporal calculations
        # Include key oxides for TAS/AFM plots (only what's needed)
        # Support both structures: oxides in nested object or at root level
        "oxides.SIO2": 1,
        "oxides.NA2O": 1,
        "oxides.K2O": 1,
        "oxides.MGO": 1,
        "oxides.FE2O3": 1,
        "oxides.FEOT": 1,
        "oxides.CAO": 1,
        "oxides.AL2O3": 1,
        "oxides.TIO2": 1,
        "oxides.P2O5": 1,
        "oxides.MNO": 1,
        # Also include root-level oxide fields (some samples store oxides at root)
        "SIO2": 1,
        "NA2O": 1,
        "K2O": 1,
        "MGO": 1,
        "FE2O3": 1,
        "FEOT": 1,
        "CAO": 1,
        "AL2O3": 1,
        "TIO2": 1,
        "P2O5": 1,
        "MNO": 1
    }
    
    # Use aggregation pipeline to enrich samples with volcano rock_type via lookup
    pipeline = [
        {"$match": query},
        {"$skip": offset},
    ]
    
    if limit is not None:
        pipeline.append({"$limit": limit})
    
    # Add lookup to join with volcanoes collection to get rock_type
    pipeline.extend([
        {
            "$lookup": {
                "from": "volcanoes",
                "let": {"volcano_number": "$matching_metadata.volcano.number"},
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$eq": [{"$toString": "$volcano_number"}, "$$volcano_number"]
                            }
                        }
                    },
                    {"$project": {"petro": 1, "_id": 0}}
                ],
                "as": "volcano_info"
            }
        },
        {
            "$addFields": {
                "matching_metadata.volcano.petro": {
                    "$cond": {
                        "if": {"$gt": [{"$size": "$volcano_info"}, 0]},
                        "then": {"$arrayElemAt": ["$volcano_info.petro", 0]},
                        "else": None
                    }
                }
            }
        },
        {"$project": projection},  # Apply projection
        {"$unset": "volcano_info"}  # Remove temporary field after projection
    ])
    
    # Execute aggregation pipeline
    samples = list(db.samples.aggregate(pipeline, batchSize=10000))
    
    # Normalize oxide structure: ensure all oxides are in 'oxides' object
    oxide_fields = ['SIO2', 'NA2O', 'K2O', 'MGO', 'FE2O3', 'FEOT', 'CAO', 'AL2O3', 'TIO2', 'P2O5', 'MNO']
    for sample in samples:
        # Convert ObjectId to string for JSON serialization
        if "_id" in sample:
            sample["_id"] = str(sample["_id"])
        
        # Normalize oxides: if oxides are at root level, move them to 'oxides' object
        if not sample.get("oxides"):
            sample["oxides"] = {}
        
        for oxide in oxide_fields:
            # If oxide exists at root level, move it to oxides object
            if oxide in sample and sample[oxide] is not None:
                if oxide not in sample["oxides"] or sample["oxides"][oxide] is None:
                    sample["oxides"][oxide] = sample[oxide]
                # Remove from root level to avoid duplication
                del sample[oxide]
    
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
        query["petro.rock_type"] = rock_type
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
                    "rock_type": sample.get("petro", {}).get("rock_type") if isinstance(sample.get("petro"), dict) else None,
                    "db": sample.get("db"),
                }
            })
    
    return {
        "type": "FeatureCollection",
        "features": features
    }
