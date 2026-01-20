"""
Metadata router - API endpoints for metadata (countries, rock types, etc.)
"""
from fastapi import APIRouter, Depends
from pymongo.database import Database

from backend.dependencies import get_database

router = APIRouter()


@router.get("/countries")
async def get_countries(db: Database = Depends(get_database)):
    """
    Get list of all countries
    """
    countries = db.volcanoes.distinct("country")
    return {
        "count": len(countries),
        "data": sorted([c for c in countries if c])
    }


@router.get("/regions")
async def get_regions(db: Database = Depends(get_database)):
    """
    Get list of all volcano regions
    """
    regions = db.volcanoes.distinct("region")
    return {
        "count": len(regions),
        "data": sorted([r for r in regions if r])
    }


@router.get("/tectonic-settings")
async def get_tectonic_settings(db: Database = Depends(get_database)):
    """
    Get list of all tectonic settings (from volcanoes tectonic_setting.ui field)
    """
    volcano_settings = db.volcanoes.distinct("tectonic_setting.ui")
    return {
        "count": len(volcano_settings),
        "data": sorted([s for s in volcano_settings if s])
    }

@router.get("/tectonic-settings-volcanoes")
async def get_tectonic_settings_volcanoes(db: Database = Depends(get_database)):
    """
    Get list of all tectonic settings from volcanoes (tecto.ui)
    """
    volcano_settings = db.volcanoes.distinct("tectonic_setting.ui")
    return {
        "count": len(volcano_settings),
        "data": sorted([s for s in volcano_settings if s])
    }

@router.get("/tectonic-settings-samples")
async def get_tectonic_settings_samples(db: Database = Depends(get_database)):
    """
    Get list of all tectonic settings from samples.
    Returns the sample's tecto.ui values.
    """
    # Get tectonic settings from samples (tecto.ui field)
    sample_settings = db.samples.distinct("tecto.volcano_ui")
    # Combine and deduplicate
    all_settings = set(sample_settings)
    return {
        "count": len(all_settings),
        "data": sorted([s for s in all_settings if s])
    }


@router.get("/rock-types")
async def get_rock_types(db: Database = Depends(get_database)):
    """
    Get list of all rock types from samples (using petro.rock_type field)
    """
    rock_types = db.samples.distinct("petro.rock_type")
    return {
        "count": len(rock_types),
        "data": sorted([r for r in rock_types if r])
    }


@router.get("/databases")
async def get_databases(db: Database = Depends(get_database)):
    """
    Get list of available samples databases (GEOROC, PetDB)
    """
    databases = db.samples.distinct("db")
    return {
        "count": len(databases),
        "data": sorted([d for d in databases if d])
    }


@router.get("/volcano-names")
async def get_volcano_names(db: Database = Depends(get_database)):
    """
    Get list of all volcano names for autocomplete
    """
    volcano_names = db.volcanoes.distinct("volcano_name")
    return {
        "count": len(volcano_names),
        "data": sorted([v for v in volcano_names if v])
    }
