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
                # Header Section
                create_header_section(),
                html.Br(),

                # Dropdown Menus Section
                create_dropdown_section(),
                html.Br(),

                # Chemical Plots Section
                create_chemical_plots_section(),

                # Chronogram Section
                create_chronogram_section(),
            ]),
        ),
    ])

# *************************#
# Segmented Sections
# *************************#

def create_header_section():
    """Creates the header section with title and description."""
    return dbc.Row([
        # Main header h1
        html.H1(children="TAS Diagrams and Chronogram", className="title"),
        
        # Subtitle paragraph
        html.P(
            children=("On the left, a TAS diagram using Georoc data. On the right, the same samples are "
                      "filtered out, so only samples matching GVP eruptions are shown, so their VEI is given, "
                      "if known. On the right, a round symbol means either no VEI or a VEI at most 2, while "
                      "a triangle means a VEI at least 3. Below, a chronogram shows the eruption history, "
                      "during three periods: before BC, after BC until 1679, after 1679. VEI data is superimposed, "
                      "the line connecting the VEI points shows the fluctuations of VEI over time. Samples from "
                      "Georoc are further superimposed, to see the evolution of SIO2 and K2O over time."),
            className="description"
        ),
    ], align='center', className='intro')

def create_dropdown_section():
    """Creates the dropdown section with filters."""
    return dbc.Row([
        # First column with Volcano Name dropdown and Eruption Date dropdown
        dbc.Col([
            html.Div(children="Volcano Name", className="menu-title"),
            dcc.Dropdown(
                id="page5-region-filter",
                options=[{"label": region, "value": region} for region in grnames],
                value="start",  # Default value
            ),
            html.Div(children="Eruption date(s)", className="menu-title"),
            dcc.Dropdown(
                id="page5-erup-filter",
                options=[{"label": region, "value": region} for region in []],
                value="all",  # Default value
                clearable=False,
            ),
        ], width=3),

        # Empty column for alignment
        dbc.Col([], width=3),

        # Placeholder for future second column (currently commented out)
        dbc.Col([], width=3),

        # Empty column for alignment
        dbc.Col([], width=3),
    ], align='center')

def create_chemical_plots_section():
    """Creates the chemical plots section with two graphs."""
    return dbc.Row([
        # First chemical plot
        dbc.Col([
            html.Div(
                dcc.Graph(id="page5-chem-chart-georoc-1"),
            ),
        ], className="card"),
        
        # Second chemical plot
        dbc.Col([
            html.Div(
                dcc.Graph(id="page5-chem-chart-georoc-2"),
            ),
        ], className="card"),
    ], align='center')

def create_chronogram_section():
    """Creates the chronogram section with filters on top and the VEI chart below."""
    
    # First Row: GEOROC sample filter and period buttons
    filters_row = dbc.Row([
        dbc.Col([
            html.Div(
                dcc.Checklist(
                    id="page5-georoc-sample-filter",
                    options=[{'label': 'GEOROC', 'value': 'GEOROC'}],
                    labelStyle={'margin-right': '5px'},
                    value=['GEOROC'],
                )
            )
        ], width="auto"),

        dbc.Col([
            html.Div(
                dcc.RadioItems(
                    id='page5-period-button',
                    options=[
                        {'label': 'BC', 'value': 'BC'},
                        {'label': 'before 1679', 'value': 'before 1679'},
                        {'label': '1679 and after', 'value': '1679 and after'}
                    ],
                    value='1679 and after'
                )
            )
        ], width="auto")
    ], align='center', justify='center')  # Add margin-bottom for spacing

    # Second Row: VEI chart
    vei_chart_row = dbc.Row([
        dbc.Col([
            html.Div(
                dcc.Graph(id="page5-vei-chart"),
            ),
        ], className="card"),
    ])

    # Combine both rows into one section
    return dbc.Container([
        filters_row,
        vei_chart_row
    ])