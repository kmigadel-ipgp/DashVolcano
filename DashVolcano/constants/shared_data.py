# Global variables
df_volcano = None
df_eruption = None
df_volcano_no_eruption = None
lst_countries = None
lst_names = None
df_events = None
severity_colors = None
dict_volcano_file = None
dict_georoc_gvp = None
dict_gvp_georoc = None
grnames = None
dict_georoc_sl = None
dict_georoc_ls = None


def set_volcano_data(volcano_data, volcano_no_eruption_data):
    global df_volcano, df_volcano_no_eruption
    df_volcano = volcano_data
    df_volcano_no_eruption = volcano_no_eruption_data


def set_eruption_data(eruption_data):
    global df_eruption
    df_eruption = eruption_data


def set_list(countries_data, names_data):
    global lst_countries, lst_names
    lst_countries = countries_data
    lst_names = names_data


def set_events_data(events_data):
    global df_events
    df_events = events_data


def set_dict(dict_volcano_file_data, dict_georoc_gvp_data, dict_gvp_georoc_data, dict_georoc_sl_data, dict_georoc_ls_data):
    global dict_volcano_file, dict_georoc_gvp, dict_gvp_georoc, dict_georoc_sl, dict_georoc_ls
    dict_volcano_file = dict_volcano_file_data
    dict_georoc_gvp = dict_georoc_gvp_data
    dict_gvp_georoc = dict_gvp_georoc_data
    dict_georoc_sl = dict_georoc_sl_data
    dict_georoc_ls = dict_georoc_ls_data

def set_severity_colors(severity_data):
    global severity_colors
    severity_colors = severity_data

def set_grnames(grnames_data):
    global grnames
    grnames = grnames_data