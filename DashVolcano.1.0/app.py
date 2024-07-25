# ******************************************************************** #
#
# This file creates a class instance of the app DashVolcano.
# Package versions for modules to be installed:
# dash==2.0.0
# dash-bootstrap-components==1.0.0
# dash-core-components==2.0.0
# dash-html-components==2.0.0
# geopandas==0.10.2
# numpy==1.20.3
# openpyxl==3.0.7
# pandas==1.3.5
# plotly==5.3.1
#
# Author: F. Oggier
# Last update: Aug 30 2022
# ********************************************************************* #

import dash
import dash_bootstrap_components as dbc        

# creates a class instance, specifies the style sheet
app = dash.Dash(__name__, external_stylesheets=[dbc.themes.BOOTSTRAP], suppress_callback_exceptions=True)
# sets up a title for the app, to be displayed in the browser bar
app.title = "DashVolcano"
