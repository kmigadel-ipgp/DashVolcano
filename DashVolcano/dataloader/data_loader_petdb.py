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
# Last update: April 25 2024
# ************************************************************************************* #


import pandas as pd
import numpy as np
import ast

from constants.chemicals import OXIDES
from constants.paths import PETDB_GVP_DIR, PETDB_EARTHCHEM_DIR

from functions.georoc import with_FEOnorm, guess_rock



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

