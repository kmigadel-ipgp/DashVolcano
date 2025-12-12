#!/usr/bin/env python3
"""
Create missing MongoDB indexes for optimal query performance across all collections
Run this script to add indexes for volcanoes, eruptions, and samples collections
"""
import sys
sys.path.insert(0, '/root/DashVolcano/backend')
from config import settings
from pymongo import MongoClient, ASCENDING, DESCENDING, TEXT
import time

def create_indexes():
    """Create indexes on all collections for common query patterns"""
    
    print("Connecting to MongoDB...")
    client = MongoClient(settings.mongodb_uri)
    db = client[settings.MONGO_DB]
    
    print(f"Database: {settings.MONGO_DB}")
    print(f"Collections: samples, volcanoes, eruptions")
    
    # ========== VOLCANOES COLLECTION ==========
    print("\n" + "=" * 70)
    print("VOLCANOES COLLECTION INDEXES")
    print("=" * 70)
    
    volcanoes_indexes = [
        {
            "name": "volcano_number_1",
            "keys": [("volcano_number", ASCENDING)],
            "unique": True,
            "background": True
        },
        {
            "name": "volcano_name_1",
            "keys": [("volcano_name", ASCENDING)],
            "background": True
        },
        {
            "name": "country_1",
            "keys": [("country", ASCENDING)],
            "background": True
        },
        {
            "name": "region_1",
            "keys": [("region", ASCENDING)],
            "background": True
        },
        {
            "name": "tectonic_setting_1",
            "keys": [("tectonic_setting", ASCENDING)],
            "background": True
        },
        # Compound indexes for common query combinations
        {
            "name": "country_1_region_1",
            "keys": [("country", ASCENDING), ("region", ASCENDING)],
            "background": True
        },
    ]
    
    print(f"\nCreating indexes on 'volcanoes' collection...")
    for idx_spec in volcanoes_indexes:
        try:
            name = idx_spec["name"]
            existing = list(db.volcanoes.list_indexes())
            if any(idx['name'] == name for idx in existing):
                print(f"  ✓ Index '{name}' already exists")
                continue
            
            print(f"  Creating '{name}'...", end=" ")
            start = time.time()
            db.volcanoes.create_index(
                idx_spec["keys"],
                name=name,
                unique=idx_spec.get("unique", False),
                background=idx_spec.get("background", True)
            )
            elapsed = time.time() - start
            print(f"✓ ({elapsed:.2f}s)")
        except Exception as e:
            print(f"  ✗ Error: {e}")
    
    # ========== ERUPTIONS COLLECTION ==========
    print("\n" + "=" * 70)
    print("ERUPTIONS COLLECTION INDEXES")
    print("=" * 70)
    
    eruptions_indexes = [
        {
            "name": "eruption_number_1",
            "keys": [("eruption_number", ASCENDING)],
            "unique": True,
            "background": True
        },
        {
            "name": "vei_1",
            "keys": [("vei", ASCENDING)],
            "background": True,
            "sparse": True  # VEI can be null/missing
        },
        {
            "name": "start_date.year_1",
            "keys": [("start_date.year", ASCENDING)],
            "background": True,
            "sparse": True
        },
        # Compound indexes for filtering
        {
            "name": "volcano_number_1_vei_1",
            "keys": [("volcano_number", ASCENDING), ("vei", ASCENDING)],
            "background": True
        },
        {
            "name": "volcano_number_1_start_date.year_1",
            "keys": [("volcano_number", ASCENDING), ("start_date.year", ASCENDING)],
            "background": True
        },
    ]
    
    print(f"\nCreating indexes on 'eruptions' collection...")
    for idx_spec in eruptions_indexes:
        try:
            name = idx_spec["name"]
            existing = list(db.eruptions.list_indexes())
            if any(idx['name'] == name for idx in existing):
                print(f"  ✓ Index '{name}' already exists")
                continue
            
            print(f"  Creating '{name}'...", end=" ")
            start = time.time()
            db.eruptions.create_index(
                idx_spec["keys"],
                name=name,
                unique=idx_spec.get("unique", False),
                background=idx_spec.get("background", True),
                sparse=idx_spec.get("sparse", False)
            )
            elapsed = time.time() - start
            print(f"✓ ({elapsed:.2f}s)")
        except Exception as e:
            print(f"  ✗ Error: {e}")
    
    # ========== SAMPLES COLLECTION (additional indexes) ==========
    print("\n" + "=" * 70)
    print("SAMPLES COLLECTION - ADDITIONAL INDEXES")
    print("=" * 70)
    
    samples_additional_indexes = [
        {
            "name": "eruption_date.year_1",
            "keys": [("eruption_date.year", ASCENDING)],
            "background": True,
            "sparse": True
        },
        {
            "name": "material_1",
            "keys": [("material", ASCENDING)],
            "background": True
        },
    ]
    
    print(f"\nCreating additional indexes on 'samples' collection...")
    for idx_spec in samples_additional_indexes:
        try:
            name = idx_spec["name"]
            existing = list(db.samples.list_indexes())
            if any(idx['name'] == name for idx in existing):
                print(f"  ✓ Index '{name}' already exists")
                continue
            
            print(f"  Creating '{name}'...", end=" ")
            start = time.time()
            db.samples.create_index(
                idx_spec["keys"],
                name=name,
                background=idx_spec.get("background", True),
                sparse=idx_spec.get("sparse", False)
            )
            elapsed = time.time() - start
            print(f"✓ ({elapsed:.2f}s)")
        except Exception as e:
            print(f"  ✗ Error: {e}")
    
    # ========== SUMMARY ==========
    print("\n" + "=" * 70)
    print("FINAL INDEX SUMMARY")
    print("=" * 70)
    
    print("\n### SAMPLES COLLECTION ###")
    for idx in db.samples.list_indexes():
        print(f"  - {idx['name']}")
    
    print("\n### VOLCANOES COLLECTION ###")
    for idx in db.volcanoes.list_indexes():
        print(f"  - {idx['name']}")
    
    print("\n### ERUPTIONS COLLECTION ###")
    for idx in db.eruptions.list_indexes():
        print(f"  - {idx['name']}")
    
    print("\n✓ Index creation complete!")
    client.close()

if __name__ == "__main__":
    create_indexes()
