import os
import ast
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
    """
    Computes a pairwise distance matrix based on squared differences.

    Args:
        data (list of lists): A 2D list where each sublist represents a data point.

    Returns:
        np.matrix: A matrix where the (i, j) entry represents the half-squared Euclidean distance
                   between data point i and data point j.
    """

    # Initialize an empty list to store the rows of the matrix
    rows = []

    # Iterate over each data point in the input list (r1)
    for r1 in data:
        # For each data point r1, compute the row of the matrix by calculating the
        # half-squared Euclidean distance to every other data point (r2)
        row = [
            np.square(np.subtract(np.array(r1), np.array(r2))).sum() / 2
            for r2 in data
        ]

        # Append the computed row to the rows list
        rows.append(row)

    # Convert the list of rows into an np.matrix and return the result
    return np.matrix(rows)


def split_coordinates(zone):
    """
    Splits each line of zone data by spaces and removes any empty strings.

    Args:
        zone (list): A list of strings, each representing a line of data from the GMT file.

    Returns:
        list: A list of lists where each sublist contains the coordinate values (as strings) for a given line.
    """
    return [[y for y in x.split(' ') if y != ''] for x in zone]


def append_split_data(longitudes, latitudes, on, rs, x1_val, x2_val, names_list):
    """
    Splits the coordinates into two parts based on specified x-values and appends them to the respective lists.

    Args:
        longitudes (list): List to store longitude data.
        latitudes (list): List to store latitude data.
        on (str): The name of the tectonic zone.
        rs (list): List of coordinate pairs (longitude, latitude) for the current zone.
        x1_val (float): First longitude value used to split the zone coordinates.
        x2_val (float): Second longitude value used to split the zone coordinates.
        names_list (list): List to store the zone names.

    Returns:
        tuple: Updated longitudes, latitudes, and names_list after appending the split data.
    """
    # Extract longitudess from the coordinate pairs
    x_tmp = [float(x[0]) for x in rs]
    
    # Find the indices where the splitting should happen
    id1, id2 = x_tmp.index(x1_val), x_tmp.index(x2_val)
    
    # Append the first part of the split data
    longitudes.append([float(x[0]) for x in rs[0:id1]])
    latitudes.append([float(x[1]) for x in rs[0:id1]])
    
    # Append the second part of the split data
    longitudes.append([float(x[0]) for x in rs[id2:]])
    latitudes.append([float(x[1]) for x in rs[id2:]])
    
    # Append the zone name twice since data was split into two segments
    names_list.append(on)
    names_list.append(on)

    return longitudes, latitudes, names_list


def read_gmt(file_name):
    """
    Reads a GMT file and extracts longitudes, latitudes, and zone names.

    Args:
        file_name (str): Name of the GMT file, e.g., 'ridge.gmt'.

    Returns:
        tuple: Three lists containing the longitudes, latitudes, and names of the tectonic zones.
    """

    # Initialize an empty list to hold the file's raw data lines
    data = []
    
    # Construct the full file path by combining the directory and file name
    file_path = os.path.join(TECTONIC_ZONES_DIR, file_name)
    
    # Open and read the contents of the GMT file
    with open(file_path) as gmtf:
        data = gmtf.readlines()

    # Extract zone names (lines starting with '>') and group the remaining data by tectonic zones
    orig_names = [x.strip('>') for x in data if '>' in x][:-1]
    zones = [list(g) for k, g in groupby(data, key=lambda x: '>' not in x) if k]

    # Initialize empty lists to store longitudes (X), latitudes (Y), and zone names
    longitudes, latitudes, names = [], [], []

    # Iterate over each zone and its corresponding original name
    for r, on in zip(zones, orig_names):
        # Split the zone data into longitude-latitude pairs
        rs = split_coordinates(r)

        # If the file name contains 'ridge', process ridge-specific logic
        if 'ridge' in file_name:
            # Check for specific longitude values in the zone data
            fnd1 = any(np.isclose(float(x[0]), 179.935, rtol=1e-09, atol=1e-09) for x in rs)
            fnd2 = any(np.isclose(float(x[0]), 179.9024, rtol=1e-09, atol=1e-09) for x in rs)
            
            # If specific values are found, split the data and append
            if fnd1:
                longitudes, latitudes, names = append_split_data(longitudes, latitudes, on, rs, 179.935, -179.77, names)
            elif fnd2:
                longitudes, latitudes, names = append_split_data(longitudes, latitudes, on, rs, 179.9024, -179.9401, names)
            else:
                # Otherwise, append the entire zone's data
                longitudes.append([float(x[0]) for x in rs])
                latitudes.append([float(x[1]) for x in rs])
                names.append(on)

        # If the file name contains 'trench', process trench-specific logic
        elif 'trench' in file_name:
            # Check if a specific longitude value is found in the zone data
            fnd1 = any(float(x[0]) == -179.7613 for x in rs)
            
            # If found, split and append the data
            if fnd1:
                longitudes, latitudes, names = append_split_data(longitudes, latitudes, on, rs, -179.7613, 179.8569, names)
            else:
                # Otherwise, append the entire zone's data
                longitudes.append([float(x[0]) for x in rs])
                latitudes.append([float(x[1]) for x in rs])
                names.append(on)

        # If the file name contains 'transform', process transform-specific logic
        elif 'transform' in file_name:
            # Reduce the number of points by taking every third point if the zone has more than 10 points
            if len(rs) > 10:
                rs = rs[0::3]  # Take every third point
            longitudes.append([float(x[0]) for x in rs])
            latitudes.append([float(x[1]) for x in rs])
            names.append(on)

    # Return the longitudes (longitudes), latitudes (latitudes), and names of the tectonic zones
    return longitudes, latitudes, names


def create_menu_options(items, disabled_state=None):
    """
    Creates a list of dictionary-based menu options for a dropdown or menu component.
    
    Args:
        items (list): A list of items for which menu options need to be created.
        disabled_state (dict, optional): A dictionary specifying the disabled state for each item.
                                         If None, all items will be enabled by default.

    Returns:
        list: A list of dictionaries, each containing 'label', 'disabled', and 'value' keys for the menu option.
    """

    # If no disabled_state is provided, initialize all items as enabled (False).
    if disabled_state is None:
        disabled_state = {item: False for item in items}

    # Create a list of menu options where each option is a dictionary containing:
    # 'label': the item name to display
    # 'disabled': whether the item is disabled (based on the disabled_state)
    # 'value': the item itself
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


def add_tectonic_layers(fig, plates_boundaries_setting, thiszoom, thiscenter):
    """
    Adds tectonic plate, rift, subduction, and intraplate data to the map.

    Args:
        fig: Plotly figure to which tectonic layers are added.
        plates_boundaries_setting (list): List of plates boundaries to display.
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
        if layer in plates_boundaries_setting:
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


def replace_nan_in_string_list(val, column_name):
    """
    Processes a value by replacing 'nan' with '0' and converting strings representing 
    lists into actual lists. For the 'MATERIAL' column, elements are converted to strings.
    For other columns, elements are converted to floats.
    
    Parameters:
    val (str or other): The value to process, which could be a string, list, or other.
    column_name (str): The name of the column where the value is located.
    
    Returns:
    list or original value: A list of floats/strings or the original value if no processing is needed.
    """
    if isinstance(val, str):  # Only process if it's a string
        try:
            if "nan" in val:
                val = val.replace("nan", "0")  # Replace 'nan' with '0'
            val_list = ast.literal_eval(val)  # Attempt to evaluate the string as a Python literal (list)
            
            # Check if the evaluated result is a list
            if isinstance(val_list, list):
                # For the 'MATERIAL' column, convert each element to string
                if column_name == 'MATERIAL':
                    return [str(x) for x in val_list]
                else:
                    # For other columns, convert elements to floats
                    return [float(x) for x in val_list]
        except:
            # If evaluation fails (e.g., invalid string), return the original value
            return val
    return val  # Return the original value if no changes were made


def expand_rows_with_lists(df):
    """
    Expands rows in a DataFrame where certain columns contain lists. Each list element 
    will become a new row, duplicating non-list columns. If Latitude and Longitude are 
    part of the DataFrame index, they are retained as regular columns during expansion.
    
    Parameters:
    df (pd.DataFrame): The DataFrame with columns that may contain lists and indexed by Latitude and Longitude.
    
    Returns:
    pd.DataFrame: A new DataFrame where rows have been expanded to account for list elements, 
    with Latitude and Longitude retained.
    """
    new_rows = []  # List to store the new rows after expansion
    
    # Reset index to bring Latitude and Longitude back as columns
    df_reset = df.reset_index()
    
    # Iterate through each row in the DataFrame
    for index, row in df_reset.iterrows():
        # Identify the columns that contain lists (assumed to be after the index columns)
        list_columns = df_reset.columns[2:]  # List columns start from the 3rd column (after Latitude and Longitude)
        
        # Determine the maximum number of elements in any list column for this row
        max_elements = max(len(row[col]) for col in list_columns if isinstance(row[col], list))
        
        # Generate new rows based on the maximum number of elements in list columns
        for i in range(max_elements):
            new_row = row.copy()  # Copy the current row
            
            # Replace list values with the i-th element for each list column
            for col in list_columns:
                if isinstance(row[col], list):
                    new_row[col] = row[col][i]  # Use the i-th element from the list
            
            # Append the new row to the list of expanded rows
            new_rows.append(new_row)
    
    # Create a new DataFrame from the expanded rows
    expanded_df = pd.DataFrame(new_rows)
    
    # Reset the index of the new DataFrame to maintain continuity
    expanded_df = expanded_df.reset_index(drop=True)
    
    return expanded_df
