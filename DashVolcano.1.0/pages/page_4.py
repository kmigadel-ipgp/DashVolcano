# ************************************************************************************* #
#
# This creates a one-page layout, with a map and a TAS diagram.
# 1) create_map_samples: creates the dataframe of samples to be drawn
# 2) displays_map_samples: draws the map
# 3) update_tas: draws the TAS diagram, possibly with selected points
# 4) download_tasdata: downloads the TAS data
#
# Author: F. Oggier
# Last update: Sep 3 2022
# ************************************************************************************* #


import dash
from dash import dcc
from dash import html
import dash_bootstrap_components as dbc
import plotly.graph_objs as go
import plotly.express as px

import geopandas as gpd
import pandas as pd
import numpy as np

# links to the main app
from app import app

# import variables common to all files
# this includes loading the dataframes
from config_variables import *

# import functions to process GVP data
from GVP_functions import *
from Georoc_functions import *

# *************************#
#
# create a layout
#
# *************************#

layout = html.Div([
    # creates a layout with dbc
    dbc.Card(
        dbc.CardBody([
            # **************************************************#
            dbc.Row([
                # title (h1) and subtitle (p)
                # main header h1
                html.H1(children="Map", className="title", ),
                # paragraph
                html.P(
                    children="Shows GVP volcanoes and the location of GEOROC samples. "
                             "Use the Where menu to zoom into a specific volcano. "
                             "Choose to display data from only GVP, only GEOROC, or both. "
                             "Use the rectangular selection or lasso tool (on the top right corner of the map) "
                             "to select a subset of rock samples, whose chemical composition will be shown "
                             "in the TAS diagram below. Double-click the map to reset the selection.  ",
                    className="description",
                ),
            ], align='center', className='intro'),
            html.Br(),
            # *************************************************#
            # 2 menus
            # **************************************************#
            dbc.Row([
                # 1st column
                dbc.Col([
                    # first drop down
                    html.Div(children="Where", className="menu-title"),
                    dcc.Dropdown(
                        id="region-filter",
                        options=[{"label": region, "value": region} for region in grnames],
                        # default value
                        value="start",
                    ),
                ], width=3),
                # empty column to create alignment
                dbc.Col([
                ], width=2),
                # second column
                dbc.Col([
                    # checklist
                    html.Div(children="Which database", className="menu-title"),
                    dcc.Checklist(
                        id="db-filter",
                        options=[
                                 {'label': 'GEOROC', 'value': 'GEOROC'},
                                 {'label': 'GVP', 'value': 'GVP'}],
                        labelStyle={'margin-right': '5px'},
                        value=['GVP', 'GEOROC'],
                        className='check',
                    ),
                ], width=3),
                # empty column to create alignment
                dbc.Col([
                ], width=3),
            ], align='center', ),
            html.Br(),

            # *************************************************#
            # map
            # **************************************************#
            dbc.Row([
                # inserts a graph
                # a dcc.Graph components expect a figure object
                # or a Python dictionary containing the plot’s data and layout.
                html.Div(
                    dcc.Graph(id="map"),
                ),
            ], className="card", align='center'),
            html.Br(),

            # *************************************************#
            # chemical plots
            # **************************************************#
            dbc.Row([
                dbc.Col([
                    #
                    html.Br(),
                    html.Div(

                    ),
                    html.Br(),
                ], width=2),
                #
                dbc.Col([
                    #
                    html.Div(
                        html.Button('Download', id='button-1', n_clicks=0),
                    ),
                ], width=1),
            ], align='center'),
            html.Br(),
            dbc.Row([
                # inserts a graph
                # a dcc.Graph components expect a figure object
                # or a Python dictionary containing the plot’s data and layout.
                dbc.Col([
                    #
                    html.Div(
                        dcc.Graph(id="tas"),
                    ),
                ], width=5),
            ], className="card", align='center'),
            html.Br(),
        ]),
    ),
])


# ************************************#
#
# 1st callback for figure updates
#
# ************************************#
@app.callback(
    # cautious that using [] means a list, which causes error with a single argument
    [
        dash.dependencies.Output("map", "figure"),
        dash.dependencies.Output("map", "selectedData"),
    ],
    [
        # from drop down
        dash.dependencies.Input("region-filter", "value"),
        # from check list
        dash.dependencies.Input("db-filter", "value"),
    ],
)
def update_map(volcano_name, db):
    """

    Args:
        volcano_name: GEOROC volcano name from drop down menu
        db: choice of deb from the checkboxes

    Returns:
        returns a world map

    """

    # default center and zoom
    this_center = {}
    this_zoom = 1.3
    
    # if a volcano name is given, zoom on this volcano
    if not (volcano_name is None) and not (volcano_name == "start"):
        # find gvp name corresponding to GEOROC name
        n = volcano_name
        # handles long names
        if n in dict_Georoc_sl.keys():
            n = dict_Georoc_sl[n]
        # automatic matching
        if n in dict_Georoc_GVP.keys():
            n = dict_Georoc_GVP[n]
        else:
            n = volcano_name.title()
        
        volrecord = dfv[dfv['Volcano Name'] == n]
        # if no eruption data, switches to other record
        if len(volrecord) == 0:
            volrecord = dfvne[dfvne['Volcano Name'] == n]

        # in case no GVP record is found
        if len(volrecord) > 0:
            this_center = {'lat': float(volrecord['Latitude'].iloc[0]), 'lon': float(volrecord['Longitude'].iloc[0])}
            this_zoom = 8

    dffig = create_map_samples(db, volcano_name)
    fig = displays_map_samples(dffig, this_zoom, this_center)

    # this resets the selected points
    return [fig, None]


def create_map_samples(db, thisvolcano):
    """

    Args:
        db: choice of deb from the checkboxes
        thisvolcano: contains volcano from dropped down menu if any
    Returns:
        returns a dataframe containing the data to be plotted on the map

    """
    # name of column
    thisname = 'Name'

    # loads GEOROC
    # lists files in the folder
    if 'GEOROCaroundGVP.csv' in os.listdir('../GeorocDataset'):
        # file exists, just reads it
        dfgeo2 = pd.read_csv('../GeorocDataset/GEOROCaroundGVP.csv')
    else:
        # creates the file
        dfgeo2 = create_georoc_around_gvp()

    # handles latitude and longitude
    # removes weird latitudes
    dfgeo2 = dfgeo2[abs(dfgeo2['LATITUDE MAX']) <= 90]
    dfgeo2['Latitude'] = (dfgeo2['LATITUDE MIN'] + dfgeo2['LATITUDE MAX'])/2
    dfgeo2['Longitude'] = (dfgeo2['LONGITUDE MIN'] + dfgeo2['LONGITUDE MAX'])/2
    dfgeo2['db'] = ['Georoc']*len(dfgeo2.index)
    dfgeo2 = dfgeo2.rename(columns={'SAMPLE NAME': thisname})
    
    dfgeo = dfgeo2[['Latitude', 'Longitude', 'db', thisname]]
    
    # if a volcano name is given, higlights samples from this volcano
    if not (thisvolcano is None) and not (thisvolcano == "start"):
        dfzoom = load_georoc(thisvolcano)
        # handles latitude and longitude
        # removes weird latitudes
        dfzoom = dfzoom[abs(dfzoom['LATITUDE MAX']) <= 90]
        dfzoom['Latitude'] = (dfzoom['LATITUDE MIN'] + dfzoom['LATITUDE MAX'])/2
        dfzoom['Longitude'] = (dfzoom['LONGITUDE MIN'] + dfzoom['LONGITUDE MAX'])/2
        dfzoom['db'] = ['Georoc found']*len(dfzoom.index)
        dfzoom = dfzoom.rename(columns={'SAMPLE NAME': thisname})
        # find samples already present
        fnd = dfgeo['Latitude'].isin(dfzoom['Latitude']) & dfgeo['Longitude'].isin(dfzoom['Longitude']) 
        dfgeo.loc[fnd, 'db'] = 'Georoc found'
        # add samples not present (if any)
        missing = ~(dfzoom['Latitude'].isin(dfgeo['Latitude']) & dfzoom['Longitude'].isin(dfgeo['Longitude']))
        dfmissing = dfzoom[missing]
                
        if len(dfmissing.index) > 0:
            # dfgeo = dfgeo.append(dfmissing[['Latitude', 'Longitude', 'db', thisname]])
            dfgeo = pd.concat([dfgeo, dfmissing[['Latitude', 'Longitude', 'db', thisname]]], ignore_index=True)
    
    # GVP
    dfgeo3 = dfv[['Longitude', 'Latitude', 'Volcano Name']].copy()
    dfgeo3.loc[:, 'db'] = ['GVP with eruptions']*len(dfgeo3.index)
    dfgeo3 = dfgeo3.rename(columns={'Volcano Name': thisname})
    # dfgeo = dfgeo.append(dfgeo3)
    dfgeo = pd.concat([dfgeo, dfgeo3], ignore_index=True)
    
    dfgeo4 = dfvne[['Longitude', 'Latitude', 'Volcano Name']].copy()
    dfgeo4.loc[:, 'db'] = ['GVP no eruption']*len(dfgeo4.index)
    dfgeo4 = dfgeo4.rename(columns={'Volcano Name': thisname})
    # dfgeo = dfgeo.append(dfgeo4)
    dfgeo = pd.concat([dfgeo, dfgeo4], ignore_index=True)


    # choose which Db(s) to display
    if 'GEOROC' in db:
        if 'PetDB' in db:
            if 'GVP' in db:
                cond = dfgeo['db'].isin(['Georoc', 'Georoc found', 'PetDB', 'GVP with eruptions', 'GVP no eruption'])
            else:
                cond = dfgeo['db'].isin(['Georoc', 'Georoc found', 'PetDB'])
        else:
            if 'GVP' in db:
                cond = dfgeo['db'].isin(['Georoc', 'Georoc found', 'GVP with eruptions', 'GVP no eruption'])
            else:
                cond = dfgeo['db'].isin(['Georoc', 'Georoc found'])
    else: 
        if 'PetDB' in db:
            if 'GVP' in db:
                cond = dfgeo['db'].isin(['PetDB', 'GVP with eruptions', 'GVP no eruption'])
            else:
                cond = dfgeo['db'].isin(['PetDB'])
        else: 
            if 'GVP' in db:
                cond = dfgeo['db'].isin(['GVP with eruptions', 'GVP no eruption'])
            else:
                cond = dfgeo['db'].isin([''])
    
    dfchoice = dfgeo[cond]
    # dfchoice['db'].replace({'Georoc': 'Rock sample (GEOROC)', 'Georoc found': 'Matching rock sample (GEOROC)',
    #                         'GVP with eruptions': 'Volcano with known eruptions (GVP)',
    #                         'GVP no eruption': 'Volcano with no known eruption (GVP)'}, inplace=True)
    dfchoice['db'] = dfchoice['db'].replace({'Georoc': 'Rock sample (GEOROC)', 'Georoc found': 'Matching rock sample (GEOROC)',
                            'GVP with eruptions': 'Volcano with known eruptions (GVP)',
                            'GVP no eruption': 'Volcano with no known eruption (GVP)'})
    return dfchoice


def displays_map_samples(thisdf, thiszoom, thiscenter):
    """

        Args:
            thisdf: dataframe to be plotted on the world map
            thiszoom: zoom into the map
            thiscenter: center of the map

        Returns:
            a map of the world

    """
    # color scheme
    this_color_discrete_map = {'Rock sample (GEOROC)': 'burlywood', 'PetDB': 'darkseagreen',
                               'Volcano with known eruptions (GVP)': 'maroon',
                               'Volcano with no known eruption (GVP)': 'black',
                               'Matching rock sample (GEOROC)': 'cornflowerblue'}

    fig = px.scatter_mapbox(thisdf, lat="Latitude", lon="Longitude",
                            color='db', color_discrete_map=this_color_discrete_map,
                            mapbox_style="carto-positron", height=1000,
                            width=1600, zoom=thiszoom,
                            hover_data=['Latitude', 'Longitude', 'Name', 'db'],
                            center=thiscenter,)

    return fig


# ******************************************#
#
# 2nd callback for updates based on dropdown
#
# ********************************************#
@app.callback(
    # cautious that using [] means a list, which causes error with a single argument

    dash.dependencies.Output("tas", "figure"),

    [
        # from drop down
        dash.dependencies.Input("region-filter", "value"),
        # from selection tool
        dash.dependencies.Input("map", "selectedData"),
        # from button
        dash.dependencies.Input('button-1', 'n_clicks'),
    ],
)
def update_tas_download(volcano_name, selectedpts, button):
    """

    Args:
        volcano_name: GEOROC name
        selectedpts: output from select tool, either box or lasso
        button: download button
    Returns: updates the TAS diagram and reset the selected points

    """

    # initializes TAS figure
    fig = go.Figure()
    fig.update_layout(title='<b>Chemical Rock Composition from Georoc</b> <br>', )
    # adds TAS layout
    fig = plot_tas(fig)
    fig, tas_data = update_tas(fig, volcano_name, selectedpts)

    # downloads
    download_tasdata(tas_data, button, volcano_name)

    return fig


def update_tas(fig, volcano_name, selectedpts):
    """

       Args:
           fig: figure to be updated
           volcano_name: chosen volcano_name
           selectedpts: points selected by lasso/box tool
       Returns:
           a TAS diagram for these selected points
       """

    # for lasso tool:
    # lassoPoints = corner of the lasso, the only other key is points
    # for rectangular selection:
    # range = corner of the rectangle, the only other key is points
    # selectedpts['points'] is a list of dictionary
    # every dictionary contains a bunch of keys, including 'lon', 'lat', 'text'

    # keep only points, if no point, skips
    if not (selectedpts is None) and len(selectedpts['points']) > 0:
        selectedpts = selectedpts['points']

        # loads GEOROC
        dfgeogr = pd.read_csv('../GeorocDataset/GEOROCaroundGVP.csv')

        dfgeogr['LATITUDE'] = (dfgeogr['LATITUDE MIN'] + dfgeogr['LATITUDE MAX']) / 2
        dfgeogr['LONGITUDE'] = (dfgeogr['LONGITUDE MIN'] + dfgeogr['LONGITUDE MAX']) / 2

        # separate into dbs
        # GEOROC, only those in GEOROCaroundGVP file
        with_text = [[x['lon'], x['lat']] for x in selectedpts if ('Rock sample (GEOROC)' in x['customdata'])]
        # GEOROC, those matching
        with_text_match = [[x['lon'], x['lat']] for x in selectedpts
                           if ('Matching rock sample (GEOROC)' in x['customdata'])]

        # plots points from GEOROC
        gr_idx = dfgeogr.set_index(['LATITUDE', 'LONGITUDE'])
        whichfiles = []
        whichlocation = []
        for lt_lg in with_text:
            lt = lt_lg[1]
            lg = lt_lg[0]
            # find files with the selected data
            fnd_idx = list(gr_idx.loc[(lt, lg), 'arc'].unique())
            whichfiles += fnd_idx
            # find locations with the selected data
            fnd_idx2 = list(gr_idx.loc[(lt, lg), 'LOCATION'].unique())
            whichlocation += fnd_idx2
        # removes duplicates
        whichfiles = list(set(whichfiles))
        whichlocation = list(set(whichlocation))

        # matching samples are present, so we need to load them based on the name
        if len(with_text_match) > 0:
            dfloaded = load_georoc(volcano_name)
        else:
            dfloaded = pd.DataFrame()

        for pathcsv in whichfiles:
            # changes name to the latest file version
            pathcsv = fix_pathname(pathcsv)
            # loads the file
            dftmp = pd.read_csv("../GeorocDataset/%s" % pathcsv, low_memory=False, encoding='latin1')
            # inclusion file has a different format
            if 'Inclusions_comp' in pathcsv:
                # updates columns to have the same format as dataframes from other files
                dftmp = fix_inclusion(dftmp)
            # locations
            dfloc = dftmp[dftmp['LOCATION'].isin(whichlocation)]
            # dfloaded = dfloaded.append(dfloc)
            dfloaded = pd.concat([dfloaded, dfloc], ignore_index=True)


        if len(dfloaded.index) > 0:
            # add normalization
            dfloaded = with_feonorm(dfloaded)

    else:

        if not (volcano_name is None) and not (volcano_name == "start"):
            dfloaded = load_georoc(volcano_name)
        else:
            dfloaded = pd.DataFrame()

    if len(dfloaded.index) > 0:
        # makes sure all 3 chemicals are present
        dfloaded = dfloaded.dropna(subset=['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], how='all')
        thisgeogr = detects_chems(dfloaded, ['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], morechems, lbls)

        # draws the scatter plot
        fig = plot_chem(fig, thisgeogr, ['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], lbls)
    else:
        thisgeogr = pd.DataFrame()

    # this returns the dataframe thisgeogr
    return [fig, thisgeogr]


def download_tasdata(tasdata, button, volcano_name):
    """

    Args:
        tasdata: dataframe that was plotted in TAS diagram
        button: download button
        volcano_name: GEOROC volcano name
    Returns:
    """
    # if download button is clicked
    # button = no of clicks on the button
    title = ''
    if button >= 1 and len(tasdata.index) > 0:
        #
        changed_id = [p['prop_id'] for p in dash.callback_context.triggered][0]
        # this is to make sure that only when the last event is button pressed, then the download happens
        if changed_id == 'button-1.n_clicks':
            # no volcano name
            if not (volcano_name is None) and not (volcano_name == "start"):
                title = str(volcano_name)
            else:
                if not (selectedpts is None):
                    title = 'selected_points'
            if not (title == ''):
                # cleans up, removes columns that are not needed for download
                locs = ['LOCATION-' + str(i) for i in range(1, 9)]
                dropmore = ['GUESSED DATE', 'NA2O(WT%)+K2O(WT%)',
                            'excessFEO(WT%)', 'excessCAO(WT%)', 'excessMGO(WT%)', 'color', 'symbol',
                            'SIO2(WT%)old', 'NA2O(WT%)old', 'K2O(WT%)old']

                for loc in locs + dropmore:
                    if loc in list(tasdata):
                        tasdata = tasdata.drop(loc, axis=1)

                # removes duplicates
                tasdata = tasdata.drop_duplicates()
                # saves to file
                tasdata.to_excel('download_%s.xlsx' % title, sheet_name='sheet 1', index=False)
