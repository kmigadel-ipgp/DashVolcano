"""
FastAPI dependencies for dependency injection
Provides database connections and shared resources
"""
from typing import Generator
from pymongo import MongoClient
from pymongo.database import Database

from backend.config import settings


# Global MongoDB client (singleton)
_mongo_client: MongoClient = None


def get_mongo_client() -> MongoClient:
    """Get or create MongoDB client singleton"""
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = MongoClient(settings.mongodb_uri)
    return _mongo_client


def get_database() -> Generator[Database, None, None]:
    """
    FastAPI dependency to get database instance
    
    Usage:
        @app.get("/endpoint")
        async def endpoint(db: Database = Depends(get_database)):
            # Use db here
    """
    client = get_mongo_client()
    db = client[settings.MONGO_DB]
    try:
        yield db
    finally:
        # Connection is kept alive (connection pooling)
        pass


def close_mongo_connection():
    """Close MongoDB connection (call on shutdown)"""
    global _mongo_client
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None
