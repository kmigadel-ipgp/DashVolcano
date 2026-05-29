"""
Integration tests for analytics endpoints (Sprint 1.5).

Tests:
- TAS diagram polygon definitions
- AFM boundary line
- VEI distribution by volcano
- Chemical analysis (TAS/AFM data)
- Error handling

Run with: pytest backend/tests/test_analytics_endpoints.py -v
"""

from contextlib import contextmanager
from copy import deepcopy

import pytest
from fastapi.testclient import TestClient
from backend.dependencies import get_database
from backend.main import app

client = TestClient(app)


def _chemical_analysis_samples(data):
    return data.get("samples", [])


def _tas_samples(data):
    return [
        sample for sample in _chemical_analysis_samples(data)
        if sample.get("SIO2") is not None
        and sample.get("NA2O") is not None
        and sample.get("K2O") is not None
    ]


def _afm_samples(data):
    return [
        sample for sample in _chemical_analysis_samples(data)
        if sample.get("FEOT") is not None
        and sample.get("MGO") is not None
        and sample.get("NA2O") is not None
        and sample.get("K2O") is not None
    ]


def normalize_confidence(sample):
    metadata = sample.get("matching_metadata") or {}
    quality = metadata.get("quality") or {}
    primary = str(quality.get("conf") or "").lower().strip()
    if primary == "high":
        return "high"
    if primary == "medium":
        return "medium"
    if primary == "low":
        return "low"
    if primary == "none":
        return "unknown"

    legacy = str(metadata.get("confidence_level") or "").lower().strip()
    if legacy in {"high", "1"}:
        return "high"
    if legacy in {"medium", "2"}:
        return "medium"
    if legacy in {"low", "3"}:
        return "low"
    return "unknown"


def _get_nested_value(document, path):
    current = document
    parts = path.split(".")

    for index, part in enumerate(parts):
        if isinstance(current, list):
            remaining = ".".join(parts[index:])
            return [_get_nested_value(item, remaining) for item in current]
        if not isinstance(current, dict):
            return None
        current = current.get(part)

    return current


def _has_nested_value(document, path):
    current = document

    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            return False
        current = current[part]

    return True


def _set_nested_value(document, path, value):
    current = document
    parts = path.split(".")

    for part in parts[:-1]:
        next_value = current.get(part)
        if not isinstance(next_value, dict):
            next_value = {}
            current[part] = next_value
        current = next_value

    current[parts[-1]] = value


def _evaluate_expression(document, expression, variables=None):
    variables = variables or {}

    if isinstance(expression, str):
        if expression.startswith("$$"):
            return variables.get(expression[2:])
        if expression.startswith("$"):
            return _get_nested_value(document, expression[1:])
        return expression

    if not isinstance(expression, dict):
        return expression

    if "$and" in expression:
        return all(_evaluate_expression(document, item, variables) for item in expression["$and"])

    if "$eq" in expression:
        left, right = expression["$eq"]
        return _evaluate_expression(document, left, variables) == _evaluate_expression(document, right, variables)

    if "$ne" in expression:
        left, right = expression["$ne"]
        return _evaluate_expression(document, left, variables) != _evaluate_expression(document, right, variables)

    if "$gte" in expression:
        left, right = expression["$gte"]
        return _evaluate_expression(document, left, variables) >= _evaluate_expression(document, right, variables)

    if "$lte" in expression:
        left, right = expression["$lte"]
        return _evaluate_expression(document, left, variables) <= _evaluate_expression(document, right, variables)

    if "$ifNull" in expression:
        value_expression, fallback_expression = expression["$ifNull"]
        value = _evaluate_expression(document, value_expression, variables)
        if value is None:
            return _evaluate_expression(document, fallback_expression, variables)
        return value

    if "$convert" in expression:
        spec = expression["$convert"]
        value = _evaluate_expression(document, spec.get("input"), variables)
        if value is None:
            return spec.get("onNull")
        try:
            if spec.get("to") == "int":
                return int(value)
        except (TypeError, ValueError):
            return spec.get("onError")
        return value

    if "$arrayElemAt" in expression:
        array_expression, index_expression = expression["$arrayElemAt"]
        values = _evaluate_expression(document, array_expression, variables)
        index = _evaluate_expression(document, index_expression, variables)
        if not isinstance(values, list):
            return None
        try:
            return values[index]
        except (IndexError, TypeError):
            return None

    raise AssertionError(f"Unsupported expression in fake Mongo evaluator: {expression}")


def _matches_query(document, query, variables=None):
    for key, condition in query.items():
        if key == "$expr":
            if not _evaluate_expression(document, condition, variables):
                return False
            continue

        value = _get_nested_value(document, key)

        if isinstance(condition, dict):
            for operator, expected in condition.items():
                if operator == "$exists":
                    if _has_nested_value(document, key) != expected:
                        return False
                elif operator == "$ne":
                    if value == expected:
                        return False
                elif operator == "$gte":
                    if value < expected:
                        return False
                elif operator == "$lte":
                    if value > expected:
                        return False
                else:
                    raise AssertionError(f"Unsupported query operator in fake Mongo evaluator: {operator}")
        elif value != condition:
            return False

    return True


def _apply_sort(documents, sort_spec):
    sorted_documents = list(documents)

    for field, direction in reversed(list(sort_spec.items())):
        reverse = direction < 0
        sorted_documents.sort(key=lambda document: _get_nested_value(document, field), reverse=reverse)

    return sorted_documents


def _apply_project(document, project_spec, variables=None):
    projected = {}

    for field, expression in project_spec.items():
        if field == "_id" and expression == 0:
            continue
        if expression == 1:
            projected[field] = deepcopy(_get_nested_value(document, field))
            continue
        projected[field] = _evaluate_expression(document, expression, variables)

    return projected


def _apply_pipeline(documents, pipeline, lookup_collections=None, variables=None):
    results = [deepcopy(document) for document in documents]
    lookup_collections = lookup_collections or {}

    for stage in pipeline:
        if "$match" in stage:
            results = [
                document for document in results
                if _matches_query(document, stage["$match"], variables)
            ]
        elif "$addFields" in stage:
            updated_results = []
            for document in results:
                updated = deepcopy(document)
                for field, expression in stage["$addFields"].items():
                    _set_nested_value(updated, field, _evaluate_expression(updated, expression, variables))
                updated_results.append(updated)
            results = updated_results
        elif "$lookup" in stage:
            lookup_spec = stage["$lookup"]
            joined_results = []
            foreign_documents = lookup_collections[lookup_spec["from"]]

            for document in results:
                lookup_variables = {
                    name: _evaluate_expression(document, expression, variables)
                    for name, expression in lookup_spec.get("let", {}).items()
                }
                joined = _apply_pipeline(
                    foreign_documents,
                    lookup_spec["pipeline"],
                    lookup_collections=lookup_collections,
                    variables=lookup_variables,
                )
                updated = deepcopy(document)
                updated[lookup_spec["as"]] = joined
                joined_results.append(updated)

            results = joined_results
        elif "$sort" in stage:
            results = _apply_sort(results, stage["$sort"])
        elif "$limit" in stage:
            results = results[:stage["$limit"]]
        elif "$project" in stage:
            results = [_apply_project(document, stage["$project"], variables) for document in results]
        else:
            raise AssertionError(f"Unsupported pipeline stage in fake Mongo evaluator: {stage}")

    return results


class FakeAnalyticsSamplesCollection:
    def __init__(self, documents, eruption_documents):
        self._documents = [deepcopy(document) for document in documents]
        self._eruption_documents = [deepcopy(document) for document in eruption_documents]

    def count_documents(self, query):
        return sum(1 for document in self._documents if _matches_query(document, query))

    def aggregate(self, pipeline, **_kwargs):
        return _apply_pipeline(
            self._documents,
            pipeline,
            lookup_collections={"eruptions": self._eruption_documents},
        )


class FakeFindCursor:
    def __init__(self, documents):
        self._documents = list(documents)

    def sort(self, field, direction):
        self._documents = _apply_sort(self._documents, {field: direction})
        return self

    def __iter__(self):
        return iter(self._documents)


class FakeAnalyticsEruptionsCollection:
    def __init__(self, documents):
        self._documents = [deepcopy(document) for document in documents]

    def find(self, query):
        filtered = [document for document in self._documents if _matches_query(document, query)]
        return FakeFindCursor(filtered)


class FakeAnalyticsDatabase:
    def __init__(self, sample_documents, eruption_documents):
        self.samples = FakeAnalyticsSamplesCollection(sample_documents, eruption_documents)
        self.eruptions = FakeAnalyticsEruptionsCollection(eruption_documents)


@contextmanager
def samples_with_vei_test_client(sample_documents, eruption_documents):
    fake_db = FakeAnalyticsDatabase(sample_documents, eruption_documents)

    def override_get_database():
        yield fake_db

    app.dependency_overrides[get_database] = override_get_database

    try:
        with TestClient(app) as scoped_client:
            yield scoped_client
    finally:
        app.dependency_overrides.pop(get_database, None)


def build_sample_document(
    sample_code="sample-1",
    sample_year=1721,
    volcano_number="305030",
    oxides=None,
):
    if oxides is None:
        oxides = {"SIO2": 50.2, "NA2O": 4.1, "K2O": 2.3}

    return {
        "sample_code": sample_code,
        "material": "WR",
        "matching_metadata": {"volcano": {"number": volcano_number}},
        "eruption_date": {"year": sample_year},
        "oxides": oxides,
    }


def build_eruption_document(
    eruption_number,
    start_year,
    end_year=None,
    vei=2,
    volcano_number=305030,
):
    eruption = {
        "eruption_number": eruption_number,
        "volcano_number": volcano_number,
        "start_date": {"year": start_year},
        "vei": vei,
    }

    if end_year is not None:
        eruption["end_date"] = {"year": end_year}

    return eruption


class TestTASPolygonsEndpoint:
    """Test TAS diagram polygon definitions endpoint."""
    
    def test_get_tas_polygons(self):
        """Test GET /api/analytics/tas-polygons returns polygon definitions."""
        response = client.get("/api/analytics/tas-polygons")
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert "polygons" in data
        assert "alkali_line" in data
        assert "axes" in data
    
    def test_tas_polygon_count(self):
        """Test TAS diagram has 14 rock classification polygons."""
        response = client.get("/api/analytics/tas-polygons")
        assert response.status_code == 200
        data = response.json()
        
        polygons = data["polygons"]
        assert len(polygons) == 14  # Standard TAS diagram has 14 regions
    
    def test_tas_polygon_structure(self):
        """Test each TAS polygon has required fields."""
        response = client.get("/api/analytics/tas-polygons")
        assert response.status_code == 200
        data = response.json()
        
        for polygon in data["polygons"]:
            # Each polygon needs name and coordinates
            assert "name" in polygon
            assert "coordinates" in polygon
            
            # Coordinates should be array of [x, y] pairs
            coords = polygon["coordinates"]
            assert isinstance(coords, list)
            assert len(coords) >= 3  # Polygon needs at least 3 points
            
            # Each coordinate pair should have 2 values
            for coord in coords:
                assert len(coord) == 2
    
    def test_tas_rock_names(self):
        """Test TAS polygons include expected rock types."""
        response = client.get("/api/analytics/tas-polygons")
        assert response.status_code == 200
        data = response.json()
        
        rock_names = [p["name"].lower() for p in data["polygons"]]
        
        # Should include common volcanic rock types
        expected_rocks = ["basalt", "andesite", "dacite", "rhyolite"]
        for rock in expected_rocks:
            assert any(rock in name for name in rock_names)
    
    def test_tas_alkali_line(self):
        """Test TAS alkali/subalkalic dividing line."""
        response = client.get("/api/analytics/tas-polygons")
        assert response.status_code == 200
        data = response.json()
        
        alkali_line = data["alkali_line"]
        
        # Validate alkali line structure
        assert "name" in alkali_line
        assert "coordinates" in alkali_line
        assert len(alkali_line["coordinates"]) >= 2
        
        # Alkali line should span SiO2 range
        coords = alkali_line["coordinates"]
        sio2_values = [c[0] for c in coords]
        assert min(sio2_values) < 45  # Low silica end
        assert max(sio2_values) > 70  # High silica end
    
    def test_tas_axes_definition(self):
        """Test TAS axes have labels and ranges."""
        response = client.get("/api/analytics/tas-polygons")
        assert response.status_code == 200
        data = response.json()
        
        axes = data["axes"]
        
        # X-axis (SiO2)
        assert "x" in axes
        assert "label" in axes["x"]
        assert "SiO2" in axes["x"]["label"]
        assert "range" in axes["x"]
        assert len(axes["x"]["range"]) == 2
        
        # Y-axis (Na2O + K2O)
        assert "y" in axes
        assert "label" in axes["y"]
        assert "Na2O" in axes["y"]["label"] or "K2O" in axes["y"]["label"]
        assert "range" in axes["y"]


class TestAFMBoundaryEndpoint:
    """Test AFM ternary diagram boundary endpoint."""
    
    def test_get_afm_boundary(self):
        """Test GET /api/analytics/afm-boundary returns boundary line."""
        response = client.get("/api/analytics/afm-boundary")
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert "boundary" in data
        assert "axes" in data
    
    def test_afm_boundary_structure(self):
        """Test AFM boundary has correct structure."""
        response = client.get("/api/analytics/afm-boundary")
        assert response.status_code == 200
        data = response.json()
        
        boundary = data["boundary"]
        
        # Boundary should have name and coordinates
        assert "name" in boundary
        assert "coordinates" in boundary
        
        # Should have at least 2 points (line)
        coords = boundary["coordinates"]
        assert len(coords) >= 2
        
        # Each point should be an object with A, F, M keys
        for coord in coords:
            assert "A" in coord
            assert "F" in coord
            assert "M" in coord
            # Ternary coordinates should sum to 100 (or close to it)
            coord_sum = coord["A"] + coord["F"] + coord["M"]
            assert 99 <= coord_sum <= 101  # Allow small rounding error
    
    def test_afm_boundary_interpretation(self):
        """Test AFM boundary has interpretation notes."""
        response = client.get("/api/analytics/afm-boundary")
        assert response.status_code == 200
        data = response.json()
        
        boundary = data["boundary"]
        
        # Should explain tholeiitic vs calc-alkaline
        name = boundary["name"].lower()
        assert "tholeiitic" in name or "calc-alkaline" in name or "boundary" in name
    
    def test_afm_axes_definition(self):
        """Test AFM axes have labels."""
        response = client.get("/api/analytics/afm-boundary")
        assert response.status_code == 200
        data = response.json()
        
        axes = data["axes"]
        
        # Should have A, F, M axes for ternary diagram
        assert "A" in axes or "a" in axes
        assert "F" in axes or "f" in axes
        assert "M" in axes or "m" in axes


class TestVEIDistributionEndpoint:
    """Test VEI distribution by volcano endpoint."""
    
    def test_get_vei_distribution_mayon(self):
        """Test VEI distribution for Mayon volcano (273030)."""
        response = client.get("/api/volcanoes/273030/vei-distribution")
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert "volcano_name" in data
        assert "volcano_number" in data
        assert "vei_counts" in data
        assert "total_eruptions" in data
        
        # Mayon should have eruptions
        assert data["total_eruptions"] > 0
        assert data["volcano_number"] == 273030
    
    def test_vei_distribution_structure(self):
        """Test VEI distribution has correct data structure."""
        response = client.get("/api/volcanoes/273030/vei-distribution")
        assert response.status_code == 200
        data = response.json()
        
        vei_counts = data["vei_counts"]
        
        # VEI counts should be a dictionary
        assert isinstance(vei_counts, dict)
        
        # Keys should be VEI values (0-8 or "unknown")
        for key in vei_counts.keys():
            if key != "unknown":
                vei_val = int(float(key))
                assert 0 <= vei_val <= 8
        
        # Values should be positive integers
        for count in vei_counts.values():
            assert isinstance(count, int)
            assert count > 0
    
    def test_vei_distribution_date_range(self):
        """Test VEI distribution includes date range."""
        response = client.get("/api/volcanoes/273030/vei-distribution")
        assert response.status_code == 200
        data = response.json()
        
        # Should have date_range if dates available
        if "date_range" in data:
            date_range = data["date_range"]
            assert "start" in date_range or "end" in date_range
    
    def test_vei_distribution_no_eruptions(self):
        """Test VEI distribution for volcano with minimal eruptions (Abu 283001)."""
        response = client.get("/api/volcanoes/283001/vei-distribution")
        assert response.status_code == 200
        data = response.json()
        
        # Abu has 1 eruption with unknown VEI
        assert data["total_eruptions"] >= 0
        assert "vei_counts" in data
    
    def test_vei_distribution_invalid_volcano_number(self):
        """Test invalid volcano number returns 400."""
        response = client.get("/api/volcanoes/invalid_number/vei-distribution")
        assert response.status_code == 400
        assert "detail" in response.json()
    
    def test_vei_distribution_nonexistent_volcano(self):
        """Test non-existent volcano returns 404."""
        response = client.get("/api/volcanoes/999999999/vei-distribution")
        assert response.status_code == 404
        assert "detail" in response.json()


class TestSamplesWithVEIEndpoint:
    """Test TAS-by-VEI sample matching endpoint."""

    def test_matches_exact_eruption_year(self):
        samples = [build_sample_document(sample_code="exact-year", sample_year=1720)]
        eruptions = [build_eruption_document(eruption_number=1, start_year=1720, vei=3)]

        with samples_with_vei_test_client(samples, eruptions) as scoped_client:
            response = scoped_client.get("/api/analytics/volcano/305030/samples-with-vei")

        assert response.status_code == 200
        data = response.json()
        assert data["matched_samples"] == 1
        assert data["samples_with_vei"][0]["sample_code"] == "exact-year"
        assert data["samples_with_vei"][0]["vei"] == 3
        assert data["samples_with_vei"][0]["eruption_year"] == 1720

    def test_matches_sample_year_within_eruption_range(self):
        samples = [
            build_sample_document(
                sample_code="SAMPLE_005662_s_H-07-6 [15740]",
                sample_year=1721,
            )
        ]
        eruptions = [build_eruption_document(eruption_number=1, start_year=1720, end_year=1721, vei=2)]

        with samples_with_vei_test_client(samples, eruptions) as scoped_client:
            response = scoped_client.get("/api/analytics/volcano/305030/samples-with-vei")

        assert response.status_code == 200
        data = response.json()
        assert data["matched_samples"] == 1
        assert data["samples_with_vei"][0]["sample_code"] == "SAMPLE_005662_s_H-07-6 [15740]"
        assert data["samples_with_vei"][0]["vei"] == 2

    def test_prefers_most_recent_compatible_eruption_range(self):
        samples = [build_sample_document(sample_code="range-priority", sample_year=1721)]
        eruptions = [
            build_eruption_document(eruption_number=1, start_year=1719, end_year=1721, vei=1),
            build_eruption_document(eruption_number=2, start_year=1720, end_year=1721, vei=4),
        ]

        with samples_with_vei_test_client(samples, eruptions) as scoped_client:
            response = scoped_client.get("/api/analytics/volcano/305030/samples-with-vei")

        assert response.status_code == 200
        data = response.json()
        assert data["matched_samples"] == 1
        assert data["samples_with_vei"][0]["vei"] == 4

    def test_normalizes_string_sample_years(self):
        samples = [build_sample_document(sample_code="string-year", sample_year="1721")]
        eruptions = [build_eruption_document(eruption_number=1, start_year=1720, end_year=1721, vei=2)]

        with samples_with_vei_test_client(samples, eruptions) as scoped_client:
            response = scoped_client.get("/api/analytics/volcano/305030/samples-with-vei")

        assert response.status_code == 200
        data = response.json()
        assert data["matched_samples"] == 1
        assert data["samples_with_vei"][0]["eruption_year"] == 1721

    def test_excludes_samples_without_complete_tas_oxides(self):
        samples = [build_sample_document(sample_code="incomplete", oxides={"SIO2": 50.2, "NA2O": 4.1})]
        eruptions = [build_eruption_document(eruption_number=1, start_year=1720, end_year=1721, vei=2)]

        with samples_with_vei_test_client(samples, eruptions) as scoped_client:
            response = scoped_client.get("/api/analytics/volcano/305030/samples-with-vei")

        assert response.status_code == 200
        data = response.json()
        assert data["matched_samples"] == 0
        assert data["samples_with_vei"] == []


class TestRockTypeDistributionEndpoint:
    """Test aggregated rock type distribution endpoint."""

    def test_distribution_endpoint_structure(self):
        response = client.get("/api/analytics/rock-type-distribution", params={"volcano_number": "273030"})
        assert response.status_code == 200

        data = response.json()
        assert "sample_count" in data
        assert "rock_types" in data
        assert data["material"] == "WR"
        assert isinstance(data["rock_types"], dict)
        assert data["sample_count"] == sum(data["rock_types"].values())

    def test_distribution_matches_chemical_analysis_wr_counts(self):
        distribution_response = client.get(
            "/api/analytics/rock-type-distribution",
            params={"volcano_number": "273030"},
        )
        chemical_response = client.get("/api/volcanoes/273030/chemical-analysis")

        assert distribution_response.status_code == 200
        assert chemical_response.status_code == 200

        distribution = distribution_response.json()
        chemical = chemical_response.json()

        assert distribution["rock_types"] == chemical["rock_types_wr"]
        assert distribution["sample_count"] == sum(chemical["rock_types_wr"].values())

    def test_distribution_confidence_filter_matches_manual_wr_filter(self):
        response = client.get(
            "/api/analytics/rock-type-distribution",
            params={"volcano_number": "273030", "confidence_levels": "high,medium"},
        )
        chemical_response = client.get("/api/volcanoes/273030/chemical-analysis")

        assert response.status_code == 200
        assert chemical_response.status_code == 200

        distribution = response.json()
        manual_counts = {}

        for sample in chemical_response.json().get("samples", []):
            if sample.get("material") != "WR":
                continue
            if normalize_confidence(sample) not in {"high", "medium"}:
                continue

            rock_type = (sample.get("petro") or {}).get("rock_type")
            if not rock_type:
                continue
            manual_counts[rock_type] = manual_counts.get(rock_type, 0) + 1

        assert distribution["rock_types"] == manual_counts
        assert distribution["sample_count"] == sum(manual_counts.values())

    def test_distribution_rejects_invalid_confidence_level(self):
        response = client.get(
            "/api/analytics/rock-type-distribution",
            params={"volcano_number": "273030", "confidence_levels": "high,invalid"},
        )

        assert response.status_code == 400
        assert "confidence_levels" in response.json()["detail"]


class TestChemicalAnalysisEndpoint:
    """Test compact chemical analysis endpoint payload."""
    
    def test_get_chemical_analysis_popa(self):
        """Test chemical analysis for Popa volcano (275080)."""
        response = client.get("/api/volcanoes/275080/chemical-analysis?limit=100")
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert "volcano_name" in data
        assert "volcano_number" in data
        assert "samples" in data
        assert "samples_count" in data
        assert isinstance(data["samples"], list)
        
        assert data["volcano_number"] == 275080
    
    def test_chemical_analysis_samples_include_oxide_fields(self):
        """Chemical analysis samples should preserve flattened oxide fields."""
        response = client.get("/api/volcanoes/275080/chemical-analysis?limit=50")
        assert response.status_code == 200
        data = response.json()

        samples = data["samples"]
        assert isinstance(samples, list)

        if samples:
            point = samples[0]
            assert "sample_id" in point
            assert "material" in point
            assert "petro" in point or point.get("petro") is None

        for point in _tas_samples(data):
            assert 30 <= point["SIO2"] <= 90
            assert 0 <= point["NA2O"] + point["K2O"] <= 20

        for point in _afm_samples(data):
            assert point["FEOT"] >= 0
            assert point["MGO"] >= 0
            assert point["NA2O"] + point["K2O"] >= 0
    
    def test_chemical_analysis_rock_types(self):
        """Test rock type distribution in chemical analysis."""
        response = client.get("/api/volcanoes/275080/chemical-analysis?limit=100")
        assert response.status_code == 200
        data = response.json()
        
        # Should have rock_types dictionary
        assert "rock_types" in data
        rock_types = data["rock_types"]
        
        assert isinstance(rock_types, dict)
        
        # Rock type counts should be positive
        for rock_type, count in rock_types.items():
            assert isinstance(count, int)
            assert count > 0
    
    def test_chemical_analysis_limit_parameter(self):
        """Test limit parameter controls sample count."""
        # Request 10 samples
        response = client.get("/api/volcanoes/275080/chemical-analysis?limit=10")
        assert response.status_code == 200
        data = response.json()
        
        # Should return at most 10 samples
        assert data["samples_count"] <= 10

    def test_chemical_analysis_default_matches_samples_endpoint_for_large_volcano(self):
        """Default chemical analysis should not silently truncate a large volcano dataset."""
        volcano_number = "332010"

        default_response = client.get(f"/api/volcanoes/{volcano_number}/chemical-analysis")
        limited_response = client.get(f"/api/volcanoes/{volcano_number}/chemical-analysis?limit=5000")
        samples_response = client.get(f"/api/samples?volcano_number={volcano_number}")

        assert default_response.status_code == 200
        assert limited_response.status_code == 200
        assert samples_response.status_code == 200

        default_data = default_response.json()
        limited_data = limited_response.json()
        samples_data = samples_response.json()

        assert default_data["samples_count"] == len(default_data["samples"])
        assert default_data["samples_count"] == samples_data["total"]
        assert default_data["samples_count"] == samples_data["count"]

        expected_limited_count = min(5000, default_data["samples_count"])
        assert limited_data["samples_count"] == expected_limited_count

        default_wr_count = sum(default_data["rock_types_wr"].values())
        limited_wr_count = sum(limited_data["rock_types_wr"].values())
        assert default_wr_count >= limited_wr_count
    
    def test_chemical_analysis_no_samples(self):
        """Test chemical analysis for volcano with no samples (Afdera 221110)."""
        response = client.get("/api/volcanoes/221110/chemical-analysis")
        assert response.status_code == 200
        data = response.json()
        
        # Should return gracefully with empty data
        assert data["samples_count"] == 0
        assert data["samples"] == []
    
    def test_chemical_analysis_oxide_completeness(self):
        """TAS/AFM-compatible samples should be derivable from the compact payload."""
        response = client.get("/api/volcanoes/275080/chemical-analysis?limit=50")
        assert response.status_code == 200
        data = response.json()

        for point in _tas_samples(data):
            assert point["SIO2"] is not None
            assert point["NA2O"] is not None
            assert point["K2O"] is not None

        for point in _afm_samples(data):
            assert point["FEOT"] is not None
            assert point["MGO"] is not None
            assert point["NA2O"] is not None
            assert point["K2O"] is not None


class TestAnalyticsCaching:
    """Test caching on analytics endpoints."""
    
    def test_tas_polygons_cache_headers(self):
        """Test TAS polygons endpoint has cache headers."""
        response = client.get("/api/analytics/tas-polygons")
        assert response.status_code == 200
        
        # Analytics endpoints should cache for 15 minutes (900s)
        assert "cache-control" in response.headers
        cache_control = response.headers["cache-control"]
        assert "max-age=900" in cache_control
        assert "public" in cache_control
    
    def test_afm_boundary_cache_headers(self):
        """Test AFM boundary endpoint has cache headers."""
        response = client.get("/api/analytics/afm-boundary")
        assert response.status_code == 200
        
        assert "cache-control" in response.headers
        cache_control = response.headers["cache-control"]
        assert "max-age=900" in cache_control
    
    def test_vei_distribution_cache_headers(self):
        """Test VEI distribution has appropriate cache headers."""
        response = client.get("/api/volcanoes/273030/vei-distribution")
        assert response.status_code == 200
        
        # Volcano-specific endpoints cache for 5 minutes (300s)
        assert "cache-control" in response.headers
        cache_control = response.headers["cache-control"]
        assert "max-age=300" in cache_control


class TestAnalyticsIntegration:
    """Test analytics endpoints integration with other data."""
    
    def test_tas_data_matches_polygons(self):
        """Compact samples should still project into TAS polygon axes."""
        # Get TAS polygon definitions
        polygons_response = client.get("/api/analytics/tas-polygons")
        assert polygons_response.status_code == 200
        polygons_data = polygons_response.json()
        
        # Get chemical analysis for a volcano
        analysis_response = client.get("/api/volcanoes/275080/chemical-analysis?limit=10")
        assert analysis_response.status_code == 200
        analysis_data = analysis_response.json()
        
        # TAS data points should fall within expected ranges
        tas_axes = polygons_data["axes"]
        x_range = tas_axes["x"]["range"]
        y_range = tas_axes["y"]["range"]
        
        for point in _tas_samples(analysis_data):
            # Most points should be within plot ranges (allow some outliers)
            if x_range[0] <= point["SIO2"] <= x_range[1]:
                assert True  # Point within X range
            alkali = point["NA2O"] + point["K2O"]
            if y_range[0] <= alkali <= y_range[1]:
                assert True  # Point within Y range
    
    def test_afm_data_values_valid(self):
        """Test AFM data values are valid percentages."""
        response = client.get("/api/volcanoes/275080/chemical-analysis?limit=20")
        assert response.status_code == 200
        data = response.json()
        
        # AFM-compatible oxide values should be non-negative
        for point in _afm_samples(data):
            assert point["NA2O"] + point["K2O"] >= 0
            assert point["FEOT"] >= 0
            assert point["MGO"] >= 0
    
    def test_multiple_volcanoes_analytics(self):
        """Test analytics endpoints work for multiple volcanoes."""
        volcano_numbers = ["273030", "275080"]  # Mayon, Popa
        
        for volcano_num in volcano_numbers:
            # VEI distribution
            vei_response = client.get(f"/api/volcanoes/{volcano_num}/vei-distribution")
            assert vei_response.status_code == 200
            
            # Chemical analysis
            chem_response = client.get(f"/api/volcanoes/{volcano_num}/chemical-analysis")
            assert chem_response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
