"""Shared sample filter helpers for routers and analytics aggregations."""

from __future__ import annotations

from typing import Any, Dict, Optional, Sequence

from fastapi import HTTPException


VALID_MATCH_METHODS = ("literature", "nearest", "no_match")
ALL_MATCH_METHODS = set(VALID_MATCH_METHODS)


def parse_csv_values(raw: Optional[str]) -> list[str]:
    if not raw:
        return []
    return [value.strip() for value in raw.split(",") if value.strip()]


def build_bbox_filter(bbox: str) -> Dict[str, Any]:
    try:
        coords = [float(value) for value in bbox.split(",")]
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid bbox format. Use: min_lon,min_lat,max_lon,max_lat. Error: {str(exc)}",
        )

    if len(coords) != 4:
        raise HTTPException(status_code=400, detail="bbox must have 4 values: min_lon,min_lat,max_lon,max_lat")

    min_lon, min_lat, max_lon, max_lat = coords

    if not (-180 <= min_lon <= 180 and -180 <= max_lon <= 180):
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")
    if not (-90 <= min_lat <= 90 and -90 <= max_lat <= 90):
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
    if min_lon >= max_lon:
        raise HTTPException(status_code=400, detail="min_lon must be less than max_lon")
    if min_lat >= max_lat:
        raise HTTPException(status_code=400, detail="min_lat must be less than max_lat")

    return {
        "geometry": {
            "$geoIntersects": {
                "$geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [min_lon, min_lat],
                        [max_lon, min_lat],
                        [max_lon, max_lat],
                        [min_lon, max_lat],
                        [min_lon, min_lat],
                    ]],
                }
            }
        }
    }


def build_sample_match_query(
    *,
    rock_type: Optional[str] = None,
    database: Optional[str] = None,
    tectonic_setting: Optional[str] = None,
    min_sio2: Optional[float] = None,
    max_sio2: Optional[float] = None,
    volcano_number: Optional[str] = None,
    bbox: Optional[str] = None,
    material: Optional[str] = None,
) -> Dict[str, Any]:
    query: Dict[str, Any] = {}

    if rock_type:
        rock_types = parse_csv_values(rock_type)
        if len(rock_types) > 1:
            query["petro.rock_type"] = {"$in": rock_types}
        elif rock_types:
            query["petro.rock_type"] = rock_types[0]

    if database:
        query["db"] = database

    if tectonic_setting:
        settings = parse_csv_values(tectonic_setting)
        if len(settings) > 1:
            query["tecto.volcano_ui"] = {"$in": settings}
        elif settings:
            query["tecto.volcano_ui"] = settings[0]

    if min_sio2 is not None or max_sio2 is not None:
        sio2_filter: Dict[str, Any] = {"$exists": True, "$ne": None}
        if min_sio2 is not None:
            sio2_filter["$gte"] = min_sio2
        if max_sio2 is not None:
            sio2_filter["$lte"] = max_sio2
        query["oxides.SIO2"] = sio2_filter

    if volcano_number:
        query["matching_metadata.volcano.number"] = str(volcano_number)

    if material:
        materials = parse_csv_values(material)
        if len(materials) > 1:
            query["material"] = {"$in": materials}
        elif materials:
            query["material"] = materials[0]

    if bbox:
        query.update(build_bbox_filter(bbox))

    return query


def parse_match_methods(raw: Optional[str]) -> Optional[list[str]]:
    if raw is None:
        return None

    methods: list[str] = []
    for value in parse_csv_values(raw):
        normalized = value.lower()
        if normalized not in ALL_MATCH_METHODS:
            raise HTTPException(
                status_code=400,
                detail=(
                    "match_methods must contain only literature, nearest, or no_match "
                    f"(received: {value})"
                ),
            )
        if normalized not in methods:
            methods.append(normalized)

    return methods


def build_method_filter_stages(methods: Optional[Sequence[str]]) -> list[Dict[str, Any]]:
    if methods is None:
        return []
    if len(methods) == 0:
        return [{"$match": {"_id": None}}]
    if set(methods) == ALL_MATCH_METHODS:
        return []

    # Documents without an explicit method are treated as unmatched.
    return [
        {"$addFields": {"normalized_method": {"$ifNull": ["$matching_metadata.method", "no_match"]}}},
        {"$match": {"normalized_method": {"$in": list(methods)}}},
    ]