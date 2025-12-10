"""
Volcanoes router - API endpoints for volcano data
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from pymongo.database import Database
from typing import Optional

from backend.dependencies import get_database

router = APIRouter()


@router.get("/")
async def get_volcanoes(
    db: Database = Depends(get_database),
    country: Optional[str] = Query(None, description="Filter by country"),
    region: Optional[str] = Query(None, description="Filter by region"),
    tectonic_setting: Optional[str] = Query(None, description="Filter by tectonic setting"),
    volcano_name: Optional[str] = Query(None, description="Filter by volcano name"),
    limit: int = Query(1000, le=10000),
    offset: int = Query(0, ge=0)
):
    """
    Get list of volcanoes with optional filters
    """
    query = {}
    
    # Case-insensitive regex match for country
    if country:
        query["country"] = {"$regex": country, "$options": "i"}
    
    # Case-insensitive regex match for region
    if region:
        query["region"] = {"$regex": region, "$options": "i"}
    
    if tectonic_setting:
        query["tectonic_setting"] = tectonic_setting
    
    # Exact match for volcano name
    if volcano_name:
        query["volcano_name"] = volcano_name
    
    volcanoes = list(db.volcanoes.find(query).limit(limit).skip(offset))
    
    for volcano in volcanoes:
        if "_id" in volcano:
            volcano["_id"] = str(volcano["_id"])
    
    return {
        "count": len(volcanoes),
        "limit": limit,
        "offset": offset,
        "data": volcanoes
    }


@router.get("/{volcano_number}")
async def get_volcano_by_number(
    volcano_number: str,
    db: Database = Depends(get_database)
):
    """
    Get a single volcano by volcano number
    """
    try:
        volcano_num = int(volcano_number)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid volcano number format")
    
    volcano = db.volcanoes.find_one({"volcano_number": volcano_num})
    
    if not volcano:
        raise HTTPException(status_code=404, detail="Volcano not found")
    
    if "_id" in volcano:
        volcano["_id"] = str(volcano["_id"])
    
    return volcano


@router.get("/geojson/")
async def get_volcanoes_geojson(
    db: Database = Depends(get_database),
    country: Optional[str] = Query(None),
    limit: int = Query(1000, le=10000)
):
    """
    Get volcanoes in GeoJSON format for map visualization
    """
    query = {}
    
    if country:
        query["country"] = country
    
    volcanoes = list(db.volcanoes.find(query).limit(limit))
    
    features = []
    for volcano in volcanoes:
        if "geometry" in volcano:
            features.append({
                "type": "Feature",
                "geometry": volcano["geometry"],
                "properties": {
                    "volcano_number": volcano.get("volcano_number"),
                    "volcano_name": volcano.get("volcano_name"),
                    "country": volcano.get("country"),
                    "elevation": volcano.get("elevation"),
                    "primary_volcano_type": volcano.get("primary_volcano_type"),
                }
            })
    
    return {
        "type": "FeatureCollection",
        "features": features
    }


@router.get("/{volcano_number}/vei-distribution")
async def get_volcano_vei_distribution(
    volcano_number: str,
    db: Database = Depends(get_database)
):
    """
    Get VEI (Volcanic Explosivity Index) distribution for a volcano.
    
    Returns counts of eruptions by VEI level (0-8) for the specified volcano.
    """
    try:
        volcano_num = int(volcano_number)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid volcano number format")
    
    # Check if volcano exists
    volcano = db.volcanoes.find_one({"volcano_number": volcano_num})
    if not volcano:
        raise HTTPException(status_code=404, detail="Volcano not found")
    
    # Get all eruptions for this volcano
    eruptions = list(db.eruptions.find({"volcano_number": volcano_num}))
    
    if not eruptions:
        return {
            "volcano_number": volcano_num,
            "volcano_name": volcano.get("volcano_name", "Unknown"),
            "vei_counts": {},
            "total_eruptions": 0,
            "date_range": None
        }
    
    # Count eruptions by VEI
    vei_counts = {}
    dates = []
    
    for eruption in eruptions:
        vei = eruption.get("vei")
        
        # Count VEI (including None/unknown)
        vei_key = str(vei) if vei is not None else "unknown"
        vei_counts[vei_key] = vei_counts.get(vei_key, 0) + 1
        
        # Collect dates
        if eruption.get("start_date") and eruption["start_date"].get("iso8601"):
            dates.append(eruption["start_date"]["iso8601"])
    
    # Determine date range
    date_range = None
    if dates:
        dates.sort()
        date_range = {
            "start": dates[0],
            "end": dates[-1]
        }
    
    return {
        "volcano_number": volcano_num,
        "volcano_name": volcano.get("volcano_name", "Unknown"),
        "vei_counts": vei_counts,
        "total_eruptions": len(eruptions),
        "date_range": date_range
    }


@router.get("/{volcano_number}/chemical-analysis")
async def get_volcano_chemical_analysis(
    volcano_number: str,
    db: Database = Depends(get_database),
    limit: int = Query(5000, le=10000)
):
    """
    Get chemical analysis data for a volcano (TAS and AFM diagram data).
    
    Returns oxide composition data for samples associated with this volcano.
    Frontend can use this to generate TAS and AFM plots.
    """
    try:
        volcano_num = int(volcano_number)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid volcano number format")
    
    # Check if volcano exists
    volcano = db.volcanoes.find_one({"volcano_number": volcano_num})
    if not volcano:
        raise HTTPException(status_code=404, detail="Volcano not found")
    
    # Get samples for this volcano (via matching_metadata)
    samples = list(db.samples.find({
        "matching_metadata.volcano_number": str(volcano_num)
    }).limit(limit))
    
    if not samples:
        return {
            "volcano_number": volcano_num,
            "volcano_name": volcano.get("volcano_name", "Unknown"),
            "samples_count": 0,
            "tas_data": [],
            "afm_data": [],
            "rock_types": {}
        }
    
    tas_data = []
    afm_data = []
    rock_types = {}
    
    for sample in samples:
        oxides = sample.get("oxides", {})
        
        if not oxides:
            continue
        
        # Extract oxide values
        sio2 = oxides.get("SIO2(WT%)")
        na2o = oxides.get("NA2O(WT%)")
        k2o = oxides.get("K2O(WT%)")
        feot = oxides.get("FEOT(WT%)")
        mgo = oxides.get("MGO(WT%)")
        
        sample_code = str(sample.get("sample_code", ""))
        rock_type = sample.get("rock_type", "Unknown")
        
        # Count rock types
        rock_types[rock_type] = rock_types.get(rock_type, 0) + 1
        
        # TAS data (needs SiO2, Na2O, K2O)
        if sio2 is not None and na2o is not None and k2o is not None:
            tas_data.append({
                "sample_code": sample_code,
                "SiO2": round(sio2, 2),
                "Na2O": round(na2o, 2),
                "K2O": round(k2o, 2),
                "Na2O_K2O": round(na2o + k2o, 2),
                "rock_type": rock_type,
                "material": sample.get("material", "Unknown")
            })
        
        # AFM data (needs FeOT, Na2O+K2O, MgO)
        if feot is not None and na2o is not None and k2o is not None and mgo is not None:
            afm_data.append({
                "sample_code": sample_code,
                "FeOT": round(feot, 2),
                "Na2O": round(na2o, 2),
                "K2O": round(k2o, 2),
                "MgO": round(mgo, 2),
                "A": round(feot, 2),
                "F": round(na2o + k2o, 2),
                "M": round(mgo, 2),
                "rock_type": rock_type,
                "material": sample.get("material", "Unknown")
            })
    
    return {
        "volcano_number": volcano_num,
        "volcano_name": volcano.get("volcano_name", "Unknown"),
        "samples_count": len(samples),
        "tas_data": tas_data,
        "afm_data": afm_data,
        "rock_types": rock_types
    }
