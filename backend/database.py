from pymongo import MongoClient
import pandas as pd
from functools import cached_property
from helpers.helpers import first_three_unique


class Database:
    def __init__(self, config: dict):
        """Initialize MongoDB client with the provided config."""
        uri = f"mongodb+srv://{config['user']}:{config['password']}@{config['cluster']}/?retryWrites=true&w=majority"
        client = MongoClient(uri)
        self.db = client[config["db_name"]]

        self.match_wr_stage = {"$match": {"material": "WR"}}

        self.group_rock_location_stage = {
            "$group": {
                "_id": {
                    "rock": "$rock", "db": "$db", "material": "$material",
                    "latitude": "$latitude", "longitude": "$longitude"
                },
                "db": {"$first": "$db"},
                "count": {"$sum": 1}
            }
        }

        self.sort_stage = {"$sort": {"count": -1}}

        self.add_coordinates = [
            {"$lookup": {
                "from": "locations",
                "localField": "location_id",
                "foreignField": "_id",
                "as": "location_info"
            }},
            {"$unwind": "$location_info"},
            {"$addFields": {
                "latitude": "$location_info.latitude",
                "longitude": "$location_info.longitude"
            }},
            {"$unset": "location_info"}
        ]

    # ---------- Cached Volcano Map ---------- #

    @cached_property
    def volcano_id_map(self) -> dict:
        """Map volcano name (w/ ID) → volcano_number."""
        df = self.get_volcanoes()
        return {
            f"{row['volcano_name']} ({row['volcano_number']})": row['volcano_number']
            for _, row in df.iterrows()
        }

    def _match_volcano_ids(self, volcano_names: list[str]) -> list:
        return [
            self.volcano_id_map[name]
            for name in volcano_names or []
            if name in self.volcano_id_map
        ]

    def _get_location_ids(self, location_selected: list[dict]) -> list:
        locations = list(self.db.locations.aggregate([
            {"$match": {"$or": location_selected}}
        ]))
        return [loc["_id"] for loc in locations]

    def _get_oxide_fields(self) -> dict:
        oxides = [
            "SIO2", "TIO2", "AL2O3", "FEOT", "FE2O3", "MNO", "FEO",
            "CAO", "MGO", "K2O", "NA2O", "P2O5", "LOI"
        ]
        return {f"{ox}(WT%)": f"$oxides.{ox}(WT%)" for ox in oxides}
    
    # --- Shared helper pipelines (add to the Database class) --- #

    def _join_volcano_and_vei(self) -> list:
        """Returns the lookup/unwind/join pipeline to enrich with volcano and VEI eruption info."""
        return [
            {"$lookup": {
                "from": "volcanoes",
                "localField": "volcano_number",
                "foreignField": "volcano_number",
                "as": "volcano_info"
            }},
            {"$unwind": "$volcano_info"},
            {"$lookup": {
                "from": "eruptions",
                "let": {"eruption_nums": {"$ifNull": ["$eruption_numbers.eruption_number", []]}},
                "pipeline": [
                    {"$match": {"$expr": {"$in": ["$eruption_number", "$$eruption_nums"]}}}
                ],
                "as": "vei_eruptions"
            }},
        ]

    def _enrich_sample_fields(self) -> dict:
        """Returns $addFields stage to enrich samples with metadata and oxides."""
        return {
            "$addFields": {
                "year": "$date.year",
                "month": "$date.month",
                "day": "$date.day",
                "uncertainty_days": "$date.uncertainty_days",
                "vei": "$vei_eruptions.vei",
                "volcano_name": "$volcano_info.volcano_name",
                "eruptions": "$eruption_numbers.eruption_number",
                **self._get_oxide_fields()
            }
        }


    # ---------- Basic Collection Loaders ---------- #

    def get_samples(self) -> pd.DataFrame:
        return pd.DataFrame(self.db.samples.find())

    def get_volcanoes(self) -> pd.DataFrame:
        return pd.DataFrame(self.db.volcanoes.find())

    def get_eruptions(self) -> pd.DataFrame:
        return pd.DataFrame(self.db.eruptions.find())

    def get_countries(self) -> list:
        return self.db.volcanoes.distinct("country")

    def get_tectonic_settings(self) -> list:
        return self.db.volcanoes.distinct("tectonic_setting")

    def get_volcano_names(self) -> list:
        return self.db.volcanoes.distinct("volcano_name")

    # ---------- Volcano Filtering ---------- #

    def _build_volcano_id_map(self) -> dict:
        df = self.get_volcanoes()
        return {
            f"{row['volcano_name']} ({row['volcano_number']})": row['volcano_number']
            for _, row in df.iterrows()
        }

    def filter_volcanoes_by_selection(self, volcano_names=None, countries=None, tectonic_setting=None) -> pd.DataFrame:
        """Return volcanoes matching selection filters."""
        pipeline = []

        if tectonic_setting:
            pipeline.append({"$match": {"tectonic_setting": {"$in": tectonic_setting}}})
        if countries:
            pipeline.append({"$match": {"country": {"$in": countries}}})
        if volcano_names:
            pipeline.append({"$match": {"volcano_number": {"$in": self._match_volcano_ids(volcano_names)}}})
            
        pipeline += self.add_coordinates
        pipeline += [
            {"$addFields": {
                "reference": "Global Volcanism Program, Smithsonian Institution (https://volcano.si.edu/)"
            }},
            {"$match": {"latitude": {"$gte": -85, "$lte": 85}}}
        ]

        return pd.DataFrame(self.db.volcanoes.aggregate(pipeline))

    # ---------- Sample Filtering ---------- #

    def filter_samples_by_selection(self, volcano_names=None, selected_db=None, tectonic_setting=None, rock_density=None) -> pd.DataFrame:
        """Return samples matching filter criteria."""
        pipeline = []

        if selected_db:
            pipeline.append({"$match": {"db": {"$in": selected_db}}})
        if tectonic_setting:
            pipeline.append({"$match": {"tectonic_setting": {"$in": tectonic_setting}}})
        if volcano_names:
            pipeline.append({"$match": {"volcano_number": {"$in": self._match_volcano_ids(volcano_names)}}})
        if rock_density:
            pipeline.append({"$match": {"material": {"$ne": "INC"}}})
            filtered = [r for r in rock_density if r != 'SIO2(WT%)']
            if filtered:
                pipeline.append({"$match": {"rock": {"$in": filtered}}})

        # Add SIO2 and filter oxides in valid range
        pipeline += [
            {"$addFields": {"SIO2(WT%)": "$oxides.SIO2(WT%)"}},
            {"$match": {"SIO2(WT%)": {"$gte": 0, "$lte": 100}}},
            *self.add_coordinates
        ]

        df = pd.DataFrame(self.db.samples.aggregate(pipeline))
        if df.empty:
            return df

        df['material'] = df.get('material', pd.Series(dtype=str)).fillna("UNKNOWN")
        if 'name' in df:
            df['name'] = df['name'].apply(first_three_unique)
        if 'reference' in df:
            df['reference'] = df['reference'].apply(first_three_unique)

        return df

    # ---------- Location-Based Utilities ---------- #

    def get_location_selected(self, selected_idx, *args, **kwargs) -> list:
        """Return lat/lon dicts of selected sample locations."""
        df = self.filter_samples_by_selection(*args, **kwargs)
        grouped = df.groupby(['latitude', 'longitude', 'db']).size().reset_index(name='count')

        try:
            selected_rows = grouped.iloc[selected_idx]
            return [
                {"latitude": row["latitude"], "longitude": row["longitude"]}
                for _, row in selected_rows.iterrows()
            ]
        except IndexError:
            return []


    def get_selected_data(self, location_selected: list, volcano_names=None, selected_db=None) -> pd.DataFrame:
        """Return full sample docs matching selected lat/lon with volcano/eruptions joined."""
        if not location_selected:
            return None

        # Match location
        location_ids = self._get_location_ids(location_selected)
        if not location_ids:
            return None

        volcano_ids = self._match_volcano_ids(volcano_names)

        # Start pipeline with required matches
        pipeline = [
            {"$match": {"location_id": {"$in": location_ids}}},
            *([{"$match": {"db": {"$in": selected_db}}}] if selected_db else []),
            *([{"$match": {"volcano_number": {"$in": volcano_ids}}}] if volcano_ids else []),
            *self.add_coordinates,
            {"$lookup": {
                "from": "volcanoes",
                "localField": "volcano_number",
                "foreignField": "volcano_number",
                "as": "volcano_info"
            }},
            {"$unwind": "$volcano_info"},
            {"$lookup": {
                "from": "eruptions",
                "let": {"eruption_nums": {"$ifNull": ["$eruption_numbers.eruption_number", []]}},
                "pipeline": [{"$match": {"$expr": {"$in": ["$eruption_number", "$$eruption_nums"]}}}],
                "as": "vei_eruptions"
            }},
            {"$addFields": {
                "year": "$date.year",
                "month": "$date.month",
                "day": "$date.day",
                "uncertainty_days": "$date.uncertainty_days",
                "vei": "$vei_eruptions.vei",
                "volcano_name": "$volcano_info.volcano_name",
                "eruptions": "$eruption_numbers.eruption_number",
                **self._get_oxide_fields()
            }},
            {"$unset": ["volcano_info", "vei_eruptions"]}
        ]

        return pd.DataFrame(self.db.samples.aggregate(pipeline))


    def aggregate_wr_data(self, min_value, max_value, select_value, tectonic_setting) -> pd.DataFrame:
        """Aggregate WR sample counts per location with optional filters."""
        pipeline = [self.match_wr_stage]

        if tectonic_setting:
            pipeline.append({"$match": {"tectonic_setting": {"$in": tectonic_setting}}})

        pipeline += [
            *self.add_coordinates,
            self.group_rock_location_stage,
            self.sort_stage
        ]

        # Apply range filtering if requested
        if select_value == 'No':
            pipeline.append({"$match": {"count": {"$gte": min_value, "$lte": max_value}}})

        return pd.DataFrame(self.db.samples.aggregate(pipeline))


    def aggregate_selected_wr_data(self, location_selected) -> pd.DataFrame:
        """Aggregate WR samples for selected locations."""
        if not location_selected:
            return pd.DataFrame()

        location_ids = self._get_location_ids(location_selected)
        if not location_ids:
            return pd.DataFrame()

        pipeline = [
            {"$match": {"location_id": {"$in": location_ids}}},
            self.match_wr_stage,
            *self.add_coordinates,
            self.group_rock_location_stage,
            self.sort_stage
        ]

        return pd.DataFrame(self.db.samples.aggregate(pipeline))


    def aggregate_wr_composition_samples(self, tectonic_setting) -> pd.DataFrame:
        """Get top 3 WR rock types per volcano from sample data."""

        pipeline = [self.match_wr_stage]

        if tectonic_setting:
            pipeline.append({"$match": {"tectonic_setting": {"$in": tectonic_setting}}})

        pipeline += [
            {"$group": {
                "_id": {"db": "$db", "volcano_number": "$volcano_number", "rock": "$rock"},
                "count": {"$sum": 1}
            }},
            self.sort_stage,
            {"$group": {
                "_id": {"db": "$_id.db", "volcano_number": "$_id.volcano_number"},
                "top_rocks": {"$push": {"rock": "$_id.rock", "count": "$count"}}
            }},
            {"$project": {
                "db": "$_id.db",
                "volcano_number": "$_id.volcano_number",
                "top_rocks": {"$slice": ["$top_rocks", 3]}
            }},
            {"$project": {
                "db": 1,
                "volcano_number": 1,
                "major_rock_1": {"$arrayElemAt": ["$top_rocks.rock", 0]},
                "major_rock_2": {"$ifNull": [{"$arrayElemAt": ["$top_rocks.rock", 1]}, None]},
                "major_rock_3": {"$ifNull": [{"$arrayElemAt": ["$top_rocks.rock", 2]}, None]}
            }}
        ]

        return pd.DataFrame(self.db.samples.aggregate(pipeline))

    
    def aggregate_wr_composition_volcanoes(self, tectonic_setting, country) -> pd.DataFrame:
        """Return GVP WR composition for volcanoes with optional filters."""
        pipeline = []

        if tectonic_setting:
            pipeline.append({"$match": {"tectonic_setting": {"$in": tectonic_setting}}})
        if country:
            pipeline.append({"$match": {"country": {"$in": country}}})

        return pd.DataFrame(self.db.volcanoes.aggregate(pipeline))

    
    def get_samples_from_volcano_eruptions(self, selected_volcano, selected_eruptions=None) -> pd.DataFrame:
        """Return samples from selected volcano and eruptions, enriched with metadata."""
        pipeline = [{"$match": {"volcano_number": {"$in": selected_volcano}}}]

        if selected_eruptions:
            pipeline.append({"$match": {"eruption_numbers.eruption_number": {"$in": selected_eruptions}}})

        pipeline += (
            self._join_volcano_and_vei() +
            [self._enrich_sample_fields()] +
            [{"$unset": ["volcano_info", "vei_eruptions"]},
            {"$match": {"SIO2(WT%)": {"$gte": 0, "$lte": 100}}}] +
            self.add_coordinates
        )

        return pd.DataFrame(self.db.samples.aggregate(pipeline))

    
    def get_volcano_info(self, selected_volcano) -> pd.DataFrame:
        """Return basic volcano information for selected volcano numbers."""
        pipeline = [
            {"$match": {"volcano_number": {"$in": selected_volcano}}}
        ]
        return pd.DataFrame(self.db.volcanoes.aggregate(pipeline))


    
    def get_vei_from_volcano(self, selected_volcano) -> pd.DataFrame:
        """Return eruption records enriched with VEI, lat/lon, and sample count."""
        
        pipeline = [
            {"$match": {"volcano_number": {"$in": selected_volcano}}},
            *self.add_coordinates
        ]
        df_eruptions = pd.DataFrame(self.db.eruptions.aggregate(pipeline))
        if df_eruptions.empty:
            return df_eruptions

        df_samples = pd.DataFrame(self.db.samples.find({}))

        def count_samples_for_eruption(eruption_number):
            return df_samples['eruption_numbers'].apply(
                lambda eruptions: any(e.get('eruption_number') == eruption_number for e in eruptions)
                if isinstance(eruptions, list) else False
            ).sum()

        df_eruptions['nb_samples'] = df_eruptions['eruption_number'].apply(count_samples_for_eruption)
        return df_eruptions


    def get_selected_eruptions_and_events(self, selected_volcano) -> pd.DataFrame:
        """Return eruptions with date parts and a list of associated event types."""
        
        pipeline = [
            {"$match": {"volcano_number": {"$in": selected_volcano}}},
            {"$addFields": {
                "start_year": "$start_date.year",
                "start_month": "$start_date.month",
                "start_day": "$start_date.day",
                "start_uncertainty_days": "$start_date.uncertainty_days",
                "end_year": {"$ifNull": ["$end_date.year", None]},
                "end_month": {"$ifNull": ["$end_date.month", None]},
                "end_day": {"$ifNull": ["$end_date.day", None]},
                "end_uncertainty_days": {"$ifNull": ["$end_date.uncertainty_days", None]},
            }},
            {"$lookup": {
                "from": "events",
                "localField": "eruption_number",
                "foreignField": "eruption_number",
                "as": "event_info"
            }},
            {"$addFields": {
                "events": {
                    "$map": {
                        "input": "$event_info",
                        "as": "ev",
                        "in": "$$ev.event_type"
                    }
                }
            }},
            {"$project": {"event_info": 0}}
        ]

        return pd.DataFrame(self.db.eruptions.aggregate(pipeline))
