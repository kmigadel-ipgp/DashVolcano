from dash import dcc, html

import dash_bootstrap_components as dbc

from constants.shared_data import grnames, lst_countries
from constants.tectonics import ALL_TECTONIC_SETTINGS, NEW_TECTONIC_SETTINGS
from constants.rocks import GEOROC_ROCKS

from helpers.helpers import create_menu_options

# *************************#
# Create Menus
# *************************#

def create_menus():
    """Creates the dropdowns and checklist menus for tectonics, rocks, etc."""
    # Rock database
    rock_database = create_menu_options(['GEOROC', 'PetDB'])

    # Tectonic settings
    gvp_tectonic_options = create_menu_options(ALL_TECTONIC_SETTINGS)
    rock_tectonic_options = create_menu_options(NEW_TECTONIC_SETTINGS)

    # Rocks and chemical settings
    rocks_options = create_menu_options(GEOROC_ROCKS + ['SIO2(WT%)'])

    # Layout for menus
    return dbc.Row([
        dbc.Col([
            html.Div([
                # First column (Map View Menu)
                html.Div("Map View", className="menu-title"),
                dcc.Checklist(id="page4-plates-boundaries-filter", options=[
                    {'label': 'tectonic plates', 'value': 'tectonic'},
                    {'label': 'divergent plate boundaries', 'value': 'rift'},
                    {'label': 'convergent plate boundaries', 'value': 'subduction'},
                    {'label': 'transform plate boundaries', 'value': 'intraplate'},
                ], value=[], className='check')
            ], className='card'),
            html.Div([
                html.Div("Volcanic Rock Database", className="menu-title"),
                dcc.Checklist(id='page4-rock-database', className='check', options=rock_database, value=[]),
                html.Div("Tectonic Settings", className="menu-title"),
                dcc.Checklist(id='page4-rock-tectonic-settings', className='check', options=rock_tectonic_options, value=[]),
            ], className='card'),
            html.Div([
                html.Div(children="Rock Density Map", className="menu-title"),
                dcc.Dropdown(id='page4-rocks-density-filter', options=rocks_options, value=[], multi=True),            
                ], className='card')
        ], width=3),
        
        # Second column (GEOROC - PetDB Tectonic Settings)
        dbc.Col([
            html.Div([
                html.Div("Global Volcanism Program (GVP)", className="menu-title"),
                html.Div("Select Volcano country", className="menu-title"),
                dcc.Dropdown(id="page4-country-filter", options=[{"label": region, "value": region} for region in ['all'] + lst_countries], value="all"),
                html.Div("Tectonic Settings", className="menu-title"),
                dcc.Checklist(id='page4-GVP-tectonic-settings', className='check', options=gvp_tectonic_options, value=[]),
                html.Div("*GVP provides volcano locations, tectonic settings and main rock types.", className="information"),
            ], className='card')
        ], width=3),
        
        # Third column (GVP Tectonic Settings)
        dbc.Col([
            html.Div([
                html.Div("Single volcano view", className="menu-title"),
                dcc.Dropdown(id="page4-region-filter", options=[{"label": region, "value": region} for region in grnames], value="start"),
                html.Div(id='page4-textarea-output', style={'whiteSpace': 'pre-line'}),
            ], className='card')
        ], width=3),
    ], justify='center')  # Centering the row horizontally and vertically
    

# *************************#
# Create Map Plot
# *************************#

def create_map():
    return dbc.Row([
        dbc.Col([html.Div(dcc.Graph(id="page4-map"), className='card')], width=10)  # Set width to center the map
    ], justify='center', align='center')  # Centering the column within the row


# *************************#
# Create Download
# *************************#

def create_download_button():
    """Creates the download button."""
    return dbc.Row([
        dbc.Col([
            html.Div([
                html.Button('Download', id='page4-download-button', n_clicks=0),        
                # Download component (to trigger the download automatically)
                dcc.Download(id='page4-download')
            ], style={'textAlign': 'center'})  # Centering the button within the column
        ])
    ], justify='center')  # Centering the column within the row


# *************************#
# TAS and AFM Plots
# *************************#

def create_tas_and_afm_plot():
    """Creates the TAS diagram."""
    return dbc.Row([
        dbc.Col([
            html.Div(className="card", children=[
                dcc.Graph(id="page4-tas"), 
                html.Div(id='page4-tas-title', style={'whiteSpace': 'pre-line'})
            ])
        ], width=6),
        dbc.Col([
            html.Div(className="card", children=[dcc.Graph(id='page4-afm')]),
        ], width=6)
    ], align='center')

# *************************#
# Rock Composition Plots
# *************************#

def create_rock_composition_plots():
    """Creates the rock composition plots."""
    return dbc.Row([
        dbc.Col([html.Div(className="card", children=[
            html.Div("Number of samples obtained per volcano", className="menu-title"),
            dcc.RangeSlider(min=0, max=100, value=[5, 15], marks={0: '0', 25: '25', 50: '50', 75: '75', 100: '100' }, id='page4-range-slider'),
            dcc.Graph(id='page4-radar')])]),
        dbc.Col([html.Div(className="card", children=[dcc.Graph(id='page4-rocks-composition-GEOROC')])]),
        dbc.Col([html.Div(className="card", children=[dcc.Graph(id='page4-rocks-composition-GVP')])]),
    ], align='center')

# *************************#
# Main Page Layout
# *************************#

def create_page_layout():
    """Creates the overall page layout."""
    
    return html.Div([
        # Main card layout
        dbc.Card(dbc.CardBody([
            # Header
            dbc.Row([html.H1("Map", className="title"), html.P(
                "Shows GVP volcanoes and the location of GEOROC samples. "
                "Use the Where menu to zoom into a specific volcano. "
                "Choose to display data from only GVP, only GEOROC, or both. "
                "Use the rectangular selection or lasso tool (on the top right corner of the map) "
                "to select a subset of rock samples, whose chemical composition will be shown " 
                "in the TAS diagram below. Double-click the map to reset the selection.  "
                "Use the display tectonic plates/ rift zone/ subduction zone/ intraplate zone check boxes "
                "to add these zones to the map. Choose specific settings from GEOROC or GVP. ",
                className="description",
            )], align='center', className='intro'),
            html.Br(),

            # Menus
            create_menus(),
            html.Br(),

            # Map
            create_map(),
            html.Br(),

            # Download Section
            create_download_button(),
            html.Br(),

            # TAS and AFM diagrams
            create_tas_and_afm_plot(),
            html.Br(),

            # Rock Composition plots
            create_rock_composition_plots(),
            html.Br(),
        ], className='page')),
    ])