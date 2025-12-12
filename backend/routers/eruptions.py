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
