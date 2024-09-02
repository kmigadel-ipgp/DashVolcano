
import os
import statistics
import ast
import math
import pandas as pd
import numpy as np

from collections import Counter

from constants.chemicals import OXIDES, CHEMICALS_SETTINGS
from constants.tectonics import NEW_TECTONIC_DICT, NEW_TECTONIC_SETTINGS
from constants.rocks import GEOROC_ROCK_COL, GEOROC_ROCKS
from constants.paths import PETDB_EARTHCHEM_DIR, PETDB_GVP_DIR, PETDB_DIR

from functions.georoc import with_FEOnorm, guess_rock

from dataloader.data_loader import df_volcano
from dataloader.data_loader_petdb import load_and_preprocess_PetDB_data

# **********************************************************************************#
#
# This contains functions to manipulate Georoc data.
# --------------------------------------------------
# * load_PetDB
# * createPetDBaroundGVP
# * PetDB_majorrocks: computes/loads rock data from PetDB
#
# Author: F. Oggier
# Last update: 25 April 2024
# **********************************************************************************#


def createPetDBaroundGVP():
    """
    Recreates the file PetDBaroundGVP.csv and returns its content as a DataFrame.

    Returns:
        pd.DataFrame: The dataframe containing data around the Global Volcanism Program (GVP) volcanoes.
    """  
    
    # Initialize an empty DataFrame
    pdb = pd.DataFrame()

    for fn in PETDB_EARTHCHEM_DIR:

        # read file
        pdtmp = pd.read_excel(fn)

        # finds the row containing the column names, and removes the rows before
        pdtmp = pdtmp[np.where(pdtmp.iloc[:, 0] == 'SAMPLE ID')[0][0]:]

        # uses the first row as column names and then removes it
        pdtmp.columns = list(pdtmp[0:1].values[0])
        pdtmp = pdtmp.drop(pdtmp.index[[0]])

        # removes duplicated columns and keep the first instance
        pdtmp = pdtmp.loc[:, ~pdtmp.T.duplicated(keep='first')]
        pdb = pdb.append(pdtmp)
    
    # transforms PetDB names into GEOROC names
    oxides_pdb = [x for x in list(pdb) if str(x)+'(WT%)' in OXIDES]
    colpdb = {'ANALYZED MATERIAL': 'MATERIAL'}
    for c in oxides_pdb:
        colpdb[c] = c+'(WT%)'

    pdb = pdb.rename(columns=colpdb)
    
    # matches with GVP
    pi = math.pi

    # kms apart
    dist = 50

    # Radians = Degrees * PI / 180
    pdb_lat_rad = pdb['LATITUDE'].astype('float')*pi/180
    pdb_long_rad = pdb['LONGITUDE'].astype('float')*pi/180

    # keep only columns of interest
    pdb = pdb[['LATITUDE', 'LONGITUDE', 'MATERIAL', 'SAMPLE ID']+OXIDES]

    dfgeo = pd.DataFrame()

    for ltr, lgr, lt, lg in zip(pdb_lat_rad, pdb_long_rad, pdb['LATITUDE'], pdb['LONGITUDE']):
        gvp_lat = df_volcano['Latitude'].astype('float')*pi/180
        gvp_long = df_volcano['Longitude'].astype('float')*pi/180

        # Calculate the distance
        # acos(sin(lat1)*sin(lat2)+cos(lat1)*cos(lat2)*cos(lon2-lon1))*6371
        a1 = np.sin(ltr)*np.sin(gvp_lat)
        a2 = np.cos(ltr)*np.cos(gvp_lat)
        a3 = np.cos(gvp_long-lgr)
        d = 6371*np.arccos(a1+a2*a3)
    
        dffromgvp = df_volcano[d <= dist][['Volcano Name', 'Latitude', 'Longitude']]

        if len(dffromgvp.index) > 0:
            # checks for more than one volcano
            if len(dffromgvp.index) > 1:    
                nov = len(dffromgvp.index)
                shorterdist = dist-1
                while nov > 1:
                    dffromgvp = df_volcano[d <= shorterdist][['Volcano Name', 'Latitude', 'Longitude']]
                    if len(dffromgvp.index) == 1 or shorterdist == 5:
                        nov = 1
                    else:
                        shorterdist = shorterdist-1

            # keep chemicals
            subpdb = pdb[(pdb['LATITUDE'] == lt) & (pdb['LONGITUDE'] == lg)]
            subpdb['Volcano Name'] = [';'.join(list(dffromgvp['Volcano Name']))]*len(subpdb)
            dfgeo = dfgeo.append(subpdb)
            dfgeo = dfgeo.drop_duplicates()
            
    # cleans the data
    dfgeo = dfgeo.fillna(0)
    dfgeo['LOI(WT%)'] = dfgeo['LOI(WT%)'].apply(lambda x: float(x.split('<')[1].strip())-0.01 if type(x) == str else x)
    dfgeo['NA2O(WT%)'] = dfgeo['NA2O(WT%)'].apply(lambda x: float(x.split('<')[1].strip())-0.01 if type(x) == str else x)
    
    # Feo normalization
    dfgeo = with_FEOnorm(dfgeo)

    # Add rock names
    dfgeo = guess_rock(dfgeo)

    # rock names excluding inclusions
    dfgeo['ROCK no inc'] = dfgeo['ROCK']
    dfgeo.loc[dfgeo['MATERIAL'] == 'INCLUSION', 'ROCK no inc'] = ''

    # Keeps only the necessary
    dfgeo = dfgeo[['LATITUDE', 'LONGITUDE', 'MATERIAL', 'SAMPLE ID', 'SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)', 'CAO(WT%)','FEOT(WT%)','MGO(WT%)', 'ROCK', 'ROCK no inc', 'Volcano Name']]
    
    # group sample names when same location
    matchgroup = dfgeo.groupby(['LATITUDE', 'LONGITUDE']).agg(lambda x: list(x))
    matchgroup['SAMPLE ID'] = matchgroup['SAMPLE ID'].apply(lambda x: x if len(x) <= 3 else list(set(x[0:3]))+['+'+str(len(x)-3)])
    
    # this creates a single string out of different sample names attached to one location
    matchgroup['SAMPLE ID'] = matchgroup['SAMPLE ID'].apply(lambda x: " ".join([str(y) for y in x]))
    matchgroup['ROCK'] = matchgroup['ROCK'].apply(lambda x: list(Counter(x).items()))
    matchgroup['ROCK no inc'] = matchgroup['ROCK no inc'].apply(lambda x: list(Counter(x).items()))
    
    for c in CHEMICALS_SETTINGS[0:1]:
        matchgroup[c+'mean'] = matchgroup[c].apply(lambda x: statistics.mean(x))
    
    # Save the output to a CSV file
    output_path = os.path.join(PETDB_GVP_DIR)
    matchgroup.to_csv(output_path)

    return matchgroup 


def get_volcano_names_from_PetDB():
    """
    Loads and processes volcano names from the PetDBaroundGVP.csv file.

    Returns:
        list: A list of unique volcano names.
    """
    dicPetDB = pd.read_csv(PETDB_GVP_DIR)['Volcano Name']
    dicPetDB = dicPetDB.apply(lambda x: set(ast.literal_eval(x)))
    dicPetDB = [list(x)[0].split(';') for x in list(dicPetDB)]
    return list(set([item for sublist in dicPetDB for item in sublist]))


def match_volcanoes_to_tectonic_setting(ts, volcano_names):
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
        thisdf = load_and_preprocess_PetDB_data(thisvolcano)
        
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


def PetDB_majorrocks(tect_setting): 
    """
    Args:
        tect_setting (list): List of tectonic settings.

    Returns:
        pd.DataFrame: A dataframe with volcano names and their PetDB major rocks 1, 2, and 3.
    """

    # Filter out unwanted tectonic settings
    tect_setting = [x for x in tect_setting if x != None and x != ' all GEOROC']
    
    # Determine tectonic settings to use for GEOROC
    if ' PetDB' in tect_setting and len(tect_setting) == 1:
        # format tectonic setting names
        tect_GEOROC = [x.strip().replace(' ', '_').replace('/',',') for x in NEW_TECTONIC_SETTINGS]
    else: 
        tect_GEOROC = [x.strip().replace(' ', '_').replace('/',',') for x in tect_setting if (x != ' PetDB') and (x != ' all GEOROC')]
        
    alldf = pd.DataFrame()
        
    # check if file exists
    for ts in tect_GEOROC:

        file_name = f"PetDB{ts}.txt"
        file_path = os.path.join(PETDB_DIR, file_name)

        # lists files in the folder
        if file_name in os.listdir(PETDB_DIR):
            # File exists, read it
            thisdf = pd.read_csv(file_path)
        else:
            # file needs to be created    
            # PetDB volcanoes    
            volcano_names = get_volcano_names_from_PetDB()
            matched_volcanoes = match_volcanoes_to_tectonic_setting(ts, volcano_names)   
            thisdf = create_major_rocks_dataframe(matched_volcanoes)
            save_major_rocks_dataframe(thisdf, file_path)
    
        alldf = pd.concat([alldf, thisdf])     

    return alldf
