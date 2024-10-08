# ************************************************************************************* #
#
# This creates a one-page layout, with a map, a TAS diagram, and AFM diagram, 
# a rock sample frequency radar plot. two rock composition sunburst plots
# 1) create_map_samples: creates the dataframe of samples to be drawn
# 2) displays_map_samples: draws the map
# 3) update_tas: draws the TAS diagram, possibly with selected points
# 4) download_tasdata: downloads the TAS data
#
# Author: F. Oggier
# Editor: K. Migadel
# Last update: September 20 2024
# ************************************************************************************* #

import io
import plotly.graph_objs as go
import pandas as pd
import plotly.graph_objs as go

from plotly.subplots import make_subplots

from dash import dcc
from dash import Input, Output

from constants.shared_data import df_volcano, df_volcano_no_eruption, dict_georoc_sl, dict_volcano_file, dict_georoc_gvp

# import functions to process GVP, GEOROC and PetDB data
from functions.gvp import extract_by_filter, update_rockchart, update_tectonicmenu
from functions.georoc import update_subtitle, plot_tas, georoc_majorrocks, update_georock_chart
from functions.petdb import petdb_majorrocks
from functions.map import create_map_samples, displays_map_samples

from pages.visualization import update_afm, update_radar, update_tas, clean_tas_data

def register_callbacks_page4(app):
    """Register all callbacks related to Page 4"""

    # ************************************#
    # 1st Callback: Update Tectonic Filter
    # ************************************#
    @app.callback(
        Output("ppage4-GVP-tectonic-settings", "options"),  # Output: Options for the tectonic filter dropdown
        Input("page4-country-filter", "value"),             # Input: Selected country from the country filter
    )
    def set_tectonic_options(country_name):
        """
        Updates the tectonic filter options based on the selected country.
        
        Args:
            country_name: The name of the country selected in the country filter.
            
        Returns:
            List of updated tectonic settings/options for the dropdown menu.
        """
        # Calls a function that filters tectonic settings based on the selected country
        return update_tectonicmenu(country_name, df_volcano)



    # ************************************#
    # 2nd Callback: Update Map Display
    # ************************************#
    @app.callback(
        [
            Output("page4-map", "figure"),                          # Output: Updated map figure
            Output("page4-map", "selectedData"),                    # Output: Reset selected data on the map
            Output('page4-textarea-output', 'children'),            # Output: Updated tectonic settings text
        ],
        [
            Input("page4-region-filter", "value"),                  # Input: Selected region or volcano name
            Input("page4-plates-boundaries-filter", "value"),       # Input: Selected databases (e.g., GVP, GEOROC)
            Input("page4-rock-database", "value"),                  # Input: Selected volcanic rock database
            Input("page4-GVP-tectonic-settings", "value"),          # Input: Selected GVP tectonic settings
            Input("page4-rock-tectonic-settings", "value"),         # Input: Selected GEOROC tectonic settings
            Input("page4-country-filter", "value"),                 # Input: Selected country for filtering
            Input("page4-rocks-density-filter", "value"),           # Input: Selected rock types
        ],
    )
    def update_map(volcano_name, plates_boundaries_setting, rock_database, gvp_tect_setting, rock_tect_setting, country, rocks_density_filter):
        """
        Updates the map based on the selected filters and tectonic settings.
        
        Args:
            volcano_name: Name of the volcano or region selected in the region filter.
            plates_boundaries_setting: List of plates boundaries to display.
            rock_database: List of volcanic rock databases selected.
            gvp_tect_setting: List of selected GVP tectonic settings for map display.
            rock_tect_setting: List of selected GEOROC and PetDb tectonic settings for map display.
            country: Selected country to filter the map data.
            rocks_density_filter: List of selected rock types for filtering map samples.
        
        Returns:
            fig: Updated map figure with the filtered data points.
            None: Reset any selected data points on the map.
            tectext: Updated tectonic settings text to be displayed in the textarea.
        """
        database = []

        # Append 'GVP' to the database list
        if country:
            database.append('GVP')

        # Append 'PetDB' to the database list
        if 'PetDB' in rock_database:
            database.append('PetDB')

        # Append 'GEOROC' to the database list
        if 'GEOROC' in rock_database: 
            database.append('GEOROC')

        # Default center and zoom level for the map
        thiscenter, thiszoom, tectext = {}, 1.3, ''  # Initialize center and zoom level with default values

        # If a volcano name is selected and it's not the default "start" value
        if volcano_name and volcano_name != "start":
            # Handle special long names or titles using predefined dictionaries
            n = dict_georoc_sl.get(volcano_name, volcano_name)  # Get short name or fallback to original
            n = dict_georoc_gvp.get(n, n.title())               # Convert to title case or auto-match

            # Retrieve volcano data from the appropriate dataframe
            volrecord = df_volcano[df_volcano['Volcano Name'] == n] if not df_volcano[df_volcano['Volcano Name'] == n].empty else df_volcano_no_eruption[df_volcano_no_eruption['Volcano Name'] == n]
            
            # If a volcano record is found, update map center, zoom, and tectonic text info
            if not volrecord.empty:
                thiscenter = {'lat': float(volrecord['Latitude'].iloc[0]), 'lon': float(volrecord['Longitude'].iloc[0])}
                thiszoom = 8  # Zoom in on the selected volcano
                tectext += f"{volrecord['Country'].iloc[0]}, {volrecord['Subregion'].iloc[0]}\n{volrecord['Tectonic Settings'].iloc[0]}\n"  # Add tectonic info to text
            
            # Process volcano name and extract associated tectonic files
            volcano_name = dict_georoc_sl.get(volcano_name, volcano_name)  # Get the short name
            tects = [t.split('.csv')[0].split('part')[0].replace('_', ' ') for t in dict_volcano_file[volcano_name]]  # Parse tectonic files
            
            # Append tectonic settings to the tectonic text display
            tectext += '\n'.join(t for t in tects if 'Manual' not in t)

        # Create a filtered DataFrame with samples based on the selected filters
        dffig = create_map_samples(database, volcano_name, gvp_tect_setting, rock_tect_setting, country)
        
        # Generate the map figure with the filtered data
        fig = displays_map_samples(dffig, thiszoom, thiscenter, plates_boundaries_setting, rock_tect_setting, rocks_density_filter)

        # Update the layout of the map figure to include a legend
        fig.update_layout(legend=dict(yanchor="top", y=0.99, xanchor="left", x=0.01))

        # Return the updated figure, reset selected data points, and tectonic text
        return [fig, None, tectext]


    # ******************************************#
    # 3rd callback: Updates based on dropdown and selection
    # ******************************************#
    @app.callback(
        Output("page4-tas-title", "children"),  # Output: TAS diagram title or subtitle
        Input("page4-tas", "figure"),           # Input: Current TAS figure
    )
    def update_store(fig):
        """
        Updates the store and subtitle based on selected dropdown and TAS plot interactions.
        
        Args:
            fig: Current TAS diagram figure.

        Returns:
            str: Updated TAS diagram subtitle (or empty if no markers).
        """
        
        # Check if fig is None
        if fig is None:
            return ''  # Return empty string if fig is None

        # Filter for records with 'customdata' key and non-empty marker symbols on the TAS plot
        recs = [d for d in fig['data'] if 'customdata' in d.keys() and len(d['marker']['symbol']) > 0]

        # If there are valid markers in the TAS plot, update the store and subtitle
        if recs:
            subtitle = update_subtitle(fig)
        else:
            subtitle = ''  # If no valid markers, clear the subtitle

        return subtitle



    # ***************************************************#
    # 4th Callback: Update TAS, AFM, Radar, and Download Data
    # ***************************************************#
    @app.callback(
        [
            Output("page4-tas", "figure"),                  # Output: TAS diagram figure
            Output("page4-afm", "figure"),                  # Output: AFM diagram figure
            Output('page4-radar', 'figure'),                # Output: Radar chart figure
            Output('page4-download', 'data'),               # Output: Data for download as an Excel file
            Output('page4-download-button', 'n_clicks')     # Output: Reset the download button clicks
        ],
        [
            Input("page4-region-filter", "value"),                  # Input: Region filter value
            Input("page4-map", "selectedData"),                     # Input: Data selected on the map (from the selection tool)
            Input('page4-download-button', 'n_clicks'),             # Input: Button for triggering the download action
            Input("page4-rock-database", "value"),                  # Input: Selected volcanic rock database
            Input("page4-rock-tectonic-settings", "value"),         # Input: GEOROC tectonic filter value
            Input('page4-range-slider', "value"),
        ],
        prevent_initial_call=True  # Prevent callback from being triggered on page load
    )
    def update_tas_download(volcano_name, selectedpts, button, rock_database, rock_tect_setting, sample_interval):
        """
        Updates the TAS diagram, AFM diagram, radar chart, and handles data download.
        
        Args:
            volcano_name: Name of the selected volcano or region.
            selectedpts: Points selected on the map (via selection tool such as box or lasso).
            button: Number of clicks on the download button.
            rock_database: List of volcanic rock databases selected.
            rock_tect_setting: Tectonic filter selected from the GEOROC and PetDB database.
        
        Returns:
            Updated TAS, AFM, and radar chart figures.
            Excel file data for download when the download button is clicked.
        """

        # Initialize a subplot figure for the TAS diagram
        fig = make_subplots(rows=2, cols=1, shared_xaxes=True, row_width=[0.85, 0.2], vertical_spacing=0.05)
        fig.update_layout(title='<b>Chemical Rock Composition from Georoc</b> <br>')  # Set TAS diagram title
        fig = plot_tas(fig)  # Plot initial TAS diagram structure

        # Update TAS plot with volcano and database data, return the figure and associated data
        fig, tas_data = update_tas(fig, volcano_name, selectedpts, rock_database)

        # Check if the download button was clicked and data is available
        if button >= 1 and len(tas_data.index) > 0:
            # Clean the TAS data before exporting
            tas_data = clean_tas_data(tas_data)

            # Create an in-memory bytes buffer to store the Excel file
            output = io.BytesIO()

            # Write the cleaned TAS data into the Excel file stored in the buffer
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                tas_data.to_excel(writer, sheet_name='sheet 1', index=False)  # Write data to sheet 'sheet 1'

            # Move the buffer pointer back to the start
            output.seek(0)

            # Send the Excel file content as bytes to trigger the download via dcc.Download
            return fig, update_afm(volcano_name, tas_data), update_radar(rock_database, rock_tect_setting, volcano_name, tas_data), \
                dcc.send_bytes(output.getvalue(), f'download_{volcano_name}.xlsx'), 0

        # If no download action, return the updated figures without triggering the download
        return fig, update_afm(volcano_name, tas_data), update_radar(rock_database, rock_tect_setting, volcano_name, tas_data, sample_interval), None, 0


    # ***************************************************#
    # 5th Callback: Update Rock Composition Plots
    # ***************************************************#
    @app.callback(
        [
            Output('page4-rocks-composition-GVP', 'figure'),        # Output for the rock chart figure
            Output('page4-rocks-composition-GEOROC', 'figure'),     # Output for the GEOROC chart figure
        ],
        [
            Input("page4-country-filter", "value"),                 # Input from the country filter dropdown
            Input("page4-rock-database", "value"),                  # Input: Selected volcanic rock database
            Input("page4-GVP-tectonic-settings", "value"),          # Input from the GVP tectonic settings checkboxes
            Input("page4-rock-tectonic-settings", "value"),         # Input from the GEOROC tectonic settings checkboxes
        ],
    )
    def update_charts(country_name, rock_database, gvp_tect_setting, rock_tect_setting):
        """
        Update sunburst charts of major rocks based on user filters.

        Args:
            country_name (str): Selected country name from the dropdown.
            rock_database: List of volcanic rock databases selected.
            gvp_tect_setting (list): Selected tectonic settings from GVP.
            rock_tect_setting (list): Selected tectonic settings from GEOROC and PetDB.

        Returns:
            tuple: Updated figures for the rock chart and GEOROC chart.
        """
        fig = go.Figure()  # Initialize a new figure for the rock chart
        
        # Extract volcanoes filtered by country name and tectonic settings
        volcanoesbycountry = extract_by_filter(country_name, gvp_tect_setting, df_volcano) if country_name and country_name != 'start' else []

        # Update the rock chart with the filtered volcano data
        fig = update_rockchart(volcanoesbycountry, fig, df_volcano)
        
        thisdf = pd.DataFrame()  # Initialize an empty DataFrame for combined data
        database = []  # List to track data sources (PetDB and GEOROC)

        # Process PetDB data if selected in the rock_database input
        if 'PetDB' in rock_database:
            dftmp = petdb_majorrocks(rock_tect_setting)  # Retrieve PetDB major rock data
            if not dftmp.empty:  # Check if the DataFrame is not empty
                # Filter for whole rock samples and valid major rock data
                dftmp = dftmp[dftmp['material'] == 'WR']
                dftmp = dftmp[dftmp['PetDB Major Rock 1'] != 'No Data']
                dftmp['db'] = 'PetDB'  # Add a column indicating the data source
                # Rename columns for clarity
                dftmp.rename(columns={
                    'PetDB Major Rock 1': 'db Major Rock 1',
                    'PetDB Major Rock 2': 'db Major Rock 2',
                    'PetDB Major Rock 3': 'db Major Rock 3'
                }, inplace=True)
                thisdf = pd.concat([thisdf, dftmp])  # Concatenate PetDB data to thisdf
                database.append('PetDB')  # Track source

        # Process GEOROC data if selected in the rock_database input
        if 'GEOROC' in rock_database:
            dftmp = georoc_majorrocks(rock_tect_setting, dict_georoc_sl, dict_volcano_file)  # Retrieve GEOROC major rock data
            if not dftmp.empty:  # Check if the DataFrame is not empty
                # Filter for whole rock samples and valid major rock data
                dftmp = dftmp[(dftmp['material'] == 'WR') & (dftmp['GEOROC Major Rock 1'] != 'No Data')]
                dftmp['db'] = 'GEOROC'  # Add a column indicating the data source
                # Rename columns for clarity
                dftmp.rename(columns={
                    'GEOROC Major Rock 1': 'db Major Rock 1',
                    'GEOROC Major Rock 2': 'db Major Rock 2',
                    'GEOROC Major Rock 3': 'db Major Rock 3'
                }, inplace=True)
                thisdf = pd.concat([thisdf, dftmp])  # Concatenate GEOROC data to thisdf
                database.append('GEOROC')  # Track source

        # Deduplicate the combined DataFrame to ensure unique entries
        thisdf = thisdf.drop_duplicates()
        if not thisdf.empty:  # Check if there is data to process
            # Filter relevant columns for the output
            thisdf = thisdf[['Volcano Name', 'db Major Rock 1', 'db Major Rock 2', 'db Major Rock 3', 'cnt 1', 'cnt 2', 'cnt 3', 'db']]

        # Update the GEO rock chart with the combined data and sources
        fig2 = update_georock_chart(thisdf, database, dict_georoc_gvp)
        
        return fig, fig2  # Return the updated figures for both charts

