# ************************************************************************************* #
#
# This file creates and starts the DashVolcano app.
#
# Author: F. Oggier
# Editor: K. Migadel
# Last update: September 20, 2024
# ************************************************************************************* #

import os
import dash_bootstrap_components as dbc        
from dash import Dash, dcc, html, callback, Input, Output
from waitress import serve

import dataloader.data_loader as data_loader
# Load initial data
data_loader.load_data()

# Import pages
from pages.page2.page_2 import Page2
from pages.page4.page_4 import Page4
from pages.page5.page_5 import Page5
# from pages import page_3  # Page 3 is under development

# Initialize Dash app
app = Dash(__name__, external_stylesheets=[dbc.themes.BOOTSTRAP], suppress_callback_exceptions=True)
server = app.server
app.title = "Volcano Analytics"

# Create page instances
page_2 = Page2()
page_4 = Page4()
page_5 = Page5()

# Define app layout
app.layout = html.Div([
    dcc.Location(id='url', refresh=False),  # Location for routing
    dbc.Row([
        # Navigation links
        dbc.Col([dcc.Link('Map', href='/page-4', className='menu-link')], width=2),
        dbc.Col([dcc.Link('TAS and Harker Diagrams', href='/page-2', className='menu-link')], width=2),
        dbc.Col([dcc.Link('TAS Diagrams and Chronogram', href='/page-5', className='menu-link')], width=2),    
        # dbc.Col([dcc.Link('Rock Similarity', href='/page-3', className='menu-link')], width=2),  # Page 3 is under development
    ], justify='center'),
    html.Div(id='page-content', children=[])  # Placeholder for page content
])

# Callback for page routing
@callback(Output('page-content', 'children'), [Input('url', 'pathname')])
def display_page(pathname):
    """Displays the appropriate page based on the URL pathname."""
    if pathname == '/page-2':
        return page_2.layout
    elif pathname == '/page-5':
        return page_5.layout    
    # elif pathname == '/page-3':
    #     return page_3.layout  # Page 3 is under development
    else:
        return page_4.layout  # Default to page 4

# Register callbacks for each page
page_2.register_callbacks(app)
page_4.register_callbacks(app)
page_5.register_callbacks(app)

# Start the server
if __name__ == '__main__':
    if os.getenv("FLASK_ENV") == "development":
        app.run_server(debug=True, host='0.0.0.0', port=8050)
    else:
        serve(server)