from dash import dcc, html
import dash_bootstrap_components as dbc
from constants.shared_data import lst_names

# *************************#
# Main Page Layout
# *************************#
def create_page_layout():
    """Creates the overall page layout."""
    return html.Div([
        dbc.Card(
            dbc.CardBody([
                create_header(),
                html.Br(),
                create_menus(),
                html.Br(),
                create_figures_section_1(),
                create_figures_section_2(),
                html.Br()
            ])
        )
    ])


# *************************#
# Header Section
# *************************#
def create_header():
    """Creates the header section with title and description."""
    return dbc.Row([
        # Title (h1) and Subtitle (p)
        html.H1(children="World Volcanoes", className="title"),
        html.P(
            children="Displays the number of volcanoes around the world as a function of two parameters,"
                     "one on the x-axis (a rock or a morphology), the other on the y-axis (VEI or eruptive"
                     " material). Data can be filtered out by reliability (no of eruptions with VEI data vs"
                     " no of eruptions) or total no of eruptions. Corresponding chronograms are provided.",
            className="description",
        ),
    ], align='center', className='intro')


# *************************#
# Menus Section
# *************************#
def create_menus():
    """Creates the menus section with filters and options."""
    return dbc.Row([
        # First Column: Features Checklist and Threshold Input
        dbc.Col(create_features_menu(), width=6),
        # Second Column: Volcano Name Dropdown and Period Buttons
        dbc.Col(create_volcano_menu(), width=6),
    ], align='center')


def create_features_menu():
    """Creates the features checklist and threshold input."""
    return html.Div(className="card", children=[
        html.Div(children="Features", className="menu-title"),
        dcc.Checklist(
            id='page3-check-features',
            options=[
                {'label': 'Rocks', 'value': 'Rocks'},
                {'label': 'Eruption Frequency', 'value': 'Eruption Frequency'},
                {'label': 'VEI', 'value': 'VEI'},
            ],
            value=[None, None, None]
        ),
        dcc.Input(
            id='page3-threshold',
            type='number',
            min=0, max=1,
            placeholder='key in a threshold'
        )
    ])


def create_volcano_menu():
    """Creates the volcano name dropdown and period radio buttons."""
    return html.Div(className="card", children=[
        html.Div(children="Volcano Name", className="menu-title"),
        dcc.Dropdown(
            id="page3-gvp-names-dropdown",
            options=[{"label": vn, "value": vn} for vn in sorted(lst_names)],
            value=None,
        ),
        dcc.RadioItems(
            id='page3-period-button',
            options=[
                {'label': 'BC', 'value': 'BC'},
                {'label': 'before 1679', 'value': 'before 1679'},
                {'label': '1679 and after', 'value': '1679 and after'}
            ],
            value='1679 and after',
        )
    ])


# *************************#
# Figures Section
# *************************#
def create_figures_section_1():
    """Creates the first section with the main figure."""
    return dbc.Row([
        dbc.Col([
            html.Div(dcc.Graph(
                id="page3-rock-vei-chart",
                hoverData={'points': [{'customdata': 'names'}]},
            ), className="card"),
        ]),
    ], align='center')


def create_figures_section_2():
    """Creates the second section with additional figures."""
    return dbc.Row([
        # Column 1
        dbc.Col([
            html.Div(dcc.Graph(id="page3-rock-vei-chart-thresh"), className="card"),
        ], width=4),
        # Column 2
        dbc.Col([
            html.Div(dcc.Graph(id="page3-rock-vei-chart-samples"), className="card"),
        ], width=4),
        # Column 3
        dbc.Col([
            html.Div(dcc.Graph(id="page3-chrono"), className="card"),
        ], width=4),
    ], align='center')