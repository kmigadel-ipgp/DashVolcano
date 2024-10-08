# functions/map.py
import plotly.graph_objs as go
import plotly.express as px
import pandas as pd
import ast

from dataloader.data_loader_georoc import load_georoc_data
from dataloader.data_loader_petdb import load_petdb_data
from dataloader.data_loader_gvp import filter_volcano_data

from constants.shared_data import df_volcano, df_volcano_no_eruption, dict_georoc_sl, dict_volcano_file
from constants.tectonics import ALL_TECTONIC_SETTINGS
from constants.chemicals import CHEMICALS_SETTINGS
from constants.rocks import GEOROC_ROCKS

from helpers.helpers import highlight_volcano_samples, filter_by_databases, filter_by_tectonics, add_tectonic_layers


def create_map_samples(database, thisvolcano, gvp_tect_setting, georoc_petdb_tect_setting, country):
    """
    Creates a world map showing sample locations based on the chosen database (PetDB, GEOROC, GVP),
    tectonic settings, country, and optionally a specific volcano.

    Args:
        database (list): List of databases used.
        thisvolcano (str): Specific volcano name selected from dropdown.
        gvp_tect_setting (list): List of GVP tectonic settings.
        georoc_petdb_tect_setting (list): List of GEOROC and PetDB tectonic settings.
        country (str): Selected country for filtering volcanoes.
        dict_georoc_sl (dict): Dictionary mapping GEOROC sample names to their details.
        dict_volcano_file (dict): Dictionary mapping volcano names to their files.

    Returns:
        pd.DataFrame: DataFrame containing coordinates and metadata for plotting on the map.
    """

    # Load and process PetDB data
    dfgeopdb = load_petdb_data(database, georoc_petdb_tect_setting, df_volcano, df_volcano_no_eruption)

    # Load and process GEOROC data
    dfgeogr = load_georoc_data(database, georoc_petdb_tect_setting)

    # Combine PetDB and GEOROC data
    dfgeo = pd.concat([dfgeopdb, dfgeogr[['Latitude', 'Longitude', 'db', 'Volcano Name', 'Name', 'refs', 'ROCK no inc', 'SIO2(WT%)mean']]])

    # Filter by tectonic setting
    dfgeo = filter_by_tectonics(dfgeo, georoc_petdb_tect_setting)

    # Highlight samples from the selected volcano if specified
    if thisvolcano and thisvolcano != "start":
        dfgeo, database = highlight_volcano_samples(dfgeo, thisvolcano, georoc_petdb_tect_setting, database, dict_georoc_sl, dict_volcano_file)
        
    # Clean GVP tectonic settings and ensure at least one setting is available
    if not gvp_tect_setting:
        # Include 'Unknown' to display volcanoes with no known tectonic setting
        gvp_tect_setting = ALL_TECTONIC_SETTINGS + ['Unknown']

    # Process GVP data (both with and without eruptions)
    dfgeo = pd.concat([dfgeo, filter_volcano_data(df_volcano, gvp_tect_setting, country, has_eruption=True)])
    dfgeo = pd.concat([dfgeo, filter_volcano_data(df_volcano_no_eruption, gvp_tect_setting, country, has_eruption=False)])

    # Filter based on the selected databases (PetDB, GEOROC, GVP)
    dfgeo = filter_by_databases(dfgeo, database)

    # Replace database names with descriptive labels
    dfgeo['db'] = dfgeo['db'].replace({
        'Georoc': 'Rock sample (GEOROC)', 
        'Georoc found': 'Matching rock sample (GEOROC)', 
        'GVP with eruptions': 'Volcano with known eruption data (GVP)', 
        'GVP no eruption': 'Volcano with no known eruption data (GVP)'
    })

    return dfgeo


def displays_map_samples(thisdf, thiszoom, thiscenter, plates_boundaries_setting, georoc_petdb_tect_setting, rocks_density_filter):
    """
    Displays a world map with geological data.
    
    Args:
        thisdf (pd.DataFrame): DataFrame containing geological data to plot on the map.
        thiszoom (int): Zoom level for the map.
        thiscenter (dict): Coordinates for the center of the map.
        plates_boundaries_setting (list): List of plates boundaries to display.
        georoc_petdb_tect_setting (list): GEOROC and PetDB tectonic settings to filter data.
        rocks_density_filter (list): List of selected rock types for filtering map samples.
    
    Returns:
        go.Figure: A Plotly figure with samples and tectonic layers plotted.
    """ 
    # Determine color column and set filter for SIO2 values
    if len(list(set(rocks_density_filter) & set(CHEMICALS_SETTINGS))) > 0 and georoc_petdb_tect_setting:
        colorcol = 'SIO2(WT%)mean'
        thisdf['SIO2(WT%)mean'] = thisdf['SIO2(WT%)mean'].fillna(0)
        # Filter ranges of silica
        thisdf = thisdf[(thisdf['SIO2(WT%)mean'] >= 30) & (thisdf['SIO2(WT%)mean'] <= 80)]
        thisdf['SIO2(WT%)mean'] = thisdf['SIO2(WT%)mean'].round(-1)
        # Initialize color scheme
        this_color_discrete_map = {}
    else:
        colorcol = 'db'
        # Define color scheme for different database categories
        this_color_discrete_map = {
            'Rock sample (GEOROC)': 'burlywood', 
            'PetDB': 'darkseagreen', 
            'Volcano with known eruption data (GVP)': 'maroon',
            'Volcano with no known eruption data (GVP)': 'black',
            'Matching rock sample (GEOROC)': 'cornflowerblue'
        }
                
    if len(list(set(rocks_density_filter) & set(GEOROC_ROCKS))) > 0 and georoc_petdb_tect_setting:
        # Reads list format from a string in list format
        # ROCK for all rocks, and ROCK no inc to remove inclusions
        thisdf['ROCK no inc'] = thisdf['ROCK no inc'].apply(lambda y: ast.literal_eval(y) if isinstance(y, str) else [])
        thisdf['count'] = thisdf['ROCK no inc'].apply(lambda y: sum([x[1] if x[0] in rocks_density_filter else 0 for x in y]))
        
        # Draws the samples on the map using a density map
        figtmp = px.density_mapbox(
            thisdf, 
            lat="Latitude", 
            lon="Longitude", 
            z='count', 
            height=1000,
            radius=30,
            mapbox_style="carto-positron",
            zoom=thiszoom,
            opacity=0.3,
            color_continuous_scale='inferno',
            hover_data=['Latitude', 'Longitude', 'Name', 'db'],
            center=thiscenter,
        )
        
        if colorcol == 'db':
            thiscolormap = thisdf["db"].replace(this_color_discrete_map)
        if colorcol == 'SIO2(WT%)mean':
            thiscolormap = thisdf['SIO2(WT%)mean']        
        thiscolorscale = px.colors.sequential.Jet[::-1]
            
        # Add scatter points for geological samples
        figtmp.add_trace(
            go.Scattermapbox(
                lat=thisdf["Latitude"],
                lon=thisdf["Longitude"],
                mode="markers",
                customdata=thisdf['Latitude'].astype(str) + ', ' + thisdf['Longitude'].astype(str) + ', ' + thisdf['Name'] + ', ' + thisdf['db'] + thisdf['refs'],
                hovertemplate='%{customdata}',
                marker={
                    "color": thiscolormap,
                    'colorscale': thiscolorscale,
                }
            )
        )
    else:
        # Draws the samples on the map using a scatter plot
        figtmp = px.scatter_mapbox(thisdf, lat="Latitude", lon="Longitude", 
            color=colorcol, 
            color_discrete_map=this_color_discrete_map, 
            color_continuous_scale=px.colors.sequential.Jet[::-1],
            mapbox_style="carto-positron",
            zoom=thiszoom,
            height=1000,
            hover_data=['Latitude', 'Longitude', 'Name', 'db', 'refs'],
            center=thiscenter,
        )
            
    fig = go.Figure()

    # Add tectonic layers based on selected db settings
    if any(setting in plates_boundaries_setting for setting in ['tectonic', 'rift', 'subduction', 'intraplate']):
        fig = add_tectonic_layers(fig, plates_boundaries_setting, thiszoom, thiscenter)

        # Overlay the geological samples on top of the tectonic layers
        for trace in figtmp.data:
            fig.add_trace(trace)
    else:
        fig = figtmp

    return fig
