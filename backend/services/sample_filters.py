"""Shared sample filter helpers for routers and analytics aggregations."""

from __future__ import annotations

from typing import Any, Dict, Optional, Sequence

from fastapi import HTTPException


VALID_CONFIDENCE_LEVELS = ("high", "medium", "low", "unknown")
ALL_CONFIDENCE_LEVELS = set(VALID_CONFIDENCE_LEVELS)


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


def parse_confidence_levels(raw: Optional[str]) -> Optional[list[str]]:
    if raw is None:
        return None

    levels: list[str] = []
    for value in parse_csv_values(raw):
        normalized = value.lower()
        if normalized not in ALL_CONFIDENCE_LEVELS:
            raise HTTPException(
                status_code=400,
                detail=(
                    "confidence_levels must contain only high, medium, low, or unknown "
                    f"(received: {value})"
                ),
            )
        if normalized not in levels:
            levels.append(normalized)

    return levels


def build_normalized_confidence_expression() -> Dict[str, Any]:
    return {
        "$let": {
            "vars": {
                "primary": {
                    "$trim": {
                        "input": {
                            "$toLower": {
                                "$ifNull": ["$matching_metadata.quality.conf", ""]
                            }
                        }
                    }
                },
                "legacy": {
                    "$trim": {
                        "input": {
                            "$toLower": {
                                "$toString": {
                                    "$ifNull": ["$matching_metadata.confidence_level", ""]
                                }
                            }
                        }
                    }
                },
            },
            "in": {
                "$switch": {
                    "branches": [
                        {"case": {"$eq": ["$$primary", "high"]}, "then": "high"},
                        {"case": {"$eq": ["$$primary", "medium"]}, "then": "medium"},
                        {"case": {"$eq": ["$$primary", "low"]}, "then": "low"},
                        {"case": {"$eq": ["$$primary", "none"]}, "then": "unknown"},
                        {"case": {"$in": ["$$legacy", ["high", "1"]]}, "then": "high"},
                        {"case": {"$in": ["$$legacy", ["medium", "2"]]}, "then": "medium"},
                        {"case": {"$in": ["$$legacy", ["low", "3"]]}, "then": "low"},
                    ],
                    "default": "unknown",
                }
            },
        }
    }


def build_confidence_filter_stages(levels: Optional[Sequence[str]]) -> list[Dict[str, Any]]:
    if levels is None:
        return []
    if len(levels) == 0:
        return [{"$match": {"_id": None}}]
    if set(levels) == ALL_CONFIDENCE_LEVELS:
        return []

    return [
        {"$addFields": {"normalized_confidence": build_normalized_confidence_expression()}},
        {"$match": {"normalized_confidence": {"$in": list(levels)}}},
    ]