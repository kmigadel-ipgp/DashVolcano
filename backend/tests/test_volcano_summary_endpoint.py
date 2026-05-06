import re

import pytest
from fastapi.testclient import TestClient

from backend.dependencies import get_database
from backend.main import app


class FakeCursor:
    def __init__(self, documents):
        self._documents = list(documents)

    def limit(self, limit):
        if limit is not None:
            self._documents = self._documents[:limit]
        return self

    def skip(self, offset):
        if offset > 0:
            self._documents = self._documents[offset:]
        return self

    def batch_size(self, _size):
        return self

    def __iter__(self):
        return iter(self._documents)


class FakeVolcanoCollection:
    def __init__(self, documents):
        self._documents = list(documents)
        self.last_query = None
        self.last_projection = None

    def find(self, query, projection):
        self.last_query = query
        self.last_projection = projection

        volcano_name_filter = query.get("volcano_name")
        filtered_documents = self._documents

        if volcano_name_filter:
            flags = re.IGNORECASE if "i" in volcano_name_filter.get("$options", "") else 0
            pattern = re.compile(volcano_name_filter["$regex"], flags)
            filtered_documents = [
                document.copy()
                for document in self._documents
                if pattern.search(document.get("volcano_name", ""))
            ]
        else:
            filtered_documents = [document.copy() for document in self._documents]

        return FakeCursor(filtered_documents)


class FakeDatabase:
    def __init__(self, documents):
        self.volcanoes = FakeVolcanoCollection(documents)


@pytest.fixture
def client_and_db():
    fake_db = FakeDatabase(
        [
            {
                "_id": 1,
                "volcano_number": 281110,
                "volcano_name": "Zaozan [Zaosan]",
                "country": "Japan",
                "region": "Honshu",
                "primary_volcano_type": "Stratovolcano",
                "geometry": {"type": "Point", "coordinates": [140.44, 38.14]},
            },
            {
                "_id": 2,
                "volcano_number": 282001,
                "volcano_name": "Mount Fuji",
                "country": "Japan",
                "region": "Honshu",
                "primary_volcano_type": "Stratovolcano",
                "geometry": {"type": "Point", "coordinates": [138.73, 35.36]},
            },
        ]
    )

    def override_get_database():
        yield fake_db

    app.dependency_overrides[get_database] = override_get_database

    with TestClient(app) as client:
        yield client, fake_db

    app.dependency_overrides.pop(get_database, None)


def test_summary_treats_bracketed_volcano_name_as_literal(client_and_db):
    client, fake_db = client_and_db
    target_name = "Zaozan [Zaosan]"

    response = client.get("/api/volcanoes/summary", params={"volcano_name": target_name})

    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 1
    assert data["data"][0]["volcano_name"] == target_name
    assert fake_db.volcanoes.last_query["volcano_name"]["$regex"] == re.escape(target_name)
    assert fake_db.volcanoes.last_query["volcano_name"]["$options"] == "i"


def test_summary_keeps_case_insensitive_partial_search(client_and_db):
    client, fake_db = client_and_db

    response = client.get("/api/volcanoes/summary", params={"volcano_name": "zaosan"})

    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 1
    assert data["data"][0]["volcano_name"] == "Zaozan [Zaosan]"
    assert fake_db.volcanoes.last_query["volcano_name"]["$regex"] == re.escape("zaosan")