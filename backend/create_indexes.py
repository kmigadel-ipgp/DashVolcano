#!/usr/bin/env python3
"""
Create MongoDB indexes for optimal query performance
Run this script once to set up indexes on the samples collection
"""
import sys
sys.path.insert(0, '/root/DashVolcano/backend')
from config import settings
from pymongo import MongoClient, ASCENDING, DESCENDING
import time

def create_indexes():
    """Create indexes on the samples collection for common query patterns"""
    
    print("Connecting to MongoDB...")
    client = MongoClient(settings.mongodb_uri)
    db = client[settings.MONGO_DB]
    samples = db.samples
    
    print(f"Database: {settings.MONGO_DB}")
    print(f"Collection: samples")
    print(f"Total documents: {samples.count_documents({})}")
    
    # List existing indexes
    print("\n=== Existing Indexes ===")
    for idx in samples.list_indexes():
        print(f"  - {idx['name']}: {idx['key']}")
    
    print("\n=== Creating New Indexes ===")
    
    indexes_to_create = [
        # Single field indexes for common filters
        {
            "name": "rock_type_1",
            "keys": [("rock_type", ASCENDING)],
            "background": True
        },
        {
            "name": "db_1", 
            "keys": [("db", ASCENDING)],
            "background": True
        },
        {
            "name": "tectonic_setting_1",
            "keys": [("tectonic_setting", ASCENDING)],
            "background": True
        },
        {
            "name": "matching_metadata.volcano_number_1",
            "keys": [("matching_metadata.volcano_number", ASCENDING)],
            "background": True
        },
        
        # Compound indexes for common query combinations
        {
            "name": "rock_type_1_db_1",
            "keys": [("rock_type", ASCENDING), ("db", ASCENDING)],
            "background": True
        },
        {
            "name": "rock_type_1_tectonic_setting_1",
            "keys": [("rock_type", ASCENDING), ("tectonic_setting", ASCENDING)],
            "background": True
        },
        {
            "name": "db_1_rock_type_1_geometry_2dsphere",
            "keys": [("db", ASCENDING), ("rock_type", ASCENDING), ("geometry", "2dsphere")],
            "background": True
        },
        
        # Index for SiO2 filtering
        {
            "name": "oxides.SIO2(WT%)_1",
            "keys": [("oxides.SIO2(WT%)", ASCENDING)],
            "background": True,
            "sparse": True  # Only index documents that have this field
        },
    ]
    
    for idx_spec in indexes_to_create:
        try:
            name = idx_spec["name"]
            
            # Check if index already exists
            existing = list(samples.list_indexes())
            if any(idx['name'] == name for idx in existing):
                print(f"  ✓ Index '{name}' already exists, skipping")
                continue
            
            print(f"  Creating index '{name}'...", end=" ")
            start = time.time()
            
            samples.create_index(
                idx_spec["keys"],
                name=name,
                background=idx_spec.get("background", True),
                sparse=idx_spec.get("sparse", False)
            )
            
            elapsed = time.time() - start
            print(f"✓ Done ({elapsed:.2f}s)")
            
        except Exception as e:
            print(f"  ✗ Error creating index '{name}': {e}")
    
    print("\n=== Final Index List ===")
    for idx in samples.list_indexes():
        print(f"  - {idx['name']}")
    
    print("\n✓ Index creation complete!")
    client.close()

if __name__ == "__main__":
    create_indexes()
