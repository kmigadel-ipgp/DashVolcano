import pandas as pd

from pymongo import MongoClient
from functools import cached_property

from helpers.helpers import first_three_unique, format_date, load_config


class Database:
    def __init__(self):
        """Initialize MongoDB client with the provided config."""
        config = load_config()
        
        uri = f"mongodb+srv://{config['user']}:{config['password']}@{config['cluster']}/?retryWrites=true&w=majority"
        client = MongoClient(uri)
        self.db = client[config["db_name"]]

        self.match_wr_stage = [{"$match": {"material": "WR"}}]

        self.group_rock_location_stage = [{
            "$group": {
                "_id": {
                    "rock": "$rock", "db": "$db", "material": "$material",
                    "latitude": "$latitude", "longitude": "$longitude"
                },
                "db": {"$first": "$db"},
                "count": {"$sum": 1}
            }
        }]

        self.sort_stage = [{"$sort": {"count": -1}}]

        self.filter_sio2_percentage = [{"$match": {"SIO2": {"$gte": 0, "$lte": 100}}}]

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

        self.join_volcano = [
            {"$lookup": {
                "from": "volcanoes",
                "localField": "volcano_number",
                "foreignField": "volcano_number",
                "as": "volcano_info"
            }},
            {"$unwind": "$volcano_info"}
        ]

        self.join_eruption = [
            {"$lookup": {
                "from": "eruptions",
                "let": {"eruption_nums": {"$ifNull": ["$eruption_numbers.eruption_number", []]}},
                "pipeline": [{"$match": {"$expr": {"$in": ["$eruption_number", "$$eruption_nums"]}}}],
                "as": "vei_eruptions"
            }}
        ]

    # ---------- Cached Volcano and Eruption ID Maps ---------- #

    @cached_property
    def volcano_id_map(self) -> dict:
        """
        Create a mapping from volcano name with ID (e.g. "Etna (211060)") to its volcano_number.

        Returns:
            (dict): A dictionary mapping "volcano_name (volcano_number)" → volcano_number.
        """
        df = self.get_volcanoes()
        return {
            f"{row['volcano_name']} ({row['volcano_number']})": row['volcano_number']
            for _, row in df.iterrows()
        }

    @cached_property
    def eruption_id_map(self) -> dict:
        """
        Create a mapping from eruption date with ID (e.g. "2001-07-01 (E001)") to eruption_number.

        Returns:
            (dict): A dictionary mapping "start_date (eruption_number)" → eruption_number.
        """
        df = self.get_eruptions()
        return {
            f"{format_date(row['start_date'])} ({row['eruption_number']})": row['eruption_number']
            for _, row in df.iterrows()
        }

    def _match_volcano_ids(self, volcano_names: list[str]) -> list:
        """
        Convert a list of full volcano labels (e.g. "Etna (211060)") to volcano_number values.

        Parameters:
            volcano_names (list[str]): A list of volcano names with IDs.

        Returns:
            (list): A list of corresponding volcano_number integers.
        """
        return [
            self.volcano_id_map[name]
            for name in volcano_names or []
            if name in self.volcano_id_map
        ]
    
    def _match_eruption_ids(self, eruption_dates: list[str]) -> list:
        """
        Convert a list of eruption labels (e.g. "2001-07-01 (E001)") to eruption_number values.

        Parameters:
            eruption_dates (list[str]): A list of eruption date labels with IDs.

        Returns:
            (list): A list of corresponding eruption_number values.
        """
        return [
            self.eruption_id_map[date]
            for date in eruption_dates or []
            if date in self.eruption_id_map
        ]

    def _get_location_ids(self, location_selected: list[dict]) -> list:
        """
        Query location documents from the database that match the given location filters.

        Parameters:
            location_selected (list[dict]): A list of `$or` match conditions (e.g. [{"country": "Italy"}, {"region": "Europe"}]).

        Returns:
            (list): A list of matching location document `_id`s.
        """
        locations = list(self.db.locations.aggregate([
            {"$match": {"$or": location_selected}}
        ]))
        return [loc["_id"] for loc in locations]

    def _get_oxide_fields(self) -> dict:
        """
        Generate a mapping of oxide field aliases for MongoDB `$addFields` operation.

        Returns:
            (dict): A dictionary mapping field names like "SIO2(WT%)" → "$oxides.SIO2(WT%)".
        """
        oxides = [
            "SIO2", "TIO2", "AL2O3", "FEOT", "FE2O3", "MNO", "FEO",
            "CAO", "MGO", "NA2O", "K2O", "P2O5", "LOI"
        ]
        return {ox: f"$oxides.{ox}" for ox in oxides}

    # --- Shared helper pipelines (add to the Database class) --- #

    def _match_volcano_names(self, volcano_names: list) -> list:
        """
        Return a list of pipeline stages to match documents by volcano names.

        Parameters:
            volcano_names (list): List of volcano names to match.

        Returns:
            (list): A list containing a single `$match` stage if volcano_names is provided,
                otherwise an empty list (no filter applied).
        """
        if volcano_names:
            return [{"$match": {"volcano_number": {"$in": self._match_volcano_ids(volcano_names)}}}]
        return []
    
    def _match_eruption_dates(self, selected_eruptions: list) -> list:
        """
        Return a list of pipeline stages to match documents by eruption dates.

        Parameters:
            selected_eruptions (list): List of eruption dates to match.

        Returns:
            (list): A list containing a single `$match` stage if selected_eruptions is provided,
                otherwise an empty list (no filter applied).
        """
        if selected_eruptions:
            return [{"$match": {"eruption_numbers.eruption_number": {"$in": self._match_eruption_ids(selected_eruptions)}}}]
        return []

    def _match_tectonic_setting(self, tectonic_setting: list) -> list:
        """
        Return a list of pipeline stages to match documents by tectonic setting.
        
        For samples: Use tecto.ui field
        For volcanoes: Use tectonic_setting.ui field

        Parameters:
            tectonic_setting (list): List of tectonic settings to match.

        Returns:
            (list): A list of pipeline stages if tectonic_setting is provided,
                otherwise an empty list (no filter applied).
        """
        if tectonic_setting:
            return [{"$match": {"tectonic_setting.ui": {"$in": tectonic_setting}}}]
        return []
    
    def _match_tectonic_setting_for_samples(self, tectonic_setting: list) -> list:
        """
        Return pipeline stages to filter samples by their tectonic setting.
        
        Filters samples directly by their tecto.ui field.
        
        Parameters:
            tectonic_setting (list): List of tectonic settings (from sample tecto.ui)
            
        Returns:
            (list): Pipeline stages for match, or empty list if no filter.
        """
        if not tectonic_setting:
            return []
        
        # Filter samples directly by tecto.ui field
        return [{"$match": {"tecto.ui": {"$in": tectonic_setting}}}]

    def _match_countries(self, countries: list) -> list:
        """
        Return a list of pipeline stages to match documents by countries.

        Parameters:
            countries (list): List of countries to match.

        Returns:
            (list): A list containing a single `$match` stage if countries is provided,
                otherwise an empty list (no filter applied).
        """
        if countries:
            return [{"$match": {"country": {"$in": countries}}}]
        return []

    def _match_db(self, selected_db: list) -> list:
        """
        Return a list of pipeline stages to match documents by database.

        Parameters:
            selected_db (list): List of database to match.

        Returns:
            (list): A list containing a single `$match` stage if selected_db is provided,
                otherwise an empty list (no filter applied).
        """
        if selected_db:
            return [{"$match": {"db": {"$in": selected_db}}}]
        return []

    def _match_location(self, location_selected: list) -> list:
        """
        Return a list of pipeline stages to match documents by location.

        Parameters:
            location_selected (list): List of locations to match.

        Returns:
            (list): A list containing a single `$match` stage if location_selected is provided,
                otherwise an empty list (no filter applied).
        """
        if not location_selected:
            return []

        location_ids = self._get_location_ids(location_selected)
        if location_ids:
            return [{"$match": {"location_id": {"$in": location_ids}}}]
        return []

    def _enrich_sample_fields(self) -> list:
        """
        Generate aggregation pipeline stages to enrich sample documents with metadata fields
        such as date components, VEI, volcano name, eruption numbers, and oxide concentrations.

        This method is typically used as part of a MongoDB aggregation pipeline to transform
        raw sample documents into a more analysis-friendly structure.

        Returns:
            (list): A list of two MongoDB aggregation stages:
                1. `$addFields`: Adds the following fields to each document:
                    - year, month, day, uncertainty_days: extracted from the nested `date` field.
                    - vei: extracted from the `vei_eruptions` lookup.
                    - volcano_name: from the joined `volcano_info` document.
                    - eruptions: list of associated eruption numbers.
                    - oxides: parsed from `oxides.<name>(WT%)` into flat keys using `_get_oxide_fields`.
                2. `$unset`: Removes intermediate fields used for joins (`volcano_info`, `vei_eruptions`)
                    to avoid polluting the final document output.
        """
        return [
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

    # ---------- Basic Collection Loaders ---------- #

    def get_samples(self) -> pd.DataFrame:
        """
        Retrieve all sample documents from the 'samples' collection.

        Returns:
            (pd.DataFrame): A DataFrame containing all documents from the samples collection.
        """
        return pd.DataFrame(self.db.samples.find())

    def get_volcanoes(self) -> pd.DataFrame:
        """
        Retrieve all volcano documents from the 'volcanoes' collection.

        Returns:
            (pd.DataFrame): A DataFrame containing all documents from the volcanoes collection.
        """
        return pd.DataFrame(self.db.volcanoes.find())

    def get_eruptions(self) -> pd.DataFrame:
        """
        Retrieve all eruption documents from the 'eruptions' collection.

        Returns:
            (pd.DataFrame): A DataFrame containing all documents from the eruptions collection.
        """
        return pd.DataFrame(self.db.eruptions.find())

    def get_countries(self) -> list[str]:
        """
        Retrieve a list of unique countries from the 'volcanoes' collection.

        Returns:
            (list[str]): A list of distinct country names.
        """
        return self.db.volcanoes.distinct("country")

    def get_tectonic_settings(self) -> list[str]:
        """
        Retrieve a list of unique tectonic settings from the 'volcanoes' collection.

        Returns:
            (list[str]): A list of distinct tectonic setting values.
        """
        return self.db.volcanoes.distinct("tectonic_setting")

    def get_volcano_names(self) -> list[str]:
        """
        Retrieve a list of unique volcano names from the 'volcanoes' collection.

        Returns:
            (list[str]): A list of distinct volcano names.
        """
        return self.db.volcanoes.distinct("volcano_name")

    # ---------- Volcano Filtering ---------- #

    def _build_volcano_id_map(self) -> dict:
        """
        Build a mapping from composite volcano name strings to their corresponding volcano numbers.

        This is typically used to create a user-friendly way of referencing volcanoes
        by combining the name and the unique identifier (volcano_number).

        Example key: "Etna (211060)"

        Example value: 211060

        Returns:
            (dict): A dictionary where keys are strings in the format
                "volcano_name (volcano_number)" and values are the corresponding
                integer volcano numbers.
        """
        df = self.get_volcanoes()
        return {
            f"{row['volcano_name']} ({row['volcano_number']})": row['volcano_number']
            for _, row in df.iterrows()
        }

    def filter_volcanoes_by_selection(self, volcano_names:list[str]=None, countries:list[str]=None, tectonic_setting:list[str]=None) -> pd.DataFrame:
        """
        Return volcanoes matching selection filters.
        Parameters:
            volcano_names (list[str], optional): list of volcano names (with optional volcano numbers in label)
            countries (list[str], optional): list of country names
            tectonic_setting (list[str], optional): list of tectonic settings
        Returns:
            (pd.DataFrame): Return volcanoes matching selection filters in a DataFrame format
        """
        pipeline = []

        pipeline += self._match_tectonic_setting(tectonic_setting)
        pipeline += self._match_countries(countries)
        pipeline += self._match_volcano_names(volcano_names)
        pipeline += self.add_coordinates
        pipeline += [
            {"$addFields": {
                "reference": "Global Volcanism Program, Smithsonian Institution (https://volcano.si.edu/)"
            }},
            {"$match": {"latitude": {"$gte": -85, "$lte": 85}}}
        ]

        return pd.DataFrame(self.db.volcanoes.aggregate(pipeline))

    # ---------- Sample Filtering ---------- #

    def filter_samples_by_selection(self, volcano_names:list[str]=None, selected_db:list[str]=None, tectonic_setting:list[str]=None, rock_density:list[str]=None) -> pd.DataFrame:
        """
        Filter and return rock samples from the database based on user-selected criteria.

        Parameters:
            volcano_names (list[str], optional): A list of volcano names to filter by.
            selected_db (list[str], optional): List of source database identifiers (e.g., ["GEOROC", "PetDB"]).
            tectonic_setting (list[str], optional): List of tectonic settings to include (e.g., ["Subduction Zone"]).
                                                   Filters by the volcano's tectonic_setting.ui field.
            rock_density (list[str], optional): List of rock types or densities to include (e.g., ["Basalt", "Andesite"]).
                                            Special handling excludes "INC" (incomplete) and optionally filters by `rock`.

        Returns:
            (pd.DataFrame): A DataFrame of samples enriched with metadata (e.g., volcano, eruption, coordinates),
                        filtered by the specified parameters. Returns an empty DataFrame if no match is found.
        """
        pipeline = []

        pipeline += self._match_db(selected_db)
        # Use the samples-specific tectonic setting filter that joins with volcanoes
        pipeline += self._match_tectonic_setting_for_samples(tectonic_setting)
        pipeline += self._match_volcano_names(volcano_names)
         
        if rock_density:
            pipeline += [{"$match": {"material": {"$ne": "INC"}}}]
            filtered = [r for r in rock_density if r != 'SIO2']
            if filtered:
                pipeline += [{"$match": {"rock": {"$in": filtered}}}]

        pipeline += [{"$addFields": {**self._get_oxide_fields()}}]
        pipeline += self.filter_sio2_percentage
        pipeline += self.add_coordinates

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

    def get_location_selected(self, selected_idx:list[int], *args, **kwargs) -> list:
        """
        Return a list of selected sample locations as dictionaries containing latitude and longitude.

        Parameters:
            selected_idx (list[int]): 
                List of row indices (e.g. from a selection in a UI) corresponding to grouped location entries.
                These indices will be used to extract lat/lon coordinates from the grouped DataFrame.

            (args, kwargs): 
                Forwarded to `filter_samples_by_selection`, which supports:
                    - volcano_names (list[str])
                    - selected_db (list[str])
                    - tectonic_setting (list[str])
                    - rock_density (list[str])
                These filters determine which subset of samples to analyze.

        Returns:
            (list[dict]): A list of dictionaries, each with:
                - "latitude": float
                - "longitude": float
            If the selected indices are out of range, returns an empty list.
        """
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

    def get_selected_data(self, location_selected:list[dict], volcano_names:list[str]=None, selected_db:list[str]=None) -> pd.DataFrame | None:
        """
        Retrieve full sample documents that match selected filters (locations, volcanoes, and databases),
        enriched with joined metadata (volcano info, eruption info, coordinates, oxides, etc.).

        Parameters:
            location_selected (list[dict]):
                A list of dictionaries, each specifying a selected location with keys like:
                - "latitude": float
                - "longitude": float
                Used to retrieve matching `location_id` values in the database.

            volcano_names (list[str], optional):
                List of volcano names to filter the samples by. These names are resolved to
                volcano numbers using the `volcano_id_map`.

            selected_db (list[str], optional):
                List of rock databases (e.g., ["GEOROC", "PetDB"]) to filter the samples by.

        Returns:
            (pd.DataFrame, None):
                A DataFrame containing samples matching the filters and enriched with:
                - Coordinates
                - Volcano and eruption metadata
                - Oxide compositions
                - Other sample-level metadata
                Returns None if no documents match the filters.
        """
        pipeline = []

        pipeline += self._match_location(location_selected)
        pipeline += self._match_volcano_names(volcano_names)
        pipeline += self._match_db(selected_db)
        pipeline += self.add_coordinates
        pipeline += self.join_volcano
        pipeline += self.join_eruption
        pipeline += self._enrich_sample_fields()
        pipeline += self.filter_sio2_percentage
        pipeline += self.add_coordinates

        result = list(self.db.samples.aggregate(pipeline))

        if not result:
            return None

        return pd.DataFrame(result)

    def aggregate_wr_data(self, min_value:int, max_value:int, select_value:str, tectonic_setting:list[str]) -> pd.DataFrame:
        """
        Aggregate Whole Rock (WR) sample counts per location, optionally filtering by
        tectonic setting and count range.

        Parameters:
            min_value (int):
                Minimum number of samples per location to include in the result
                (used if `select_value == 'No'`).

            max_value (int):
                Maximum number of samples per location to include in the result
                (used if `select_value == 'No'`).

            select_value (str):
                If 'No', applies the count filtering between `min_value` and `max_value`.
                If anything else (e.g., 'Yes'), no filtering is applied.

            tectonic_setting (list[str]):
                Optional list of tectonic settings (e.g., ['Subduction zone']) to filter
                the volcanoes/samples by.

        Returns:
            (pd.DataFrame):
                A DataFrame containing the number of WR samples per location (latitude/longitude),
                optionally filtered by tectonic setting and count range. The structure typically includes:
                    - latitude
                    - longitude
                    - count (number of WR samples at that location)
                    - rock types (aggregated list)
        """
        pipeline = []

        pipeline += self.match_wr_stage
        pipeline += self._match_tectonic_setting_for_samples(tectonic_setting)
        pipeline += self.add_coordinates
        pipeline += self.group_rock_location_stage
        pipeline += self.sort_stage

        if select_value == 'No':
            pipeline.append({"$match": {"count": {"$gte": min_value, "$lte": max_value}}})

        return pd.DataFrame(self.db.samples.aggregate(pipeline))

    def aggregate_selected_wr_data(self, location_selected:list[dict]) -> pd.DataFrame:
        """
        Aggregate Whole Rock (WR) samples for a list of selected geographic locations.

        Parameters:
            location_selected (list[dict]):
                A list of selected locations, where each item is a dictionary containing
                at least latitude and longitude values, e.g.:
                [
                    {"latitude": 10.5, "longitude": 122.3},
                    {"latitude": -3.1, "longitude": 101.7},
                    ...
                ]
                These will be used to filter the samples by matching `location_id`s.

        Returns:
            (pd.DataFrame):
                A DataFrame with aggregated WR sample information for the selected locations.
                The result typically includes:
                    - latitude
                    - longitude
                    - count: number of WR samples at each location
                    - rock: list of unique rock types at that location
        """
        pipeline = []

        pipeline += self._match_location(location_selected)
        pipeline += self.match_wr_stage
        pipeline += self.add_coordinates
        pipeline += self.group_rock_location_stage
        pipeline += self.sort_stage

        return pd.DataFrame(self.db.samples.aggregate(pipeline))

    def aggregate_wr_composition_samples(self, tectonic_setting:list[str]=None) -> pd.DataFrame:
        """
        Get the top 3 most common Whole Rock (WR) rock types per volcano from sample data.

        Parameters:
            tectonic_setting (list[str], optional):
                A list of tectonic settings to filter the samples by (e.g., ["subduction", "rift"]).
                If None or empty, no tectonic setting filter is applied.

        Returns:
            (pd.DataFrame):
                A DataFrame with the following columns per volcano and database:
                    - db: Database source (e.g., GEOROC, PetDB)
                    - volcano_number: Volcano identifier
                    - major_rock_1: Most common rock type (string)
                    - major_rock_2: Second most common rock type (string or None)
                    - major_rock_3: Third most common rock type (string or None)

                Each row corresponds to a unique (db, volcano) combination.
        """
        pipeline = []

        pipeline += self.match_wr_stage
        pipeline += self._match_tectonic_setting(tectonic_setting)
        pipeline += [
            {"$group": {
                "_id": {"db": "$db", "volcano_number": "$volcano_number", "rock": "$rock"},
                "count": {"$sum": 1}
            }}]
        pipeline += self.sort_stage
        pipeline += [
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
    
    def aggregate_wr_composition_volcanoes(self, tectonic_setting:list[str]=None, countries:list[str]=None) -> pd.DataFrame:
        """
        Return Whole Rock (WR) composition summary for volcanoes filtered by optional tectonic settings and countries.

        Parameters:
            tectonic_setting (list[str], optional):
                A list of tectonic setting names to filter volcanoes by (e.g., ["subduction", "rift"]).
                If None or empty, no filter on tectonic setting is applied.

            countries (list[str], optional):
                A list of country names to filter volcanoes by (e.g., ["USA", "Indonesia"]).
                If None or empty, no filter on country is applied.

        Returns:
            (pd.DataFrame):
                A DataFrame containing volcano documents from the 'volcanoes' collection
                filtered by the specified tectonic settings and countries.
                Each row represents one volcano.
        """
        pipeline = []

        pipeline += self._match_tectonic_setting(tectonic_setting)
        pipeline += self._match_countries(countries)

        return pd.DataFrame(self.db.volcanoes.aggregate(pipeline))
    
    def get_samples_from_volcano_eruptions(self, selected_volcano:list[str], selected_eruptions:list[str]=None) -> pd.DataFrame:
        """
        Retrieve sample data for specified volcanoes and optionally filtered by selected eruptions,
        enriched with related volcano and eruption metadata, and spatial coordinates.

        Parameters:
            selected_volcano (list[str]):
                List of volcano names (or IDs) to filter samples by. If empty or None,
                the function returns an empty DataFrame to avoid querying the entire database.

            selected_eruptions (list[str], optional):
                List of eruption dates or identifiers to further filter samples linked to these eruptions.
                If None or empty, no eruption filter is applied.

        Returns:
            (pd.DataFrame):
                A DataFrame containing sample documents matching the selected volcanoes and eruptions,
                enriched with volcano and eruption metadata, oxide data, and spatial coordinates.
                Returns an empty DataFrame if no volcanoes are specified or no valid matches found.
        """
        if not selected_volcano:
            return pd.DataFrame()

        pipeline = self._match_volcano_names(selected_volcano)

        if not pipeline:
            return pd.DataFrame()
        
        pipeline += self._match_eruption_dates(selected_eruptions)
        pipeline += self.join_volcano
        pipeline += self.join_eruption
        pipeline += self._enrich_sample_fields()
        pipeline += self.filter_sio2_percentage
        pipeline += self.add_coordinates

        return pd.DataFrame(self.db.samples.aggregate(pipeline))
    
    def get_volcano_info(self, selected_volcano:list[str]) -> pd.DataFrame:
        """
        Retrieve basic information for the specified volcanoes.

        Parameters:
            selected_volcano (list[str]):
                List of volcano names (or IDs) to filter volcano information by.
                If the list is empty or None, the function returns an empty DataFrame
                to avoid querying the entire volcano collection.

        Returns:
            (pd.DataFrame):
                A DataFrame containing basic information for the selected volcanoes.
                Returns an empty DataFrame if no volcanoes are specified or no valid matches found.
        """
        if not selected_volcano:
            return pd.DataFrame()

        pipeline = self._match_volcano_names(selected_volcano)

        if not pipeline:
            return pd.DataFrame()
        
        return pd.DataFrame(self.db.volcanoes.aggregate(pipeline))
    
    def get_vei_from_volcano(self, selected_volcano:list[str]) -> pd.DataFrame:
        """
        Retrieve eruption records for the specified volcanoes enriched with VEI,
        latitude/longitude, and the count of associated samples.

        Parameters:
            selected_volcano (list[str]):
                List of volcano names (or IDs) to filter eruptions by.
                If empty or None, the function returns an empty DataFrame
                to avoid querying the entire eruptions collection.

        Returns:
            (pd.DataFrame):
                A DataFrame containing eruption records with added fields:
                - VEI (Volcanic Explosivity Index)
                - Latitude and longitude coordinates
                - Number of samples linked to each eruption ('nb_samples')

                Returns an empty DataFrame if no volcanoes are specified or no valid matches found.
        """

        if not selected_volcano:
            return pd.DataFrame()

        pipeline = self._match_volcano_names(selected_volcano)

        if not pipeline:
            return pd.DataFrame()
        
        pipeline += self.add_coordinates

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

    def get_selected_eruptions_and_events(self, selected_volcano:list[str]) -> pd.DataFrame:
        """
        Retrieve eruption records for specified volcanoes, including detailed date parts 
        and a list of associated event types.

        Parameters:
            selected_volcano (list[str]):
                List of volcano names or IDs to filter the eruptions.
                If empty or None, the function returns an empty DataFrame to avoid
                querying the entire eruptions collection.

        Returns:
            (pd.DataFrame):
                A DataFrame with eruption records enriched with the following fields:
                - start_year, start_month, start_day, start_uncertainty_days:
                Date components and uncertainty of eruption start date.
                - end_year, end_month, end_day, end_uncertainty_days:
                Date components and uncertainty of eruption end date, if present.
                - events: List of event types associated with each eruption.
                
                Returns an empty DataFrame if no volcanoes are specified or no valid matches found.
        """

        if not selected_volcano:
            return pd.DataFrame()

        pipeline = self._match_volcano_names(selected_volcano)

        if not pipeline:
            return pd.DataFrame()
        
        pipeline += [
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
