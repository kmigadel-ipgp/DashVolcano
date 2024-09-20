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

from constants.paths import GEOROC_DATASET_DIR
from constants.tectonics import NEW_TECTONIC_SETTINGS
from constants.shared_data import set_volcano_data, set_eruption_data, set_dict, set_list, set_events_data, set_grnames, set_severity_colors


from dataloader.data_loader_gvp import load_and_preprocess_gvp_data
from dataloader.data_loader_georoc import load_and_preprocess_georoc_data


def generate_summary_statistics(df_volcano, df_eruption, df_volcano_no_eruption, grnames, dict_gvp_georoc):
    """
    Generates summary statistics of the loaded data and displays it.
    Args:
        df_volcano (pd.DataFrame): Volcano data.
        df_eruption (pd.DataFrame): Eruption data.
        df_volcano_no_eruption (pd.DataFrame): Volcanoes with no eruption data.
        grnames (list): Sorted list of Georoc names.
        dict_gvp_georoc (dict): Reverse dictionary mapping GVP names to Georoc names.
    """
    totalgvp = len(df_volcano.index)
    print('##########################################')
    print('#                                        #')
    print('# Basic Statistics                       #')
    print('#                                        #')
    print('##########################################')
    print('Number of GVP volcanoes: ', totalgvp + len(df_volcano_no_eruption.index))
    print('Number of GVP eruptions (confirmed): ', len(df_eruption.index))
    print('Number of volcanoes with known eruption(s): ', totalgvp)
    print('Number of GVP volcanoes with major rock 1: ', totalgvp + len(df_volcano_no_eruption.index) - len(df_volcano[df_volcano['Major Rock 1'].isin(['No Data (checked)', '\xa0'])].index) - len(df_volcano_no_eruption[df_volcano_no_eruption['Major Rock 1'].isin(['No Data (checked)', '\xa0'])].index))
    print('Number of GVP volcanoes with known eruption(s) and major rock 1: ', totalgvp - len(df_volcano[df_volcano['Major Rock 1'].isin(['No Data (checked)', '\xa0'])].index))
    print('')
    print('Number of GEOROC volcanoes: ', len(grnames))

    witheruptiondata = len(df_eruption[df_eruption['Volcano Name'].isin(list(dict_gvp_georoc.keys()))]['Volcano Name'].unique())
    print('Number of GEOROC volcanoes with eruption data: ', witheruptiondata)

    mrdf = pd.DataFrame()
    tect_GEOROC = [x.strip().replace(' ','_').replace('/',',') for x in NEW_TECTONIC_SETTINGS]

    for ts in tect_GEOROC:

        file_path = os.path.join(GEOROC_DATASET_DIR, str(ts) + '.txt')

        # If file exist in the folder, we read it
        if os.path.exists(file_path):
            thisdf = pd.read_csv(file_path)
            mrdf = pd.concat([mrdf, thisdf])
        else:
            print(str(ts) + '.txt does not yet exist but will be automatically generated.')

    if len(mrdf.index) > 0:    
        # have to take unique, because some volcanos are in different tectonic settings
        # restricts to whole rock to tally with app count
        print('Number of GEOROC volcanoes with rocks: ', len(mrdf[(mrdf['GEOROC Major Rock 1'] != 'No Data') & (mrdf['material'] == 'WR')]['Volcano Name'].unique()))

def load_data():
    """
    Loads and processes data from several datasets.
    """

    # Loads and preprocess GVP data
    df_volcano, df_eruption, df_volcano_no_eruption, lst_countries, lst_names, df_events, severity_colors = load_and_preprocess_gvp_data()

    # Loads and preprocess Georoc data
    dict_volcano_file, dict_georoc_gvp, dict_gvp_georoc, grnames, dict_georoc_sl, dict_georoc_ls = load_and_preprocess_georoc_data()

    set_volcano_data(df_volcano, df_volcano_no_eruption)
    set_eruption_data(df_eruption)
    set_list(lst_countries, lst_names)
    set_dict(dict_volcano_file, dict_georoc_gvp, dict_gvp_georoc, dict_georoc_sl, dict_georoc_ls)
    set_events_data(df_events)
    set_severity_colors(severity_colors)
    set_grnames(grnames)

    generate_summary_statistics(df_volcano, df_eruption, df_volcano_no_eruption, grnames, dict_gvp_georoc)
