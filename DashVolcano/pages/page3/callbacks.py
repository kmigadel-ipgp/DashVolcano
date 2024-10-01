# ************************************************************************************* #
#
# This file defines all the callback functions for the Dash app.
# These callbacks include updating figures like the map, TAS diagram, AFM diagram,
# and rock sample frequency radar plot.
# 
# Callback Functions:
# 1) set_tectonic_options: updates tectonic menu based on country selection.
# 2) update_map: updates the map based on user input for regions, tectonics, and rocks.
# 
# Author: F. Oggier
# Editor: K. Migadel
# Last update: September 20 2024
# ************************************************************************************* #


import plotly.graph_objs as go
import plotly.express as px
import pandas as pd
import numpy as np

from dash import Input, Output

# import variables common to all files
# this includes loading the dataframes
from constants.shared_data import df_eruption, df_events

# import functions to process GVP and GEOROC data
from functions.gvp import compute_eruptionperiods, update_chronogram
from functions.georoc import perc_rock

from helpers.helpers import calculate_matrix

from constants.rocks import GEOROC_ROCKS

def register_callbacks_page3(app):
    """Register all callbacks related to Page 3"""


    # **************************************************************#
    # Callbacks to update multiple figures based on selected inputs
    # **************************************************************#
    @app.callback(
        # Outputs are the figures for rock-vei-chart, its threshold, and samples
        [
            Output("page3-rock-vei-chart", "figure"),
            Output("page3-rock-vei-chart-thresh", "figure"),
            Output("page3-rock-vei-chart-samples", "figure"),
        ],
        [
            # Input from checkbox to select features (Rocks, VEI, Eruption Frequency)
            Input("page3-check-features", "value"),
            # Input for threshold value used to filter similar volcanoes
            Input("page3-threshold", "value"),
            # Input from the dropdown that selects a volcano by name
            Input("page3-gvp-names-dropdown", "value"),
        ],
    )
    def update_charts(features, thresh, volcano_name):
        """
        Updates the three charts based on selected features, threshold value, 
        and the chosen volcano name.

        Args:
            features (list): List of selected features (Rocks, Eruption Frequency, VEI).
            thresh (float): Threshold value to filter volcanoes based on similarity.
            volcano_name (str): Name of the selected volcano.

        Returns:
            fig, fig1, fig2: Updated figures for rock-vei chart, threshold chart, and samples chart.
        """

        # Initialize empty figures for the three charts
        fig = go.Figure()
        fig1 = go.Figure()
        fig2 = go.Figure()
        
        # Load a dictionary containing the number of rock samples for all volcanoes
        vperc = perc_rock()
        
        # Get the index of the selected volcano, if any
        idx = list(vperc.keys()).index(volcano_name) if volcano_name else None 
        
        # Initialize a zero matrix for total correlation
        C = np.zeros((len(vperc.keys()), len(vperc.keys())))   
        
        # Initialize an empty DataFrame to store the selected features' data
        dff = pd.DataFrame()
        
        # If 'Rocks' is selected in features, compute rock percentages and update correlation matrix
        if 'Rocks' in features:
            # Compute rock percentages for each volcano
            rckb = [[x/sum(vperc[k]) for x in vperc[k]] for k in vperc.keys()]
            nosmples = [sum(vperc[k]) for k in vperc.keys()]
            
            # Update DataFrame with rock percentages
            dff = pd.DataFrame(rckb, columns=GEOROC_ROCKS)    
            
            # Calculate correlation matrix for rock percentages
            matrix_rocks = calculate_matrix(rckb)
            
            # Add rock correlation matrix to the total correlation matrix
            C = C + matrix_rocks
        
        # If 'Eruption Frequency' is selected, compute eruption frequency and update correlation matrix
        if 'Eruption Frequency' in features:
            # Compute eruption periods for short, medium, and long eruptions
            dfd, dfr = compute_eruptionperiods(vperc.keys())
            
            # Group the data by volcano name and calculate the number of eruptions
            dfgrp = (dfd[['Volcano Name', 'Eruption Number']]
                        .groupby('Volcano Name')
                        .count()
                        .reset_index()
                        .merge(dfd[['Volcano Name', 'long eruption']].groupby('Volcano Name').sum().reset_index(), on='Volcano Name', how='left')
                        .merge(dfd[['Volcano Name', 'medium eruption']].groupby('Volcano Name').sum().reset_index(), on='Volcano Name', how='left')
                        .merge(dfd[['Volcano Name', 'short eruption']].groupby('Volcano Name').sum().reset_index(), on='Volcano Name', how='left'))

            # Calculate eruption and repose frequencies for each volcano
            freq = []
            for k1 in vperc.keys():
                n1 = dfgrp[dfgrp['Volcano Name'] == k1]['Eruption Number']
                if len(n1.index) > 0:
                    # Get eruption and repose data for the volcano
                    d1 = dfgrp[dfgrp['Volcano Name'] == k1].values[0]
                    dr = dfr[dfr['Volcano Name'] == k1][['repose_x','repose_y']]
                    drl = list(dr['repose_x']+dr['repose_y'])[0]
                    
                    # Calculate repose weights for long, medium, and short reposes
                    drll = len([x for x in drl if x > 50])/(2*len(drl))
                    drlm = len([x for x in drl if (x>=1)&(x<=50)])/(2*len(drl))
                    drls = len([x for x in drl if x <1])/(2*len(drl))
                    
                    # Append eruption and repose frequencies to the list
                    freq.append([x/(2*d1[1]) for x in d1[2:]]+[drll, drlm, drls])    
                else:
                    freq.append([0,0,0,0,0,0])

            # Create DataFrame with eruption and repose frequencies
            dffreq = pd.DataFrame(freq, columns = ['long eruption', 'medium eruption', 'short eruption', 'long repose', 'medium repose', 'short repose']).round(3)
            
            # Concatenate eruption frequency data to the main DataFrame
            dff = pd.concat([dff, dffreq], axis=1)

            # Calculate correlation matrix for eruption frequencies
            matrix_frequency = calculate_matrix(freq)
            
            # Add eruption frequency correlation matrix to the total correlation matrix
            C = C + matrix_frequency
        
        # If 'VEI' is selected, compute VEI (Volcanic Explosivity Index) frequency and update correlation matrix
        if 'VEI' in features:
            # Group the eruption data by volcano name and calculate the VEI frequency
            dftmp = df_eruption.groupby('Volcano Name')['VEI'].apply(list).reset_index(name='VEI')
            dict_vei = dftmp.set_index('Volcano Name').T.to_dict('list')
            
            # Collect VEI data for each volcano
            veis = []
            for k1 in vperc.keys():
                r1 = dict_vei[k1][0]
                r1 = [int(i) for i in r1 if isinstance(i, str)]
                r1c = [r1.count(i) / len(r1) if len(r1) != 0 else 0 for i in range(8)]
                veis.append(r1c)           
            
            # Create DataFrame with VEI data
            dfvei = pd.DataFrame(veis, columns = [str(i) for i in range(8)]) 
            
            # Concatenate VEI data to the main DataFrame
            dff = pd.concat([dff, dfvei], axis=1)
            
            # Calculate correlation matrix for VEI
            matrix_vei = calculate_matrix(veis)
            
            # Add VEI correlation matrix to the total correlation matrix (with scaling factor)
            C = C + matrix_vei / 2
        
        # Normalize the total correlation matrix by the number of selected features
        nofeat = len([x for x in features if x is not None] )
        if nofeat > 0:
            C = C / nofeat
        
        # If a volcano is selected and the correlation matrix has data, find similar volcanoes
        if volcano_name is not None and np.any(C):
            # Get the correlation values for the selected volcano
            lv = C[idx].tolist()[0]
            clse = []
            
            # Set default threshold if none is provided
            if thresh is None:
                thresh = 2
            
            # Identify volcanoes that are within the threshold of similarity
            for i in range(len(lv)):
                if lv[i] <= thresh and lv[i] >= 0:
                    clse.append(i)

            # Mark similar volcanoes in the DataFrame
            clsecol = [0 if x not in clse else 1 for x in range(len(vperc.keys()))]  
            dff['Close'] = clsecol

            if not dff.empty:
                # Create custom labels for parallel coordinates plot
                customlabels = {c: c.lower()[0:8] + '<br>' + c.lower()[8:] for c in list(dff)}
                fig = px.parallel_coordinates(dff, color='Close',
                                            color_continuous_scale=px.colors.sequential.Bluered,
                                            labels=customlabels)

                def create_dataframe(hoverdata, include_vei, include_erup_freq, include_rocks):
                    """Helper function to create the dataframe based on selected features."""
                    df_data = {
                        'dist': [lv[i] for i in clse],
                        'name': [list(vperc.keys())[i] for i in clse]
                    }

                    if include_rocks:
                        df_data['samples'] = [nosmples[i] for i in clse]

                    if include_vei:
                        df_data['VEI'] = [dict_vei[list(vperc.keys())[i]] for i in clse]
                        hoverdata['VEI'] = True
                    if include_erup_freq:
                        df_data['erup'] = [dffreq.iloc[i].tolist() for i in clse]
                        hoverdata['erup'] = True

                    return hoverdata, pd.DataFrame(df_data)

                if 'Rocks' in features:
                    hoverdata = {'no': False, 'dist': True, 'name': True, 'samples': True, 'shape': False}
                    hoverdata, dfc = create_dataframe(hoverdata, 'VEI' in features, 'Eruption Frequency' in features, 'Rocks' in features)
                    
                    dfc['no'] = [i for i in range(len(clse))]

                    # Add shape based on samples count
                    conditions = [(dfc['samples'] < 10), (dfc['samples'] >= 10) & (dfc['samples'] <= 30), (dfc['samples'] > 30)]
                    choices = ['circle', 'square', 'diamond']
                    dfc['shape'] = np.select(conditions, choices)
                    # hoverdata.update({'erup': 'erup' in dfc.columns, 'VEI': 'VEI' in dfc.columns})

                    # Scatter plot for rock samples
                    fig1 = px.scatter(dfc.sort_values(by='dist'), x='no', y='dist', symbol='shape', hover_data=hoverdata)
                    newnames = {'circle': 'less than 10', 'square': 'less than 30', 'diamond': 'more than 30'}
                    fig1.for_each_trace(lambda t: t.update(name=newnames[t.name], legendgroup=newnames[t.name]))
                    fig1.update_layout(legend_title="", xaxis_title="", yaxis_title="distance")
                
                else:
                    hoverdata = ['dist', 'name']
                    hoverdata, dfc = create_dataframe(hoverdata, 'VEI' in features, 'Eruption Frequency' in features, 'Rocks' in features)
                    
                    dfc['no'] = [i for i in range(len(clse))] 
                    
                    # Scatter plot for non-rock samples
                    fig1 = px.scatter(dfc.sort_values(by='dist'), x='no', y='dist', hover_data=hoverdata)

                # Close = 1 processing
                dfs = dff[dff['Close'] == 1].drop('Close', axis=1).T
                dfs.columns = [list(vperc.keys())[i] for i in clse]
                dfs['no'] = [list(dff)[i].lower() for i in range(len(dfs.index))]

                # Line plot for volcano data
                fig2 = px.line(dfs, x='no', y=dfs.columns[:-1], markers=True)
                fig2.update_layout(legend_title="Volcano", xaxis_title="", yaxis_title="")
                fig2.update_xaxes(tickangle=45)

        fig1.update_layout(title='<b>Threshold</b> <br>')
        fig1.update_xaxes(tickangle=45) 

        # Return the updated figures
        return fig, fig1, fig2



    @app.callback(
        # Output specifies the target component and property to be updated
        Output("page3-chrono", "figure"),
        [
            # Input from the volcano name dropdown on the page
            Input("page3-gvp-names-dropdown", "value"),
            # Input from hovering over the rock-vei chart, getting hover data
            Input("page3-rock-vei-chart-thresh", "hoverData"),
            # Input from the period selection radio buttons (BC, before 1679, 1679 and after)
            Input("page3-period-button", 'value')
        ],
    )
    def update_chronogram_chart(volcano_name, hoverdata, period_choice):
        """
        Updates the chronogram chart based on the selected volcano name, hover data from the rock-vei chart,
        and the chosen period. This function processes these inputs and generates a new chronogram figure.
        
        Args:
            volcano_name (str): The name of the selected volcano from the dropdown.
            hoverdata (dict): Data from hovering over the rock-vei chart, containing custom data about selected points.
            period_choice (str): The selected period ('BC', 'before 1679', or '1679 and after') from the radio buttons.
            
        Returns:
            fig (go.Figure): The updated chronogram figure to be displayed in the 'page3-chrono' component.
        """

        # Initialize an empty list to store volcano names from hover data
        lstv = []
        
        # Check if hoverdata is not None (i.e., if there is valid hover information)
        if hoverdata is not None: 
            # Check if 'customdata' exists in the hoverdata (to avoid errors if it's absent)
            if 'customdata' in hoverdata['points'][-1].keys():
                # Add the volcano name from custom data to the list
                # Accessing the last point in the hover data and taking the first item of custom data
                lstv = [hoverdata['points'][-1]['customdata'][0]]

        # Initialize an empty plotly figure
        fig = go.Figure()

        # If a volcano name is selected from the dropdown
        if volcano_name is not None:
            # Update the chronogram using the volcano name from the dropdown and the hover data
            # Add the volcano name to the hover volcano names list and pass it to the chronogram update function
            fig = update_chronogram(lstv + [volcano_name], period_choice, df_eruption, df_events)
        else:
            # If no volcano name is selected, but hover data exists
            if len(lstv) > 0:
                # Update the chronogram using only the volcano names from the hover data
                fig = update_chronogram(lstv, period_choice, df_eruption, df_events)
        
        # Return the updated figure for rendering in the chronogram component
        return fig
