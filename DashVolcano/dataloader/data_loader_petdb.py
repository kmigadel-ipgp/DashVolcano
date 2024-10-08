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

from collections import Counter
from tqdm import tqdm

from constants.chemicals import OXIDES
from constants.paths import PETDB_GVP_DIR, PETDB_EARTHCHEM_DIR, GEOROC_DATASET_DIR, GEOROC_AROUND_PETDB_FILE

from functions.georoc import normalize_oxides_with_feot, guess_rock, find_new_tect_setting
from constants.shared_data import df_volcano


def create_petdb_around_gvp():
    """
    Recreates the file PetDBaroundGVP.csv and returns its content as a DataFrame.
    This function merges PetDB data with GVP (Global Volcanism Program) volcano locations 
    within a certain distance and performs several data cleaning and normalization operations.
    
    Returns:
        pd.DataFrame: DataFrame containing PetDB data around GVP volcanoes.
    """  
    
    # Initialize an empty DataFrame to store the PetDB data
    pdb = pd.DataFrame()

    # Process each PetDB file
    for fn in PETDB_EARTHCHEM_DIR:
        # Read the Excel file
        pdtmp = pd.read_excel(fn)

        # Locate the row with the column headers ('SAMPLE ID') and remove rows before it
        pdtmp = pdtmp[np.where(pdtmp.iloc[:, 0] == 'SAMPLE ID')[0][0]:]

        # Set the first row as column headers and remove it from the DataFrame
        pdtmp.columns = pdtmp.iloc[0]
        pdtmp = pdtmp.drop(pdtmp.index[0])

        # Remove duplicate columns (keep only the first instance)
        pdtmp = pdtmp.loc[:, ~pdtmp.T.duplicated(keep='first')]

        # Append the data to the overall PetDB DataFrame
        pdb = pd.concat([pdb, pdtmp])

    # Rename columns for consistency
    colpdb = {c: c + '(WT%)' for c in pdb.columns if str(c) + '(WT%)' in OXIDES}
    colpdb['ANALYZED MATERIAL'] = 'MATERIAL'
    pdb = pdb.rename(columns=colpdb)

    # Convert latitude and longitude to radians for distance calculation
    pdb_lat_rad = pdb['LATITUDE'].astype('float') * math.pi / 180
    pdb_long_rad = pdb['LONGITUDE'].astype('float') * math.pi / 180

    gvp_lat_rad = df_volcano['Latitude'].astype('float') * math.pi / 180
    gvp_long_rad = df_volcano['Longitude'].astype('float') * math.pi / 180

    # Select relevant columns from the PetDB data
    pdb = pdb[['LATITUDE', 'LONGITUDE', 'MATERIAL', 'REFERENCES', 'SAMPLE ID'] + OXIDES]

    # Initialize an empty DataFrame to store matched data
    dfgeo = pd.DataFrame()

    # Compare each PetDB sample location with GVP volcano locations
    for petdb_lat_rad, petdb_long_rad, petdb_lat, petdb_long in tqdm(zip(pdb_lat_rad, pdb_long_rad, pdb['LATITUDE'], pdb['LONGITUDE']), total=len(pdb)):
        
        # Calculate the distance between the PetDB sample and GVP volcanoes
        a1 = np.sin(petdb_lat_rad) * np.sin(gvp_lat_rad)
        a2 = np.cos(petdb_lat_rad) * np.cos(gvp_lat_rad)
        a3 = np.cos(gvp_long_rad - petdb_long_rad)

        cosine_value = a1 + a2 * a3                 # Earth radius in km
        cosine_value = np.clip(cosine_value, -1, 1) # Ensure the input to arccos is within the valid range [-1, 1]
        d = 6371 * np.arccos(cosine_value)          # Calculate the distance

        # Filter volcanoes within the distance threshold of 50 kilometers
        dffromgvp = df_volcano[d <= 50][['Volcano Name', 'Latitude', 'Longitude']]

        # If multiple volcanoes are matched, reduce the distance iteratively
        if len(dffromgvp) > 1:
            shorterdist = 49
            while len(dffromgvp) > 1 and shorterdist >= 5:
                dffromgvp = df_volcano[d <= shorterdist][['Volcano Name', 'Latitude', 'Longitude']]
                shorterdist -= 1

            # If a match is found, append the sample with the volcano name to the result DataFrame
            subpdb = pdb[(pdb['LATITUDE'] == petdb_lat) & (pdb['LONGITUDE'] == petdb_long)].copy()
            subpdb['Volcano Name'] = ';'.join(dffromgvp['Volcano Name'])
            dfgeo = pd.concat([dfgeo, subpdb.drop_duplicates()])

    # Save the result to a CSV file
    dfgeo = dfgeo.fillna(0)

    # Data cleaning: handle specific cases in LOI and NA2O columns
    dfgeo[OXIDES] = dfgeo[OXIDES].apply(lambda column: column.apply(lambda value: float(value.replace('< ', '')) - 0.01 if isinstance(value, str) else value))

    # Normalize FeO values
    dfgeo = normalize_oxides_with_feot(dfgeo)

    # Add rock names based on the TAS classification
    dfgeo = guess_rock(dfgeo)

    # Separate rock names excluding inclusions
    dfgeo['ROCK no inc'] = dfgeo['ROCK']
    dfgeo.loc[dfgeo['MATERIAL'] == 'INCLUSION', 'ROCK no inc'] = ''

    # Select necessary columns for the final DataFrame
    dfgeo = dfgeo[[
        'LATITUDE',
        'LONGITUDE',
        'REFERENCES',
        'MATERIAL',
        'SAMPLE ID',
        'SIO2(WT%)',
        'NA2O(WT%)',
        'K2O(WT%)',
        'CAO(WT%)',
        'FEOT(WT%)',
        'MGO(WT%)',
        'ROCK',
        'ROCK no inc',
        'Volcano Name']]

    # Group by location (latitude, longitude) and aggregate sample names
    matchgroup = dfgeo.groupby(['LATITUDE', 'LONGITUDE']).agg(lambda x: list(x))
    matchgroup['SAMPLE ID'] = matchgroup['SAMPLE ID'].apply(lambda x: x if len(x) <= 3 else list(set(x[:3])) + ['+' + str(len(x) - 3)])

    # Concatenate sample IDs into a single string
    matchgroup['SAMPLE ID'] = matchgroup['SAMPLE ID'].apply(lambda x: " ".join([str(y) for y in x]))
    matchgroup['ROCK'] = matchgroup['ROCK'].apply(lambda x: list(Counter(x).items()))
    matchgroup['ROCK no inc'] = matchgroup['ROCK no inc'].apply(lambda x: list(Counter(x).items()))
    matchgroup['SIO2(WT%)mean'] = matchgroup['SIO2(WT%)'].apply(lambda x: statistics.mean(x))

    # Save the result to a CSV file
    output_path = os.path.join(PETDB_GVP_DIR)
    matchgroup.to_csv(output_path)

    return matchgroup



def empty_petdb_df():
    """
    Creates an empty DataFrame with predefined columns for PetDB data.
    
    Returns:
        pd.DataFrame: An empty DataFrame with columns relevant to PetDB data.
    """
    return pd.DataFrame({
        'LATITUDE': [],           # Latitude of the sample location
        'LONGITUDE': [],          # Longitude of the sample location
        'SAMPLE ID': [],          # Unique identifier for the sample
        'REFERENCES': [],         # References related to the sample
        'ROCK no inc': [],        # Type of rock, excluding inclusions
        'SIO2(WT%)mean': [],      # Mean SiO2 (silica) weight percentage
        'Volcano Name': []        # Name of the associated volcano
    })



def rename_columns(df, db_type):
    """
    Renames specific columns and adds new fields to standardize the dataset across different sources.

    Args:
        df (pd.DataFrame): The dataframe to modify.
        db_type (str): The type of database the data belongs to (e.g., 'Georoc', 'GVP').

    Returns:
        pd.DataFrame: The modified dataframe with renamed columns and added fields.
    """
    # Rename key columns for consistency across datasets
    df = df.rename(columns={"LATITUDE": "Latitude", "LONGITUDE": "Longitude", "SAMPLE ID": "Name"})

    # Add a column specifying the source database type
    df['db'] = db_type

    # Initialize a placeholder for references
    df['refs'] = 'refs'

    # Replace db_type values with more descriptive labels
    db_type_mapping = {
        'Georoc': 'Rock sample (GEOROC)',
        'Georoc found': 'Matching rock sample (GEOROC)',
        'GVP with eruptions': 'Volcano with known eruption data (GVP)',
        'GVP no eruption': 'Volcano with no known eruption data (GVP)'
    }
    df['db'] = df['db'].replace(db_type_mapping)

    return df



def load_petdb_data(database, georoc_petdb_tect_setting, df_volcano, df_volcano_no_eruption):
    """
    Loads and processes PetDB data.

    Args:
        database (list): List of databases used.
        georoc_petdb_tect_setting: Settings that specify the inclusion of PetDB data.
        df_volcano: DataFrame containing volcano data.
        df_volcano_no_eruption: DataFrame for volcanoes with no eruptions.

    Returns:
        A DataFrame with processed PetDB data.
    """
    # Check if the PetDB data file exists in the specified directory and if PetDB is included in the settings
    if 'PetDBaroundGVP.csv' in os.listdir(GEOROC_DATASET_DIR) and 'PetDB' in database:
        # Load the PetDB data from the CSV file
        dfgeo = pd.read_csv(GEOROC_AROUND_PETDB_FILE)
        
        # Convert 'Volcano Name' from string representation of lists to actual lists
        dfgeo['Volcano Name'] = dfgeo['Volcano Name'].apply(lambda volcanoes: set(ast.literal_eval(volcanoes)))  # Convert string to set
        dfgeo['Volcano Name'] = dfgeo['Volcano Name'].apply(lambda volcanoes: [volcano_name.split(';') for volcano_name in volcanoes])  # Split names by ';'
        dfgeo['Volcano Name'] = dfgeo['Volcano Name'].apply(lambda volcanoes: list(set([item for sublist in volcanoes for item in sublist])))  # Flatten and deduplicate lists
        
        # Update volcano names with new tectonic settings
        dfgeo['Volcano Name'] = dfgeo['Volcano Name'].apply(lambda volcanoes: [find_new_tect_setting(volcano_name, df_volcano, df_volcano_no_eruption) for volcano_name in volcanoes if volcano_name != '']) 
        
        # Rename columns to standardize the DataFrame
        dfgeo = rename_columns(dfgeo, 'PetDB')
    else:
        # If PetDB data file does not exist or PetDB is not in settings, create an empty DataFrame or load the data
        dfgeo = create_petdb_around_gvp() if 'PetDB' in database else empty_petdb_df()

    # Rename specific columns for consistency
    dfgeo = dfgeo.rename(columns={"LATITUDE": "Latitude", "LONGITUDE": "Longitude"})
    
    # Add a new column to specify the data source
    dfgeo['db'] = 'PetDB'
    
    # Rename 'SAMPLE ID' column to 'Name'
    dfgeo = dfgeo.rename(columns={'SAMPLE ID': 'Name'})
    
    # If the 'REFERENCES' column exists, create a new column 'refs' to hold reference information
    if 'REFERENCES' in dfgeo.columns:
        dfgeo['refs'] = dfgeo['REFERENCES'] 
        for i in range(1, 11):
            dfgeo['refs'] = dfgeo['refs'].apply(lambda x: x[:i*80]+'<br>'+x[i*80:] if len(x)>i*80 else x)
        dfgeo['refs'] = dfgeo['refs'].apply(lambda x: x if len(x)<800 else x[:800]+'(...)')
    
    # Return the processed DataFrame
    return dfgeo



def load_and_preprocess_petdb_data(volcano):
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
        pdbloaded = pd.concat([pdbloaded, pdtmp])  # Append the filtered data to the combined DataFrame
        
    # Clean and standardize material names
    pdbloaded = pdbloaded.replace({'WHOLE ROCK': 'WR', 'GLASS': 'GL', 'INCLUSION': 'INC'})
    
    # Clean and standardize values with inequalities
    for c in ['LOI(WT%)', 'NA2O(WT%)']:
        pdbloaded[c] = pdbloaded[c].apply(lambda x: float(x.split('<')[1].strip())-0.01 if isinstance(x, str) else x)
    
    # Normalize FeO values using the provided normalization function
    pdbloaded = normalize_oxides_with_feot(pdbloaded)
    
    # Add rock names using the provided guess_rock function
    pdbloaded = guess_rock(pdbloaded)
    
    return pdbloaded

