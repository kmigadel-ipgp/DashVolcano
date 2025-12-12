"""
Spatial router - API endpoints for spatial queries
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import JSONResponse
from pymongo.database import Database
from typing import List, Dict, Any
import json
from pathlib import Path

from backend.dependencies import get_database

router = APIRouter()

# Load tectonic plate data at module level for caching
TECTONIC_DATA_PATH = Path(__file__).parent.parent.parent / "data" / "tectonicplates"


@router.get("/bounds")
async def get_samples_in_bounds(
    db: Database = Depends(get_database),
    min_lon: float = Query(..., description="Minimum longitude"),
    min_lat: float = Query(..., description="Minimum latitude"),
    max_lon: float = Query(..., description="Maximum longitude"),
    max_lat: float = Query(..., description="Maximum latitude"),
    limit: int = Query(5000, le=10000)
):
    """
    Get samples within a bounding box
    Uses $geoIntersects with Polygon for proper 2dsphere index usage
    """
    query = {
        "geometry": {
            "$geoIntersects": {
                "$geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [min_lon, min_lat],  # Southwest
                        [max_lon, min_lat],  # Southeast
                        [max_lon, max_lat],  # Northeast
                        [min_lon, max_lat],  # Northwest
                        [min_lon, min_lat]   # Close polygon
                    ]]
                }
            }
        }
    }
    
    samples = list(db.samples.find(query).limit(limit))
    
    for sample in samples:
        if "_id" in sample:
            sample["_id"] = str(sample["_id"])
    
    return {
        "count": len(samples),
        "bounds": {
            "min_lon": min_lon,
            "min_lat": min_lat,
            "max_lon": max_lon,
            "max_lat": max_lat
        },
        "data": samples
    }


@router.get("/tectonic-plates")
async def get_tectonic_plates():
    """
    Get tectonic plate boundaries as GeoJSON FeatureCollection.
    
    Returns plate polygons from PB2002 plate boundary model.
    """
    try:
        plates_file = TECTONIC_DATA_PATH / "PB2002_plates.json"
        
        if not plates_file.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Tectonic plates data file not found: {plates_file}"
            )
        
        with open(plates_file, 'r') as f:
            plates_data = json.load(f)
        
        return JSONResponse(content=plates_data)
    
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error parsing tectonic plates data: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading tectonic plates: {str(e)}"
        )


def _parse_gmt_file(file_path: Path) -> List[Dict[str, Any]]:
    """
    Parse GMT file format into GeoJSON LineString features.
    
    GMT format:
    > segment_id segment_name
    lon1 lat1
    lon2 lat2
    ...
    > next_segment_id next_segment_name
    ...
    """
    features = []
    current_coordinates = []
    current_properties = {}
    
    with open(file_path, 'r') as f:
        for line in f:
            line = line.strip()
            
            if not line:
                continue
            
            if line.startswith('>'):
                # Save previous feature if exists
                if current_coordinates:
                    features.append({
                        "type": "Feature",
                        "properties": current_properties,
                        "geometry": {
                            "type": "LineString",
                            "coordinates": current_coordinates
                        }
                    })
                
                # Start new feature
                parts = line[1:].strip().split(maxsplit=1)
                segment_id = parts[0] if parts else ""
                segment_name = parts[1] if len(parts) > 1 else ""
                
                current_properties = {
                    "id": segment_id,
                    "name": segment_name
                }
                current_coordinates = []
            else:
                # Parse coordinate line
                try:
                    parts = line.split()
                    if len(parts) >= 2:
                        lon = float(parts[0])
                        lat = float(parts[1])
                        current_coordinates.append([lon, lat])
                except (ValueError, IndexError):
                    continue
        
        # Save last feature
        if current_coordinates:
            features.append({
                "type": "Feature",
                "properties": current_properties,
                "geometry": {
                    "type": "LineString",
                    "coordinates": current_coordinates
                }
            })
    
    return features


@router.get("/tectonic-boundaries")
async def get_tectonic_boundaries(
    boundary_type: str = Query(
        None,
        description="Type of boundary: 'ridge', 'trench', 'transform', or 'all'",
        pattern="^(ridge|trench|transform|all)$"
    )
):
    """
    Get tectonic plate boundaries (ridges, trenches, transforms) as GeoJSON.
    
    Query parameters:
    - boundary_type: Type of boundary to return (default: all)
    
    Returns GeoJSON FeatureCollection of LineString features.
    """
    try:
        all_features = []
        
        if boundary_type is None or boundary_type == "all":
            types_to_load = ["ridge", "trench", "transform"]
        else:
            types_to_load = [boundary_type]
        
        for btype in types_to_load:
            file_path = TECTONIC_DATA_PATH / f"{btype}.gmt"
            
            if not file_path.exists():
                continue
            
            features = _parse_gmt_file(file_path)
            
            # Add boundary type to properties
            for feature in features:
                feature["properties"]["boundary_type"] = btype
            
            all_features.extend(features)
        
        if not all_features:
            raise HTTPException(
                status_code=404,
                detail=f"No tectonic boundary data found for type: {boundary_type}"
            )
        
        geojson = {
            "type": "FeatureCollection",
            "features": all_features
        }
        
        return JSONResponse(content=geojson)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading tectonic boundaries: {str(e)}"
        )
