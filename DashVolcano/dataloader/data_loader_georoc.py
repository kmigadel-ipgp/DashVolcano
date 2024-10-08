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
import ast

from constants.paths import GEOROC_GVP_DIR, GEOROC_DATASET_DIR, GEOROC_AROUND_GVP_FILE

from helpers.helpers import process_lat_lon

from functions.georoc import createGEOROCaroundGVP

def empty_georoc_df():
    return pd.DataFrame({'LATITUDE MIN': [], 'LATITUDE MAX': [], 'LONGITUDE MIN': [], 'LONGITUDE MAX': [], 'SAMPLE NAME': [], 'CITATIONS': [], 'ROCK no inc': [], 'SIO2(WT%)mean': [], 'Volcano Name': [] })


def load_georoc_data(database):
    """
    Loads and processes GEOROC data.
    
    Args:
        database (list): List of databases used.
    Returns:
        pd.DataFrame: Processed GEOROC data, potentially filtered by volcano name.
    """
    if 'GEOROCaroundGVP.csv' in os.listdir(GEOROC_DATASET_DIR) and 'GEOROC' in database:
        df_georoc = pd.read_csv(GEOROC_AROUND_GVP_FILE)
        df_georoc['Volcano Name'] = df_georoc['Volcano Name'].apply(lambda x: list(set([name.replace('Within ', 'Intra') for name in ast.literal_eval(x)])))
    else:
        df_georoc = createGEOROCaroundGVP() if 'GEOROC' in database else empty_georoc_df()
    df_georoc = process_lat_lon(df_georoc)
    df_georoc['db'] = 'Georoc'
    df_georoc = df_georoc.rename(columns={'SAMPLE NAME': 'Name'})
    df_georoc = df_georoc.rename(columns={'CITATIONS': 'refs'})
    for i in range(1, 11):
        df_georoc['refs'] = df_georoc['refs'].apply(lambda x: x[:i*80]+'<br>'+x[i*80:] if len(x)>i*80 else x)
    df_georoc['refs'] = df_georoc['refs'].apply(lambda x: x if len(x)<800 else x[:800]+'(...)')  
    return df_georoc


def load_and_preprocess_georoc_data():
    """
    Loads and preprocesses Georoc data, including volcano name mappings between Georoc and GVP datasets.
    Returns:
        dict_volcano_file (dict): Dictionary mapping Georoc volcano names to data files.
        dict_georoc_gvp (dict): Dictionary mapping Georoc names to GVP names.
        dict_gvp_georoc (dict): Reverse dictionary mapping GVP names to Georoc names.
        grnames (list): Sorted list of Georoc names for drop-down menus.
        dict_georoc_sl (dict): Mapping of short names to long Georoc names.
        dict_georoc_ls (dict): Reverse mapping of long Georoc names to short names.
    """
    # Collect all arcs files in the mapping directory
    lst_arcs_ = []
    path_for_arcs = os.listdir(GEOROC_GVP_DIR)
    for folder in path_for_arcs:
        folder_path = os.path.join(GEOROC_GVP_DIR, folder)
        # lists files in each folder
        tmp = os.listdir(folder_path)
        # adds the path to include directory if file is not empty
        # and removes the extension (.txt)
        lst_arcs_ += [os.path.join(folder, f)[:-4] for f in tmp if os.path.getsize(os.path.join(folder_path, f)) != 0]

    # Initialize dictionaries
    dict_volcano_file = {}
    dict_georoc_gvp = {}

    for fname in lst_arcs_:
        fnameext = fname + '.txt'

        # open mapping file
        nameconv = pd.read_csv(os.path.join(GEOROC_GVP_DIR, fnameext), delimiter=';')
        
        # Georoc names are from the column GEOROC
        for nn in nameconv['GEOROC']:

            # new value for this key
            newvalue = list(nameconv[nameconv['GEOROC'] == nn].values)[0][0]

            # if key not yet in the dictionary
            if nn not in dict_volcano_file.keys():

                # if new value (that is GVP name) is already in dictionary
                # this happens when one volcano has data in different arc files
                if newvalue in dict_georoc_gvp.values():

                    # updates Georoc_GVP
                    # find old (existing key)
                    old_key = [k for k in dict_georoc_gvp.keys() if dict_georoc_gvp[k] == newvalue][0]
                    
                    # append Georoc rock names and removes duplicates
                    new_key = ','.join(sorted(set((old_key + ',' + nn).split(','))))  
                    
                    # add new key/value
                    dict_georoc_gvp[new_key] = dict_georoc_gvp.pop(old_key)

                    # removes the old key (only if different, otherwise this deletes the record)
                    if new_key != old_key:
                        

                        # then updates volcano_file
                        # if no new file name, just update the key
                        dict_volcano_file[new_key] = dict_volcano_file.pop(old_key)

                        # if new file name
                        if fname + '.csv' not in dict_volcano_file[new_key]:
                            dict_volcano_file[new_key].append(fname + '.csv')
                        
                        

                    # when both keys are the same (new clause) 
                    else:
                        dict_volcano_file[new_key].append(fname + '.csv')
            
                # just add new key and new value      
                else:
                    dict_volcano_file[nn] = [fname + '.csv']
                    dict_georoc_gvp[nn] = newvalue
            
            else:
                if newvalue in dict_georoc_gvp.values():
                    # GVP data appears in more than one file, so update the file paths
                    dict_volcano_file[nn].append(fname + '.csv')
                else:
                    print("double key", nn)

    # between GVP (keys) and Georoc (value)
    dict_gvp_georoc = {v: k for k, v in dict_georoc_gvp.items()}

    # Handle long names
    longnames = [x for x in dict_georoc_gvp.keys() if len(x) >= 80 and len(x.split(',')) >= 2]
    mostcommon = []
    for x in longnames:
        longstrip = [y.strip() for y in x.replace('-', ',').split(',')]
        cnt = [longstrip.count(word) for word in longstrip]
        maxcnt = max(cnt)
        smallword = min(longstrip, key=len)
        if maxcnt > 1:
            mostcommon.append('SOUFRIERE GUADELOUPE' if 'GRANDE DECOUVERTE' in longstrip else longstrip[cnt.index(maxcnt)])
        elif sum([smallword in word for word in longstrip]) >= 2:
            mostcommon.append(smallword)
        elif any(['MOUNT' in word for word in longstrip]):
            mostcommon.append([word for word in longstrip if 'MOUNT' in word][0])
        elif 'VULSINI (VULSINI VOLCANIC DISTRICT)' in longstrip:
            mostcommon.append('VULSINI VOLCANIC DISTRICT')
        elif 'ZEALANDIA BANK' in longstrip:
            mostcommon.append('ZEALANDIA BANK')
        elif 'SUMISUJIMA' in longstrip:
            mostcommon.append('SUMISUJIMA')
        else:
            print('missing name for', longstrip)
            mostcommon.append(smallword)

    dict_georoc_sl = {y.strip() + ' ('+ str(len(x.split(','))) + ' SITES)': x for x, y in zip(longnames, mostcommon)}
    dict_georoc_ls = {lng: shrt for shrt, lng in dict_georoc_sl.items()}

    grnames = list(dict_georoc_gvp.keys())
    for kk, value in dict_georoc_sl.items():
        grnames[grnames.index(value)] = kk

    grnames = sorted(grnames)

    return dict_volcano_file, dict_georoc_gvp, dict_gvp_georoc, grnames, dict_georoc_sl, dict_georoc_ls
