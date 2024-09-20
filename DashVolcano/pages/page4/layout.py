from dash import dcc, html

import dash_bootstrap_components as dbc

from constants.shared_data import grnames, lst_countries

from constants.tectonics import ALL_TECTONIC_SETTINGS, NEW_TECTONIC_SETTINGS
from constants.rocks import GEOROC_ROCKS
from constants.chemicals import CHEMICALS_SETTINGS


# *************************#
# Helper functions
# *************************#

# Function to create tectonic menu options
def create_tectonic_menu_options(tectonic_settings):
    disable = {ts: False for ts in tectonic_settings}
    return [{'label': ts, 'disabled': disable[ts], 'value': ts} for ts in tectonic_settings]


# *************************#
# Create Menus
# *************************#

def create_menus():
    """Creates the dropdowns and checklist menus for tectonics, rocks, etc."""
    tectonic_options = create_tectonic_menu_options(ALL_TECTONIC_SETTINGS)

    # GEOROC tectonic settings
    new_georoc_tectonic_settings = [' all GEOROC', ' PetDB'] + NEW_TECTONIC_SETTINGS
    
    disable2 = {}
    for ts in new_georoc_tectonic_settings:
        disable2[ts] = False

    georoc_tectonic_options = []
    for ts in new_georoc_tectonic_settings:
        georoc_tectonic_options.append({'label': ts.replace('Within ', 'Intra').replace('all', ''),
                                        'disabled': disable2[ts],
                                        'value': ts})
        

    disable3 = {}
    for ch in GEOROC_ROCKS + CHEMICALS_SETTINGS[0:1]:
        disable3[ch] = False

    rocks_options = []
    for r in GEOROC_ROCKS + CHEMICALS_SETTINGS[0:1]:
        rocks_options.append({'label': ' ' + r, 'disabled': disable3[r], 'value': r})

    # Layout for menus
    return dbc.Row([
        dbc.Col([
            # First column (Region Filter and Tectonic Menu)
            html.Div("Where", className="menu-title"),
            dcc.Dropdown(id="page4-region-filter", options=[{"label": region, "value": region} for region in grnames], value="start"),
            html.Div(id='page4-textarea-example-output', style={'whiteSpace': 'pre-line'}),
            dcc.Checklist(id="page4-db-filter", options=[
                {'label': ' tectonic plates', 'value': 'tectonic'},
                {'label': ' divergent plate boundaries', 'value': 'rift'},
                {'label': ' convergent plate boundaries', 'value': 'subduction'},
                {'label': ' transform plate boundaries', 'value': 'intraplate'},
            ], value=[None]*3, className='check')
        ], width=3),
        
        # Second column (GEOROC Tectonic Settings)
        dbc.Col([
            html.Div("Tectonic Settings", className="menu-title"),
            dcc.Checklist(id='page4-GEOROC-tectonic-filter', className='check', options=georoc_tectonic_options, value=[None]*len(georoc_tectonic_options))
        ], width=3),
        
        # Third column (Country Filter and Rocks)
        dbc.Col([
            html.Div("Country Name", className="menu-title"),
            dcc.Dropdown(id="page4-country-filter", options=[{"label": region, "value": region} for region in ['all'] + lst_countries], value="all"),
            dcc.Checklist(id='page4-tectonic-filter', className='check', options=tectonic_options, value=['start'] * 10),
        ], width=3),

        # Fourth column (Rock Density Filter)
        dbc.Col([
            html.Div(children="Rock Density", className="menu-title"),
            dcc.Checklist(id='page4-rocksopt', className='check', options=rocks_options, value=[None]*len(rocks_options)),
        ], width=3)
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
                html.Button('Download', id='page4-button-1', n_clicks=0),        
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
            ]),
            dcc.Store(id="page4-tas-store")
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
        dbc.Col([html.Div(className="card", children=[dcc.Graph(id='page4-radar')])]),
        dbc.Col([html.Div(className="card", children=[dcc.Graph(id='page4-rocksGEO')])]),
        dbc.Col([html.Div(className="card", children=[dcc.Graph(id='page4-rocks')])]),
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