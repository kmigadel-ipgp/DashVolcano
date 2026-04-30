"""
Analytics router - API endpoints for analytical data

These endpoints return data for chemical analysis plots (TAS, AFM),
VEI distributions, and comparative analysis between volcanoes.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.database import Database
from typing import List, Dict, Any, Optional

from backend.dependencies import get_database
from backend.models.responses import RockTypeDistributionResponse
from backend.services.sample_filters import (
    build_confidence_filter_stages,
    build_sample_match_query,
    parse_confidence_levels,
)

router = APIRouter()


@router.get("/rock-type-distribution", response_model=RockTypeDistributionResponse)
async def get_rock_type_distribution(
    db: Database = Depends(get_database),
    rock_type: Optional[str] = Query(None, description="Filter by rock type (comma-separated for multiple)"),
    database: Optional[str] = Query(None, description="Filter by database (GEOROC, PetDB, GVP)"),
    tectonic_setting: Optional[str] = Query(None, description="Filter by tectonic setting (comma-separated for multiple)"),
    min_sio2: Optional[float] = Query(None, description="Minimum SiO2 content (%)"),
    max_sio2: Optional[float] = Query(None, description="Maximum SiO2 content (%)"),
    volcano_number: Optional[str] = Query(None, description="Filter by volcano number"),
    bbox: Optional[str] = Query(
        None,
        description="Bounding box as 'min_lon,min_lat,max_lon,max_lat'",
        pattern=r"^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$",
    ),
    material: Optional[str] = Query("WR", description="Material filter (defaults to WR for whole-rock comparison)"),
    confidence_levels: Optional[str] = Query(
        None,
        description="Confidence levels to include (comma-separated: high,medium,low,unknown)",
    ),
):
    """Return a rock type distribution for the filtered sample set."""

    selected_confidence_levels = parse_confidence_levels(confidence_levels)
    query = build_sample_match_query(
        rock_type=rock_type,
        database=database,
        tectonic_setting=tectonic_setting,
        min_sio2=min_sio2,
        max_sio2=max_sio2,
        volcano_number=volcano_number,
        bbox=bbox,
        material=material,
    )

    pipeline: List[Dict[str, Any]] = [{"$match": query}]
    pipeline.extend(build_confidence_filter_stages(selected_confidence_levels))
    pipeline.extend([
        {"$match": {"petro.rock_type": {"$exists": True, "$nin": [None, ""]}}},
        {"$group": {"_id": "$petro.rock_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1, "_id": 1}},
    ])

    rock_type_rows = list(db.samples.aggregate(pipeline, batchSize=10000))
    rock_types = {
        row["_id"]: row["count"]
        for row in rock_type_rows
        if row.get("_id")
    }

    return {
        "sample_count": sum(rock_types.values()),
        "rock_types": rock_types,
        "material": material,
        "confidence_levels": selected_confidence_levels,
    }


@router.get("/tas-polygons")
async def get_tas_polygons():
    """
    Get TAS (Total Alkali-Silica) diagram polygon definitions.
    
    Returns the polygon coordinates and names for TAS diagram regions.
    Frontend can use this to draw the TAS classification diagram.
    """
    # TAS polygon definitions (from analytic_plots.py)
    polygons = [
        {"name": "picro-basalt",            "coordinates": [[41,0],[41,3],[45,3],[45,0],[41,0]]},
        {"name": "basalt",                  "coordinates": [[45,0],[45,5],[52,5],[52,0],[45,0]]},
        {"name": "basaltic andesite",       "coordinates": [[52,0],[52,5],[57,5.9],[57,0],[52,0]]},
        {"name": "andesite",                "coordinates": [[57,0],[57,5.9],[63,7],[63,0],[57,0]]},
        {"name": "dacite",                  "coordinates": [[63,0],[63,7],[69,8],[77,0],[63,0]]},
        {"name": "tephrite",                "coordinates": [[41,3],[41,7],[45,9.4],[49.4,7.3],[45,5],[45,3],[41,3]]},
        {"name": "trachybasalt",            "coordinates": [[45,5],[49.4,7.3],[52,5],[45,5]]},
        {"name": "phono-tephrite",          "coordinates": [[45,9.4],[48.4,11.5],[53,9.3],[49.4,7.3],[45,9.4]]},
        {"name": "basaltic trachyandesite", "coordinates": [[49.4,7.3],[53,9.3],[57,5.9],[52,5],[49.4,7.3]]},
        {"name": "tephri-phonolite",        "coordinates": [[53,9.3],[48.4,11.5],[52.5,14],[57.6,11.7],[53,9.3]]},
        {"name": "trachyandesite",          "coordinates": [[53,9.3],[57.6,11.7],[63,7],[57,5.9],[53,9.3]]},
        {"name": "rhyolite",                "coordinates": [[69,8],[69,13],[77,13],[77,0],[69,8]]},
        {"name": "trachyte,trachydacite",   "coordinates": [[57.6,11.7],[65,15.7],[69,13],[69,8],[63,7],[57.6,11.7]]},
        {"name": "phonolyte",               "coordinates": [[50,15.13],[65,15.7],[57.6,11.7],[50,15.13]]},
        {"name": "foidite",                 "coordinates": [[41,0],[30,0],[30,15.13],[52.5,14],[48.4,11.5],[45,9.4],[41,7],[41,3],[41,0]]}
    ]
    
    # Alkali/Subalkalic dividing line
    alkali_line = {
        "name": "Alkali/Subalkalic Line",
        "coordinates": [
            [39.2, 0], [40, 0.4], [43.2, 2], [45, 2.8], [48, 4],
            [50, 4.75], [53.7, 6], [55, 6.4], [60, 8], [65, 8.8], [74.4, 10]
        ]
    }
    
    return {
        "polygons": polygons,
        "alkali_line": alkali_line,
        "axes": {
            "x": {"label": "SiO2 (WT%)", "range": [39, 80]},
            "y": {"label": "Na2O+K2O (WT%)", "range": [0, 16]}
        }
    }


@router.get("/afm-boundary")
async def get_afm_boundary():
    """
    Get AFM (Alkali-Ferro-Magnesium) diagram boundary line.
    
    Returns the boundary line coordinates that separates tholeiitic
    and calc-alkaline rock series on the AFM ternary diagram.
    """
    boundary_line = {
        "name": "Tholeiitic/Calc-Alkaline Boundary",
        "coordinates": [
            {"A": 39, "F": 11, "M": 50},
            {"A": 50, "F": 14, "M": 36},
            {"A": 56, "F": 18, "M": 26},
            {"A": 53, "F": 28, "M": 20},
            {"A": 45, "F": 40, "M": 15},
            {"A": 26, "F": 70, "M": 4}
        ]
    }
    
    return {
        "boundary": boundary_line,
        "axes": {
            "A": "FeOT (WT%)",
            "F": "Na2O+K2O (WT%)",
            "M": "MgO (WT%)"
        },
        "note": "Points above line are calc-alkaline, below are tholeiitic"
    }


@router.get("/volcano/{volcano_number}/samples-with-vei")
async def get_volcano_samples_with_vei(
    volcano_number: int,
    db: Database = Depends(get_database)
):
    """
    Get samples with VEI from eruptions.
    
    Since samples don't have eruption dates, this endpoint assigns VEI values
    based on the most common VEI for this volcano's eruptions. This provides
    a representative VEI distribution for visualization purposes.
    
    Args:
        volcano_number: GVP volcano number
        
    Returns:
        - samples_with_vei: List of samples with VEI added (distributed across eruptions)
        - total_samples: Total samples for this volcano
        - matched_samples: Number of samples with VEI assigned
        - match_rate: Percentage of samples with VEI (currently returns all samples)
        - method: "representative_distribution" - indicates VEI is assigned, not matched
    """
    # Convert volcano_number to string for MongoDB query (matching_metadata.volcano.number is stored as string)
    volcano_num_str = str(volcano_number)
    
    # Get total sample count first
    total_samples = db.samples.count_documents({
        "matching_metadata.volcano.number": volcano_num_str
    })
    
    if total_samples == 0:
        raise HTTPException(status_code=404, detail="No samples found for this volcano")
    
    # Get eruptions for this volcano with VEI
    # Note: eruptions collection stores volcano_number as int, samples as string
    eruptions = list(db.eruptions.find({
        "volcano_number": volcano_number,
        "vei": {"$ne": None, "$gte": 0, "$lte": 8}
    }).sort("start_date.year", -1))
    
    if not eruptions:
        # No VEI data available for this volcano
        return {
            "volcano_number": volcano_number,
            "samples_with_vei": [],
            "total_samples": total_samples,
            "matched_samples": 0,
            "match_rate": 0,
            "method": "no_vei_data",
            "message": "No eruption records with VEI found for this volcano"
        }
    
    # Join samples with eruptions by volcano number and year
    # Note: volcano_number is int in eruptions, string in samples.matching_metadata.volcano.number
    pipeline = [
        {
            "$match": {
                "matching_metadata.volcano.number": volcano_num_str,
                "eruption_date.year": {"$ne": None},
                "oxides.SIO2": {"$exists": True},
                "oxides.NA2O": {"$exists": True},
                "oxides.K2O": {"$exists": True}
            }
        },
        {
            "$lookup": {
                "from": "eruptions",
                "let": {
                    "sample_year": "$eruption_date.year"
                },
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {"$eq": ["$volcano_number", volcano_number]},
                                    {"$eq": ["$start_date.year", "$$sample_year"]},
                                    {"$ne": ["$vei", None]},
                                    {"$gte": ["$vei", 0]},
                                    {"$lte": ["$vei", 8]}
                                ]
                            }
                        }
                    },
                    {"$project": {"vei": 1, "start_date": 1}}
                ],
                "as": "matching_eruptions"
            }
        },
        {
            "$match": {
                "matching_eruptions.0": {"$exists": True}
            }
        },
        {
            "$project": {
                "_id": 0,
                "sample_id": "$sample_code",
                "sample_code": 1,
                "petro": 1,
                "material": 1,
                "geometry": 1,
                "oxides": 1,  # Preserve original MongoDB oxide field names like SIO2(WT%)
                "vei": {"$arrayElemAt": ["$matching_eruptions.vei", 0]},
                "eruption_year": "$eruption_date.year",
                "matching_metadata": 1
            }
        }
    ]
    
    samples = list(db.samples.aggregate(pipeline))
    matched_samples = len(samples)
    
    # Get VEI distribution
    vei_counts = {}
    for sample in samples:
        vei = sample.get("vei")
        if vei is not None:
            vei_counts[vei] = vei_counts.get(vei, 0) + 1
    
    return {
        "volcano_number": volcano_number,
        "samples_with_vei": samples,
        "total_samples": total_samples,
        "matched_samples": matched_samples,
        "match_rate": matched_samples / total_samples if total_samples > 0 else 0,
        "method": "year_based_matching",
        "vei_distribution": vei_counts,
        "message": f"Samples matched with eruptions by year. {len(eruptions)} eruptions with VEI found."
    }
