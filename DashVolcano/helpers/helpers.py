import os
import pandas as pd
import numpy as np
import json
import geopandas as gpd
import plotly.express as px
import plotly.graph_objs as go
from shapely.geometry import Polygon
from itertools import groupby

from functions.georoc import load_georoc

from constants.paths import TECTONICS_PLATES_DIR, TECTONIC_ZONES_DIR


def calculate_matrix(data):
        rows = []
        for r1 in data:
            row = [np.square(np.subtract(np.array(r1), np.array(r2))).sum() / 2 for r2 in data]
            rows.append(row)
        return np.matrix(rows)


def read_gmt(file_name):
    """
    Reads a GMT file and extracts longitudes, latitudes, and zone names.

    Args:
        file_name (str): Name of the GMT file, e.g., 'ridge.gmt'.

    Returns:
        tuple: Three lists containing the longitudes, latitudes, and names of the tectonic zones.
    """
    
    data = []
    file_path = os.path.join(TECTONIC_ZONES_DIR, str(file_name))

    # reads gmt file
    with open(file_path) as gmtf:
        for line in gmtf:
            data.append(line)
 
    orig_names = [x.strip('>') for x in data if '>' in x][:-1]
    names = []
    
    zones = [list(g) for k, g in groupby(data, key=lambda x: not('>' in x)) if k]

    X = []
    Y = []

    for r, on in zip(zones, orig_names):
        rs = [[y for y in x.split(' ') if y != ''] for x in r]
        
        # so need to cut two lines for ridge
        if 'ridge' in file_name:

            fnd1 = [x for x in rs if (float(x[0]) == 179.935)]
            fnd2 = [x for x in rs if (float(x[0]) == 179.9024)]

            if len(fnd1) > 0:
                x_tmp = [float(x[0]) for x in rs]
                id1 = x_tmp.index(179.935)
                id2 = x_tmp.index(-179.77)
                X.append([float(x[0]) for x in rs[0:id1]])
                Y.append([float(x[1]) for x in rs[0:id1]])
                X.append([float(x[0]) for x in rs[id2:]])
                Y.append([float(x[1]) for x in rs[id2:]])
                names.append(on)
                names.append(on)
            elif len(fnd2) > 0:
                x_tmp = [float(x[0]) for x in rs]
                id1 = x_tmp.index(179.9024)
                id2 = x_tmp.index(-179.9401)
                X.append([float(x[0]) for x in rs[0:id1]])
                Y.append([float(x[1]) for x in rs[0:id1]])
                X.append([float(x[0]) for x in rs[id2:]])
                Y.append([float(x[1]) for x in rs[id2:]])
                names.append(on)
                names.append(on)
            else:
                X.append([float(x[0]) for x in rs])
                Y.append([float(x[1]) for x in rs])
                names.append(on)
    
        # so need to cut two lines for ridge
        if 'trench' in file_name:

            fnd1 = [x for x in rs if (float(x[0]) == -179.7613)]

            if len(fnd1) > 0:
                x_tmp = [float(x[0]) for x in rs]
                id1 = x_tmp.index(-179.7613)
                id2 = x_tmp.index(179.8569)
                X.append([float(x[0]) for x in rs[0:id1]])
                Y.append([float(x[1]) for x in rs[0:id1]])
                X.append([float(x[0]) for x in rs[id2:]])
                Y.append([float(x[1]) for x in rs[id2:]])
                names.append(on)
                names.append(on)
            
            else:
                X.append([float(x[0]) for x in rs])
                Y.append([float(x[1]) for x in rs])
                names.append(on)
                
        # for transform
        if 'transform' in file_name:
            if len(rs) > 10:
                rs = rs[0::3]
                on = on[0::3]
            X.append([float(x[0]) for x in rs])
            Y.append([float(x[1]) for x in rs])
            names.append(on)

    return X, Y, names

# Function to create menu options
def create_menu_options(items, disabled_state=None):
    """Creates menu options for given items with all options enabled by default."""
    if disabled_state is None:
        disabled_state = {item: False for item in items}
    return [{'label': item, 'disabled': disabled_state[item], 'value': item} for item in items]


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


def highlight_volcano_samples(dfgeo, thisvolcano, georoc_petdb_tect_setting, db, dict_georoc_sl, dict_volcano_file):
    """
    Highlights samples from the selected volcano.

    Args:
        dfgeo: DataFrame containing geological data.
        thisvolcano: Name of the volcano to highlight.
        georoc_petdb_tect_setting: List of Georoc and PetDB tectonic settings to consider.
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
    dfzoom['db'] = 'Georoc found'
    
    # Update the main geological DataFrame with new samples
    dfgeo, db = update_georoc_samples(dfgeo, dfzoom, georoc_petdb_tect_setting, db)
    
    return dfgeo, db


def update_georoc_samples(dfgeo, dfzoom, georoc_petdb_tect_setting, db):
    """
    Updates GEOROC samples with new data.

    Args:
        dfgeo: Main geological DataFrame.
        dfzoom: DataFrame containing new GEOROC samples.
        georoc_petdb_tect_setting: List of Georoc and PetDB tectonic settings to check.
        db: List of databases in use.

    Returns:
        dfgeo: Updated DataFrame with GEOROC samples included.
        db: Updated list of databases.
    """
    # Rename column for consistency
    dfzoom = dfzoom.rename(columns={'SAMPLE NAME': 'Name'})
    
    # Check if 'GEOROC' is in the tectonic settings list
    if 'GEOROC' in georoc_petdb_tect_setting:
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
            dfgeo = pd.concat([dfgeo, dfmissing[['Latitude', 'Longitude', 'db', 'Name', 'refs']]])
    else:
        # If not all tectonics, just append dfzoom to dfgeo
        dfgeo = pd.concat([dfgeo, dfzoom[['Latitude', 'Longitude', 'db', 'Name', 'refs']]])
        db.append('GEOROC')
    
    return dfgeo, db


def filter_by_tectonics(dfgeo, georoc_petdb_tect_setting):
    """
    Filters the dataset by tectonic settings.

    Args:
        dfgeo: Main geological DataFrame.
        georoc_petdb_tect_setting: List of Georoc and PetDB tectonic settings to filter by.

    Returns:
        dfgeo: Filtered DataFrame based on tectonic settings.
    """
    # Remove 'GEOROC' and 'PetDB' from tectonic settings
    georoc_petdb_tect_setting = [x for x in georoc_petdb_tect_setting if x not in ['GEOROC', 'PetDB']]
    
    # Filter the DataFrame if there are tectonic settings to apply
    return dfgeo[dfgeo['Volcano Name'].map(lambda x: bool(set(x) & set(georoc_petdb_tect_setting)))] if georoc_petdb_tect_setting else dfgeo


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
