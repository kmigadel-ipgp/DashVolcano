from fastapi.testclient import TestClient
import pytest

from backend.dependencies import get_database
from backend.main import app


class FakeCollection:
    def __init__(self, values_by_field):
        self._values_by_field = values_by_field
        self.last_distinct_field = None

    def distinct(self, field):
        self.last_distinct_field = field
        return list(self._values_by_field.get(field, []))


class FakeDatabase:
    def __init__(self):
        self.samples = FakeCollection(
            {
                "tecto.volcano_ui": [
                    "Subduction zone / Oceanic crust (< 15 km)",
                    "unknown",
                    "Subduction zone / Oceanic crust (< 15 km)",
                    None,
                ],
                "tecto.ui": [
                    "Convergent Margins",
                    "Ocean Island Groups",
                ],
            }
        )
        self.volcanoes = FakeCollection({"tectonic_setting.ui": []})


@pytest.fixture
def client_and_db():
    fake_db = FakeDatabase()

    def override_get_database():
        yield fake_db

    app.dependency_overrides[get_database] = override_get_database

    with TestClient(app) as client:
        yield client, fake_db

    app.dependency_overrides.pop(get_database, None)


def test_sample_tectonic_settings_endpoint_uses_volcano_aligned_taxonomy(client_and_db):
    client, fake_db = client_and_db

    response = client.get("/api/metadata/tectonic-settings-samples")

    assert response.status_code == 200
    payload = response.json()
    assert fake_db.samples.last_distinct_field == "tecto.volcano_ui"
    assert payload["count"] == 2
    assert payload["data"] == [
        "Subduction zone / Oceanic crust (< 15 km)",
        "unknown",
    ]