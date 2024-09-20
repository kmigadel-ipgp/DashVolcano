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

import os
import pandas as pd
import numpy as np
import ast
import statistics
import math

from constants.chemicals import OXIDES, CHEMICALS_SETTINGS
from constants.paths import PETDB_GVP_DIR, PETDB_EARTHCHEM_DIR, GEOROC_DATASET_DIR, GEOROC_AROUND_PETDB_FILE

from functions.georoc import with_FEOnorm, guess_rock
from constants.shared_data import df_volcano

from functions.gvp import find_new_tect_setting


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
    pdb = pdb[['LATITUDE', 'LONGITUDE', 'MATERIAL', 'REFERENCES', 'SAMPLE ID']+OXIDES]

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
    dfgeo = dfgeo[['LATITUDE', 'LONGITUDE', 'REFERENCES', 'MATERIAL', 'SAMPLE ID', 'SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)', 'CAO(WT%)','FEOT(WT%)','MGO(WT%)', 'ROCK', 'ROCK no inc', 'Volcano Name']]
    
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


def empty_petdb_df():
    return pd.DataFrame({'LATITUDE': [], 'LONGITUDE': [], 'SAMPLE ID': [], 'REFERENCES': [], 'ROCK no inc': [], 'SIO2(WT%)mean': [], 'Volcano Name': []})

def rename_columns(df, db_type):
    """
    Renames common columns across different datasets.
    """
    df = df.rename(columns={"LATITUDE": "Latitude", "LONGITUDE": "Longitude", 'SAMPLE ID': 'Name'})
    df['db'] = [db_type] * len(df.index)
    df['refs'] = ['refs'] * len(df.index)
    df['db'] = df['db'].replace({
        'Georoc': 'Rock sample (GEOROC)', 
        'Georoc found': 'Matching rock sample (GEOROC)', 
        'GVP with eruptions': 'Volcano with known eruption data (GVP)', 
        'GVP no eruption': 'Volcano with no known eruption data (GVP)'})
    
    return df

def load_petdb_data(tect_lst, df_volcano, df_volcano_no_eruption):
    """
    Loads and processes PetDB data.
    """
    if 'PetDBaroundGVP.csv' in os.listdir(GEOROC_DATASET_DIR) and 'PetDB' in tect_lst:
        dfgeo = pd.read_csv(GEOROC_AROUND_PETDB_FILE)
        # from string back to list
        dfgeo['Volcano Name'] = dfgeo['Volcano Name'].apply(lambda x: set(ast.literal_eval(x)))
        dfgeo['Volcano Name'] = dfgeo['Volcano Name'].apply(lambda y: [x.split(';') for x in y])
        dfgeo['Volcano Name'] = dfgeo['Volcano Name'].apply(lambda y: list(set([item for sublist in y for item in sublist])))
        dfgeo['Volcano Name'] = dfgeo['Volcano Name'].apply(lambda x: [find_new_tect_setting(y, df_volcano, df_volcano_no_eruption) for y in x if y != ''] )        
        dfgeo = rename_columns(dfgeo, 'PetDB')
    else:
        dfgeo = createPetDBaroundGVP() if 'PetDB' in tect_lst else empty_petdb_df()

    dfgeo = dfgeo.rename(columns={"LATITUDE": "Latitude", "LONGITUDE": "Longitude"})
    dfgeo['db'] = ['PetDB']*len(dfgeo.index)
    dfgeo = dfgeo.rename(columns={'SAMPLE ID': 'Name'})
    # add references
    if 'REFERENCES' in dfgeo.columns:
        dfgeo['refs'] = dfgeo['REFERENCES'] 
    
    return dfgeo


def load_and_preprocess_PetDB_data(volcano):
    """
    Load and preprocess PetDB data for a specific volcano.
    
    Args:
        volcano (str): The name of the volcano for which PetDB data is to be loaded.
    
    Returns:
        pd.DataFrame: A DataFrame containing the processed PetDB data for the specified volcano.
    """
    
    # Load the PetDB-GVP mapping file
    dfn = pd.read_csv(PETDB_GVP_DIR)

    # Convert the 'Volcano Name' column from stringified lists to actual lists and deduplicate names
    dfn['Volcano Name'] = dfn['Volcano Name'].apply(lambda x: list(set(ast.literal_eval(x)))[0].split(';'))

    # Filter the DataFrame to only include rows related to the specified volcano
    dfn = dfn[dfn['Volcano Name'].apply(lambda x: True if len(np.intersect1d(x, [volcano])) > 0 else False)]

    pdbloaded = pd.DataFrame()  # Initialize an empty DataFrame to store the combined data

    for fn in PETDB_EARTHCHEM_DIR:
        # Load the PetDB Excel file
        pdtmp = pd.read_excel(fn)

        # Identify the row containing column names and remove preceding rows
        pdtmp = pdtmp[np.where(pdtmp.iloc[:, 0] == 'SAMPLE ID')[0][0]:]

        # Use the identified row as column headers and drop it from the data
        pdtmp.columns = list(pdtmp[0:1].values[0])
        pdtmp = pdtmp.drop(pdtmp.index[[0]])

        # Remove duplicated columns, keeping only the first occurrence
        pdtmp = pdtmp.loc[:, ~pdtmp.T.duplicated(keep='first')]

        # Clean and standardize the column names
        oxides_pdb = [x for x in list(pdtmp) if str(x)+'(WT%)' in OXIDES]
        colpdb = {'ANALYZED MATERIAL': 'MATERIAL'}
        for c in oxides_pdb:
            colpdb[c] = c+'(WT%)'
        pdtmp = pdtmp.rename(columns=colpdb)
        
        # Filter samples based on latitude and longitude matches with the GVP data
        pdtmp = pdtmp[(pdtmp['LATITUDE'].isin(dfn['LATITUDE'])) & (pdtmp['LONGITUDE'].isin(dfn['LONGITUDE']))]
        pdbloaded = pdbloaded.append(pdtmp)  # Append the filtered data to the combined DataFrame
        
    # Clean and standardize material names
    pdbloaded = pdbloaded.replace({'WHOLE ROCK': 'WR', 'GLASS': 'GL', 'INCLUSION': 'INC'})
    
    # Clean and standardize values with inequalities
    for c in ['LOI(WT%)', 'NA2O(WT%)']:
        pdbloaded[c] = pdbloaded[c].apply(lambda x: float(x.split('<')[1].strip())-0.01 if isinstance(x, str) else x)
    
    # Normalize FeO values using the provided normalization function
    pdbloaded = with_FEOnorm(pdbloaded)
    
    # Add rock names using the provided guess_rock function
    pdbloaded = guess_rock(pdbloaded)
    
    return pdbloaded

