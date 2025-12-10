"""
Eruptions router - API endpoints for eruption data
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from pymongo.database import Database
from typing import Optional

from backend.dependencies import get_database

router = APIRouter()


@router.get("/")
async def get_eruptions(
    db: Database = Depends(get_database),
    volcano_number: Optional[str] = Query(None, description="Filter by volcano number"),
    vei: Optional[int] = Query(None, ge=0, le=8, description="Filter by VEI"),
    limit: int = Query(1000, le=10000),
    offset: int = Query(0, ge=0)
):
    """
    Get list of eruptions with optional filters
    """
    query = {}
    
    if volcano_number:
        try:
            # Convert to integer as database stores volcano_number as int
            query["volcano_number"] = int(volcano_number)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid volcano_number format")
    if vei is not None:
        query["vei"] = vei
    
    eruptions = list(db.eruptions.find(query).limit(limit).skip(offset))
    
    for eruption in eruptions:
        if "_id" in eruption:
            eruption["_id"] = str(eruption["_id"])
    
    return {
        "count": len(eruptions),
        "limit": limit,
        "offset": offset,
        "data": eruptions
    }


@router.get("/{eruption_number}")
async def get_eruption_by_number(
    eruption_number: str,
    db: Database = Depends(get_database)
):
    """
    Get a single eruption by eruption number
    """
    try:
        eruption_num = int(eruption_number)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid eruption number format")
    
    eruption = db.eruptions.find_one({"eruption_number": eruption_num})
    
    if not eruption:
        raise HTTPException(status_code=404, detail="Eruption not found")
    
    if "_id" in eruption:
        eruption["_id"] = str(eruption["_id"])
    
    return eruption
