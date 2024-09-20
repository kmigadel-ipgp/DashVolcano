import pandas as pd
import json
import geopandas as gpd
import plotly.express as px
import plotly.graph_objs as go
from shapely.geometry import Polygon

from functions.georoc import load_georoc
from functions.gvp import read_gmt

from constants.paths import TECTONICS_PLATES_DIR


def process_lat_lon(df):
    """
    Processes latitude and longitude by averaging min and max values.

    Args:
        df: DataFrame containing columns 'LATITUDE MIN' and 'LATITUDE MAX'.

    Returns:
        df: Updated DataFrame with averaged 'Latitude' and 'Longitude'.
    """
    # Filter out rows where 'LATITUDE MAX' is greater than 90 or less than -90
    df = df[abs(df['LATITUDE MAX']) <= 90]
    
    # Calculate 'Latitude' as the average of 'LATITUDE MIN' and 'LATITUDE MAX'
    df['Latitude'] = (df['LATITUDE MIN'] + df['LATITUDE MAX']) / 2
    
    # Calculate 'Longitude' as the average of 'LONGITUDE MIN' and 'LONGITUDE MAX'
    df['Longitude'] = (df['LONGITUDE MIN'] + df['LONGITUDE MAX']) / 2
    
    return df


def highlight_volcano_samples(dfgeo, thisvolcano, tect_lst, db, dict_georoc_sl, dict_volcano_file):
    """
    Highlights samples from the selected volcano.

    Args:
        dfgeo: DataFrame containing geological data.
        thisvolcano: Name of the volcano to highlight.
        tect_lst: List of tectonic settings to consider.
        db: List of databases in use.
        dict_georoc_sl: Dictionary mapping GEOROC samples.
        dict_volcano_file: Dictionary for volcano file mappings.

    Returns:
        dfgeo: Updated DataFrame with highlighted samples.
        db: Updated list of databases.
    """
    # Load samples for the specified volcano
    dfzoom = load_georoc(thisvolcano, dict_georoc_sl, dict_volcano_file)
    
    # Process latitude and longitude in the loaded samples
    dfzoom = process_lat_lon(dfzoom)
    
    # Mark the database source for these samples
    dfzoom['db'] = ['Georoc found'] * len(dfzoom.index)
    
    # Update the main geological DataFrame with new samples
    dfgeo, db = update_georoc_samples(dfgeo, dfzoom, tect_lst, db)
    
    return dfgeo, db


def update_georoc_samples(dfgeo, dfzoom, tect_lst, db):
    """
    Updates GEOROC samples with new data.

    Args:
        dfgeo: Main geological DataFrame.
        dfzoom: DataFrame containing new GEOROC samples.
        tect_lst: List of tectonic settings to check.
        db: List of databases in use.

    Returns:
        dfgeo: Updated DataFrame with GEOROC samples included.
        db: Updated list of databases.
    """
    # Rename column for consistency
    dfzoom = dfzoom.rename(columns={'SAMPLE NAME': 'Name'})
    
    # Check if 'all GEOROC' is in the tectonic settings list
    if 'all GEOROC' in tect_lst:
        # Find matching latitude and longitude in the main DataFrame
        fnd = dfgeo['Latitude'].isin(dfzoom['Latitude']) & dfgeo['Longitude'].isin(dfzoom['Longitude'])
        
        # Update the 'db' column for found samples
        dfgeo.loc[fnd, 'db'] = 'Georoc found'
        
        # Append 'GEOROC' to the list of databases
        db.append('GEOROC')
        
        # Identify samples in dfzoom that are not in dfgeo
        missing = ~(dfzoom['Latitude'].isin(dfgeo['Latitude']) & dfzoom['Longitude'].isin(dfgeo['Longitude']))
        dfmissing = dfzoom[missing]
        
        # If there are missing samples, concatenate them to dfgeo
        if len(dfmissing.index) > 0:
            dfgeo = pd.concat([dfgeo, dfmissing[['Latitude', 'Longitude', 'db', 'Name']]])
    else:
        # If not all tectonics, just append dfzoom to dfgeo
        dfgeo = pd.concat([dfgeo, dfzoom[['Latitude', 'Longitude', 'db', 'Name']]])
        db.append('GEOROC')
    
    return dfgeo, db


def filter_by_tectonics(dfgeo, tect_georoc):
    """
    Filters the dataset by tectonic settings.

    Args:
        dfgeo: Main geological DataFrame.
        tect_georoc: List of tectonic settings to filter by.

    Returns:
        dfgeo: Filtered DataFrame based on tectonic settings.
    """
    # Remove 'all GEOROC' and 'PetDB' from tectonic settings
    tect_georoc = [x for x in tect_georoc if x not in ['all GEOROC', 'PetDB']]
    
    # Filter the DataFrame if there are tectonic settings to apply
    return dfgeo[dfgeo['Volcano Name'].map(lambda x: bool(set(x) & set(tect_georoc)))] if tect_georoc else dfgeo


def filter_by_databases(dfgeo, db):
    """
    Filters the combined dataset based on selected databases (PetDB, GEOROC, GVP).

    Args:
        dfgeo: Main geological DataFrame.
        db: List of selected databases.

    Returns:
        dfgeo: Filtered DataFrame based on database selections.
    """
    # Mapping of databases to their corresponding values in dfgeo
    db_map = {
        'GEOROC': ['Georoc', 'Georoc found'],
        'PetDB': ['PetDB'],
        'GVP': ['GVP with eruptions', 'GVP no eruption']
    }
    
    # Retrieve the selected database values
    selected_dbs = [db_map[db_type] for db_type in db if db_type in db_map]
    
    # Filter dfgeo based on the selected databases
    return dfgeo[dfgeo['db'].isin(sum(selected_dbs, []))]


def add_tectonic_layers(fig, db, thiszoom, thiscenter):
    """
    Adds tectonic plate, rift, subduction, and intraplate data to the map.

    Args:
        fig: Plotly figure to which tectonic layers are added.
        db: List of tectonic settings chosen.
        thiszoom: Zoom level for the map.
        thiscenter: Center coordinates of the map.

    Returns:
        fig: Updated Plotly figure with tectonic layers added.
    """
    # Mapping of tectonic layers and their corresponding properties
    tectonic_layers = {
        'tectonic': ('PlateName', 0.1),
        'rift': ('ridge.gmt', 'blue'),
        'subduction': ('trench.gmt', 'red'),
        'intraplate': ('transform.gmt', 'green')
    }

    # Add tectonic layers based on the selected database
    for layer, data in tectonic_layers.items():
        if layer in db:
            if layer == 'tectonic':
                # Colorize tectonic plates on the map
                fig = colorize_tectonic_plates(data[0], data[1], thiszoom, thiscenter)
            else:
                # Show boundaries for other tectonic features
                fig = show_boundaries_plates(fig, data[0], data[1], thiszoom, thiscenter)
    
    return fig


def colorize_tectonic_plates(color_col, opacity, zoom, center):
    """
    Adds a choropleth layer (e.g., tectonic plates) to the map.

    Args:
        fig: Plotly figure to which tectonic plates are added.
        color_col: Column name for coloring the plates.
        opacity: Opacity level for the choropleth layer.
        zoom: Zoom level for the map.
        center: Center coordinates of the map.

    Returns:
        fig: Updated Plotly figure with tectonic plates added.
    """
    # Load tectonic plate data from a JSON file
    with open(TECTONICS_PLATES_DIR, 'r') as f:
        js_tect = json.load(f)
    
    # Create a GeoDataFrame from the loaded JSON features
    gdf = gpd.GeoDataFrame.from_features(js_tect)

    # Determine the zoomed-in GeoDataFrame based on center coordinates
    if center == {}:
        gdfzoom = gdf
    else: 
        # Create a bounding box for the zoom area
        zoombox = gpd.GeoSeries([Polygon([(center['lon']-2, center['lat']-2), 
                                            (center['lon']-2, center['lat']+2), 
                                            (center['lon']+2, center['lat']+2), 
                                            (center['lon']+2, center['lat']-2)])])
                            
        gdfz = gpd.GeoDataFrame({'geometry': zoombox, 'df1_data':[1]})                  
        # Get the intersection of the zoom box and tectonic plates
        gdfzoombox = gdfz.overlay(gdf, how='intersection')
        # Extract only the plates within the zoom box
        gdfzoom = gdf[gdf['PlateName'].isin(gdfzoombox['PlateName'])]

    # Create a choropleth map with the zoomed-in tectonic plates
    fig = px.choropleth_mapbox(gdfzoom, geojson=gdfzoom.geometry, locations=gdfzoom.index, color=color_col, opacity=opacity, center=center, mapbox_style="carto-positron", zoom=zoom)
    
    return fig.update_traces(showlegend=False)


def show_boundaries_plates(fig, file_path, line_color, zoom, center):
    """
    Adds tectonic line data (e.g., rift, subduction) to the map.

    Args:
        fig: Plotly figure to which tectonic lines are added.
        file_path: Path to the file containing tectonic line data.
        line_color: Color for the lines.
        zoom: Zoom level for the map.
        center: Center coordinates of the map.

    Returns:
        fig: Updated Plotly figure with tectonic lines added.
    """
    # Read the tectonic line data from the specified file
    X, Y, names = read_gmt(file_path)
    
    # Add each tectonic line to the figure
    for x, y in zip(X, Y):
        idx = X.index(x)
        fig.add_trace(go.Scattermapbox(lon=x, lat=y, mode='lines', line_color=line_color, opacity=0.6, name=names[idx], showlegend=False))
    
    return fig.update_layout(mapbox={'style': "carto-positron", 'zoom': zoom, 'center': center})
