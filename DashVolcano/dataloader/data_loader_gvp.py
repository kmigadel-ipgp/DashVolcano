# ************************************************************************************ #
#
# This file performs the following 4 tasks:
# 1) it defines a bunch of constant variables used across the code.
# 2) It loads GVP data from two files, downloaded from the GVP DB:
#    * one that contains volcano data, it needs to be named:
#      GVP_Volcano_List.xlsx
#    * one that contains eruption data, it needs to be named:
#      GVP_Eruption_Results.xlsx
# 3) It creates an index for GEOROC data, based on the content of the
#    folder GeorocGVPmapping.
#    Due to the sheer size of GEOROC dataset, the GEOROC data
#    is not loaded in memory. Instead, an index linking GVP data and GEOROC
#    data is created. Upon calling, the app will load the necessary GEOROC
#    data.
# 4) It displays in terminal a summary of statistics of the laded data.
#
# HARD CODED DATA WARNING 1: some volcano names are inconsistent between
# both files, this was fixed manually for files downloaded in 2021, if new
# inconsistencies appear in further downloads, this may need either further
# manual fixes, or to be coded once and for all.
#
# HARD CODED DATA WARNING 2: GEOROC volcano names are decided algorithmically;
# for some volcano, the result is not good, and some manual fix is done, to get
# a meaningful name.
#
# Author: F. Oggier
# Editor: K. Migadel
# Last update: September 20 2024
# ************************************************************************************* #


import pandas as pd
import numpy as np
import plotly.express as px

from constants.paths import GVP_ERUPTION_DIR, GVP_VOLCANO_DIR
from constants.rocks import ALL_ROCKS, ROCK_SORTED, VEI_COLS, ROCK_COL, SHAPES
from constants.events import BY_SEVERITY_EVENTS

def filter_volcano_data(df, tect_gvp, country, has_eruption=True):
    """
    Filters the volcano data based on tectonic settings and country.

    Args:
        df (pd.DataFrame): The volcano data to filter.
        tect_gvp (list): The list of tectonic settings to filter by.
        country (str): The country to filter by ('all' for no filtering).
        has_eruption (bool): If True, the data represents volcanoes with eruptions; otherwise, without eruptions.

    Returns:
        pd.DataFrame: The filtered volcano data with additional metadata.
    """
    condtc = df['Tectonic Settings'].isin(tect_gvp)
    cond_country = (df['Country'] == country) if country != 'all' else True
    
    # Filter the DataFrame
    filtered_df = df[condtc & cond_country][['Longitude', 'Latitude', 'Volcano Name']].copy()

    # Add metadata
    filtered_df['db'] = 'GVP with eruptions' if has_eruption else 'GVP no eruption'
    filtered_df['refs'] = 'Global Volcanism Program, Smithsonian Institution'

    # Rename columns for consistency
    return filtered_df.rename(columns={'Volcano Name': 'Name'})


def load_and_preprocess_volcano_and_eruption_data():
    """
    Loads and preprocesses both GVP eruption and volcano data, including:
    - Loading the datasets.
    - Cleaning and filtering the eruption data.
    - Adjusting volcano names.
    - Retrieving VEI and rock composition data.
    - Merging eruption data with volcano data.

    Returns:
        df_volcano (pd.DataFrame): Preprocessed volcano data.
        df_eruption (pd.DataFrame): Preprocessed eruption data.
        df_volcano_no_eruption (pd.DataFrame): Preprocessed volcano data with no eruption data.
    """
    # Load the eruption data
    df_eruption = pd.read_excel(GVP_ERUPTION_DIR, engine='openpyxl')
    df_eruption.columns = list(df_eruption.iloc[0])
    df_eruption = df_eruption.drop(df_eruption.index[0])
    df_eruption = df_eruption[df_eruption['Volcano Name'] != 'Unknown Source']
    df_eruption = df_eruption[df_eruption['Eruption Category'] == 'Confirmed Eruption']
    df_eruption = df_eruption[df_eruption['Volcano Name'] != 'Unnamed']
    df_eruption = df_eruption[df_eruption['Volcano Name'] != 'McBride Volcanic Province']

    # Load the volcano data
    df_volcano = pd.read_excel(GVP_VOLCANO_DIR, engine='openpyxl')
    df_volcano.columns = list(df_volcano.iloc[0])
    df_volcano = df_volcano.drop(df_volcano.index[0])

    # Adjust volcano names
    df_eruption, df_volcano = adjust_volcano_names(df_eruption, df_volcano)

    # Handle missing tectonic settings
    df_volcano['Tectonic Settings'] = df_volcano['Tectonic Settings'].fillna('Unknown')

    # Handle volcanoes with no eruption data
    df_volcano_no_eruption = df_volcano[~df_volcano['Volcano Name'].isin(df_eruption['Volcano Name'])]
    df_volcano_no_eruption.loc[:, 'Tectonic Settings'] = df_volcano_no_eruption['Tectonic Settings'].fillna('Unknown')

    # Retrieve VEI and rock composition data
    cols = ['Volcano Number', 'eruption no', 'reliability'] + VEI_COLS + ROCK_COL + ['Weighted ' + r for r in ROCK_COL]
    veirock_data = retrieve_vinfo_byno(df_volcano, df_eruption)
    
    # Merge the VEI data with the volcano dataframe:
    #   - note that the merging is based on either 'right' or 'left':
    #   - 'left' means that volcanoes are kept even with no eruptive data
    #   - 'right' means we only keep volcanoes with eruptions (thus possibly VEI and eruptive events)
    #   - the only data not considered by taking 'right' is the rock composition
    #   - country data is not available with eruption data
    #   - after merging using 'right', only countries with eruptive data are kept
    #   - names of volcanoes are thus only volcanoes with eruptive data if 'right' was chosen during merging
    #   - using GVP data from Oct 2021, there should be 861 volcanoes with eruptive data
    df_volcano = df_volcano.merge(pd.DataFrame(np.array(veirock_data), columns=cols), on='Volcano Number', how='right')

    # Encode volcano types (replaces string by integers) for decision trees
    shape_to_index = {shape: idx for idx, shape in enumerate(SHAPES)}
    df_volcano['Primary Volcano Type'] = df_volcano['Primary Volcano Type'].map(shape_to_index)

    return df_volcano, df_eruption, df_volcano_no_eruption


def adjust_volcano_names(df_eruption, df_volcano):
    """
    Adjusts names for volcanoes with the same name by adding the region to the name.

    Args:
        df_eruption (pd.DataFrame): The eruption data.
        df_volcano (pd.DataFrame): The volcano data.

    Returns:
        df_eruption (pd.DataFrame): The updated eruption data.
        df_volcano (pd.DataFrame): The updated volcano data.
    """
    replace_names = [353060, 357060, 382001, 344020, 353120, 263220, 351021, 224004]
    idx = df_volcano[df_volcano["Volcano Number"].isin(replace_names)].index
    df_volcano.loc[idx, 'Volcano Name'] = df_volcano.loc[idx, 'Volcano Name'] + '-' + df_volcano.loc[idx, 'Subregion']

    for no in replace_names:
        new_name = df_volcano[df_volcano["Volcano Number"] == no]['Volcano Name'].values[0]
        df_eruption.loc[df_eruption["Volcano Number"] == no, "Volcano Name"] = new_name

    return df_eruption, df_volcano

def retrieve_vinfo_byno(df_volcano, df_eruption):
    """
    Retrieves VEI and rock composition data for each volcano.

    Args:
        df_volcano (pd.DataFrame): The volcano data.
        df_eruption (pd.DataFrame): The eruption data.

    Returns:
        list: A list of data for each volcano, including VEI and rock composition.
    """
    veirock_data = []
    for no in df_eruption['Volcano Number'].unique():
        datv = [no]
        lstvei = list(df_eruption[df_eruption['Volcano Number'] == no]['VEI'].values)
        valid_vei = [float(x) for x in lstvei if isinstance(x, str)]
        rel = len(valid_vei) / len(lstvei)
        datv.extend([len(lstvei), rel])
        if rel > 0:
            datv.extend([max(valid_vei), sum(valid_vei) / len(valid_vei), min(valid_vei)])
        else:
            datv.extend([np.nan, np.nan, np.nan])

        rocks_orig = list(df_volcano[df_volcano['Volcano Number'] == no][ALL_ROCKS].values[0])
        rocks = [r for r in rocks_orig if r not in ['\xa0', 'No Data (checked)']]
        ridx = [0] * len(ROCK_SORTED)
        for r in rocks:
            ridx[ROCK_SORTED.index(r)] = rocks_orig.index(r) + 1
        datv.extend([x if x == 0 else 1 for x in ridx])
        datv.extend(ridx)
        veirock_data.append(datv)

    return veirock_data


def load_and_preprocess_gvp_events_data():
    """
    Loads and preprocesses the GVP events data from the Excel file's second sheet.
    Returns:
        df_events (pd.DataFrame): Preprocessed events data.
    """
    # Load the Excel file and parse the "Events" sheet
    xl = pd.ExcelFile(GVP_ERUPTION_DIR, engine='openpyxl')
    df_events = xl.parse("Events")
    df_events.columns = list(df_events.iloc[0])
    df_events = df_events.drop(df_events.index[0])

    return df_events

def get_severity_colors():
    """
    Assigns colors to event severity levels based on predefined severity categories.
    Returns:
        severity_colors (dict): Mapping of event severity to colors.
    """
    by_severity_flat = [event for sublist in BY_SEVERITY_EVENTS for event in sublist]

    severity_colors = {}

    # Assign colors for Category 1
    for i in range(len(px.colors.sequential.gray)):
        severity_colors[by_severity_flat[i]] = px.colors.sequential.gray[i]

    # Assign colors for specific severity levels in Category 1
    severity_colors[by_severity_flat[12]] = px.colors.sequential.Brwnyl[0]
    severity_colors[by_severity_flat[13]] = px.colors.sequential.Brwnyl[1]
    severity_colors[by_severity_flat[14]] = px.colors.sequential.Brwnyl[2]

    # Assign colors for Category 2
    for i in range(len(px.colors.sequential.solar[2:])):
        severity_colors[by_severity_flat[15 + i]] = px.colors.sequential.solar[i]

    # Assign colors for Category 3 beginning
    for i in range(len(px.colors.sequential.Pinkyl)):
        severity_colors[by_severity_flat[25 + i]] = px.colors.sequential.Pinkyl[i]

    # Assign colors for Category 3 end and Category 4
    for i in range(len(px.colors.sequential.OrRd)):
        severity_colors[by_severity_flat[32 + i]] = px.colors.sequential.OrRd[i]

    return severity_colors


def load_and_preprocess_gvp_data():
    """
    Loads and preprocesses GVP data

    Returns:
        df_volcano (pd.DataFrame): Preprocessed volcano data.
        df_eruption (pd.DataFrame): Preprocessed eruption data.
        df_volcano_no_eruption (pd.DataFrame): Preprocessed volcano data with no eruption data.
        lst_countries (list): List of country with volcano.
        lst_names (list): List of volcano names.
        df_events (pd.DataFrame): Preprocessed events data.
        severity_colors (dict): Mapping of event severity to colors.
    """
    # Loads and preprocess GVP volcano and eruption data
    df_volcano, df_eruption, df_volcano_no_eruption = load_and_preprocess_volcano_and_eruption_data()

    # List of countries and volcano names with eruptive data
    lst_countries = sorted(df_volcano['Country'].unique())
    lst_names = list(df_volcano['Volcano Name'].unique())

    # Load GVP events data
    df_events = load_and_preprocess_gvp_events_data()

    # Get severity colors
    severity_colors = get_severity_colors()

    return df_volcano, df_eruption, df_volcano_no_eruption, lst_countries, lst_names, df_events, severity_colors