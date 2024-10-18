from dash import dcc, html
import dash_bootstrap_components as dbc
from constants.shared_data import grnames

# *************************#
# Main Page Layout
# *************************#

def create_page_layout():
    """Creates the overall page layout."""
    return html.Div([
        dbc.Card(
            dbc.CardBody([
                create_intro_section(),
                html.Br(),
                create_dropdowns(),
                html.Br(),
                create_graphs_section()
            ])
        )
    ])

def create_intro_section():
    """Creates the introduction section with title and description."""
    return dbc.Row([
        html.H1(children="TAS and Harker Diagrams", className="title"),
        html.P(
            children=[
                "Extracts data per volcano. The chemical composition is coming from ",
                html.A("Georoc", href="https://georoc.eu/georoc/new-start.asp", target="_blank"),
                ", names may be aggregated as indicated. The eruption dates can be filtered if available. "
                "Different symbols correspond to different materials: WR=whole rock, GL=volcano glass, "
                "INC=inclusion and MIN=mineral. The corresponding Harker Diagram is shown. "
                "The VEI (volcanic explosivity index) data is then extracted from ",
                html.A("GVP", href="https://volcano.si.edu/", target="_blank"),
                " with eruption dates. If a mapping of dates is found between the two, it is indicated."
            ],
            className="description"
        ),
    ], align='center', className='intro')

def create_dropdowns():
    """Creates the dropdown menus for volcano selection and eruption dates."""
    return dbc.Row([
        create_volcano_dropdown("1", "Volcano Name"),
        dbc.Col([], width=3),  # Empty column for alignment
        create_volcano_dropdown("2", "Volcano Name"),
        dbc.Col([], width=3),  # Empty column for alignment
    ], align='center')

def create_volcano_dropdown(dropdown_id, label):
    """Creates a dropdown for volcano selection."""
    return dbc.Col([
        html.Div(children=label, className="menu-title"),
        dcc.Dropdown(
            id=f"page2-region-filter-{dropdown_id}",
            options=[{"label": region, "value": region} for region in grnames],
            value="start",  # Default value
        ),
        html.Div(children="Eruption date(s)", className="menu-title"),
        dcc.Dropdown(
            id=f"page2-erup-filter-{dropdown_id}",
            options=[{"label": region, "value": region} for region in []],
            value="all",  # Default value
            clearable=False,
        ),
    ], width=3)

def create_graphs_section():
    """Creates the section for displaying graphs."""
    return dbc.Row([
        create_graphs_column("1"),
        create_graphs_column("2"),
    ], align='center')

def create_graphs_column(id):
    """Creates a column of graphs."""
    return dbc.Col([
        html.Div(dcc.Graph(id=f"page2-chem-chart-georoc-{id}")),
        html.Div(id=f"page2-tas-title-{id}", style={'whiteSpace': 'pre-line'}),
        html.Div(dcc.Graph(id=f"page2-oxyde-chart-{id}", style={'height': '1000px'})),
        html.Div(dcc.Graph(id=f"page2-vei-chart-{id}")),
    ], className="card")

