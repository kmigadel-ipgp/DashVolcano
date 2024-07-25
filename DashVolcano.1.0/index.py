# **************************************************************************** #
#
# DashVolcano contains several pages. This file creates the multipage layout.
# It also creates a menu on top of each page to navigate to the other pages.
# There are 3 pages: they are page-4, page-2 and page-5.
# Their respective pages are in the folder /pages.
#
# Author: F. Oggier
# Last update: Aug 30 2022
# **************************************************************************** #

import dash
from dash import dcc
from dash import html
from dash.dependencies import Input, Output
import dash_bootstrap_components as dbc

from app import app
# content from the separate pages are inside the folder /pages
from pages import page_2, page_4, page_5


app.layout = html.Div([
    dcc.Location(id='url', refresh=False),
    # this creates links on top of all pages,
    # since it is displayed before the page content.
    dbc.Row([
        dbc.Col([
            dcc.Link('Map | ', href='/page-4', className='menu-link'),
            ], width=2),
        dbc.Col([
            dcc.Link('TAS and Harker Diagrams |', href='/page-2', className='menu-link'),
            ], width=2),
        dbc.Col([
            dcc.Link('TAS Diagrams and Chronogram', href='/page-5', className='menu-link'),
            ], width=2),    
    ]),
    # this loads the page content
    html.Div(id='page-content', children=[])
])


@app.callback(
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
    else:
        return page_4.layout
