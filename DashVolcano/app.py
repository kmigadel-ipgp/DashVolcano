# ************************************************************************************* #
#
# This file creates and start the app DashVolcano.
#
# Author: F. Oggier
# Last update: 23 Sep 2023
# ************************************************************************************* #


import dash_bootstrap_components as dbc        
from dash import Dash, dcc, html, callback, Input, Output
from pages import page_2, page_4, page_5, page_3
import dataloader.data_loader as data_loader

# ****************************#
#
# create a class instance
#
# ***************************#

app = Dash(__name__, external_stylesheets=[dbc.themes.BOOTSTRAP], suppress_callback_exceptions=True)

app.title = "Volcano Analytics"

# Ensure that data is loaded before the app layout is set
data_loader.load_data()  # Load data to initialize global variables

app.layout = html.Div([
    dcc.Location(id='url', refresh=False),
    # this creates links on top of all pages,
    # since it is displayed before the page content
    dbc.Row([
        dbc.Col([
            dcc.Link('Map', href='/page-4', className='menu-link'),
            ], width=2),
        dbc.Col([
            dcc.Link('TAS and Harker Diagrams', href='/page-2', className='menu-link'),
            ], width=2),
        dbc.Col([
            dcc.Link('TAS Diagrams and Chronogram', href='/page-5', className='menu-link'),
            ], width=2),    
        dbc.Col([
            dcc.Link('Rock Similarity', href='/page-3', className='menu-link'),
            ], width=2),     
    ]),
    # this loads the page content
    html.Div(id='page-content', children=[])
])


@callback(
    Output(
        component_id='page-content',
        component_property='children',
        ),
    [Input(
        component_id='url',
        component_property='pathname',
        )]
)

def display_page(pathname):
    if pathname == '/page-2':
        return page_2.layout
    elif pathname == '/page-5':
        return page_5.layout    
    elif pathname == '/page-3':
        return page_3.layout
    else:
        return page_4.layout


if __name__ == '__main__':
    app.run_server(debug=True, host='0.0.0.0')
