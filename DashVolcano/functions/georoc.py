# **********************************************************************************#
#
# This contains functions to manipulate Georoc data.
# --------------------------------------------------
# * load_georoc: loads data for a given volcano
# * load_refs: loads references
# * fix_pathname
# * fix_inclusion
# * normalize_oxides_with_feot: handles FEOT and normalizes oxides 
# * guess_rock: associates a rock name based on chemicals and TAS diagram
# * extract_date: extract date information from comments
# * plot_TAS: draws the TAS background
# * add_alkaline_series
# * add_alkaline_line
# * detects_chems
# * plot_chem
# * match_GVPdates: given a Georoc date, matches GVP date 
# * update_chemchart
# * update_onedropdown
# * filter_date: filters a dataframe by date
# * update_onedropdown: creates menus for filtering per date
# * GEOROC_majorrock: computes major rocks for GEOROC data
# * update_GEOrockchart
# * create_georoc_around_gvp: creates a df of GEOROC samples around GVP volcanoes
# * createPetDBaroundGVP: creates a df of PetDB samples around GVP volcanoes
# * retrieved_fromfigure
# * update_subtitle: updates subtitles based on user clicks on legends
# * GEOROC_sunburst
# * perc_rock: computes the percentage of rocks for all volcanoes
#
#
# Author: F. Oggier
# Editor: K. Migadel
# Last update: September 20 2024
# **********************************************************************************#


import os
import re
import statistics
import plotly.express as px
import plotly.graph_objs as go
import pandas as pd
import numpy as np

from collections import Counter
from tqdm import tqdm
from plotly.subplots import make_subplots

from constants.rocks import GEOROC_ROCKS, GEOROC_ROCK_COL, ROCK_COL
from constants.chemicals import MORE_CHEMS, LBLS, LBLS2, CHEM_COLS, OXIDES, COLS_ROCK, ISOTOPES
from constants.tectonics import NEW_TECTONIC_DICT, NEW_TECTONIC_SETTINGS
from constants.paths import GEOROC_DATASET_DIR, GEOROC_GVP_DIR, GEOROC_AROUND_GVP_FILE

def rocks_to_color(rid):
    """

    Args:
        rid: the rock composition

    Returns: a corresponding color code

    """
    # coloring based on rock composition
    if rid[9] > 0 and rid[6] == 0:
        cc_r = max(200 - (rid[9] - 1) * 16, 115)
        cc_g = 0
    elif rid[9] == 0 and rid[6] > 0:
        cc_r = max(255 - (rid[6] - 1) * 26, 115)
        cc_g = 64
    elif rid[9] > 0 and rid[6] > 0:
        cc_r = max(200 - (rid[9] - 1) * 16, 115)
        cc_g = 64
    else:
        cc_r = 0
        cc_g = 0
    # intermediate and mafic
    if rid[2] > 0 and rid[3] == 0:
        cc_b = max(255 - (rid[2] - 1) * 26, 115)
        cc_g += 0
    elif rid[2] == 0 and rid[3] > 0:
        cc_g += max(255 - 64 - (rid[3] - 1) * 26, 115)
        cc_b = 0
    elif rid[2] > 0 and rid[3] > 0:
        cc_g += max(255 - 64 - (rid[3] - 1) * 26, 115)
        cc_b = max(255 - (rid[2] - 1) * 26, 115)
    else:
        cc_b = 0
        cc_g += 0

    return cc_r, cc_g, cc_b


def find_new_tect_setting(thisvolcano, df_volcano, df_volcano_no_eruption):
    """
    Determines the tectonic setting for a given volcano, accounting for specific known exceptions,
    and looks up the tectonic setting in the provided volcano dataframes.

    Args:
        thisvolcano (str): Name of the volcano.
        df_volcano (pd.DataFrame): DataFrame containing volcanoes with known eruptions.
        df_volcano_no_eruption (pd.DataFrame): DataFrame containing volcanoes without known eruptions.

    Returns:
        str: The tectonic setting of the volcano.
    """
    
    # Check for specific volcanoes with predefined tectonic settings
    specific_volcanoes = {
        'Northern Lake Abaya Volcanic Field': 'Rift at plate boundaries / Continental',
        'Vitim Volcanic Field': 'Rift at plate boundaries / Continental',
        'Kaikohe-Bay of Islands': 'Intraplate / Continental',
        'Garove': 'Subduction zone / Continental',
        'Eastern Gemini Seamount': 'Subduction zone / Continental'
    }
    
    # Return predefined tectonic setting if the volcano is in the list
    if thisvolcano in specific_volcanoes:
        return specific_volcanoes[thisvolcano]

    # Look up the tectonic setting from the dataframes
    tectonic_setting = df_volcano[df_volcano['Volcano Name'] == thisvolcano]['Tectonic Settings'].values
    
    # If not found in the main DataFrame, check the secondary one (no eruption data)
    if len(tectonic_setting) == 0:
        tectonic_setting = df_volcano_no_eruption[df_volcano_no_eruption['Volcano Name'] == thisvolcano]['Tectonic Settings'].values[0]
    else:
        tectonic_setting = tectonic_setting[0]
    
    # Map the tectonic setting to simplified categories
    tectonic_mapping = {
        'Subduction zone / Oceanic crust (< 15 km)': 'Subduction zone / Oceanic',
        'Subduction zone / Continental crust (>25 km)': 'Subduction zone / Continental',
        'Subduction zone / Intermediate crust (15-25 km)': 'Subduction zone / Continental',
        'Intraplate / Oceanic crust (< 15 km)': 'Intraplate / Oceanic',
        'Intraplate / Continental crust (>25 km)': 'Intraplate / Continental',
        'Intraplate / Intermediate crust (15-25 km)': 'Intraplate / Continental',
        'Rift zone / Oceanic crust (< 15 km)': 'Rift at plate boundaries / Oceanic',
        'Rift zone / Continental crust (>25 km)': 'Rift at plate boundaries / Continental',
        'Rift zone / Intermediate crust (15-25 km)': 'Rift at plate boundaries / Continental'
    }

    # Return mapped tectonic setting if found
    if tectonic_setting in tectonic_mapping:
        return tectonic_mapping[tectonic_setting]

    # Handle subduction zone with unknown crustal thickness
    if tectonic_setting == 'Subduction zone / Crustal thickness unknown':
        subregion = df_volcano[df_volcano['Volcano Name'] == thisvolcano]['Subregion'].values
        if len(subregion) == 0:
            subregion = df_volcano_no_eruption[df_volcano_no_eruption['Volcano Name'] == thisvolcano]['Subregion'].values[0]
        else:
            subregion = subregion[0]
        
        # Map subregion to tectonic setting
        oceanic_subregions = ['Bougainville and Solomon Islands', 'Izu, Volcano, and Mariana Islands', 'New Ireland', 'Santa Cruz Islands']
        continental_subregions = ['Pacific Ocean (southwestern)', 'North of Luzon', 'Lesser Sunda Islands', 'Fiji Islands']
        
        if subregion in oceanic_subregions:
            return 'Subduction zone / Oceanic'
        elif subregion in continental_subregions:
            return 'Subduction zone / Continental'
        else:
            print('Warning: missed subregion')
            return 'Unknown'
    
    # Handle unknown or unclassified tectonic setting
    if tectonic_setting == 'Unknown':
        return 'Unknown'
    
    # Warning for any missed cases
    print('Warning: missed tectonic setting')
    return 'Unknown'



def load_georoc(thisvolcano, dict_georoc_sl, dict_georoc_ls, dict_volcano_file):
    """

    Args:
        thisvolcano: name of a volcano

    Returns: a data frame with the georoc data corresponding to the volcano given as input
             manual samples can be added at the end of the code

    """
    colsloc = ['LOCATION-1', 'LOCATION-2', 'LOCATION-3', 'LOCATION-4', 'LOCATION-5',
               'LOCATION-6', 'LOCATION-7', 'LOCATION-8', 'LOCATION-9']           
    
    # handles long names
    if thisvolcano in dict_georoc_sl.keys():
        thisvolcano = dict_georoc_sl[thisvolcano]

    # files containing this volcano
    all_pathcsv = dict_volcano_file[thisvolcano]

    dfloaded = pd.DataFrame()
    for pathcsv in all_pathcsv:
        # find the latest version of the file to use
        pathcsv = fix_pathname(pathcsv)
        
        dftmp = pd.read_csv(os.path.join(GEOROC_DATASET_DIR, pathcsv), low_memory=False, encoding='latin1')

        # adds citations
        dftmp = load_refs(dftmp)

        if 'Inclusions_comp' in pathcsv:
            # updates columns to have the same format as dataframes from other files
            dftmp = fix_inclusion(dftmp)
            
        # add manual samples
        elif 'ManualDataset' in pathcsv:
            # in case some columns are missing
            for cl in ['LATITUDE MIN', 'LATITUDE MAX', 'LONGITUDE MIN', 'LONGITUDE MAX', 'SAMPLE NAME', 'CITATIONS']+CHEM_COLS + COLS_ROCK + ['LOI(WT%)']:
                if not(cl in list(dftmp)):
                    dftmp[cl] = np.nan
            # makes sure captial letters are used
            dftmp['TECTONIC SETTING'] = dftmp['TECTONIC SETTING'].str.upper()
            dftmp['LOCATION'] = dftmp['LOCATION'].str.upper()

        else:
            
            # keep only volcanic rocks
            dftmp = dftmp[dftmp['ROCK TYPE'] == 'VOL']
            dftmp = dftmp[['LOCATION']+['LATITUDE MIN', 'LATITUDE MAX', 'LONGITUDE MIN', 'LONGITUDE MAX', 'SAMPLE NAME', 'CITATIONS'] + CHEM_COLS + COLS_ROCK + ['LOI(WT%)']]
          
        dfloaded = pd.concat([dfloaded, dftmp])

    # most volcanoes are located after the 3rd backslash,
    # but sometimes we need the location after the 2nd
    # in fact, in inclusion, they can be anywhere
    splt = dfloaded['LOCATION'].str.split('/', expand=True)
    dfloaded[colsloc[0:len(splt.columns)]] = splt

    # keeps only data for this volcano
    if ',' in thisvolcano:
        # issues with , as a delimiter
        if thisvolcano == 'SANTIAGO (JAMES, SAN SALVADOR)':
            all_names = [' SANTIAGO (JAMES, SAN SALVADOR)', ' SANTIAGO (JAMES, SAN SALVADOR) ']
        else:
            # the data is dirty, sometimes there are spaces, sometimes not
            all_names = [ns.strip().upper() for ns in thisvolcano.split(',')]
            all_names += [' ' + nm for nm in all_names]
            all_names += [nm + ' ' for nm in all_names]
            all_names += [' ' + nm + ' ' for nm in all_names]
    else:
        # the data is dirty, sometimes there are spaces, sometimes not
        all_names = [' ' + thisvolcano.upper(), thisvolcano.upper(),
                     thisvolcano.upper() + ' ', ' ' + thisvolcano.upper() + ' ']

    # special clause for volcanoes which need a second column for disambiguation
    if thisvolcano in ['SUMBING - SUMATRA', 'SUMBING - JAVA']:
        region = thisvolcano.split('-')[1] + ' '
        dfloaded = dfloaded[(dfloaded['LOCATION-4'] == ' SUMBING') & (dfloaded['LOCATION-3'] == region)]
    else:
        # looks for matches in all columns
        dftmp = pd.DataFrame()
        # sometimes, it is needed to look at LOCATION COLUMNS
        dfloaded['LOCATION FROM COMMENT'] = dfloaded['LOCATION COMMENT'].str.split(',').str[0]
        allcolsloc = colsloc[0:len(splt.columns)] + ['LOCATION FROM COMMENT']
        
        for cls in allcolsloc:
            dftmp = pd.concat([dftmp, dfloaded[dfloaded[cls].isin(all_names)]], ignore_index=True)
            
        
        # in case same match is found through several columns
        dfloaded = dftmp.drop_duplicates().copy()

    # no matter in which column the match was found, the correct name is always put in LOCATION-4
    if thisvolcano in dict_georoc_sl.values():
        dfloaded.loc[:, 'LOCATION-4'] = ' ' + dict_georoc_ls[thisvolcano]
    else:
        dfloaded.loc[:, 'LOCATION-4'] = ' ' + thisvolcano

    # adds dates from LOCATION COMMENT
    # finds the dates
    dfloaded['GUESSED DATE'] = dfloaded['LOCATION COMMENT'].astype(str).fillna('').apply(extract_date)
    # replace NaN in ERUPTION YEAR 
    dfloaded['ERUPTION YEAR'] = dfloaded['ERUPTION YEAR'].fillna(dfloaded['GUESSED DATE'])
    
    # add normalization 
    dfloaded = normalize_oxides_with_feot(dfloaded)
    
    # adds names to rocks using TAS 
    dfloaded = guess_rock(dfloaded)

    dfloaded = dfloaded.rename(columns={'CITATIONS': 'refs'})
    
    for i in range(1, 11):
        dfloaded['refs'] = dfloaded['refs'].apply(lambda x: x[:i*80]+'<br>'+x[i*80:] if len(x)>i*80 else x)
    dfloaded['refs'] = dfloaded['refs'].apply(lambda x: x if len(x)<800 else x[:800]+'(...)')


    return dfloaded


def load_refs(dftmp):

    if 'CITATIONS' in list(dftmp):
        dftmp['CITATIONS'] = dftmp['CITATIONS'].fillna(' ')
        # finds where the references start in the excel file
        idx = list(dftmp[dftmp['CITATIONS']=='References:'].index)[0]
        # extracts references 
        refs = list(dftmp.iloc[idx+1:]['CITATIONS'].values)
        # creates dictionary of refs
        dictrefs = {}
        for key, value in zip([r.split(' ')[0] for r in refs], [r.split(' ', 1)[1] for r in refs]):
            dictrefs[key] = value
        # now we need to account for possibly multiple citations
        # \ to escape special characters, underneath regexp
        splt = dftmp['CITATIONS'].str.split('\]\[', expand=True).fillna("").astype(str)
        # removes white spaces and adds missing bracket
        splt = splt.applymap(lambda x: x.strip()+']' if not(']' in x) and len(x)>0 else x)
        splt = splt.applymap(lambda x: '['+x.strip() if not('[' in x) and len(x)>0 else x)
        # replaces with authors and papers
        splt = splt.replace(dictrefs)
        # extracts authors and years
        spltname = splt.applymap(lambda x: x.split(':', 1)[0])
        spltyear = splt.applymap(lambda x: ' [' + x.split('[', 1)[1].split(']')[0] + ']' if '[' in x else x)

        # recomposes the refs
        refcol = splt[list(splt)[0]]
        # recomposes only authors and years
        nycol = spltname[list(spltname)[0]] + spltyear[list(spltyear)[0]]
        for c in list(splt)[1:]:
            cc = np.where(splt[c] == '', '', '+')
            refcol += cc + splt[c]
        for n, y in zip(list(spltname)[1:], list(spltyear)[1:]):
            cc = np.where(spltname[c] == '', '', '+')
            nycol += cc + spltname[n] + spltyear[y]

        dftmp['CITATIONS'] = nycol + '===' + refcol            
    else:
        # inclusions
        dftmp['CITATION'] = dftmp['CITATION'].str.split(']').str[1]    
    return dftmp


def fix_pathname(thisarc):
    """
    Adjusts the file path to include the correct suffix, accounting for any updates to the naming conventions.

    Args:
        thisarc (str): File name without any suffix.

    Returns:
        str: File name with the correct suffix (which contains the date of the latest download).
    """
    if 'ManualDataset' not in thisarc:
        
        # Extract folder and filename from the given path
        folder, filename = thisarc.split('/')

        # Use the centralized GEOROC_DATASET_DIR path
        folder_path = os.path.join(GEOROC_DATASET_DIR, folder)
        
        # List files in the specified folder
        available_files = os.listdir(folder_path)

        # now because of the new name, needs to find the file with the right suffix
        # in fact it is worse, since they changed the concatenation of words
        # so first replace hyphen and underscores with spaces, then split with respect to spaces
        search_terms = filename.replace('-', ' ').replace('_', ' ').split(' ')

        # next find filenames that contain all the words
        # there could be several, it is assumed that the year comes first then the month
        # this should put the most recent file first
        matched_files = sorted([x for x in available_files if all(y in x for y in search_terms)])[::-1]
        
        # if there is no year, it will come first and it shouldn't
        if len(matched_files) > 1 and not matched_files[0][0].isdigit():

            # put the file name with no date at the end
            matched_files.append(matched_files.pop(0))
       
        thisarc = os.path.join(folder, matched_files[0])

    return thisarc
    

def fix_inclusion(thisdf):
    """

    Args:
        thisdf: GEOROC dataframe loaded from the Inclusion file

    Returns: the same dataframe with updated columns to match the format of dataframes from other files

    """    
    # missing columns for inclusions
    thisdf['ERUPTION YEAR'] = np.nan
    thisdf['ERUPTION MONTH'] = np.nan
    thisdf['ERUPTION DAY'] = np.nan
    thisdf['UNIQUE_ID'] = np.nan
    thisdf['MATERIAL'] = ['INC']*len(thisdf.index)
    thisdf['TECTONIC SETTING'] = np.nan
    
    # different names
    thisdf = thisdf.rename({'LATITUDE (MIN.)': 'LATITUDE MIN'}, axis='columns')
    thisdf = thisdf.rename({'LATITUDE (MAX.)': 'LATITUDE MAX'}, axis='columns')
    thisdf = thisdf.rename({'LONGITUDE (MIN.)': 'LONGITUDE MIN'}, axis='columns')
    thisdf = thisdf.rename({'LONGITUDE (MAX.)': 'LONGITUDE MAX'}, axis='columns')
    thisdf = thisdf.rename({'CITATION': 'CITATIONS'}, axis='columns')
            
    # missing chemical columns
    # for cl in ['H2OT(WT%)', 'CL2(WT%)', 'CO1(WT%)', 'CH4(WT%)', 'SO4(WT%)', 'P2O5(WT%)']:
    #    thisdf[cl] = np.nan
        
    # missing isotopes
    for cl in ISOTOPES:
        thisdf[cl] = np.nan    

    # choice of columns
    thisdf = thisdf[['LOCATION']+['LATITUDE MIN', 'LATITUDE MAX', 'LONGITUDE MIN', 'LONGITUDE MAX', 'SAMPLE NAME', 'CITATIONS'] + CHEM_COLS + COLS_ROCK + ['LOI(WT%)']+ISOTOPES]
            
    # some chemicals have two numbers instead of one, keeping the first one of the pair
    for ch in CHEM_COLS:
        nofloat = [x for x in list(thisdf[ch].unique()) if (type(x) == str and '\\' in x)]
        newvalues = {}
        for x in nofloat:
            # choose the first value of the pair
            newvalues[x] = x.split('\\')[0].strip() 
    
        # replaces the pairs by their first value
        # thisdf[ch].replace(to_replace=newvalues, inplace=True)
        thisdf[ch] = thisdf[ch].replace(newvalues)
    
    return thisdf
    

def normalize_oxides_with_feot(thisdf):
    """
    Normalizes oxide measurements in the given GEOROC dataframe for a single volcano, 
    handling Fe2O3 and FeO conversion to FEOT, and performing normalization across all oxides.

    Args:
        thisdf (pd.DataFrame): GEOROC dataframe for one volcano.
        
    Returns:
        pd.DataFrame: Dataframe with normalized oxide values.
                      If 'FEOT(WT%)' is present, 'FE2O3(WT%)' and 'FEO(WT%)' are discarded.
                      Otherwise, 'FEOT(WT%)' is calculated from 'FE2O3(WT%)' and 'FEO(WT%)'.
    """
    
    # Handle cases where oxide values are given as pairs of measurements, e.g., 'x\\y'
    for col in OXIDES:
        # Identify non-float entries containing '\\', which indicates two measurements
        nofloat = [x for x in list(thisdf[col].unique()) if isinstance(x, str) and '\\' in x]
        newvalues = {x: x.split('\\')[0].strip() for x in nofloat}  # Take the first value of the pair
        
        # Replace pairs with their first value
        thisdf[col] = thisdf[col].replace(newvalues)
    
    # Replace missing values in oxides with 0 and convert to float
    thisdf[OXIDES] = thisdf[OXIDES].fillna(0).astype(float)
    
    # List of oxides without Fe-specific columns (to be normalized)
    oxides_nofe = ['SIO2(WT%)', 'TIO2(WT%)', 'AL2O3(WT%)', 'FE2O3(WT%)', 'FEO(WT%)', 'FEOT(WT%)', 
                   'CAO(WT%)', 'MGO(WT%)', 'MNO(WT%)', 'K2O(WT%)', 'NA2O(WT%)', 'P2O5(WT%)']
    
    # Compute 'FEOT(WT%)' if missing, using the formula FEOT = FE2O3 / 1.111 + FEO
    thisdf.loc[:, 'FEOT(WT%)'] = np.where(thisdf['FEOT(WT%)'] == 0, 
                                           (thisdf['FE2O3(WT%)'] / 1.111) + thisdf['FEO(WT%)'], 
                                           thisdf['FEOT(WT%)'])
    
    # Calculate the sum of oxides excluding 'FE2O3(WT%)' and 'FEO(WT%)' and subtract 'LOI(WT%)'
    num = thisdf[oxides_nofe].sum(axis=1) - thisdf['LOI(WT%)']
    
    # Normalize each oxide by the total sum of oxides (excluding LOI)
    for col in oxides_nofe:
        thisdf.loc[:, col] = thisdf[col] * (100 / num)
    
    return thisdf


def guess_rock(thisdf):
    """
    Args:
        thisdf: GEOROC dataframe for one volcano

    Returns: 
        A new column with a rock name based on the TAS diagram, classified using SiO2 and total alkali (Na2O + K2O) content.
    """

    # Initialize a 'ROCK' column with default value 'UNNAMED' for all rows
    thisdf['ROCK'] = 'UNNAMED'

    # Extract SiO2 and total alkali (Na2O + K2O) as float values
    thisdf['SIO2(WT%)'] = pd.to_numeric(thisdf['SIO2(WT%)'], errors='coerce')
    thisdf['NA2O(WT%)'] = pd.to_numeric(thisdf['NA2O(WT%)'], errors='coerce')
    thisdf['K2O(WT%)'] = pd.to_numeric(thisdf['K2O(WT%)'], errors='coerce')

    x = thisdf['SIO2(WT%)'].astype(float)
    y = thisdf['NA2O(WT%)'].astype(float) + thisdf['K2O(WT%)'].astype(float)

    # Check for valid rows where SiO2 and alkalis are greater than 0
    valid_data = (x > 0) & (thisdf['NA2O(WT%)'] > 0) & (thisdf['K2O(WT%)'] > 0)

    # Define helper function to calculate the slope and intercept of a line between two points
    def get_line_params(x, x1, y1, x2, y2):
        slope, intercept = np.polyfit([x1, x2], [y1, y2], 1)
        return slope * x + intercept

    # Define line boundaries for TAS diagram
    lower_bound_trachy = get_line_params(x, 52, 5, 57, 5.9)
    cond_lower_bound_trachy = y <= lower_bound_trachy

    upper_bound_trachy = get_line_params(x, 45, 5, 49.4, 7.3)
    cond_upper_bound_trachy = y > upper_bound_trachy

    upper_bound_tephrite_phono_tephrite_tephrite_phonolite = get_line_params(x, 41, 7, 52.5, 14)  
    cond_upper_bound_tephrite_phono_tephrite_tephrite_phonolite = y <= upper_bound_tephrite_phono_tephrite_tephrite_phonolite

    upper_bound_trachybasalt = get_line_params(x, 49.4, 7.3, 52, 5)
    cond_upper_bound_trachybasalt = y > upper_bound_trachybasalt

    lower_bound_trachyandesite = get_line_params(x, 53, 9.3, 57, 5.9)
    cond_lower_bound_trachyandesite = y > lower_bound_trachyandesite

    lower_bound_trachydacite = get_line_params(x, 57.6, 11.7, 63, 7)
    cond_lower_bound_trachydacite = y > lower_bound_trachydacite

    upper_bound_trachydacite = get_line_params(x, 65, 15.7, 69, 13)
    cond_upper_bound_trachydacite = y < upper_bound_trachydacite

    upper_bound_tephrite = get_line_params(x, 49.4, 7.3, 45, 9.4)
    cond_upper_bound_tephrite = y > upper_bound_tephrite

    lower_bound_tephriphonolite = get_line_params(x, 53, 9.3, 48.4, 11.5)
    cond_lower_bound_tephriphonolite = y > lower_bound_tephriphonolite

    lower_bound_phonolyte = get_line_params(x, 57.6, 11.7, 50, 15.13)
    cond_lower_bound_phonolyte = y > lower_bound_phonolyte

    upper_bound_phonolyte = get_line_params(x, 50, 15.13, 65, 15.7)
    cond_upper_bound_phonolyte = y < upper_bound_phonolyte

    lower_bound_rhyolite = get_line_params(x, 77, 1, 69, 8)
    cond_lower_bound_rhyolite = y > lower_bound_rhyolite

    lower_bound_basanite = get_line_params(x, 41, 7, 45, 5)
    cond_lower_bound_basanite = y > lower_bound_basanite
    
    # Define conditions for each rock type based on SiO2 (x) and alkali (y) values
    
    # Foidite classification
    thisdf.loc[valid_data, 'ROCK'] = 'FOIDITE'

    # Basalt classification
    thisdf.loc[
        valid_data & 
        (x >= 45) & 
        (x < 52) & 
        (y < 5), 'ROCK'] = 'BASALT'

    # Basaltic andesite classification
    thisdf.loc[
        valid_data & 
        (x >= 52) & 
        (x < 57) & 
        cond_lower_bound_trachy, 'ROCK'] = 'BASALTIC ANDESITE'

    # Andesite classification
    thisdf.loc[
        valid_data & 
        (x >= 57) & 
        (x < 63) & 
        cond_lower_bound_trachy, 'ROCK'] = 'ANDESITE'

    # Dacite classification
    thisdf.loc[
        valid_data & 
        (x >= 63) & 
        (x < 77) & 
        (~cond_lower_bound_rhyolite) & 
        cond_lower_bound_trachy, 'ROCK'] = 'DACITE'

    # Trachy-basalt classification
    thisdf.loc[
        valid_data & 
        (y >= 5) & 
        (~cond_upper_bound_trachy) &
        (~cond_upper_bound_trachybasalt), 'ROCK'] = 'TRACHYBASALT'

    # Basaltic trachy-andesite classification
    thisdf.loc[
        valid_data & 
        (~cond_lower_bound_trachy) & 
        (~cond_upper_bound_trachy) & 
        (cond_upper_bound_trachybasalt) &
        (~cond_lower_bound_trachyandesite), 'ROCK'] = 'BASALTIC TRACHYANDESITE'

    # Trachy-andesite classification
    thisdf.loc[
        valid_data & 
        (~cond_lower_bound_trachy) &
        (~cond_upper_bound_trachy) &
        (cond_lower_bound_trachyandesite) &
        (~cond_lower_bound_trachydacite), 'ROCK'] = 'TRACHYANDESITE'
    
    # Trachy-dacite classification
    thisdf.loc[
        valid_data & 
        (x < 69) &
        (~cond_lower_bound_trachy) &
        (~cond_upper_bound_trachy) &
        (cond_upper_bound_trachydacite) &
        (cond_lower_bound_trachydacite), 'ROCK'] = 'TRACHYTE/TRACHYDACITE'

    # Rhyolite classification
    # a,b in ax+b
    thisdf.loc[
        valid_data &
        (x >= 69) &
        (x < 77) &
        (y < 13) &
        (cond_lower_bound_rhyolite), 'ROCK'] = 'RHYOLITE'

    # Phonolite classification
    thisdf.loc[
        (cond_upper_bound_trachy) &
        (cond_lower_bound_phonolyte) &
        (cond_upper_bound_phonolyte), 'ROCK'] = 'PHONOLITE'

    # Tephri-phonolite classification
    thisdf.loc[
        (cond_upper_bound_trachy) & 
        (~cond_lower_bound_phonolyte) & 
        (cond_lower_bound_tephriphonolite) & # cond_ef2
        (cond_upper_bound_tephrite_phono_tephrite_tephrite_phonolite), 'ROCK'] = 'TEPHRI-PHONOLITE'

    # Phono-tephrite classification
    thisdf.loc[
        (cond_upper_bound_trachy) &  
        (~cond_lower_bound_tephriphonolite) & # cond_fe2
        (cond_upper_bound_tephrite) & # cond_ef
        (cond_upper_bound_tephrite_phono_tephrite_tephrite_phonolite), 'ROCK'] = 'PHONO-TEPHRITE'

    # Tephrite classification
    # a,b in ax+b

    cond_t1 = (cond_lower_bound_basanite) & \
        (cond_upper_bound_trachy) & \
        (cond_upper_bound_tephrite_phono_tephrite_tephrite_phonolite) & \
        (~cond_upper_bound_tephrite) & \
        (x >= 41) & \
        (x < 49.4)
    
    cond_t2 = (~cond_lower_bound_basanite) & \
        (y >= 3) & \
        (x >= 41) & \
        (x < 45)
    
    thisdf.loc[valid_data & (cond_t1 | cond_t2), 'ROCK'] = 'TEPHRITE/BASANITE'

    # Picro-basalt classification
    thisdf.loc[
        valid_data & 
        (y < 3) & 
        (x >= 41) & 
        (x < 45), 'ROCK'] = 'PICROBASALT'

    return thisdf
    

def extract_date(entry):
    
    result = np.nan
    
    # checks if contains a digit
    if bool(re.search(r'\d', entry)):
        # looks for ERUPTION
        fnd1 = re.findall('ERUPTION ([0-9-.]{3,})', entry)+re.findall('([0-9-.]{3,}) ERUPTION', entry)
        # looks for B.C
        fnd2 = re.findall('[0-9]{1,} B.C', entry)
        # looks for long digits with dots
        fnd3 = re.findall('[0-9.]{5,}', entry)
        # looks for MONTHS
        fndmonth = re.findall('(JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)|AUG(?:UST)?|SEPT(?:EMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?) ([0-9,\s]*)' ,entry)
        # looks for AD
        fnd_ad = re.findall('([0-9-.\s]{3,} AD)', entry) + re.findall('([0-9-.\s]{3,} A. D.)', entry)
        # looks for BETWEEN
        fndbetw = re.findall('BETWEEN [0-9]* AND [0-9]*', entry)
        # looks for ERUPTION YEAR(s)
        fnd_ey = re.findall('ERUPTION YEAR [0-9]*', entry) + re.findall('ERUPTION YEARS [0-9]*', entry)
        # looks for dates separated by /
        fnddat = re.findall('\d*/\d*/\d*', entry)
        fnd = fnd1 + fnd2 + fnd3 + fndmonth + fnd_ad + fndbetw + fnd_ey + fnddat
        
        if len(fnd) > 0:
            testi = entry.replace('-', ' ').replace('.', ' ')
            # this loses the years written in less than 4 digits
            fnddat = [x for x in testi.split() if x.isdigit() and len(x) == 4]
            if len(fnddat) == 1:
                result = float(fnddat[0])
            if len(fnddat) == 2:
                # uses only the start year
                result = float(fnddat[0]) 
        
    return result                              


def plot_tas():
    """
    Plots a TAS (Total Alkali-Silica) diagram in the background of the given figure.

    Returns:
        fig: The updated figure with TAS diagram plotted.
    """

    fig = make_subplots(rows=2, cols=1, shared_xaxes=True, row_width=[0.85, 0.2], vertical_spacing=0.05)
    fig.update_layout(title='<b>Chemical Rock Composition from Georoc</b> <br>')  # Set TAS diagram title

    # Define the x and y coordinates for different TAS regions
    X = [
        [41, 41, 45, 45], 
        [45, 45, 52, 52], 
        [52, 52, 57, 57], 
        [57, 57, 63, 63], 
        [63, 63, 69, 77],
        [41, 41, 45, 49.4, 45, 45, 41], 
        [45, 49.4, 52, 45], 
        [45, 48.4, 53, 49.4, 45],
        [49.4, 53, 57, 52, 49.4], 
        [53, 48.4, 52.5, 57.6, 53], 
        [53, 57.6, 63, 57, 53],
        [69, 69, 77, 77, 69],
        [57.6, 65, 69, 69, 63, 57.6],
        [50, 65, 57.6, 50]
    ]
    
    Y = [
        [0, 3, 3, 0], 
        [0, 5, 5, 0], 
        [0, 5, 5.9, 0], 
        [0, 5.9, 7, 0], 
        [0, 7, 8, 0],
        [3, 7, 9.4, 7.3, 5, 3, 3], 
        [5, 7.3, 5, 5], 
        [9.4, 11.5, 9.3, 7.3, 9.4],
        [7.3, 9.3, 5.9, 5, 7.3], 
        [9.3, 11.5, 14, 11.7, 9.3], 
        [9.3, 11.7, 7, 5.9, 9.3],
        [8, 13, 13, 0, 8],
        [11.7, 15.7, 13, 8, 7, 11.7],
        [15.13, 15.7, 11.7, 15.13]
    ]
    
    # Names of the geological regions corresponding to the X and Y coordinates
    tasnames = [
        'picro-basalt', 
        'basalt', 
        'basaltic andesite', 
        'andesite',
        'dacite',
        'tephrite',
        'trachybasalt',
        'phono-tephrite',
        'basaltic trachyandesite',
        'tephri-phonolite',
        'trachyandesite',
        'rhyolite',
        'trachyte,<br>trachydacite',
        'phonolyte'
    ]

    # Add filled traces for each region in the TAS diagram
    for x, y in zip(X, Y):
        fig.add_traces(
            go.Scatter(
                x=x,
                y=y,
                mode='lines',
                line_color='grey',
                fill='toself',
                fillcolor='lightblue',
                opacity=0.2,
                name=tasnames[X.index(x)],
                showlegend=False
            ),
            rows=2, cols=1  # Position in the figure
        )

    fig = add_alkaline_line(fig)

    return fig
    

def add_alkaline_series(thisfig):
    '''
        Alkaline series
        diagram: SiO2 vs K2O
        reference: Peccerillo and Taylor (1976)
        Between calc-alkaline and tholeiite series (lower line): (48, 0.3) (52, 0.5) (56, 0.7) (63, 1.0) (70, 1.3) (78, 1.6)
        Between high-K calc-alkaline and calc-alkaline series (middle line): (48, 1.2) (52, 1.5) (56, 1.8) (63, 2.4) (70, 3.0)
        Between shoshonite and high-K calc-alkaline series (upper line): (48, 1.6) (52, 2.4) (56, 3.2) (63, 4.0)
    '''

    thisfig.add_trace(
        go.Scatter(
            x = [48, 52, 56, 63, 70, 78],
            y = [0.3, 0.5, 0.7, 1.0, 1.3, 1.6],
            mode='lines',
            name='calc-alkaline and tholeiite',
            showlegend=False
        ),
        row=4, col=1,
    )
    
    thisfig.add_trace(
        go.Scatter(
            x = [48, 52, 56, 63, 70],
            y = [1.2, 1.5, 1.8, 2.4, 3.0],
            mode='lines',
            name='high-K calc-alkaline and calc-alkaline',
            showlegend=False
        ),
        row=4, col=1,
    )
    
    thisfig.add_trace(  
        go.Scatter(
            x = [48, 52, 56, 63],
            y = [1.6, 2.4, 3.2, 4.0],
            mode='lines',
            name='shoshonite and high-K calc-alkaline',
            showlegend=False
        ),
        row=4, col=1,
    )
    
    return thisfig    
    
    
def add_alkaline_line(thisfig):
    '''
        Alkalic & sub-alkalic division
        diagram: SIO2 vs NA2O + K2O
        reference: Irvine and Baragar ( 1971, fig. 3B, p.532)
        Coordinates: (39.2,0) (40, 0.4) (43.2, 2) (45, 2.8) (48, 4) (50, 4.75) (53.7,6) (55, 6.4) (60, 8) (65, 8.8) (77.4, 10)    
    
    '''

    thisfig.add_traces(
        go.Scatter(
            x = [39.2, 40, 43.2, 45, 48, 50, 53.7, 55, 60, 65, 74.4],
            y = [0, 0.4, 2, 2.8, 4, 4.75, 6, 6.4, 8, 8.8, 10],
            mode='lines',
            name='Alkalic & sub-alkalic division',
            showlegend=False,
        ),
        rows=2, cols=1,
    )    
    
    return thisfig    


def detects_chems(thisdf, chem1, chem2, theselbls):
    """

    Args:
        thisdf: a dataframe of chemicals
        chem1: list (synthax) for usual chemicals
               first is SIO2, second is NA20, 3rd id K20
        chem2: list (synthax) for more chemical

    Returns: an updated dataframe containing the data for a TAS plot
             also, abnormal other chemicals are computed

    """
    # replaces nan with 0
    thisdf = thisdf.fillna(0)
    # removes if 80 >= SIO2 is > 0
    thisdf = thisdf[(thisdf['SIO2(WT%)'] <= 80) &  (thisdf['SIO2(WT%)'] > 0)  & (thisdf['FEOT(WT%)'] > 0)]
    
    thisdf[chem1[1]+'+'+chem1[2]] = thisdf[chem1[1]].astype('float') + thisdf[chem1[2]].astype('float')

    for mc in chem2:
        st_mc = thisdf[mc].astype('float').std()
        mn_mc = thisdf[mc].astype('float').mean()
        if not (np.isnan(st_mc)):
            mstd = mn_mc + st_mc
        else:
            mstd = mn_mc
        thisdf['excess' + mc] = 0
        thisdf.loc[thisdf[mc].astype('float') > mstd, 'excess' + mc] = 2 ** (chem2.index(mc))

    thisdf['color'] = [theselbls[x] for x in list(thisdf.loc[:, ['excess' + mc for mc in chem2]].sum(axis=1).values)]
    
    return thisdf

def process_material(material):

    result = 'UNKNOWN'

    if isinstance(material, str):
        # Split the string by '/' to handle cases with multiple materials
        parts = material.split('/')

        if any('WR' in part for part in parts):
            result = 'WR'
        elif any(keyword in material for keyword in ['GL', 'INC', 'MIN']):
            result = material.split(' ')[0]
        else:
            # If it's a string but doesn't contain the keywords, keep the original value
            result = material

    return result

def plot_chem(thisfig, thisdf, chem1, theselbls):
    """

    Args:
        thisfig: figure to be updated
        thisdf: dataframe from Georoc
        chem1: list (synthax) for usual chemicals
               first is SIO2, second is NA20, 3rd id K20

    Returns: Plots a scatter plot of the chemical composition

    """

    # if dataframe contains VEI info, this plots different symbols depending on VEI  
    if 'VEI' in list(thisdf):
        thisdf['symbol'] = np.where(thisdf['VEI'].isnull(), 'circle', 
                                    (np.where(thisdf['VEI'].astype('float') <= 2, 'circle', 'triangle-up')))
        
        full_symbol = {'circle': 'VEI<=2', 'triangle-up': 'VEI>=3'}
        short_symbol = ['circle', 'triangle-up'] 
    else:
        # sometimes two materials are present, this is to retrieve the first one
        thisdf['MATERIAL_PROCESSED'] = thisdf['MATERIAL'].apply(process_material)

        # adjusts symbol based on material
        thisdf['symbol'] = thisdf['MATERIAL_PROCESSED'].replace(to_replace={'WR': 'circle', 'GL': 'diamond', 'INC': 'square', 'MIN': 'x', 'UNKNOWN': 'diamond-wide', 'WHOLE ROCK': 'circle', 'GLASS': 'diamond', 'INCLUSION': 'square'})

        full_symbol = {'circle': 'whole rock', 'diamond': 'volcanic glass', 'square': 'inclusion', 'x': 'mineral', 'diamond-wide': 'UNKNKOWN'}
        short_symbol = ['circle', 'diamond', 'square', 'x', 'diamond-wide'] 

    for symbol in short_symbol:
        thismat = thisdf[thisdf['symbol'] == symbol]
        # custom data
        if 'VEI' in list(thisdf):
            thiscustomdata = thismat[chem1[1]].astype(str)+' '+chem1[1]+' '+thismat['MATERIAL_PROCESSED']+' VEI='+thismat['VEI']  
        else:
            thiscustomdata = thismat[chem1[1]].astype(str)+' '+chem1[1]+', '+thismat['ROCK']

        # plots
        thisfig.add_traces(
            go.Scatter(
                x=thismat[chem1[0]],
                y=thismat[chem1[1]+'+'+chem1[2]],
                customdata=thiscustomdata,
                hovertemplate='x=%{x}<br>y=%{y}<br>%{customdata}',
                mode='markers',
                marker_symbol=thismat['symbol'],
                marker_color='cornflowerblue',
                name=full_symbol[symbol],
                showlegend=True,
            ),
            rows=2, cols=1,
        )

        # plots histogram on top
        thisfig.add_traces(
            go.Histogram(
                x=thismat[chem1[0]],
                name=full_symbol[symbol]+' hist',
                marker_color='cornflowerblue',
                histnorm='percent',
            ),
            rows=1, cols=1,
        )
        

    # edits title of legends              
    thisfig['layout']['legend']['title']['text'] = ''              
        
    # styles the markers
    thisfig.update_traces(marker=dict(size=12,
                                     line=dict(width=2,
                                                color='DarkSlateGrey')),
                          selector=dict(mode='markers'))
                         
    if theselbls == LBLS2:
        title = 'Chemical Rock Composition from PetDB'
    else:
        title = 'Chemical Rock Composition from Georoc'

    thisfig.update_xaxes(title_text='SiO<sub>2</sub>(wt%)', row=2, col=1, range=[30, 80])
    thisfig.update_yaxes(title_text='Na<sub>2</sub>O+K<sub>2</sub>O(wt%)', row=2, col=1, range=[0, 20])
    thisfig.update_layout(
        title='<b>'+title+'</b>',
        height=700
    )    
    
    return thisfig
    
        
def match_GVPdates(volcano_name, date, gvpvname, dict_georoc_sl, dict_georoc_ls, dict_volcano_file, df_eruption):
    """

    Args:
        volcano_name: GEOROC name
        date: GEOROC date, it can also take the value "forall", in which case it maps all GEOROC dates to GVP dates
        gvpvname: GVP volcano name
    Returns: matching GVP dates, it is a pair for a single GEOROC date, and a list of pairs for all GEOROC dates

    """
    
    date_gvp = []   
    
    # retrieves dates from georoc
    dfgeoroc = load_georoc(volcano_name, dict_georoc_sl, dict_georoc_ls, dict_volcano_file)
    dvv = dfgeoroc[dfgeoroc['LOCATION-4'] == ' ' + volcano_name]
    dmy = dvv[['ERUPTION DAY', 'ERUPTION MONTH', 'ERUPTION YEAR']]
    dmy = dmy.dropna(how='all')
    if len(dmy.index) > 0:
        # dates from GVP
        gvpdate = df_eruption[df_eruption['Volcano Name'] == gvpvname].drop(['Start Year', 'End Year'], axis=1)
        gvpdate['Start Year'] = pd.to_numeric(df_eruption['Start Year'])
        gvpdate['End Year'] = pd.to_numeric(df_eruption['End Year'])
        # if NaN for 'End Year', uses 'Start Year'
        gvpdate['End Year'] = gvpdate.apply(
            lambda row: row['Start Year'] if pd.isnull(row['End Year']) else row['End Year'], axis=1)

        if date != 'forall':
            # retrieves the georoc date when only one date is of interest
            if '-' in date:
                s = date.split('-')
                gy = int(s[0])
            else:
                gy = int(date)
            gy_list = [gy]
        else:
            # this is to retrieve all dates
            gy_list = dmy['ERUPTION YEAR'].unique()
            
        all_dates_gvp = []
         
        for gy in gy_list:
            # matches the dates from both databases
            gy = int(gy)
            fnd = gvpdate[(gvpdate['Start Year'].astype(int) <= gy) & (gvpdate['End Year'] == gy)]
            if len(fnd.index) > 0:
                # gvp
                if date != 'forall':
                    date_gvp = [str(int(fnd['Start Year'].iloc[0])), str(int(fnd['End Year'].iloc[0]))]
                else:
                    date_gvp = fnd[['Start Year', 'End Year']].astype(int).astype(str).values
            else:
                fndbefore = gvpdate[(gvpdate['Start Year'] <= gy) & (gvpdate['End Year'] != gy)]
                if len(fndbefore.index) > 0:
                    # gvp (this if condition is in case not confirmed eruptions are considered)
                    # in the new excel, only confirmed eruptions are here
                    if fndbefore.iloc[0]['Eruption Category'] == 'Confirmed Eruption':
                        rwidx = 0
                    elif fndbefore.iloc[1]['Eruption Category'] == 'Confirmed Eruption':
                        rwidx = 1
                    else:
                        rwidx = 2
                    if date != 'forall':    
                        date_gvp = [str(int(fndbefore.iloc[rwidx]['Start Year'])),
                                    str(int(fndbefore.iloc[rwidx]['End Year']))]
                    else:
                        date_gvp = [[str(int(fndbefore.iloc[rwidx]['Start Year'])),
                                    str(int(fndbefore.iloc[rwidx]['End Year']))]] 
                else:
                    date_gvp = ['not found']  
                                        
            for dg in date_gvp:
                if not isinstance(dg, str): 
                    all_dates_gvp.append([gy, dg])
                         
        if date == 'forall':
            date_gvp = all_dates_gvp
                            
    return date_gvp


def filter_date(thisdate, dff):
    """

    Args:
        thisdate: the eruption dates, possibly all
        dff: GEOROC dataframe

    Returns: dataframe for this date

    """
    if not ((thisdate == 'all') or (thisdate == 'start')):
        # recovers and filters by dates
        if '-' in thisdate:
            s = thisdate.split('-')
            mask = (dff['ERUPTION YEAR'] == float(s[0])) & (dff['ERUPTION MONTH'] == float(s[1]))
            if len(s) == 3:
                mask = mask & (dff['ERUPTION DAY'] == float(s[2]))

        else:
            mask = dff['ERUPTION YEAR'] == float(thisdate)

        dff = dff[mask].dropna(
                subset=['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], how='all')
                
    return dff
    

def update_chemchart(thisvolcano_name, thisdate, grnames, dict_georoc_sl, dict_georoc_ls, dict_volcano_file):
    """

    Args:
        thisvolcano_name: name of a volcano
        thisfig: the figure being updated
        thisdate: the eruption dates, possibly all

    Returns: Updates both the chemical plot based on user's inputs, 
             Also the dataframe used to draw the plot

    """
    colsGvp = ['Volcano Name', 'Start Year', 'End Year', 'VEI']
    
    # not sure why I need to load again but anyway
    if thisvolcano_name != "start" and thisvolcano_name is not None:
        dfgeoroc = load_georoc(thisvolcano_name, dict_georoc_sl, dict_georoc_ls, dict_volcano_file)
    
    # checks if data is present
    if thisvolcano_name is not None and thisvolcano_name.upper() in grnames:
        # extracts by name
        # removes the nan rows for the 3 chemicals of interest
        dff = dfgeoroc.dropna(
            subset=['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], how='all')
          
        # update dff to detect abnormal chemicals
        dff = detects_chems(dff, ['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], MORE_CHEMS, LBLS)   
        
        # filter dff by dates
        dff = filter_date(thisdate, dff)       
            
    else:
        # empty dataframe with right columns
        d = {'SIO2(WT%)': [], 'NA2O(WT%)': [], 'TIO2(WT%)': [], 'AL2O3(WT%)': [], 'MGO(WT%)': [], 'FEOT(WT%)': [],
             'K2O(WT%)': [], 'NA2O(WT%)+K2O(WT%)': [], 'color': [], 'P2O5(WT%)': [],
             'FEO(WT%)': [], 'CAO(WT%)': [], 'MGO(WT%)': [], 'ERUPTION YEAR': [], 'color': [], 'MATERIAL': [], 'ROCK': []}
        dff = pd.DataFrame(data=d)

    # adds the TAS layout
    thisfig = plot_tas()
    # draws the scatter plot
    thisfig = plot_chem(thisfig, dff, ['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], LBLS)
    
    # take the first 4 and removes UNNAMED, if present
    majorrocks = [x for x in list(dff['ROCK'].value_counts().index[0:5]) if x != 'UNNAMED']
    
    # string
    strc = ''
    for mr in majorrocks:
        strc += mr + ', '
    strc = strc[:-2]
        
    thisfig.update_layout(
        annotations=[dict(xref='paper',
                          yref='paper',
                          x=0.5, y=-0.25,
                          showarrow=False,
                          text=strc)],
                )

    return thisfig, dff
    

def update_onedropdown(thisvolcano_name, grnames, dict_georoc_sl, dict_georoc_ls, dict_volcano_file):
    """

    Args:
        thisvolcano_name: name of a chosen volcano

    Returns: Updates eruption dates choice based on volcano name

    """

    # checks if data is present
    if thisvolcano_name is not None and thisvolcano_name != "start" and thisvolcano_name.upper() in grnames:
        # extracts by name
        # loads Georoc data based on volcano_name
        dfgeoroc = load_georoc(thisvolcano_name, dict_georoc_sl, dict_georoc_ls, dict_volcano_file)

        # removes the nan rows for the 3 chemicals of interest
        dff = dfgeoroc.dropna(
            subset=['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], how='all')[CHEM_COLS[1:4]]
        # removes the rows if no date is available, and then removes the duplicate dates
        dff = dff.dropna(subset=['ERUPTION DAY', 'ERUPTION MONTH', 'ERUPTION YEAR'],
                         how='all').astype('float').drop_duplicates().values

        # extracts the dates for display
        dates = []
        for d in [list(x) for x in dff]:
            dd = []
            for i in range(3):
                if np.isnan(d[i]) == False and i <= 2:
                    dd.append(d[i])
                else:
                    if i <= 2:     
                        dd.append(0)
            dates.append(dd[::-1])
        # each date is a list
        dates.sort(key=lambda x: (-x[0], -x[1], -x[2])) 
        
        dates_str = []
        for ymd in dates:
            dd = ''
            for d in ymd:
                if d > 0:
                    dd += str(int(d)) + '-'
            dates_str.append(dd[:-1])
        
        opts = [{'label': i, 'value': i} for i in ['all'] + [x for x in dates_str]]
    else:
        opts = [{'label': i, 'value': i} for i in ['all']]
    return opts


def georoc_majorrocks(rock_tect_setting, df_volcano, dict_georoc_sl, dict_georoc_ls, dict_volcano_file, dict_gvp_georoc): 
    """
    Generates a dataframe containing volcano names and their corresponding GEOROC major rocks (1, 2, and 3)
    for specified tectonic settings.

    Args:
        rock_tect_setting (list): List of tectonic settings from Georoc and PetDB.

    Returns:
        pd.DataFrame: DataFrame with volcano names and their GEOROC major rocks.
    """
    
    # Determine the tectonic settings to use for GEOROC
    if len(rock_tect_setting) == 0:
        # format tectonic setting names
        tect_georoc = [x.strip().replace(' ', '_').replace('/',',') for x in NEW_TECTONIC_SETTINGS]
    else: 
        # new tectonic settings
        tect_georoc = [x.strip().replace(' ', '_').replace('/',',') for x in rock_tect_setting]
        
    alldf = pd.DataFrame()
        
    # Iterate over each tectonic setting
    for ts in tect_georoc:
        # Check if the corresponding file exists in the GEOROC dataset directory
        if f"{ts}.txt" in os.listdir(GEOROC_DATASET_DIR):
            # File exists, read it
            thisdf = pd.read_csv(os.path.join(GEOROC_DATASET_DIR, f"{ts}.txt"))
        else:
            # file needs to be created    
            tect_cases = NEW_TECTONIC_DICT[ts.replace('_', ' ').replace(',','/')].split('+')
          
            if len(tect_cases) < 3: 
                cond = df_volcano['Tectonic Settings'].isin(tect_cases)
            elif len(tect_cases) == 3:
                cond1 = df_volcano['Tectonic Settings'] == tect_cases[0]
                cond2 = df_volcano['Tectonic Settings'] == tect_cases[2].split(';')[0]
                cond3 = df_volcano['Subregion'].isin(tect_cases[2].split(';')[1:])
                cond = cond1 | ((cond2)&(cond3))
            else:
                cond1 = (df_volcano['Tectonic Settings'] == tect_cases[0]) | (df_volcano['Tectonic Settings'] == tect_cases[1])
                cond2 = df_volcano['Tectonic Settings'] == tect_cases[3].split(';')[0]
                cond3 = df_volcano['Subregion'].isin(tect_cases[3].split(';')[1:])
                cond = cond1 | ((cond2)&(cond3))
            
            # Filter volcanoes by tectonic settings and ensure a matching GEOROC volcano exists
            volcanoesbyts = df_volcano[cond]['Volcano Name'].unique()
            volcanoesbyts = [v for v in  volcanoesbyts if v in dict_gvp_georoc.keys()]
    
            all_majorrocks = []
            
            for thisvolcano in volcanoesbyts:
                # Map GVP volcano name to GEOROC name
                thisvolcano = dict_gvp_georoc[thisvolcano]
                thisdf = load_georoc(thisvolcano, dict_georoc_sl, dict_georoc_ls, dict_volcano_file)
                
                for mat in ['WR', 'GL', 'INC']:   
                    thisdftmp = thisdf[thisdf['MATERIAL'].str.contains(mat)]
                    
                    totalsamples = len(thisdftmp.index)    
                    # Remove 'UNNAMED' rocks if present
                    allrocks = [x for x in list(thisdftmp['ROCK'].value_counts().index) if x != 'UNNAMED']
                    # computes percentage
                    allrocksvaluesperc = [round(100*(thisdftmp['ROCK'].value_counts()[r]/totalsamples),1) for r in allrocks]
                    
                    majorrocks = []
                    cnts = []

                    # Identify major rocks (>= 10% to qualify)
                    for r, rv, cnt in zip(allrocks, allrocksvaluesperc):
                        if rv >= 10:
                            majorrocks += [r]
                            cnts.append(thisdftmp['ROCK'].value_counts()[r])
                    
                    # Ensure at least 5 rocks are listed
                    if len(majorrocks) >= 5:
                        majorrocks = majorrocks[0:5]
                        cnts = cnts[0:5]
                    else:
                        majorrocks += ['No Data', 'No Data', 'No Data', 'No Data', 'No Data']
                        majorrocks = majorrocks[0:5]
                        cnts += [0, 0, 0, 0, 0]
                        cnts = cnts[0:5]

                    all_majorrocks.append([thisvolcano]+[mat]+majorrocks+cnts)

            # Create dataframe and replace rock names based on a central dictionary (GEOROC_ROCKS)   
            thisdf = pd.DataFrame(all_majorrocks, columns = ['Volcano Name', 'material', 'GEOROC Major Rock 1', 'GEOROC Major Rock 2', 'GEOROC Major Rock 3', 'GEOROC Major Rock 4', 'GEOROC Major Rock 5', 'cnt 1', 'cnt 2', 'cnt 3', 'cnt 4', 'cnt 5'])
            
            for col in ['GEOROC Major Rock 1', 'GEOROC Major Rock 2', 'GEOROC Major Rock 3', 'GEOROC Major Rock 4', 'GEOROC Major Rock 5']:
                newcol = col.split('GEOROC ')[1]
                thisdf[newcol] = thisdf[col].replace(GEOROC_ROCKS, GEOROC_ROCK_COL)
                
            # Save the newly created file to the GEOROC dataset directory
            thisdf.to_csv(os.path.join(GEOROC_DATASET_DIR, f"{ts}.txt"), index=False)

        alldf = pd.concat([alldf, thisdf])     

    return alldf


def update_georock_chart(thisdf, database, dict_georoc_gvp, rock_tect_setting): 
    """
    Updates the GEOROC major rocks sunburst chart.

    Args:
        thisdf: DataFrame containing rock data from GEOROC and/or PetDB.
        database: Indicates if GEOROC and/or PetDB data is being used.
        dict_georoc_gvp: Dictionary mapping Georoc names to GVP names.
        rock_tect_setting (list): Selected tectonic settings from GEOROC and PetDB.

    Returns: 
        A Plotly sunburst chart representing major rock compositions.
    """

    # Create a discrete color mapping for each rock type
    this_discrete_map = {
        r: 'rgb' + str(rocks_to_color([1 if rock_name == GEOROC_ROCK_COL[GEOROC_ROCKS.index(r)] else 0 for rock_name in ROCK_COL]))
        for r in GEOROC_ROCKS
    }

    # Determine the title based on the database source
    if 'PetDB' in database and 'GEOROC' not in database:
        thistitle = '<b>Rock Composition from PetDB</b> <br>'
    elif 'GEOROC' in database and 'PetDB' not in database:
        thistitle = '<b>Rock Composition from GEOROC</b> <br>'
    elif 'PetDB' in database and 'GEOROC' in database:
        thistitle = '<b>Rock Composition from GEOROC and PetDB</b> <br>'
        
        # Separate DataFrames for PetDB and GEOROC
        dfpdb = thisdf[thisdf['db'] == 'PetDB'] 
        dfgeo = thisdf[thisdf['db'] == 'GEOROC']

        # Map GEOROC volcano names to GVP names
        dfgeo['Volcano Name'] = dfgeo['Volcano Name'].map(dict_georoc_gvp)

        # Prepare lists for major rock counts
        mr1, mr2, mr3 = [], [], []

        # Combine data from both databases for volcanoes
        for volcano in set(dfgeo['Volcano Name']).union(dfpdb['Volcano Name']):
            combined_data = {}

            # Add GEOROC data
            if volcano in dfgeo['Volcano Name'].values:
                rck1 = dfgeo[dfgeo['Volcano Name'] == volcano][['db Major Rock 1', 'db Major Rock 2', 'db Major Rock 3']].values[0]
                cnt1 = dfgeo[dfgeo['Volcano Name'] == volcano][['cnt 1', 'cnt 2', 'cnt 3']].values[0]
                combined_data.update(dict(zip(rck1, cnt1)))

            # Add PetDB data
            if volcano in dfpdb['Volcano Name'].values:
                rck2 = dfpdb[dfpdb['Volcano Name'] == volcano][['db Major Rock 1', 'db Major Rock 2', 'db Major Rock 3']].values[0]
                cnt2 = dfpdb[dfpdb['Volcano Name'] == volcano][['cnt 1', 'cnt 2', 'cnt 3']].values[0]
                for r, c in zip(rck2, cnt2):
                    combined_data[r] = combined_data.get(r, 0) + c

            # Sort and select the top 3 major rocks
            top_rocks = sorted(combined_data.items(), key=lambda x: x[1], reverse=True)[:3]
            while len(top_rocks) < 3:
                top_rocks.append(('No Data', 0))  # Fill with 'No Data' if less than 3
            
            mr1.append(top_rocks[0][0])
            mr2.append(top_rocks[1][0])
            mr3.append(top_rocks[2][0])
        
        # Create a new DataFrame with the major rocks
        thisdf = pd.DataFrame({'db Major Rock 1': mr1, 'db Major Rock 2': mr2, 'db Major Rock 3': mr3})             
    else:

        thistitle = '<b>Rock Composition</b><br>'

    # Create the sunburst chart if data exists
    if not thisdf.empty:
        fig = px.sunburst(
            thisdf.replace('No Data', ' '), 
            path=["db Major Rock 1", "db Major Rock 2", "db Major Rock 3"],
            color='db Major Rock 1', 
            color_discrete_map=this_discrete_map,
            title=thistitle
        )

        # Update colors for the sunburst chart
        fig['data'][0]['marker']['colors'] = [
            col if lab != ' ' else 'rgb(255, 255, 255)' 
            for lab, col in zip(fig['data'][0]['labels'], fig['data'][0]['marker']['colors'])
        ]
    else:
        # Create an empty figure if no data
        fig = go.Figure()
        fig.update_layout(title=thistitle)
        fig.add_traces(go.Sunburst(
            labels=['Major Rock 1', 'Major Rock 2', 'Major Rock 3'],
            parents=['', 'Major Rock 1', 'Major Rock 2'],
            marker=dict(colorscale='Greys')
        ))

    # Prepare tectonic settings to include in the title
    tect_settings_str = ', '.join(rock_tect_setting) if rock_tect_setting else 'No specific tectonic setting'

    # Add a footer with the count of volcanoes
    txt = f'{len(thisdf.index)} volcano(es)<br><sub>Tectonic settings: {tect_settings_str}</sub>'
    fig.update_layout(
        annotations=[dict(
            xref='paper', yref='paper',
            x=0.5, y=-0.25, showarrow=False,
            text=txt
        )]
    )
    
    return fig
    
    
def create_georoc_around_gvp(df_volcano, df_volcano_no_eruption):
    """
    Recreates the GEOROCaroundGVP.csv file and returns its content as a DataFrame.

    Args:
        df_volcano (pd.DataFrame): DataFrame of volcanoes with eruptions.
        df_volcano_no_eruption (pd.DataFrame): DataFrame of volcanoes without eruptions.

    Returns:
        pd.DataFrame: DataFrame containing GEOROC samples matching GVP volcanoes.
    """

    gvp_names = pd.concat([df_volcano[['Volcano Name', 'Latitude', 'Longitude']],
                           df_volcano_no_eruption[['Volcano Name', 'Latitude', 'Longitude']]])
    
    # Remove unnamed volcanoes and replace 'Within' with 'Intra' in names
    gvp_names = gvp_names[gvp_names['Volcano Name'] != 'Unnamed']
    gvp_names['Volcano Name'] = gvp_names['Volcano Name'].str.replace('Within ', 'Intra')

    # List all folder paths in the GEOROC-GVP mapping directory
    lst_arcs = [f"{folder}/{f[:-4]}.csv" for folder in os.listdir(GEOROC_GVP_DIR)
                for f in os.listdir(os.path.join(GEOROC_GVP_DIR, folder))]

    # Initialize an empty DataFrame to store GEOROC data
    df_georoc = pd.DataFrame()

    # Loop through each file and process GEOROC data
    for arc in lst_arcs:
        # Fix and read the file path
        newarc = fix_pathname(arc)
        dftmp = pd.read_csv(os.path.join(GEOROC_DATASET_DIR, newarc), low_memory=False, encoding='latin1')

        # Process based on specific conditions (e.g., Inclusions, volcanic rocks)
        if 'Inclusions_comp' not in arc and 'ManualDataset' not in arc:
            dfvol = load_refs(dftmp)[dftmp["ROCK TYPE"] == 'VOL'].drop('ROCK TYPE', axis=1)
        elif 'Inclusions_comp' in arc:
            dfvol = fix_inclusion(load_refs(dftmp))
            dfvol['MATERIAL'] = 'INC'
        else:
            dfvol = dftmp

        # Keep specific columns of interest and add the 'arc' information
        dfvol = dfvol[['LOCATION', 'LATITUDE MIN', 'LATITUDE MAX', 'LONGITUDE MIN', 'LONGITUDE MAX',
                       'SAMPLE NAME', 'CITATIONS', 'MATERIAL'] + OXIDES]
        dfvol['arc'] = arc
        dfvol['CITATIONS'] = dfvol['CITATIONS'].str.split('===').str[0]  # Keep only first part of the citation

        # Append to the GEOROC DataFrame
        df_georoc = pd.concat([df_georoc, dfvol])

    # Normalize data and assign rock types
    df_georoc = guess_rock(normalize_oxides_with_feot(df_georoc))

    # Add 'ROCK no inc' column and blank out rock names for inclusions
    df_georoc['ROCK no inc'] = df_georoc['ROCK']
    df_georoc.loc[df_georoc['MATERIAL'] == 'INC', 'ROCK no inc'] = ''

    # Initialize DataFrame to store matching volcano samples
    match = pd.DataFrame()

    # Match GEOROC samples to GVP volcanoes based on lat/long
    for name, latitude, longitude in tqdm(zip(gvp_names['Volcano Name'], gvp_names['Latitude'], gvp_names['Longitude']),
                           total=len(gvp_names)):
        lat_cond = (df_georoc['LATITUDE MIN'].astype(float)-0.5 <= latitude) & (df_georoc['LATITUDE MAX'].astype(float)+0.5 >= latitude)
        long_cond = (df_georoc['LONGITUDE MIN'].astype(float)-0.5 <= longitude) & (df_georoc['LONGITUDE MAX'].astype(float)+0.5 >= longitude)

        dfgeo = df_georoc[lat_cond & long_cond][['LOCATION', 'LATITUDE MIN', 'LATITUDE MAX', 'LONGITUDE MIN',
                                                 'LONGITUDE MAX', 'SAMPLE NAME', 'CITATIONS', 'ROCK', 'ROCK no inc',
                                                 'arc', 'SIO2(WT%)']]
        
        if not dfgeo.empty:
            dfgeo['Volcano Name'], dfgeo['Latitude'], dfgeo['Longitude'] = name, latitude, longitude
            match = pd.concat([match, dfgeo])

    # Remove duplicate entries
    match = match.drop_duplicates()

    # Group by location and aggregate multiple sample names and rocks
    matchgroup = match.groupby(['LOCATION', 'LATITUDE MIN', 'LATITUDE MAX', 'LONGITUDE MIN', 'LONGITUDE MAX', 'arc']).agg(list)
    matchgroup = matchgroup.drop(columns=['Latitude', 'Longitude'])

    # Assign tectonic setting and process sample names
    matchgroup['Volcano Name'] = matchgroup['Volcano Name'].apply(lambda x: list(set([find_new_tect_setting(y, df_volcano, df_volcano_no_eruption) for y in x])))
    matchgroup['SAMPLE NAME'] = matchgroup['SAMPLE NAME'].apply(lambda x: list(set([y.split('/')[0].split('[')[0] for y in x]))[:3] + (['+' + str(len(x)-3)] if len(x) > 3 else []))
    matchgroup['SAMPLE NAME'] = matchgroup['SAMPLE NAME'].apply(' '.join)

    # Aggregate rock types and calculate SiO2 mean
    matchgroup['ROCK'] = matchgroup['ROCK'].apply(lambda x: list(Counter(x).items()))
    matchgroup['ROCK no inc'] = matchgroup['ROCK no inc'].apply(lambda x: list(Counter(x).items()))
    matchgroup['SIO2(WT%)mean'] = matchgroup['SIO2(WT%)'].apply(lambda x: statistics.mean(x))

    # Save the resulting DataFrame to a CSV file
    matchgroup.to_csv(GEOROC_AROUND_GVP_FILE)
    
    return matchgroup
    
        
def retrievedf_fromfigure(currentfig):
    """

    Args:
        currentfig: figure

    Returns: dataframe with points extracted from the figure

    """
    # retrieves records from the figure
    recs = [d for d in currentfig['data'] if 'customdata' in d.keys() and len(d['marker']['symbol']) > 0]
    rocks = [[x.split(',')[1].strip().replace("[('","").replace("'","") for x in d['customdata']] for d in recs]
    mats = [d['marker']['symbol'] for d in recs]
    xs = [d['x'] for d in recs]
    ys = [d['y'] for d in recs]
    
    thisdf = pd.DataFrame(data={'MATERIAL': [], 'ROCK': [], 'x':[], 'y': []})
    for rock, mat, x, y in zip(rocks, mats, xs, ys):
        new_data = pd.DataFrame(data={'MATERIAL': mat, 'ROCK': rock, 'x': x, 'y': y})
        thisdf = pd.concat([thisdf, new_data], ignore_index=True)
        
    thisdf = thisdf.replace({'circle': 'WR', 'square': 'INC', 'diamond': 'GL', 'diamond-wide': 'UNKNOWN', 'x': 'MIN'})
    
    return thisdf
    
def update_subtitle(fig):
    """
    Updates the subtitle based on the current figure and selected materials.

    Args:
        fig: The current figure from which data is retrieved.

    Returns:
        tuple: Updated store state and the generated subtitle.
    """

    subtitle = ''  # Initialize an empty subtitle string
    
    # Retrieve the DataFrame from the current figure
    thisdf = retrievedf_fromfigure(fig)
    
    # Extract existing materials from the DataFrame
    existing_materials = thisdf['MATERIAL'].unique()
    
    # Initialize store based on context and existing materials
    store = [mt in existing_materials for mt in ['WR', 'GL', 'INC']]
    
    # Determine visible materials based on the updated store
    visible_materials = [mat for mat, present in zip(['WR', 'GL', 'INC'], store) if present]

    if existing_materials.size > 0:  # Check if there are existing materials
        thisdf = thisdf[thisdf['MATERIAL'].isin(visible_materials)]  # Filter DataFrame
        
        # Count total samples and extract major rocks
        totalsamples = len(thisdf)
        majorrocks = thisdf['ROCK'].value_counts().index[thisdf['ROCK'].value_counts() != 'UNNAMED'][:5]
        majorrocksvalues = (round(100 * (thisdf['ROCK'].value_counts()[rock] / totalsamples), 1) 
                            for rock in majorrocks)
        
        # Construct subtitle string
        subtitle = f"{'-'.join(visible_materials)}: {', '.join(f'{mr} ({mrc}%)' for mr, mrc in zip(majorrocks, majorrocksvalues))}"
        
    return subtitle



# def GEOROC_sunburst(thisdf):
#     """
#     """
#     fig3 = make_subplots(rows=1, cols=3, specs=[[{"type": "pie"}, {"type": "pie"}, {"type": "pie"}]],
#                          subplot_titles=("all", "GL", "INC"))
    
#     xs = [0.2, 0.5, 0.8]
    
#     for mat, coln in zip(['all', 'GL', 'INC'], [1, 2, 3]):
#         if len(thisdf.index) > 0:
#             dfmat = thisdf[thisdf['material'] == mat]
            
#             if len(dfmat.index) > 0:
#                 tmpfig = update_georock_chart(dfmat)
#                 # moves the data to graph object
#                 # ids are needed when labels are repeated
#                 # formats hovertmplate
#                 hovertmplate = tmpfig['data'][0]['hovertemplate'].split('{label}<br>')[1]
#                 splt = hovertmplate.split('parent=%{parent}<br>')
#                 hovertmplate = splt[0] + splt[1]
#                 fig3.add_traces(
#                     go.Sunburst(
#                         ids=tmpfig['data'][0]['ids'].tolist(),
#                         labels=tmpfig['data'][0]['labels'].tolist(),
#                         parents=tmpfig['data'][0]['parents'].tolist(),
#                         values=tmpfig['data'][0]['values'].tolist(),
#                         marker=tmpfig['data'][0]['marker'],
#                         customdata=tmpfig['data'][0]['customdata'],
#                         hovertemplate=hovertmplate
#                     ),
#                     rows=1, cols=coln,
#                 )
                     
#                 fig3['layout']['annotations'][coln-1].update(text=mat+': ' + str(len(dfmat.index)) + ' volcano(es)', font = dict(size=13), 
#                                                              xref='paper', yref='paper', x=xs[coln-1], y=-0.25)
                
#             else:
#                 fig3.add_traces(
#                     go.Sunburst(
#                                 labels=['Major Rock 1', 'Major Rock 2', 'Major Rock 3'],
#                                 parents=['', 'Major Rock 1', 'Major Rock 2'],
#                                 marker=dict(colorscale='Greys')
#                                ),
#                     rows=1, cols=coln,
#                 )
                   
#         else:
#             fig3.add_traces(
#                 go.Sunburst(
#                         labels=['Major Rock 1', 'Major Rock 2', 'Major Rock 3'],
#                         parents=['', 'Major Rock 1', 'Major Rock 2'],
#                         marker=dict(colorscale='Greys')
#                        ),
#                 rows=1, cols=coln,
#             )
    
#     return fig3
    
    
def perc_rock():
    '''
        No input because it loads data from saved files
        output: vperc is a dictionary, with volcano names as keys
    '''   
    
    # loads a list of samples per volcano
    with open("lst1TASall2023", "rb") as fp2:   
        lst_tas_all = pd.read_pickle(fp2)

    # loads the corresponding volcano name list
    with open("lst1all2023", "rb") as fp1:
        lstall = pd.read_pickle(fp1) 
        
    vperc = {}

    for l, n in zip(lst_tas_all, lstall):
        rcks = [x for x in l[11]]
        rckscnt = Counter(rcks) 
        rckperc = [0 for x in GEOROC_ROCKS]
        idx = 0
        for rt in GEOROC_ROCKS:
            if rt in rckscnt.keys():
                rckperc[idx] = rckscnt[rt] 
            idx += 1
        vperc[n] = rckperc     
   
    return vperc


def process_georoc_data(dfgeogr, with_text, volcano_name, with_text_match, thisgeogr, dict_georoc_sl, dict_georoc_ls, dict_volcano_file):
    """Processes GEOROC data for selected points."""
    gr_idx = dfgeogr.set_index(['LATITUDE', 'LONGITUDE'])
    whichfiles = list(gr_idx.loc[with_text, 'arc'].unique())
    whichlocation = list(gr_idx.loc[with_text, 'LOCATION'].unique())

    dfloaded = pd.DataFrame()
    if with_text_match:
        dfloaded = load_georoc(volcano_name, dict_georoc_sl, dict_georoc_ls, dict_volcano_file)

    for pathcsv in set(whichfiles):
        pathcsv = fix_pathname(pathcsv)
        dftmp = pd.read_csv(os.path.join(GEOROC_DATASET_DIR, pathcsv), low_memory=False, encoding='latin1')
        # inclusion file has a different format
        if 'Inclusions_comp' in pathcsv:
            # updates columns to have the same format as dataframes from other files
            dftmp = fix_inclusion(dftmp)
        dfloc = guess_rock(dftmp[dftmp['LOCATION'].isin(whichlocation)])
        dfloaded = pd.concat([dfloaded, dfloc])
    
    if not dfloaded.empty:
        dfloaded = normalize_oxides_with_feot(dfloaded)
        dfloaded = clean_and_prepare_georoc(dfloaded)
        thisgeogr = pd.concat([thisgeogr, dfloaded])

    return thisgeogr


def clean_and_prepare_georoc(dfloaded):
    """Clean and normalize GEOROC data."""
    dfloaded = dfloaded.dropna(subset=['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], how='all')
    dfloaded = detects_chems(dfloaded, ['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], MORE_CHEMS, LBLS)
    dfloaded['db'] = 'GEOROC'
    return dfloaded