import os
import plotly.graph_objs as go
import plotly.express as px
import pandas as pd
import numpy as np
import ast
import plotly.graph_objs as go

from plotly.subplots import make_subplots

from constants.shared_data import df_volcano, df_volcano_no_eruption, dict_georoc_sl, dict_volcano_file, dict_georoc_gvp, lst_names, df_eruption, grnames
from constants.tectonics import NEW_TECTONIC_SETTINGS
from constants.chemicals import LBLS, LBLS2
from constants.rocks import GEOROC_ROCKS, ALL_ROCKS, ROCK_COL
from constants.paths import GEOROC_AROUND_GVP_FILE, GEOROC_AROUND_PETDB_FILE, GEOROC_DATASET_DIR

# import functions to process GVP, GEOROC and PetDB data
from functions.georoc import load_georoc, guess_rock, detects_chems, plot_chem, process_georoc_data, clean_and_prepare_georoc, update_onedropdown, update_chemchart, add_alkaline_line, add_alkaline_series, update_subtitle, plot_tas, match_GVPdates, find_new_tect_setting, rocks_to_color
from functions.gvp import retrieve_vinfo

from helpers.helpers import expand_rows_with_lists, replace_nan_in_string_list

def clean_tas_data(tas_data):
    """
    Helper function to clean the TAS data by removing unnecessary columns and duplicates.
    
    Args:
        tas_data (pd.DataFrame): DataFrame containing the TAS data to be cleaned.
    
    Returns:
        pd.DataFrame: Cleaned TAS data with unnecessary columns dropped and duplicates removed.
    """
    
    # List of location columns to drop, formatted as 'LOCATION-1', 'LOCATION-2', ..., 'LOCATION-8'
    locs = ['LOCATION-' + str(i) for i in range(1, 9)]
    
    # Additional columns to drop, including old and unused data fields
    dropmore = ['GUESSED DATE', 'NA2O(WT%)+K2O(WT%)', 'excessFEO(WT%)', 'excessCAO(WT%)', 
                'excessMGO(WT%)', 'color', 'symbol', 'SIO2(WT%)old', 'NA2O(WT%)old', 'K2O(WT%)old']

    # Iterate over the list of columns and drop if they exist in the TAS data
    for loc in locs + dropmore:
        if loc in tas_data.columns:
            tas_data = tas_data.drop(loc, axis=1)

    # Remove any duplicate rows from the DataFrame
    tas_data = tas_data.drop_duplicates()

    # Return the cleaned DataFrame
    return tas_data


def update_tas(fig, volcano_name, selectedpts, rock_tect_setting):
    """
    Updates the TAS diagram based on selected points and volcano data.

    Args:
        fig: The TAS figure object to update.
        volcano_name: Selected volcano name (GEOROC).
        selectedpts: Selected points data (box or lasso tool).
        rock_tect_setting: Tectonic filter selected from the GEOROC and PetDB database.

    Returns:
        A tuple containing the updated TAS figure and geochemical data.
    """
    # Initialize an empty DataFrame for geochemical data
    thisgeogr = pd.DataFrame()

    # If points are selected, process them
    if selectedpts:
        selectedpts = selectedpts['points']

        # Load PetDB and GEOROC datasets
        dfgeopdb = pd.read_csv(GEOROC_AROUND_PETDB_FILE)
        dfgeogr = pd.read_csv(GEOROC_AROUND_GVP_FILE)
        dfgeogr['LATITUDE'] = (dfgeogr['LATITUDE MIN'] + dfgeogr['LATITUDE MAX']) / 2
        dfgeogr['LONGITUDE'] = (dfgeogr['LONGITUDE MIN'] + dfgeogr['LONGITUDE MAX']) / 2

        # Filter selected points by database type (GEOROC or PetDB)
        with_text = [[x['lat'], x['lon']] for x in selectedpts if 'customdata' in x and 'Rock sample (GEOROC)' in x['customdata']]
        without_text = [[x['lat'], x['lon']] for x in selectedpts if 'customdata' in x and 'PetDB' in x['customdata']]
        with_text_match = any('customdata' in x and 'Matching rock sample (GEOROC)' in x['customdata'] for x in selectedpts)

        # Process PetDB data
        if without_text:
            thisgeopdb = dfgeopdb.set_index(['LATITUDE', 'LONGITUDE']).loc[without_text, ['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)', 'CAO(WT%)', 'FEOT(WT%)', 'MGO(WT%)', 'MATERIAL', 'ROCK']]
            thisgeopdb = clean_and_convert_geopdb(thisgeopdb)
            thisgeogr = pd.concat([thisgeogr, thisgeopdb])

        # Process GEOROC data based on selected points
        if with_text:
            thisgeogr = process_georoc_data(dfgeogr, with_text, volcano_name, with_text_match, thisgeogr, dict_georoc_sl, dict_volcano_file)

    # If no points are selected, process the volcano name
    elif volcano_name and volcano_name != "start":
        dfloaded = load_georoc(volcano_name, dict_georoc_sl, dict_volcano_file)
        dfloaded = clean_and_prepare_georoc(dfloaded)
        thisgeogr = pd.concat([thisgeogr, dfloaded])

    # Plot the TAS diagram if geochemical data is available
    if not thisgeogr.empty:
        fig = plot_chem(fig, thisgeogr, ['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], LBLS2 if 'PetDB' in rock_tect_setting else LBLS)
        add_subtitle(fig, thisgeogr)
    else:
        fig.update_layout(title='<b>TAS diagram</b><br>', height=700)

    return fig, thisgeogr


def clean_and_convert_geopdb(thisgeopdb):
    """
    Clean and convert PetDB geochemical data to the appropriate format for further analysis.
    
    Args:
        thisgeopdb: DataFrame containing geochemical data from PetDB.

    Returns:
        Cleaned and processed DataFrame with corrected formats and types.
    """
    
    morechemsh = ['FEOT(WT%)', 'CAO(WT%)', 'MGO(WT%)']  # Additional chemical columns to check.
    thisgeopdb = thisgeopdb.apply(lambda col: col.apply(lambda val: replace_nan_in_string_list(val, col.name)))
    thisgeopdb = expand_rows_with_lists(thisgeopdb)
    thisgeopdb = detects_chems(thisgeopdb, ['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], morechemsh, LBLS2)
    thisgeopdb['db'] = 'PetDB'

    # Return the cleaned and processed DataFrame.
    return thisgeopdb



def add_subtitle(fig, thisgeogr):
    """Add subtitle to the TAS diagram."""
    majorrocks = [rock for rock in thisgeogr['ROCK'].value_counts().index[:5] if rock != 'UNNAMED' and rock != 0]
    fig.update_layout(
        annotations=[dict(xref='paper', yref='paper', x=0.5, y=-0.25, showarrow=False, text=', '.join(majorrocks))],
        title='<b>TAS diagram</b><br>', height=700
    )


def update_radar(rock_database, rock_tect_setting, thisvolcano, tas_data, sample_interval):
    """
    Update a radar chart showing the frequency of rock samples based on tectonic settings.

    Args:
        rock_database: List of volcanic rock databases selected.
        rock_tect_setting (list): List of selected tectonic settings from GEOROC and PetDB.
        thisvolcano (str): Name of the selected volcano.
        tas_data (DataFrame): DataFrame containing rock sample data.

    Returns:
        go.Figure: A Plotly figure object containing the radar chart.
    """
    number_petdb_samples = 0
    number_georoc_samples = 0
    # min and max no of samples
    # this will be used per database, namely we check whether the right number is present in either db
    # we do not try to see whether the right number is present when combined, even if both dbs are chosen
    min_samples = sample_interval[0]
    max_samples = sample_interval[1]

    # Creates an empty DataFrame, in case no setting is valid
    dfgeo = pd.DataFrame({'ROCK': [], 'Volcano Name': [], 'db': []})
    # Load relevant data based on selected tectonic settings
    if 'PetDBaroundGVP.csv' in os.listdir(GEOROC_DATASET_DIR) and 'PetDB' in rock_database:
        # Load PetDB data and process the Volcano Name column
        dftmp = pd.read_csv(GEOROC_AROUND_PETDB_FILE)[['ROCK', 'Volcano Name']]
        dftmp['Volcano Name'] = dftmp['Volcano Name'].apply(lambda x: set(ast.literal_eval(x)))
        dftmp['Volcano Name'] = dftmp['Volcano Name'].apply(lambda y: [x.split(';') for x in y])
        dftmp['Volcano Name'] = dftmp['Volcano Name'].apply(lambda y: list(set([item for sublist in y for item in sublist])))
        dftmp['Volcano Name'] = dftmp['Volcano Name'].apply(lambda x: [find_new_tect_setting(y, df_volcano, df_volcano_no_eruption) for y in x if y != ''])
        dftmp['db'] = 'PetDB'
        # Convert string representations of lists back to actual lists
        dftmp['ROCK'] = dftmp['ROCK'].apply(lambda y: ast.literal_eval(y) if isinstance(y, str) else [])
        # Filters based on no of samples
        scount = dftmp['ROCK'].apply(lambda y: sum([x[1] for x in y]))
        dftmp = dftmp[(scount >= min_samples) & (scount <= max_samples)]
        # Combines
        dfgeo = pd.concat([dfgeo, dftmp])
    if 'GEOROCaroundGVP.csv' in os.listdir(GEOROC_DATASET_DIR) and 'GEOROC' in rock_database:
        # Load GEOROC data and process the Volcano Name column
        dftmp =  pd.read_csv(GEOROC_AROUND_GVP_FILE)[['ROCK', 'Volcano Name']]
        dftmp['Volcano Name'] = dftmp['Volcano Name'].apply(lambda x: list(set([name.replace('Within ', 'Intra') for name in ast.literal_eval(x)])))
        dftmp['db'] = 'GEOROC'
        # Convert string representations of lists back to actual lists
        dftmp['ROCK'] = dftmp['ROCK'].apply(lambda y: ast.literal_eval(y) if isinstance(y, str) else [])
        # Filters based on no of samples
        scount = dftmp['ROCK'].apply(lambda y: sum([x[1] for x in y]))
        dftmp = dftmp[(scount >= min_samples) & (scount <= max_samples)]
        # Combines
        dfgeo = pd.concat([dfgeo, dftmp])

    # Filter data based on new tectonic settings
    if rock_tect_setting:
        dfgeo = dfgeo[dfgeo['Volcano Name'].map(lambda x: len(np.intersect1d(x, rock_tect_setting)) > 0)]
        if dfgeo.empty:
            dfgeo = pd.DataFrame({'ROCK': [], 'Volcano Name': [], 'db': []})

    # Initialize rock count list for each type
    rlist = []
    for rock_type in GEOROC_ROCKS:
        rcount = dfgeo['ROCK'].apply(lambda y, rock_type=rock_type: sum([x[1] if x[0] == rock_type else 0 for x in y])).sum()
        rlist.append(rcount)

    counts = dfgeo['db'].value_counts()
    number_petdb_samples = counts.get('PetDB', 0)
    number_georoc_samples = counts.get('GEOROC', 0)

    # Concatenate sample counts into a display variable
    number_rock_samples = f"PetDB samples: {number_petdb_samples}, GEOROC samples: {number_georoc_samples}"

    # Create a new radar chart figure
    fig = go.Figure()

    # Add trace for GEOROC rock types if there are any
    if sum(rlist) > 0:
        fig.add_trace(go.Scatterpolar(
            r=[r * (100 / sum(rlist)) for r in rlist],
            theta=GEOROC_ROCKS,
            fill='toself',
            fillcolor='cadetblue',
            line_color='grey',
            name=' '.join(rock_tect_setting)
        ))

    # Count rocks from tas_data or load from GEOROC based on volcano selection
    if not tas_data.empty:
        rcount = tas_data['ROCK'].value_counts()
    else:
        if thisvolcano not in ['start', None]:
            rcount = load_georoc(thisvolcano)['ROCK'].value_counts()
        else:
            rcount = {}

    # Prepare rock counts for the volcano
    rlist = [rcount.get(rock_type, 0) for rock_type in GEOROC_ROCKS]

    # Add trace for the selected volcano if there are any rocks
    if sum(rlist) > 0:
        fig.add_trace(go.Scatterpolar(
            r=[r * (100 / sum(rlist)) for r in rlist],
            theta=GEOROC_ROCKS,
            fillcolor='indianred',
            line_color='firebrick',
            fill='toself',
            opacity=0.5,
            name=thisvolcano
        ))

    # Update the layout of the radar chart
    fig.update_layout(
        title='<b>Rock Sample Frequency</b> <br>',
        polar=dict(
            radialaxis=dict(
                visible=True,
                range=[0, 50]
            )),
        showlegend=False,
        annotations=[dict(
            xref='paper', yref='paper',
            x=0.5, y=-0.25, showarrow=False,
            text=number_rock_samples
        )]
    )

    return fig  # Return the constructed figure


def update_afm(volcanoname, tas_data):
    """
    Updates the AFM diagram based on the volcano name and TAS data.
    """

    custom_marker_symbols = {'WR': 'circle', 'GL': 'diamond', 'INC': 'square'}

    if volcanoname in ['start', None] and len(tas_data.index) == 0:
        df = pd.DataFrame({"FEOT(WT%)": [0], 'NA2O(WT%)+K2O(WT%)': [0], 'MGO(WT%)': [0], 'MATERIAL': [0]})
    else:
        
        # Load data from tas_data if available, otherwise from georoc
        df = tas_data if len(tas_data.index) > 0 else load_georoc(volcanoname)
        df = df[['FEOT(WT%)', 'NA2O(WT%)', 'K2O(WT%)', 'MGO(WT%)', 'MATERIAL']]
        
        # Add NA2O + K2O column and clean the MATERIAL column
        df['NA2O(WT%)+K2O(WT%)'] = df['NA2O(WT%)'] + df['K2O(WT%)']
        df['MATERIAL'] = df['MATERIAL'].str.split('[').str[0].str.strip()
    
    # Create scatter ternary plot
    fig = px.scatter_ternary(df, a="FEOT(WT%)", b='NA2O(WT%)+K2O(WT%)', c='MGO(WT%)', 
                            symbol='MATERIAL', symbol_map=custom_marker_symbols)

    # Add trace for the AFM boundary lines
    fig.add_trace(
        go.Scatterternary(
            a=[39, 50, 56, 53, 45, 26],
            b=[11, 14, 18, 28, 40, 70],
            c=[50, 36, 26, 20, 15, 4],
            mode='lines',
            marker=dict(color='purple'),
            line=dict(width=4),
            showlegend=False
        )
    )
    
    # Update layout
    fig.update_layout(title='<b>AFM diagram</b><br>', height=700)
    
    return fig


def update_veichart(thisvolcano_name, thisfig):
    """
    Args:
        thisvolcano_name: name of a GEOROC volcano
        thisfig: figure to be updated
        thisdate: chosen eruption dates, possibly all

    Returns: Updates the VEI content from GVP
    """
    these_annotations = []
    vei_ticks = {j: 'VEI ' + str(j) for j in range(9)}
    vei_ticks[9] = 'Unknown VEI'

    if thisvolcano_name and thisvolcano_name != 'start':
        # Normalize volcano name for matching
        n = dict_georoc_sl.get(thisvolcano_name, thisvolcano_name)
        n = dict_georoc_gvp.get(n, thisvolcano_name.title())

        if n in lst_names:
            datav = retrieve_vinfo(n, df_volcano, df_eruption, ALL_ROCKS)
            thiscolor = rocks_to_color(datav[2])
            dvei = datav[1]

            # Count VEI occurrences
            cnts = [len([x for x in dvei if x == i]) for i in map(str, range(9))]
            cnts.append(len([x for x in dvei if not isinstance(x, str)]))
            dfvei = pd.DataFrame({'VEI': cnts, 'VEI range': list(map(str, range(9))) + ['9']})

            # Add VEI data to plot
            thisfig.add_traces(
                go.Bar(
                    x=dfvei['VEI range'],
                    y=dfvei['VEI'],
                    marker_color=f'rgb{thiscolor}',
                    name=n
                )
            )

            # Process GVP dates
            ddate = datav[3]
            dd = [[
                ''.join([beg if isinstance(beg, str) else '' for beg in begend[::2]]),
                ''.join([end if isinstance(end, str) else '' for end in begend[1::2]])
            ] for begend in zip(*ddate)]

            # Add GVP dates to plot
            for i, veir in enumerate(list(map(str, range(9))) + ['9']):
                idx = [j for j, d in enumerate(dvei) if (d == veir if i < 9 else not isinstance(d, str))]
                dfd = pd.DataFrame({'date': [dd[j] for j in idx]})

                thisfig.add_traces(
                    go.Scatter(
                        x=[i] * len(idx),
                        y=[yi + 0.5 for yi in range(len(idx))],
                        mode='markers',
                        marker_symbol='circle',
                        customdata=dfd['date'],
                        hovertemplate='%{customdata}',
                        showlegend=False
                    )
                )

            # Add rock composition to plot caption
            datav2 = datav[2]
            strc = ''.join(
                f"Major Rock {i}: {ROCK_COL[datav2.index(i)]} " if i <= 4 else
                f"<br> Minor Rock {i}: {ROCK_COL[datav2.index(i)]}" for i in range(1, 10) if i in datav2
            )

            thisfig.update_layout(
                title=go.layout.Title(text='<b>VEI data from GVP</b><br>', x=0),
                annotations=[dict(xref='paper', yref='paper', x=0.5, y=-0.25, showarrow=False, text=strc)] + these_annotations,
                xaxis=dict(tickmode='array', tickvals=list(range(10)), ticktext=[vei_ticks[x] for x in range(10)])
            )

    else:
        thisfig.update_layout(title='<b>VEI data from GVP</b><br>')
        thisfig.add_traces(go.Bar(x=[], y=[]))

    return thisfig


    
def update_oxyde(thisdf):
    """
    Args:
        thisdf: DataFrame containing geochemical data for plotting a Harker diagram.

    Returns:
        thisfig: A Plotly figure with subplots, each showing a Harker diagram
                with different oxide concentrations against SiO2.
    """

    # Create a subplot layout with 4 rows and 2 columns for the Harker diagrams
    thisfig = make_subplots(rows=4, cols=2)
    
    # Set the title for the entire figure
    thisfig.update_layout(title='<b>Harker Diagrams from GEOROC</b> <br>')

    # List of chemical oxides (y-axis) to be plotted against SiO2 (x-axis)
    harkerchems = ['TIO2(WT%)', 'AL2O3(WT%)', 'FEOT(WT%)', 'MGO(WT%)', 
                'CAO(WT%)', 'NA2O(WT%)', 'K2O(WT%)', 'P2O5(WT%)']

    # Specify the subplot grid positions for each oxide
    harkerrows = [1, 1, 2, 2, 3, 3, 4, 4]
    harkercols = [1, 2, 1, 2, 1, 2, 1, 2]

    # Loop through each chemical oxide and plot it as a scatter plot in the correct subplot
    for chem, thisrow, thiscol in zip(harkerchems, harkerrows, harkercols):
        thisfig.add_traces(
            go.Scatter(
                x=thisdf['SIO2(WT%)'],  # SiO2 is the x-axis
                y=thisdf[chem],         # Current oxide (chem) is the y-axis
                mode='markers',         # Scatter plot mode with markers
                marker=dict(symbol='circle'),  # Marker symbol for scatter points
                name=chem,              # Name of the oxide for legend
                showlegend=False,       # Hide legend to avoid duplicates
            ),
            rows=thisrow, cols=thiscol,  # Position the plot in the specified row/column
        )

    # Update x-axis labels and ranges for SiO2, consistent across all subplots
    thisfig.update_xaxes(title_text="SiO<sub>2</sub>(wt%)", row=4, col=1)
    thisfig.update_xaxes(title_text="SiO<sub>2</sub>(wt%)", row=4, col=2)
    
    # Set the x-axis range (30-80 wt%) for all subplots
    for r in range(1, 5):
        for c in range(1, 3):
            thisfig.update_xaxes(range=[30, 80], row=r, col=c)

    # Titles and y-axis limits for each oxide subplot
    titles = ["TiO<sub>2</sub>(wt%)", "Al<sub>2</sub>O<sub>3</sub>(wt%)", "FeOT(wt%)", "MgO(wt%)",
            "CaO(wt%)", "Na<sub>2</sub>O(wt%)", "K<sub>2</sub>O(wt%)", "P<sub>2</sub>O<sub>5</sub>(wt%)"]
    maxy = [10, 25, 20, 15, 20, 10, 10, 5]  # Maximum y-axis values for each oxide

    # Loop through the titles and max y-values to set the y-axis properties for each subplot
    for title, my, thisrow, thiscol in zip(titles, maxy, harkerrows, harkercols):
        thisfig.update_yaxes(title_text=title, row=thisrow, col=thiscol)
        thisfig.update_yaxes(range=[0, my], row=thisrow, col=thiscol)

    # Return the final figure with all the subplots and formatting
    return thisfig



# Helper function to update the store and subtitle based on current figure data
def update_store(volcanoname, date, currentfig, store, restyle):
    """Processes the figure data and updates the store and subtitle for a given volcano"""
    recs = [d for d in currentfig['data'] if 'customdata' in d.keys() and len(d['marker']['symbol']) > 0] 
    if len(recs) > 0:
        store, subtitle = update_subtitle(currentfig, store, restyle, volcanoname, date)
    else:
        subtitle = ''
    return store, subtitle

# Helper function to set the date options based on the selected volcano
def set_date_options(volcano_name):
    """
    Args:
        volcano_name: name of the selected volcano
    
    Returns: 
        Updates eruption date options and selects the default 'all' option for the dropdown
    """
    opts = update_onedropdown(volcano_name, grnames, dict_georoc_sl, dict_volcano_file)
    return opts, 'all'

# Helper function to update the TAS, VEI, and oxide charts
def update_charts_rock_vei(volcano_name, date):
    """
    Args:
        volcano_name: name of the selected volcano
        date: selected eruption dates (or 'all')
    
    Returns: 
        Updated figures for the TAS diagram, VEI chart, and oxide chart
    """
    # Initialize subplots for the TAS chart
    fig = make_subplots(rows=2, cols=1, shared_xaxes=True, row_width=[0.85, 0.2], vertical_spacing=0.05)
    fig, tmp = update_chemchart(volcano_name, fig, date, grnames, dict_georoc_sl, dict_volcano_file)  # Update TAS chart
    fig = add_alkaline_line(fig)                          # Add alkaline line to TAS chart
    
    # Update the oxide chart
    figa = update_oxyde(tmp)
    figa = add_alkaline_series(figa)
    
    # Initialize and update the VEI chart
    fig2 = go.Figure()
    fig2 = update_veichart(volcano_name, fig2)

    return fig, fig2, figa  # Return updated figures



def update_joint_chemchart(thisvolcano_name, thisdf, thisfig, thisdate):
    """
    Updates both the chemical plot and the dataframe based on user's inputs.
    
    Args:
        thisvolcano_name: name of a volcano
        thisdf: dataframe containing chemical data
        thisfig: the figure being updated
        thisdate: the eruption dates, possibly 'all'

    Returns:
        thisfig: updated plot figure
        dff: dataframe used for the plot
    """
    cols_gvp = ['Volcano Name', 'Start Year', 'End Year', 'VEI']
    df_gvp_geo = pd.DataFrame(columns=cols_gvp + list(thisdf))

    # Load data if valid volcano name provided
    if thisvolcano_name != "start" and thisvolcano_name:
        volcano_key = dict_georoc_sl.get(thisvolcano_name, thisvolcano_name)
        volcano_key = dict_georoc_gvp.get(volcano_key, volcano_key.title())

        dfmatchv = df_eruption[df_eruption['Volcano Name'] == volcano_key].copy()
        dfmatchv['End Year'].fillna(dfmatchv['Start Year'], inplace=True)

        # Match eruption dates based on user's input
        all_dates_gvp = []
        if thisdate == 'all':
            all_dates_gvp = match_GVPdates(thisvolcano_name, 'forall', volcano_key, dict_georoc_sl, dict_volcano_file, df_eruption)
        else:
            this_date_gvp = match_GVPdates(thisvolcano_name, thisdate, volcano_key, dict_georoc_sl, dict_volcano_file, df_eruption)
            if this_date_gvp[0] != 'not found':
                all_dates_gvp = [[int(thisdate.split('-')[0]), this_date_gvp]]

        # Match GVP and GEOROC data
        for gy, se in all_dates_gvp:
            dfmatch = dfmatchv[(dfmatchv['Start Year'].astype(str) == se[0]) & (dfmatchv['End Year'].astype(str) == se[1])]
            gm_clean = thisdf[thisdf['ERUPTION YEAR'] == gy]['ERUPTION MONTH'].dropna().unique()
            
            if se[0] == se[1] and len(gm_clean) > 0:
                gvpm = dfmatch[['Start Month', 'End Month']].astype(float).dropna().values
                fnd_months = [[y, x] for x in gvpm for y in gm_clean if x[0] <= y <= x[1]]
                if fnd_months:
                    sm = [x[1][0] for x in fnd_months]
                    em = [x[1][1] for x in fnd_months]
                    dfmatch = dfmatch[dfmatch['Start Month'].astype(float).isin(sm) & dfmatch['End Month'].astype(float).isin(em)]

            rowgvp = dfmatch[cols_gvp].iloc[0].values
            rowsgeoroc = thisdf[(thisdf['ERUPTION YEAR'] == gy) & (thisdf['ERUPTION MONTH'].isin(gm_clean))].values

            df_gvp_geo = pd.concat([df_gvp_geo, pd.DataFrame([list(rowgvp) + list(rw) for rw in rowsgeoroc], 
                                                        columns=cols_gvp + list(thisdf))], ignore_index=True)

    # Default to an empty dataframe if no match found
    if df_gvp_geo.empty:
        dff = pd.DataFrame(columns=['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)', 'NA2O(WT%)+K2O(WT%)', 
                                    'FEO(WT%)', 'CAO(WT%)', 'MGO(WT%)', 'ERUPTION YEAR', 'MATERIAL'])
    else:
        dff = df_gvp_geo

    # Update the plot with the TAS layout and chemical scatter plot
    thisfig = plot_tas(thisfig)
    thisfig = plot_chem(thisfig, dff, ['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], LBLS)
    thisfig.update_layout(title='<b>Chemical Rock Composition from Georoc (with known eruptions)</b><br>')

    return thisfig


def add_chems(thisdf, thisfig, thisperiod):
    """
    Adds GEOROC chemical data to a GVP chronogram figure based on the eruption period.

    Args:
        thisdf: GEOROC data containing chemical composition.
        thisfig: Chronogram figure to be updated (Plotly figure).
        thisperiod: Period of eruptions ('1679 and after', 'before 1679', or negative year).

    Returns:
        thisfig: Updated chronogram figure with chemical data.
    """

    # Filter dataframe based on the eruption period
    if thisperiod == '1679 and after':
        # Keep only rows with eruptions in 1679 or later
        thisdf = thisdf[thisdf['ERUPTION YEAR'] >= 1679].rename(
            columns={'ERUPTION YEAR': 'year', 'ERUPTION MONTH': 'month', 'ERUPTION DAY': 'day'}
        )
        # Correct any invalid month/day values
        thisdf['month'] = np.where((thisdf['month'] > 12) | (thisdf['month'] < 1), 1, thisdf['month'])
        thisdf['day'] = np.where((thisdf['day'] > 31) | (thisdf['day'] <= 0), 1, thisdf['day'])
        
    elif thisperiod == 'before 1679':
        # Keep eruptions before 1679, excluding negative or zero years
        thisdf = thisdf[(thisdf['ERUPTION YEAR'] < 1679) & (thisdf['ERUPTION YEAR'] > 0)]
        
    else:
        # Keep only negative years for ancient eruptions
        thisdf = thisdf[thisdf['ERUPTION YEAR'] < 0]

    # Ensure that chemical data columns are numeric and rounded to 2 decimal places
    thisdf['K2O(WT%)'] = thisdf['K2O(WT%)'].astype(float).round(2)
    thisdf['NA2O(WT%)'] = thisdf['NA2O(WT%)'].astype(float).round(2)
    thisdf['SIO2(WT%)'] = thisdf['SIO2(WT%)'].astype(float).round(2)

    # Loop through labels (rock types) defined in LBLS to add traces for each
    for lbl in LBLS:
        # Filter data for the current rock type (color)
        dffc = thisdf[thisdf['color'] == lbl]
        
        # Determine x-axis data: use specific date for '1679 and after', otherwise just year
        if thisperiod == '1679 and after':
            xdate = pd.to_datetime(dffc[['year', 'month', 'day']])
        else:
            xdate = dffc['ERUPTION YEAR']
        
        # Add K2O + NA2O trace (chemical scatter plot)
        thisfig.add_trace(
            go.Scatter(
                x=xdate,
                mode='markers',
                marker_color='cornflowerblue',
                customdata=dffc[['NA2O(WT%)', 'K2O(WT%)']],
                hovertemplate='x=%{x}<br>NA2O=%{customdata[0]}<br>K2O=%{customdata[1]}',
                y=(dffc['K2O(WT%)'] + dffc['NA2O(WT%)']) / 100 - 0.4,  # Plot NA2O + K2O on y-axis
                name='NA2O+K2O',
                showlegend=False
            )
        )

        # Add SIO2 trace (chemical scatter plot)
        thisfig.add_trace(
            go.Scatter(
                x=xdate,
                mode='markers',
                marker_color='cornflowerblue',
                customdata=dffc['SIO2(WT%)'],
                hovertemplate='x=%{x}<br>SIO2=%{customdata}',
                y=dffc['SIO2(WT%)'] / 100 - 0.4,  # Plot SIO2 on y-axis
                name='SIO2',
                showlegend=False
            )
        )
        
    return thisfig
