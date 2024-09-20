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
from dash import Input, Output
import plotly.graph_objs as go
from dash import dcc

from constants.shared_data import df_volcano, df_volcano_no_eruption, dict_georoc_sl, dict_volcano_file, dict_georoc_gvp

# import functions to process GVP, GEOROC and PetDB data
from functions.gvp import extract_by_filter, update_rockchart
from functions.georoc import update_subtitle, make_subplots, plot_TAS, GEOROC_majorrocks, update_GEOrockchart
from functions.petdb import PetDB_majorrocks
from functions.gvp import update_tectonicmenu
from functions.map import create_map_samples, displays_map_samples

from pages.visualization import update_afm, update_radar, update_tas, clean_tas_data

def register_callbacks_page4(app):
    """Register all callbacks related to Page 4"""

    # ************************************#
    # 1st Callback: Update Tectonic Filter
    # ************************************#
    @app.callback(
        Output("page4-tectonic-filter", "options"),   # Output: Options for the tectonic filter dropdown
        Input("page4-country-filter", "value"),       # Input: Selected country from the country filter
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
            Output("page4-map", "figure"),                        # Output: Updated map figure
            Output("page4-map", "selectedData"),                  # Output: Reset selected data on the map
            Output('page4-textarea-example-output', 'children'),  # Output: Updated tectonic settings text
        ],
        [
            Input("page4-region-filter", "value"),                # Input: Selected region or volcano name
            Input("page4-db-filter", "value"),                    # Input: Selected databases (e.g., GVP, GEOROC)
            Input("page4-tectonic-filter", "value"),              # Input: Selected GVP tectonic settings
            Input("page4-GEOROC-tectonic-filter", "value"),       # Input: Selected GEOROC tectonic settings
            Input("page4-country-filter", "value"),               # Input: Selected country for filtering
            Input("page4-rocksopt", "value"),                     # Input: Selected rock types
        ],
    )
    def update_map(volcano_name, db, tect_gvp, tect_georoc, country, rocksopt):
        """
        Updates the map based on the selected filters and tectonic settings.
        
        Args:
            volcano_name: Name of the volcano or region selected in the region filter.
            db: List of selected databases (e.g., GEOROC, GVP) for filtering the map data.
            tect_gvp: List of selected GVP tectonic settings for map display.
            tect_georoc: List of selected GEOROC tectonic settings for map display.
            country: Selected country to filter the map data.
            rocksopt: List of selected rock types for filtering map samples.
        
        Returns:
            fig: Updated map figure with the filtered data points.
            None: Reset any selected data points on the map.
            tectext: Updated tectonic settings text to be displayed in the textarea.
        """

        # Append 'GVP' to the db list if a country filter is applied
        if country:
            db.append('GVP')

        # Append 'PetDB' to the db list if 'PetDB' is selected in GEOROC tectonic filters
        if ' PetDB' in tect_georoc:
            db.append('PetDB')

        # Append 'GEOROC' to the db list if 'all GEOROC' is selected
        if ' all GEOROC' in tect_georoc: 
            db.append('GEOROC')

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

        # Prepare rock filter options from user input
        chosenrocks = [r.strip() for r in rocksopt if r]  # Strip extra spaces from selected rock types

        # Create a filtered DataFrame with samples based on the selected filters
        dffig = create_map_samples(db, volcano_name, tect_gvp, tect_georoc, country)
        
        # Generate the map figure with the filtered data
        fig = displays_map_samples(dffig, thiszoom, thiscenter, db, tect_georoc, chosenrocks)

        # Update the layout of the map figure to include a legend
        fig.update_layout(legend=dict(yanchor="top", y=0.99, xanchor="left", x=0.01))

        # Return the updated figure, reset selected data points, and tectonic text
        return [fig, None, tectext]


    # ******************************************#
    # 3rd callback: Updates based on dropdown and selection
    # ******************************************#
    @app.callback(
        [
            Output("page4-tas-store", "data"),                # Output: Store updated data
            Output("page4-tas-title", "children"),            # Output: TAS diagram title or subtitle
        ],
        [
            # Inputs from dropdown and map
            Input("page4-region-filter", "value"),            # Input: Selected region or volcano name
            Input("page4-tas", "figure"),                     # Input: Current TAS figure
            Input("page4-tas-store", "data"),                 # Input: Data from tas-store (previous state)
            Input("page4-tas", "restyleData"),                # Input: Restyle data from TAS plot interactions
            Input("page4-map", "selectedData"),               # Input: Selected data points from the map
            Input("page4-GEOROC-tectonic-filter", "value"),   # Input: Selected GEOROC tectonic settings
            Input("page4-country-filter", "value"),           # Input: Selected country for filtering
            Input("page4-tectonic-filter", "value"),          # Input: Selected GVP tectonic settings
            Input("page4-db-filter", "value"),                # Input: Selected databases for filtering
        ]
    )
    def update_store(volcanoname, currentfig, store, restyle, selecteddata, tectg, country, tect, db):
        """
        Updates the store and subtitle based on selected dropdown and TAS plot interactions.
        
        Args:
            volcanoname: Name of the volcano or region selected.
            currentfig: Current TAS diagram figure.
            store: The previous data stored in store.
            restyle: Information about restyled elements in the TAS plot.
            selecteddata: Selected data points from the map.
            tectg: Selected GEOROC tectonic settings.
            country: Selected country for filtering.
            tect: Selected GVP tectonic settings.
            db: Selected databases for filtering.

        Returns:
            store: Updated store data based on the interactions.
            subtitle: Updated TAS diagram subtitle (or empty if no markers).
        """
        
        # Filter for records with 'customdata' key and non-empty marker symbols on the TAS plot
        recs = [d for d in currentfig['data'] if 'customdata' in d.keys() and len(d['marker']['symbol']) > 0]
        
        # If there are valid markers in the TAS plot, update the store and subtitle
        if len(recs) > 0:
            store, subtitle = update_subtitle(currentfig, store, restyle, volcanoname, selecteddata, tectg, country, tect, db)
        else:
            subtitle = ''  # If no valid markers, clear the subtitle
        
        # Return the updated store and subtitle
        return store, subtitle    


    # ***************************************************#
    # 4th Callback: Update TAS, AFM, Radar, and Download Data
    # ***************************************************#
    @app.callback(
        [
            Output("page4-tas", "figure"),           # Output: TAS diagram figure
            Output("page4-afm", "figure"),           # Output: AFM diagram figure
            Output('page4-radar', 'figure'),         # Output: Radar chart figure
            Output('page4-download', 'data')         # Output: Data for download as an Excel file
        ],
        [
            Input("page4-region-filter", "value"),   # Input: Region filter value
            Input("page4-db-filter", "value"),       # Input: Database filter (e.g., GVP or GEOROC)
            Input("page4-map", "selectedData"),      # Input: Data selected on the map (from the selection tool)
            Input('page4-button-1', 'n_clicks'),     # Input: Button for triggering the download action
            Input("page4-GEOROC-tectonic-filter", "value"),  # Input: GEOROC tectonic filter value
        ],
        prevent_initial_call=True  # Prevent callback from being triggered on page load
    )
    def update_tas_download(volcano_name, db, selectedpts, button, tect_georoc):
        """
        Updates the TAS diagram, AFM diagram, radar chart, and handles data download.
        
        Args:
            volcano_name: Name of the selected volcano or region.
            db: Database filter indicating the data source (e.g., GVP or GEOROC).
            selectedpts: Points selected on the map (via selection tool such as box or lasso).
            button: Number of clicks on the download button.
            tect_georoc: Tectonic filter selected from the GEOROC database.
        
        Returns:
            Updated TAS, AFM, and radar chart figures.
            Excel file data for download when the download button is clicked.
        """

        # Initialize a subplot figure for the TAS diagram
        fig = make_subplots(rows=2, cols=1, shared_xaxes=True, row_width=[0.85, 0.2], vertical_spacing=0.05)
        fig.update_layout(title='<b>Chemical Rock Composition from Georoc</b> <br>')  # Set TAS diagram title
        fig = plot_TAS(fig)  # Plot initial TAS diagram structure

        # Update TAS plot with volcano and database data, return the figure and associated data
        fig, tas_data = update_tas(fig, volcano_name, db, selectedpts)

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
            return fig, update_afm(volcano_name, tas_data), update_radar(tect_georoc, volcano_name, tas_data), \
                dcc.send_bytes(output.getvalue(), f'download_{volcano_name}.xlsx')

        # If no download action, return the updated figures without triggering the download
        return fig, update_afm(volcano_name, tas_data), update_radar(tect_georoc, volcano_name, tas_data), None


    # ***************************************************#
    # 5th Callback: Update Rock Composition Plots
    # ***************************************************#
    @app.callback(
        [
            Output('page4-rocks', 'figure'),                    # Output for the rock chart figure
            Output('page4-rocksGEO', 'figure'),                 # Output for the GEOROC chart figure
        ],
        [
            Input("page4-country-filter", "value"),             # Input from the country filter dropdown
            Input("page4-tectonic-filter", "value"),            # Input from the GVP tectonic settings checkboxes
            Input("page4-GEOROC-tectonic-filter", "value"),     # Input from the GEOROC tectonic settings checkboxes
        ],
    )
    def update_charts(country_name, tectonic, tect_georoc):
        """
        Update sunburst charts of major rocks based on user filters.

        Args:
            country_name (str): Selected country name from the dropdown.
            tectonic (list): Selected tectonic settings from GVP.
            tect_georoc (list): Selected tectonic settings from GEOROC.

        Returns:
            tuple: Updated figures for the rock chart and GEOROC chart.
        """
        fig = go.Figure()  # Initialize a new figure for the rock chart
        
        # Extract volcanoes filtered by country name and tectonic settings
        volcanoesbycountry = extract_by_filter(country_name, tectonic, df_volcano) if country_name and country_name != 'start' else []

        # Update the rock chart with the filtered volcano data
        fig = update_rockchart(volcanoesbycountry, fig, df_volcano)
        
        thisdf = pd.DataFrame()  # Initialize an empty DataFrame for combined data
        db_sources = []  # List to track data sources (PetDB and GEOROC)

        # Process PetDB data if selected in the tect_georoc input
        if ' PetDB' in tect_georoc:
            dftmp = PetDB_majorrocks(tect_georoc)  # Retrieve PetDB major rock data
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
                db_sources.append('PetDB')  # Track source

        # Process GEOROC data if selected in the tect_georoc input
        if ' all GEOROC' in tect_georoc:
            dftmp = GEOROC_majorrocks(tect_georoc, dict_georoc_sl, dict_volcano_file)  # Retrieve GEOROC major rock data
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
                db_sources.append('GEOROC')  # Track source

        # Deduplicate the combined DataFrame to ensure unique entries
        thisdf = thisdf.drop_duplicates()
        if not thisdf.empty:  # Check if there is data to process
            # Filter relevant columns for the output
            thisdf = thisdf[['Volcano Name', 'db Major Rock 1', 'db Major Rock 2', 'db Major Rock 3', 'cnt 1', 'cnt 2', 'cnt 3', 'db']]
        
        # Update the GEO rock chart with the combined data and sources
        fig2 = update_GEOrockchart(thisdf, ', '.join(db_sources), dict_georoc_gvp)
        
        return fig, fig2  # Return the updated figures for both charts

