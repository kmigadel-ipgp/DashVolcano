# **********************************************************************************#
#
# This contains functions to manipulate Georoc data.
# --------------------------------------------------
# * load_PetDB
# * createPetDBaroundGVP
# * PetDB_majorrocks: computes/loads rock data from PetDB
#
# Author: F. Oggier
# Editor: K. Migadel
# Last update: September 20 2024
# **********************************************************************************#

import os
import ast
import pandas as pd

from constants.tectonics import NEW_TECTONIC_DICT, NEW_TECTONIC_SETTINGS
from constants.rocks import GEOROC_ROCK_COL, GEOROC_ROCKS
from constants.paths import PETDB_GVP_DIR, PETDB_DIR

from dataloader.data_loader_petdb import load_and_preprocess_petdb_data


def get_volcano_names_from_petdb():
    """
    Loads and processes volcano names from the PetDBaroundGVP.csv file.

    Returns:
        list: A list of unique volcano names.
    """
    dic_petdb = pd.read_csv(PETDB_GVP_DIR)['Volcano Name']
    dic_petdb = dic_petdb.apply(lambda x: set(ast.literal_eval(x)))
    dic_petdb = [list(x)[0].split(';') for x in list(dic_petdb)]
    return list(set([item for sublist in dic_petdb for item in sublist]))


def match_volcanoes_to_tectonic_setting(ts, volcano_names, df_volcano):
    """
    Matches volcanoes to a given tectonic setting.

    Args:
        ts (str): Tectonic setting.
        volcano_names (list): List of volcano names.

    Returns:
        list: List of matched volcano names.
    """
    tect_cases = NEW_TECTONIC_DICT[ts.replace('_', ' ').replace(',', '/')].split('+')
    cond = None

    if len(tect_cases) < 3: 
        cond = df_volcano['Tectonic Settings'].isin(tect_cases)
    elif len(tect_cases) == 3:
        cond1 = df_volcano['Tectonic Settings'] == tect_cases[0]
        cond2 = df_volcano['Tectonic Settings'] == tect_cases[2].split(';')[0]
        cond3 = df_volcano['Subregion'].isin(tect_cases[2].split(';')[1:])
        cond = cond1 | (cond2 & cond3)
    else:
        cond1 = (df_volcano['Tectonic Settings'] == tect_cases[0]) | (df_volcano['Tectonic Settings'] == tect_cases[1])
        cond2 = df_volcano['Tectonic Settings'] == tect_cases[3].split(';')[0]
        cond3 = df_volcano['Subregion'].isin(tect_cases[3].split(';')[1:])
        cond = cond1 | (cond2 & cond3)
    
    volcanoes_by_ts = df_volcano[cond]['Volcano Name'].unique()
    
    # Filter volcanoes that have a matching GEOROC volcano
    return [v for v in volcanoes_by_ts if v in volcano_names]


def create_major_rocks_dataframe(volcanoes):
    """
    Creates a dataframe with major rocks for each volcano.

    Args:
        volcanoes (list): List of volcano names.

    Returns:
        pd.DataFrame: DataFrame containing major rocks data.
    """
    all_majorrocks = []
    
    for thisvolcano in volcanoes:
        thisdf = load_and_preprocess_petdb_data(thisvolcano)
        
        for mat in ['WR', 'GL', 'INC']:
            thisdftmp = thisdf[thisdf['MATERIAL'].str.contains(mat)]
            totalsamples = len(thisdftmp.index)    
            
            # Remove 'UNNAMED' rocks, if present
            allrocks = [x for x in list(thisdftmp['ROCK'].value_counts().index) if x != 'UNNAMED']
            allrocksvaluesperc = [round(100 * (thisdftmp['ROCK'].value_counts()[r] / totalsamples), 1) for r in allrocks]
            
            majorrocks, cnts = get_major_rocks_and_counts(allrocks, allrocksvaluesperc, thisdftmp)
            all_majorrocks.append([thisvolcano]+[mat]+majorrocks+cnts)
                    
    columns = ['Volcano Name', 'material', 'PetDB Major Rock 1', 'PetDB Major Rock 2', 'PetDB Major Rock 3', 'PetDB Major Rock 4', 'PetDB Major Rock 5', 'cnt 1', 'cnt 2', 'cnt 3', 'cnt 4', 'cnt 5']
    df = pd.DataFrame(all_majorrocks, columns=columns)

    # Replace with corresponding GEOROC names
    for col in ['PetDB Major Rock 1', 'PetDB Major Rock 2', 'PetDB Major Rock 3', 'PetDB Major Rock 4', 'PetDB Major Rock 5']:
        new_col = col.split('PetDB ')[1]
        df[new_col] = df[col].replace(GEOROC_ROCKS, GEOROC_ROCK_COL)
    
    return df


def get_major_rocks_and_counts(allrocks, allrocksvaluesperc, thisdftmp):
    """
    Identifies major rocks and their counts based on the provided data.

    Args:
        allrocks (list): List of all rock types.
        allrocksvaluesperc (list): List of percentages for each rock type.
        thisdftmp (pd.DataFrame): DataFrame with sample data.

    Returns:
        tuple: Major rocks and their counts.
    """
    majorrocks, cnts = [], []

    # Qualify as major rock if >= 10%
    for r, rv in zip(allrocks, allrocksvaluesperc):
        if rv >= 10:
            majorrocks.append(r)
            cnts.append(thisdftmp['ROCK'].value_counts()[r])

    # Fill with 'No Data' if necessary
    if len(majorrocks) >= 5:
        majorrocks = majorrocks[0:5]
        cnts = cnts[0:5]
    else:
        majorrocks += ['No Data', 'No Data', 'No Data', 'No Data', 'No Data']
        majorrocks = majorrocks[0:5]
        cnts += [0, 0, 0, 0, 0]
        cnts = cnts[0:5]

    return majorrocks, cnts


def save_major_rocks_dataframe(df, file_path):
    """
    Saves the dataframe to a CSV file.

    Args:
        df (pd.DataFrame): DataFrame to save.
        file_path (str): Path to save the file.
    """
    df.to_csv(file_path, index=False)


def petdb_majorrocks(rock_tect_setting, df_volcano): 
    """
    Args:
        rock_tect_setting (list): List of tectonic settings from Georoc and PetDB.

    Returns:
        pd.DataFrame: A dataframe with volcano names and their PetDB major rocks 1, 2, and 3.
    """

    # Determine tectonic settings to use for GEOROC
    if len(rock_tect_setting) == 0:
        # format tectonic setting names
        tect_georoc = [x.strip().replace(' ', '_').replace('/',',') for x in NEW_TECTONIC_SETTINGS]
    else: 
        tect_georoc = [x.strip().replace(' ', '_').replace('/',',') for x in rock_tect_setting]

    alldf = pd.DataFrame()
        
    # check if file exists
    for ts in tect_georoc:

        file_name = f"PetDB{ts}.txt"
        file_path = os.path.join(PETDB_DIR, file_name)
        
        # lists files in the folder
        if file_name in os.listdir(PETDB_DIR):
            # File exists, read it
            thisdf = pd.read_csv(file_path)
        else:
            # file needs to be created    
            # PetDB volcanoes    
            volcano_names = get_volcano_names_from_petdb()
            matched_volcanoes = match_volcanoes_to_tectonic_setting(ts, volcano_names, df_volcano)   
            thisdf = create_major_rocks_dataframe(matched_volcanoes)
            save_major_rocks_dataframe(thisdf, file_path)
    
        alldf = pd.concat([alldf, thisdf])     

    return alldf
