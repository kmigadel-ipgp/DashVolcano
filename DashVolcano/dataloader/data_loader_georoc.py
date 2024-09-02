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


import os
import pandas as pd

from constants.paths import GEOROC_GVP_DIR


def load_and_preprocess_georoc_data():
    """
    Loads and preprocesses Georoc data, including volcano name mappings between Georoc and GVP datasets.
    Returns:
        dict_volcano_file (dict): Dictionary mapping Georoc volcano names to data files.
        dict_Georoc_GVP (dict): Dictionary mapping Georoc names to GVP names.
        dict_GVP_Georoc (dict): Reverse dictionary mapping GVP names to Georoc names.
        grnames (list): Sorted list of Georoc names for drop-down menus.
        dict_Georoc_sl (dict): Mapping of short names to long Georoc names.
        dict_Georoc_ls (dict): Reverse mapping of long Georoc names to short names.
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
    dict_Georoc_GVP = {}

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
                if newvalue in dict_Georoc_GVP.values():

                    # updates Georoc_GVP
                    # find old (existing key)
                    old_key = [k for k in dict_Georoc_GVP.keys() if dict_Georoc_GVP[k] == newvalue][0]
                    
                    # append Georoc rock names and removes duplicates
                    new_key = ','.join(sorted(set((old_key + ',' + nn).split(','))))  
                    
                    # add new key/value
                    dict_Georoc_GVP[new_key] = dict_Georoc_GVP.pop(old_key)

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
                    dict_Georoc_GVP[nn] = newvalue
            
            else:
                if newvalue in dict_Georoc_GVP.values():
                    # GVP data appears in more than one file, so update the file paths
                    dict_volcano_file[nn].append(fname + '.csv')
                else:
                    print("double key", nn)

    # between GVP (keys) and Georoc (value)
    dict_GVP_Georoc = {v: k for k, v in dict_Georoc_GVP.items()}

    # Handle long names
    longnames = [x for x in dict_Georoc_GVP.keys() if len(x) >= 80 and len(x.split(',')) >= 2]
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

    dict_Georoc_sl = {y.strip() + ' ('+ str(len(x.split(','))) + ' SITES)': x for x, y in zip(longnames, mostcommon)}
    dict_Georoc_ls = {lng: shrt for shrt, lng in dict_Georoc_sl.items()}

    grnames = list(dict_Georoc_GVP.keys())
    for kk, value in dict_Georoc_sl.items():
        grnames[grnames.index(value)] = kk

    grnames = sorted(grnames)

    return dict_volcano_file, dict_Georoc_GVP, dict_GVP_Georoc, grnames, dict_Georoc_sl, dict_Georoc_ls
