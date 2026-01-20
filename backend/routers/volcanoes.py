"""
Volcanoes router - API endpoints for volcano data
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from pymongo.database import Database
from typing import Optional
from cachetools import TTLCache
import threading

from backend.dependencies import get_database

router = APIRouter()

# In-memory cache for expensive chemical-analysis queries (5 minute TTL, max 100 volcanoes)
chemical_analysis_cache = TTLCache(maxsize=100, ttl=300)  # 5 minutes
cache_lock = threading.Lock()


@router.get("/summary")
async def get_volcanoes_summary(
    db: Database = Depends(get_database),
    country: Optional[str] = Query(None, description="Filter by country"),
    region: Optional[str] = Query(None, description="Filter by region"),
    tectonic_setting: Optional[str] = Query(None, description="Filter by tectonic setting (comma-separated for multiple)"),
    volcano_name: Optional[str] = Query(None, description="Filter by volcano name (partial match)"),
    limit: Optional[int] = Query(None, description="Maximum number of results to return (default: None = no limit)"),
    offset: int = Query(0, ge=0)
):
    """
    Lightweight summary endpoint returning minimal fields for map/list views.
    Used by frontend for volcano selection and map display.
    Supports filtering by country, region, tectonic_setting, and volcano_name.
    """
    # Build query filter
    query = {}
    
    if country:
        query["country"] = country
    
    if region:
        query["region"] = region
    
    if tectonic_setting:
        # Support comma-separated values for multiple tectonic settings
        # Filter using tectonic_setting.ui field
        settings = [s.strip() for s in tectonic_setting.split(',')]
        if len(settings) == 1:
            query["tectonic_setting.ui"] = settings[0]
        else:
            query["tectonic_setting.ui"] = {"$in": settings}
    
    if volcano_name:
        # Partial match with case-insensitive search
        query["volcano_name"] = {"$regex": volcano_name, "$options": "i"}
    
    projection = {
        "_id": 1,
        "volcano_number": 1,
        "volcano_name": 1,
        "country": 1,
        "petro": 1,
        "tectonic_setting": 1,
        "region": 1,
        "primary_volcano_type": 1,
        "geometry": 1,
    }

    cursor = db.volcanoes.find(query, projection)
    if limit is not None:
        cursor = cursor.limit(limit)
    if offset > 0:
        cursor = cursor.skip(offset)
    cursor = cursor.batch_size(5000)
    volcanoes = []
    for v in cursor:
        if "_id" in v:
            v["_id"] = str(v["_id"])
        volcanoes.append(v)

    return {"count": len(volcanoes), "limit": limit, "offset": offset, "data": volcanoes}


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
    limit: Optional[int] = Query(None, description="Maximum number of results to return (default: None = no limit)"),
):
    """
    Get volcanoes in GeoJSON format for map visualization
    """
    query = {}
    
    if country:
        query["country"] = country
    
    volcanoes = db.volcanoes.find(query)
    if limit is not None:
        volcanoes = volcanoes.limit(limit)
        
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
    
    NOTE: Results are cached in memory for 5 minutes to improve performance.
    """
    try:
        volcano_num = int(volcano_number)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid volcano number format")
    
    # Check cache first (thread-safe)
    cache_key = f"{volcano_num}:{limit}"
    with cache_lock:
        if cache_key in chemical_analysis_cache:
            return chemical_analysis_cache[cache_key]
    
    # Check if volcano exists
    volcano = db.volcanoes.find_one({"volcano_number": volcano_num})
    if not volcano:
        raise HTTPException(status_code=404, detail="Volcano not found")
    
    # Get samples for this volcano (via matching_metadata)
    # Use projection to only fetch needed fields (reduces transfer size by ~50%)
    projection = {
        "_id": 0,
        "sample_code": 1,
        "sample_id": 1,
        "db": 1,
        "petro": 1,
        "material": 1,
        "tecto": 1,
        "geometry": 1,
        "matching_metadata": 1,
        "references": 1,
        "geographic_location": 1,
        "oxides": 1  # All oxide fields
    }
    
    samples = list(db.samples.find({
        "matching_metadata.volcano.number": volcano_number  # Use string directly, not int
    }, projection).limit(limit).batch_size(10000))
    
    if not samples:
        result = {
            "volcano_number": volcano_num,
            "volcano_name": volcano.get("volcano_name", "Unknown"),
            "samples_count": 0,
            "tas_data": [],
            "afm_data": [],
            "rock_types": {}
        }
        # Cache empty result too
        with cache_lock:
            chemical_analysis_cache[cache_key] = result
        return result
    
    tas_data = []
    afm_data = []
    harker_data = []
    all_samples = []  # Include ALL samples for CSV export
    rock_types = {}
    rock_types_wr = {}  # Rock types for Whole Rock (WR) samples only
    
    for sample in samples:
        # Handle both cases: oxides in nested object or at root level
        oxides = sample.get("oxides", {})
        if not oxides:
            # Try to get oxides from root level
            oxides = sample
        
        # Extract oxide values
        sio2 = oxides.get("SIO2")
        na2o = oxides.get("NA2O")
        k2o = oxides.get("K2O")
        feot = oxides.get("FEOT")
        mgo = oxides.get("MGO")
        tio2 = oxides.get("TIO2")
        al2o3 = oxides.get("AL2O3")
        cao = oxides.get("CAO")
        p2o5 = oxides.get("P2O5")
        mno = oxides.get("MNO")
        
        sample_code = str(sample.get("sample_code", ""))
        # Extract rock_type from petro field
        petro = sample.get("petro", {})
        rock_type = petro.get("rock_type", "Unknown") if isinstance(petro, dict) else "Unknown"
        material = sample.get("material", "Unknown")
        
        # Count rock types (all samples)
        rock_types[rock_type] = rock_types.get(rock_type, 0) + 1
        
        # Count rock types for WR samples only
        if material == "WR":
            rock_types_wr[rock_type] = rock_types_wr.get(rock_type, 0) + 1
        
        # Add ALL samples to all_samples array (for complete CSV export)
        all_sample_entry = {
            "sample_code": sample_code,
            "sample_id": sample.get("sample_id", sample_code),
            "db": sample.get("db", "Unknown"),
            "petro": sample.get("petro"),
            "material": sample.get("material", "Unknown"),
            "tecto": sample.get("tecto"),
            "geometry": sample.get("geometry"),
            "matching_metadata": sample.get("matching_metadata"),
            "references": sample.get("references"),
            "geographic_location": sample.get("geographic_location"),
        }
        # Add all available oxides (even if incomplete)
        if sio2 is not None:
            all_sample_entry["SIO2"] = round(sio2, 2)
        if na2o is not None:
            all_sample_entry["NA2O"] = round(na2o, 2)
        if k2o is not None:
            all_sample_entry["K2O"] = round(k2o, 2)
        if feot is not None:
            all_sample_entry["FEOT"] = round(feot, 2)
        if mgo is not None:
            all_sample_entry["MGO"] = round(mgo, 2)
        if tio2 is not None:
            all_sample_entry["TIO2"] = round(tio2, 2)
        if al2o3 is not None:
            all_sample_entry["AL2O3"] = round(al2o3, 2)
        if cao is not None:
            all_sample_entry["CAO"] = round(cao, 2)
        if p2o5 is not None:
            all_sample_entry["P2O5"] = round(p2o5, 2)
        if mno is not None:
            all_sample_entry["MNO"] = round(mno, 2)
        all_samples.append(all_sample_entry)
        
        # TAS data (preserve MongoDB field names and include all metadata)
        if sio2 is not None and na2o is not None and k2o is not None:
            tas_entry = {
                "sample_code": sample_code,
                "sample_id": sample.get("sample_id", sample_code),
                "db": sample.get("db", "Unknown"),
                "petro": sample.get("petro"),
                "material": sample.get("material", "Unknown"),
                "tecto": sample.get("tecto"),
                "geometry": sample.get("geometry"),
                "matching_metadata": sample.get("matching_metadata"),
                "references": sample.get("references"),
                "geographic_location": sample.get("geographic_location"),
                "SIO2": round(sio2, 2),
                "NA2O": round(na2o, 2),
                "K2O": round(k2o, 2)
            }
            # Add all other oxides if available
            if feot is not None:
                tas_entry["FEOT"] = round(feot, 2)
            if mgo is not None:
                tas_entry["MGO"] = round(mgo, 2)
            if tio2 is not None:
                tas_entry["TIO2"] = round(tio2, 2)
            if al2o3 is not None:
                tas_entry["AL2O3"] = round(al2o3, 2)
            if cao is not None:
                tas_entry["CAO"] = round(cao, 2)
            if p2o5 is not None:
                tas_entry["P2O5"] = round(p2o5, 2)
            if mno is not None:
                tas_entry["MNO"] = round(mno, 2)
            tas_data.append(tas_entry)
        
        # AFM data (preserve MongoDB field names and include all metadata)
        if feot is not None and na2o is not None and k2o is not None and mgo is not None:
            afm_entry = {
                "sample_code": sample_code,
                "sample_id": sample.get("sample_id", sample_code),
                "db": sample.get("db", "Unknown"),
                "petro": sample.get("petro"),
                "material": sample.get("material", "Unknown"),
                "tecto": sample.get("tecto"),
                "geometry": sample.get("geometry"),
                "matching_metadata": sample.get("matching_metadata"),
                "references": sample.get("references"),
                "geographic_location": sample.get("geographic_location"),
                "FEOT": round(feot, 2),
                "NA2O": round(na2o, 2),
                "K2O": round(k2o, 2),
                "MGO": round(mgo, 2)
            }
            # Add other oxides if available
            if sio2 is not None:
                afm_entry["SIO2"] = round(sio2, 2)
            if tio2 is not None:
                afm_entry["TIO2"] = round(tio2, 2)
            if al2o3 is not None:
                afm_entry["AL2O3"] = round(al2o3, 2)
            if cao is not None:
                afm_entry["CAO"] = round(cao, 2)
            if p2o5 is not None:
                afm_entry["P2O5"] = round(p2o5, 2)
            if mno is not None:
                afm_entry["MNO"] = round(mno, 2)
            afm_data.append(afm_entry)
        
        # Harker data - ONLY Whole Rock (WR) samples for accurate geochemical comparison
        if material == "WR" and sio2 is not None and 35 <= sio2 <= 80:  # Valid SiO2 range
            harker_point = {
                "sample_code": sample_code,
                "sample_id": sample.get("sample_id", sample_code),
                "db": sample.get("db", "Unknown"),
                "petro": sample.get("petro"),
                "material": material,
                "tecto": sample.get("tecto"),
                "geometry": sample.get("geometry"),
                "matching_metadata": sample.get("matching_metadata"),
                "references": sample.get("references"),
                "geographic_location": sample.get("geographic_location"),
                "SIO2": round(sio2, 2)
            }
            
            # Add available oxides (preserve MongoDB field names)
            if tio2 is not None:
                harker_point["TIO2"] = round(tio2, 2)
            if al2o3 is not None:
                harker_point["AL2O3"] = round(al2o3, 2)
            if feot is not None:
                harker_point["FEOT"] = round(feot, 2)
            if mgo is not None:
                harker_point["MGO"] = round(mgo, 2)
            if cao is not None:
                harker_point["CAO"] = round(cao, 2)
            if na2o is not None:
                harker_point["NA2O"] = round(na2o, 2)
            if k2o is not None:
                harker_point["K2O"] = round(k2o, 2)
            if p2o5 is not None:
                harker_point["P2O5"] = round(p2o5, 2)
            if mno is not None:
                harker_point["MNO"] = round(mno, 2)
            
            # Only add if at least one other oxide is present
            if len(harker_point) > 9:  # More than sample_code, sample_id, db, SiO2, rock_type, material, tecto, geometry, matching_metadata
                harker_data.append(harker_point)
    
    result = {
        "volcano_number": volcano_num,
        "volcano_name": volcano.get("volcano_name", "Unknown"),
        "samples_count": len(samples),
        "tas_data": tas_data,
        "afm_data": afm_data,
        "harker_data": harker_data,
        "all_samples": all_samples,  # All samples with any oxide data for CSV export
        "rock_types": rock_types,
        "rock_types_wr": rock_types_wr  # Rock types for WR samples only (used for distribution charts)
    }
    
    # Cache the result for 5 minutes (thread-safe)
    with cache_lock:
        chemical_analysis_cache[cache_key] = result
    
    return result


@router.get("/{volcano_number}/rock-types")
async def get_volcano_rock_types(
    volcano_number: str,
    db: Database = Depends(get_database)
):
    """
    Get GVP major rock types for a volcano.
    Returns the rock type from the volcano's rock_type field (now a string).
    """
    try:
        volcano_num = int(volcano_number)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid volcano number format")
    
    volcano = db.volcanoes.find_one(
        {"volcano_number": volcano_num},
        {"volcano_name": 1, "volcano_number": 1, "petro": 1}
    )
    
    if not volcano:
        raise HTTPException(status_code=404, detail="Volcano not found")
    
    # Extract rock type from petro field
    rock_types = []
    petro = volcano.get("petro", {})
    rock_type = petro.get("rock_type") if isinstance(petro, dict) else None
    
    # If rock_type exists and is not empty, add it as primary rock type
    if rock_type and isinstance(rock_type, str) and rock_type.strip():
        rock_types.append({"type": rock_type.strip(), "rank": 1})
    
    return {
        "volcano_number": volcano["volcano_number"],
        "volcano_name": volcano["volcano_name"],
        "rock_types": rock_types
    }


@router.get("/{volcano_number}/sample-timeline")
async def get_volcano_sample_timeline(
    volcano_number: str,
    db: Database = Depends(get_database)
):
    """
    Get sample statistics for timeline context.
    Returns basic sample counts by rock type since eruption dates are rarely available.
    """
    try:
        volcano_num = int(volcano_number)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid volcano number format")
    
    # Verify volcano exists
    volcano = db.volcanoes.find_one({"volcano_number": volcano_num})
    if not volcano:
        raise HTTPException(status_code=404, detail="Volcano not found")
    
    # Try to aggregate by eruption year first (preferred but rarely available)
    year_pipeline = [
        {
            "$match": {
                "matching_metadata.volcano.number": volcano_num,
                "eruption_date.year": {"$ne": None, "$exists": True, "$type": "number"}
            }
        },
        {
            "$group": {
                "_id": "$eruption_date.year",
                "sample_count": {"$sum": 1},
                "rock_types": {"$addToSet": "$rock_type"}
            }
        },
        {
            "$project": {
                "year": "$_id",
                "sample_count": 1,
                "rock_types": 1,
                "_id": 0
            }
        },
        {"$sort": {"year": 1}}
    ]
    
    timeline_data = list(db.samples.aggregate(year_pipeline))
    
    # Get total sample count and rock type distribution (always available)
    total_samples = db.samples.count_documents({
        "matching_metadata.volcano.number": volcano_num
    })
    
    # Get rock type distribution
    rock_type_pipeline = [
        {
            "$match": {
                "matching_metadata.volcano.number": volcano_num,
                "rock_type": {"$ne": None, "$exists": True}
            }
        },
        {
            "$group": {
                "_id": "$rock_type",
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"count": -1}}
    ]
    
    rock_type_dist = list(db.samples.aggregate(rock_type_pipeline))
    
    # Calculate statistics
    years = [item["year"] for item in timeline_data]
    
    return {
        "volcano_number": volcano_num,
        "volcano_name": volcano.get("volcano_name", "Unknown"),
        "total_samples": total_samples,
        "samples_with_dates": sum(item["sample_count"] for item in timeline_data),
        "timeline_data": timeline_data,
        "rock_type_distribution": [
            {"rock_type": item["_id"], "count": item["count"]} 
            for item in rock_type_dist
        ],
        "date_range": {
            "min_year": min(years) if years else None,
            "max_year": max(years) if years else None,
            "span_years": max(years) - min(years) if years else 0
        },
        "has_timeline_data": len(timeline_data) > 0
    }
