from pymongo import MongoClient
import pandas as pd

from helpers.helpers import first_three_unique


class Database:
    def __init__(self, config):
        """Initialize the MongoDB client."""
        uri = f"mongodb+srv://{config['user']}:{config['password']}@{config['cluster']}/?retryWrites=true&w=majority"
        client = MongoClient(uri)
        self.db = client[config["db_name"]]

        self.match_wr_stage = {"$match": {"material": "WR"}}

        self.group_rock_location_stage = {
            "$group": {
                "_id": {
                    "rock": "$rock",
                    "db": "$db",
                    "material": "$material",
                    "latitude": "$latitude",
                    "longitude": "$longitude"
                },
                "db": {"$first": "$db"},
                "count": {"$sum": 1}
            }
        }

        self.sort_stage = {"$sort": {"count": -1}}


    def get_samples(self):
        return pd.DataFrame(list(self.db.samples.find()))


    def get_volcanoes(self):
        return pd.DataFrame(list(self.db.volcanoes.find()))


    def get_eruptions(self):
        return pd.DataFrame(list(self.db.eruptions.find()))


    def get_countries(self):
        return self.db.volcanoes.distinct("country")


    def get_tectonic_settings(self):
        return self.db.volcanoes.distinct("tectonic_setting")


    def get_volcano_names(self):
        return self.db.volcanoes.distinct("volcano_name")


    def filter_samples_by_selection(self, volcano_names, selected_db, tectonic_setting, rock_density):
        """Filter samples based on selection criteria."""
        pipeline = []
        
        # --- Matching stages ---
        if selected_db:
            match_db_stage = {"$match": {"db": {"$in": selected_db}}}
            pipeline.append(match_db_stage)

        if tectonic_setting:
            match_tectonic_stage = {"$match": {"tectonic_setting": {"$in": tectonic_setting}}}
            pipeline.append(match_tectonic_stage)

        if volcano_names:
            volcano_display_map = {
                f"{row['volcano_name']} ({row['volcano_number']})": row['volcano_number']
                for _, row in self.get_volcanoes().iterrows()
            }
            volcano_ids = [volcano_display_map[name] for name in volcano_names if name in volcano_display_map]
            match_volcano_number_stage = {"$match": {"volcano_number": {"$in": volcano_ids}}}
            pipeline.append(match_volcano_number_stage)

        if rock_density:
            match_material_stage = {"$match": {"material": {"$ne": "INC"}}}
            pipeline.append(match_material_stage)

            filtered_rock_density = [rock for rock in rock_density if rock != 'SIO2(WT%)']

            if filtered_rock_density:
                match_rock_density_stage = {"$match": {"rock": {"$in": filtered_rock_density}}}
                pipeline.append(match_rock_density_stage)

        # --- Add SIO2(WT%) field ---
        add_fields_stage = {
            "$addFields": {
                "SIO2(WT%)": "$oxides.SIO2(WT%)"
            }
        }
        pipeline.append(add_fields_stage)

        # --- Filter valid percentage range ---
        filter_percent_stage = {
            "$match": {"SIO2(WT%)": {"$gte": 0, "$lte": 100}}
        }

        pipeline.append(filter_percent_stage)

        # --- Join with locations collection ---
        pipeline.append({
            "$lookup": {
                "from": "locations",
                "localField": "location_id",
                "foreignField": "_id",
                "as": "location_info"
            }
        })

        pipeline.append({"$unwind": "$location_info"})

        # --- Extract lat/lon to top level (for convenience) ---
        pipeline.append({
            "$addFields": {
                "latitude": "$location_info.latitude",
                "longitude": "$location_info.longitude"
            }
        })

        # --- Remove the now-unnecessary location_info ---
        pipeline.append({
            "$unset": "location_info"
        })

        selected_samples = list(self.db.samples.aggregate(pipeline))

        if not selected_samples:
            return pd.DataFrame()

        df = pd.DataFrame(selected_samples)
        df['material'] = df.get('material', pd.Series(dtype=str)).fillna("UNKNOWN")
        
        if 'name' in df:
            df['name'] = df['name'].apply(first_three_unique)
        if 'reference' in df:
            df['reference'] = df['reference'].apply(first_three_unique)

        return df
    

    def filter_volcanoes_by_selection(self, volcano_names, country, tectonic_setting):
        """Filter volcanoes based on selection criteria."""
        pipeline = []
        
        if tectonic_setting:
            match_tectonic_stage = {"$match": {"tectonic_setting": {"$in": tectonic_setting}}}
            pipeline.append(match_tectonic_stage)

        if country:
            match_country_stage = {"$match": {"country": {"$in": country}}}
            pipeline.append(match_country_stage)

        if volcano_names:
            volcano_display_map = {
                f"{row['volcano_name']} ({row['volcano_number']})": row['volcano_number']
                for _, row in self.get_volcanoes().iterrows()
            }
            volcano_ids = [volcano_display_map[name] for name in volcano_names if name in volcano_display_map]
            match_volcano_number_stage = {"$match": {"volcano_number": {"$in": volcano_ids}}}
            pipeline.append(match_volcano_number_stage)

        # --- Join with locations collection ---
        pipeline.append({
            "$lookup": {
                "from": "locations",
                "localField": "location_id",
                "foreignField": "_id",
                "as": "location_info"
            }
        })

        pipeline.append({"$unwind": "$location_info"})

        # --- Extract lat/lon to top level (for convenience) ---
        pipeline.append({
            "$addFields": {
                "latitude": "$location_info.latitude",
                "longitude": "$location_info.longitude"
            }
        })

        # --- Remove the now-unnecessary location_info ---
        pipeline.append({
            "$unset": "location_info"
        })
        
        filter_latitude_stage = {
            "$match": {"latitude": {"$gte": -85, "$lte": 85}}
        }

        pipeline.append(filter_latitude_stage)

        # Add a stage to extract 'SIO2(WT%)' from the oxides field
        add_fields_stage = {
            "$addFields": {
                "refs": "Global Volcanism Program, Smithsonian Institution"
            }
        }
        pipeline.append(add_fields_stage)

        selected_volcanoes = list(self.db.volcanoes.aggregate(pipeline))

        if not selected_volcanoes:
            return pd.DataFrame()

        df = pd.DataFrame(selected_volcanoes)

        return df
    

    def get_location_selected(self, selected, volcano_names, selected_db, tectonic_setting, rock_density):
        """Retrieve and process the selected data from the database."""

        data = self.filter_samples_by_selection(volcano_names, selected_db, tectonic_setting, rock_density)
    
        grouped = (
            data.groupby(['latitude', 'longitude', 'db'])
            .agg({'_id': 'count'})
            .reset_index()
            .rename(columns={'_id': 'count'})
        ).reset_index(drop=True)


        try:
            selected_data = grouped.iloc[selected]
            
            location_selected = [
                {"latitude": row["latitude"], "longitude": row["longitude"]}
                for _, row in selected_data.iterrows()
            ]

        except IndexError:
            location_selected = []
        
        return location_selected


    def get_selected_data(self, location_selected):
        """Query the documents that match the selected locations and enrich with location data."""

        # Step 1: Match locations
        filter_location_stage = {"$match": {"$or": location_selected}}

        matching_locations = list(self.db.locations.aggregate([filter_location_stage]))

        if not matching_locations:
            return None

        # Step 2: Extract location IDs
        location_ids = [loc["_id"] for loc in matching_locations]

        # Step 3: Build pipeline for samples collection
        match_samples_stage = {"$match": {"location_id": {"$in": location_ids}}}

        # Step 4: Lookup latitude/longitude from locations
        lookup_location_stage = {
            "$lookup": {
                "from": "locations",
                "localField": "location_id",
                "foreignField": "_id",
                "as": "location_info"
            }
        }

        unwind_location_stage = {"$unwind": "$location_info"}

        # Step 5: Add oxides, date fields and location fields
        add_fields_stage = {
            "$addFields": {
                "year": "$date.year",
                "month": "$date.month",
                "day": "$date.day",
                "latitude": "$location_info.latitude",
                "longitude": "$location_info.longitude",
                "SIO2(WT%)": "$oxides.SIO2(WT%)",
                "TIO2(WT%)": "$oxides.TIO2(WT%)",
                "AL2O3(WT%)": "$oxides.AL2O3(WT%)",
                "FEOT(WT%)": "$oxides.FEOT(WT%)",
                "FE2O3(WT%)": "$oxides.FE2O3(WT%)",
                "MNO(WT%)": "$oxides.MNO(WT%)",
                "FEO(WT%)": "$oxides.FEO(WT%)",
                "CAO(WT%)": "$oxides.CAO(WT%)",
                "MGO(WT%)": "$oxides.MGO(WT%)",
                "K2O(WT%)": "$oxides.K2O(WT%)",
                "NA2O(WT%)": "$oxides.NA2O(WT%)",
                "P2O5(WT%)": "$oxides.P2O5(WT%)",
                "LOI(WT%)": "$oxides.LOI(WT%)"
            }
        }

        # Step 6: Remove the embedded location_info field
        unset_location_info_stage = {"$unset": "location_info"}

        # Final pipeline
        pipeline = [
            match_samples_stage,
            lookup_location_stage,
            unwind_location_stage,
            add_fields_stage,
            unset_location_info_stage
        ]

        selected_data = list(self.db.samples.aggregate(pipeline))

        if not selected_data:
            return None

        df_selected_data = pd.DataFrame(selected_data)
        df_selected_data['_id'] = df_selected_data['_id'].astype(str)

        return df_selected_data


    def aggregate_wr_data(self, min_value, max_value, select_value, tectonic_setting):
        """Aggregate data based on location queries and filter conditions."""
        
        pipeline = [self.match_wr_stage]

        if tectonic_setting:
            match_tectonic_setting_stage = {"$match": {"tectonic_setting": {"$in": tectonic_setting}}}
            pipeline.append(match_tectonic_setting_stage)

        # Add location info from the locations collection
        lookup_location_stage = {
            "$lookup": {
                "from": "locations",
                "localField": "location_id",
                "foreignField": "_id",
                "as": "location_info"
            }
        }

        pipeline.append(lookup_location_stage)

        # Flatten array of joined location info
        unwind_location_stage = {"$unwind": "$location_info"}
        pipeline.append(unwind_location_stage)

        # Promote lat/lon to top-level
        add_fields_location_stage = {
            "$addFields": {
                "latitude": "$location_info.latitude",
                "longitude": "$location_info.longitude"
            }
        }
        pipeline.append(add_fields_location_stage)

        # Remove embedded location_info
        unset_location_info_stage = {"$unset": "location_info"}
        pipeline.append(unset_location_info_stage)

        pipeline.append(self.group_rock_location_stage)
        pipeline.append(self.sort_stage)

        if select_value == 'No':
            pipeline.append({"$match": {"count": {"$gte": min_value, "$lte": max_value}}})

        wr_aggregation = list(self.db.samples.aggregate(pipeline))
        df_wr_agg = pd.DataFrame(wr_aggregation)

        return df_wr_agg


    def aggregate_selected_wr_data(self, location_selected):
        """Aggregate whole-rock data based on selected locations and enrich with lat/lon."""

        # Match stage based on selected locations
        filter_location_stage = {"$match": {"$or": location_selected}}
        
        matching_locations = list(self.db.locations.aggregate([filter_location_stage]))

        if not matching_locations:
            return None

        # Step 2: Extract location IDs
        location_ids = [loc["_id"] for loc in matching_locations]

        # Step 3: Build pipeline for samples collection
        match_samples_stage = {"$match": {"location_id": {"$in": location_ids}}}

        # Lookup to enrich with location info
        lookup_location_stage = {
            "$lookup": {
                "from": "locations",
                "localField": "location_id",
                "foreignField": "_id",
                "as": "location_info"
            }
        }

        # Flatten the joined location array
        unwind_location_stage = {"$unwind": "$location_info"}

        # Add latitude and longitude from location_info to top-level fields
        add_fields_location_stage = {
            "$addFields": {
                "latitude": "$location_info.latitude",
                "longitude": "$location_info.longitude"
            }
        }

        # Remove embedded location_info field
        unset_location_info_stage = {"$unset": "location_info"}

        # Construct final pipeline
        pipeline = [
            match_samples_stage,
            self.match_wr_stage,
            lookup_location_stage,
            unwind_location_stage,
            add_fields_location_stage,
            unset_location_info_stage,
            self.group_rock_location_stage,
            self.sort_stage
        ]

        # Execute aggregation
        selected_wr_aggregation = list(self.db.samples.aggregate(pipeline))
        df_selected_wr_agg = pd.DataFrame(selected_wr_aggregation)

        return df_selected_wr_agg


    def aggregate_wr_composition_samples(self, tectonic_setting):
        """Get WR composition of volcanoes from samples."""
        group_volcano_rock_stage = {
            "$group": {
                "_id": {
                    "db": "$db",
                    "volcano_number": "$volcano_number",
                    "rock": "$rock"
                },
                "count": {"$sum": 1}
            }
        }

        # Group again to get top 3 rocks for each db and volcano number
        group_top_rocks_stage = {
            "$group": {
                "_id": {
                    "db": "$_id.db",
                    "volcano_number": "$_id.volcano_number"
                },
                "top_rocks": {
                    "$push": {
                        "rock": "$_id.rock",
                        "count": "$count"
                    }
                }
            }
        }

        # Project stage to slice the top 3 rocks
        project_top_rocks_stage = {
            "$project": {
                "db": "$_id.db",
                "volcano_number": "$_id.volcano_number",
                "top_rocks": {"$slice": ["$top_rocks", 0, 3]}
            }
        }

        # Project stage to transform top_rocks into separate fields
        transform_top_rocks_stage = {
            "$project": {
                "db": 1,
                "volcano_number": 1,
                "major_rock_1": {"$arrayElemAt": ["$top_rocks.rock", 0]},
                "major_rock_2": {
                    "$ifNull": [
                        {"$arrayElemAt": ["$top_rocks.rock", 1]},
                        None
                    ]
                },
                "major_rock_3": {
                    "$ifNull": [
                        {"$arrayElemAt": ["$top_rocks.rock", 2]},
                        None
                    ]
                },
            }
        }

        pipeline = [self.match_wr_stage]

        if tectonic_setting:
            match_tectonic_setting_stage = {"$match": {"tectonic_setting": {"$in": tectonic_setting}}}
            pipeline.append(match_tectonic_setting_stage)

        pipeline.extend([
            group_volcano_rock_stage, 
            self.sort_stage, 
            group_top_rocks_stage, 
            project_top_rocks_stage, 
            transform_top_rocks_stage
        ])

        wr_composition_samples = list(self.db.samples.aggregate(pipeline))
        df_wr_composition_samples = pd.DataFrame(wr_composition_samples)
        
        return df_wr_composition_samples
    

    def aggregate_wr_composition_volcanoes(self, tectonic_setting, country):
        """Get WR composition of volcanoes from GVP database."""

        pipeline = []
        
        if tectonic_setting:
            match_tectonic_stage = {"$match": {"tectonic_setting": {"$in": tectonic_setting}}}
            pipeline.append(match_tectonic_stage)

        if country:
            match_country_stage = {"$match": {"country": {"$in": country}}}
            pipeline.append(match_country_stage)

        wr_composition_volcanoes = list(self.db.volcanoes.aggregate(pipeline))
        df_wr_composition_volcanoes = pd.DataFrame(wr_composition_volcanoes)
        
        return df_wr_composition_volcanoes
    

    def get_samples_from_volcano_eruptions(self, selected_volcano, selected_eruptions=None):
        
        pipeline = []

        # Match volcano
        pipeline.append({
            "$match": {"volcano_number": {"$in": selected_volcano}}
        })

        # Optional: Filter by specific eruption numbers
        if selected_eruptions:
            pipeline.append({
                "$match": {
                    "eruption_numbers.eruption_number": {"$in": selected_eruptions}
                }
            })

        # Join with volcanoes to get volcano_name, etc.
        pipeline.append({
            "$lookup": {
                "from": "volcanoes",
                "localField": "volcano_number",
                "foreignField": "volcano_number",
                "as": "volcano_info"
            }
        })
        pipeline.append({"$unwind": "$volcano_info"})

        # --- NEW: Join with eruptions ---
        pipeline.append({
            "$lookup":  {
                "from": "eruptions",
                "let": {
                    "eruption_nums": { "$ifNull": ["$eruption_numbers.eruption_number", []] }
                },
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    { "$in": ["$eruption_number", "$$eruption_nums"] },
                                ]
                            }
                        }
                    }
                ],
                "as": "vei_eruptions"
            }
        })

        # Add fields for ease of analysis
        pipeline.append({
            "$addFields": {
                "year": "$date.year",
                "month": "$date.month",
                "day": "$date.day",
                "vei": "$vei_eruptions.vei",
                "volcano_name": "$volcano_info.volcano_name",
                "eruptions": "$eruption_numbers.eruption_number",
                "SIO2(WT%)": "$oxides.SIO2(WT%)",
                "TIO2(WT%)": "$oxides.TIO2(WT%)",
                "AL2O3(WT%)": "$oxides.AL2O3(WT%)",
                "FEOT(WT%)": "$oxides.FEOT(WT%)",
                "FE2O3(WT%)": "$oxides.FE2O3(WT%)",
                "MNO(WT%)": "$oxides.MNO(WT%)",
                "FEO(WT%)": "$oxides.FEO(WT%)",
                "CAO(WT%)": "$oxides.CAO(WT%)",
                "MGO(WT%)": "$oxides.MGO(WT%)",
                "K2O(WT%)": "$oxides.K2O(WT%)",
                "NA2O(WT%)": "$oxides.NA2O(WT%)",
                "P2O5(WT%)": "$oxides.P2O5(WT%)",
                "LOI(WT%)": "$oxides.LOI(WT%)"
            }
        })

        pipeline.append({"$unset": "volcano_info"})
        pipeline.append({"$unset": "vei_eruptions"})

        # Filter invalid SiO2 values
        pipeline.append({
            "$match": {"SIO2(WT%)": {"$gte": 0, "$lte": 100}}
        })

        # Lookup to enrich with location info
        pipeline.append({
            "$lookup": {
                "from": "locations",
                "localField": "location_id",
                "foreignField": "_id",
                "as": "location_info"
            }
        })

        # Flatten the joined location array
        pipeline.append({"$unwind": "$location_info"})

        # Add latitude and longitude from location_info to top-level fields
        pipeline.append({
            "$addFields": {
                "latitude": "$location_info.latitude",
                "longitude": "$location_info.longitude"
            }
        })

        # Remove embedded location_info field
        pipeline.append({"$unset": "location_info"})

        # Execute pipeline
        selected_samples = list(self.db.samples.aggregate(pipeline))
        df_selected_samples = pd.DataFrame(selected_samples)

        return df_selected_samples
    
    def get_volcano_info(self, selected_volcano):
        pipeline = []

        # Match stage to filter eruptions by selected volcano numbers
        match_volcano_stage = {"$match": {"volcano_number": {"$in": selected_volcano}}}
        pipeline.append(match_volcano_stage)

        # Execute pipeline
        volcano_info = list(self.db.volcanoes.aggregate(pipeline))
        df_volcano_info = pd.DataFrame(volcano_info)

        return df_volcano_info

    
    def get_vei_from_volcano(self, selected_volcano):
        pipeline = []

        # Match stage to filter eruptions by selected volcano numbers
        match_volcano_stage = {"$match": {"volcano_number": {"$in": selected_volcano}}}
        pipeline.append(match_volcano_stage)

        # Aggregate the data for eruptions
        eruptions = list(self.db.eruptions.aggregate(pipeline))
        df_eruptions = pd.DataFrame(eruptions)

        # Retrieve all samples
        samples = list(self.db.samples.find({}))  # Retrieve all samples without filtering
        df_samples = pd.DataFrame(samples)

        # Perform the join in memory and count the number of samples for each eruption
        selected_eruptions = []
        for _, eruption in df_eruptions.iterrows():
            eruption_number = eruption['eruption_number']

            # Filter samples that have the current eruption number in their eruption_numbers list
            matched_samples = df_samples[df_samples['eruption_numbers'].apply(
                lambda x: any(e['eruption_number'] == eruption_number for e in x)
                if isinstance(x, list) else False
            )]

            # Count the number of matched samples
            nb_samples = len(matched_samples)

            # Add the count to the eruption data
            eruption_data = eruption.to_dict()
            eruption_data['nb_samples'] = nb_samples
            selected_eruptions.append(eruption_data)

        # Create a DataFrame from the list of dictionaries
        df_selected_eruptions = pd.DataFrame(selected_eruptions)

        return df_selected_eruptions

    def get_selected_eruptions_and_events(self, selected_volcano):
        pipeline = []

        # Match volcano
        pipeline.append({
            "$match": {"volcano_number": {"$in": selected_volcano}}
        })

        # Add date parts with fallback values
        pipeline.append({
            "$addFields": {
                "start_year": "$start_date.year",
                "start_month": "$start_date.month",
                "start_day": "$start_date.day",
                "end_year": "$end_date.year",
                "end_month": "$end_date.month",
                "end_day": "$end_date.day"
            }
        })


        # Lookup corresponding events from the 'events' collection
        pipeline.append({
            "$lookup": {
                "from": "events",
                "localField": "eruption_number",
                "foreignField": "eruption_number",
                "as": "event_info"
            }
        })

        # Flatten to list of event_type strings
        pipeline.append({
            "$addFields": {
                "events": {
                    "$map": {
                        "input": "$event_info",
                        "as": "ev",
                        "in": "$$ev.event_type"
                    }
                }
            }
        })

        # Optional: drop intermediate 'event_info'
        pipeline.append({
            "$project": {
                "event_info": 0
            }
        })

        

        # Execute pipeline
        selected_eruptions = list(self.db.eruptions.aggregate(pipeline))
        df_selected_eruptions = pd.DataFrame(selected_eruptions)

        return df_selected_eruptions