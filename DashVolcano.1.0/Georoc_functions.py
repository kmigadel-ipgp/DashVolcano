# ************************************************************************************ #
#
# This file contains functions to manipulate GEOROC data.
# Function used once may also be present in pages, but functions used
# at least twice are in this file for GEOROC, and in the corresponding
# file for GVP.
#
# 1) load_georoc: loads GEOROC data for a given volcano.
# 2) fix_path: finds the latest file, in case two downloaded versions exist
# 3) fix_inclusion: the inclusion file has a different format than other files;
#                   this function makes inclusion data in the same format as the rest.
# 4) with_feonorm: this function computes an FEO normalization of the data.
# 5) guess_rock: associates a rock name based on chemicals and TAS diagram.
# 6) extract_date: extract date information, if any, from the field LOCATION COMMENTS.
# 7) plot_tas: draws the TAS background.
# 8) detects_chems: finds abnormal chemicals.
# 9) plot_chem: plots the samples on a TAS diagram.
# 10) match_gvpdates: given a Georoc date, matches GVP date based on year.
# 11) update_chemchart: updates the plots based on dates.
# 12) update_onedropdown: creates menus for filtering data per date.
# 13) create_georoc_around_gvp: creates a dataframe of GEOROC samples around GVP volcanoes
#
# Author: F. Oggier
# Last update: Jan 25 2023
# ******************************************************************************* #

from config_variables import *
import plotly.graph_objs as go
from numpy.linalg import inv
import re


def load_georoc(thisvolcano):
    """

    Args:
        thisvolcano: name of a GEOROC volcano, as computed in dict_Georoc_GVP.keys()

    Returns:
        a data frame with the GEOROC data corresponding to the volcano given as input.
        Location matches are looked for both in the column LOCATION and LOCATION COMMENTS.
        Manual data inputs are automatically searched.
        Also:
            * a column GUESSED ROCK is added with the name of a rock based on the chemical
              composition found,
            * if the eruption year is missing, the LOCATION COMMENTS is searched for possible dates,
              then the eruption year is updated accordingly.
            * FEO normalization is applied to the chemical composition.

    HARD CODED DATA WARNING 1: SUMBING JAVA and SUMBING SUMATRA needed manual disambiguation.
    HARD CODED DATA WARNING 2: SANTIAGO (JAMES, SAN SALVADOR) is dealt manually because commas are used as
                               delimiters, having one in name is a mess.
    POSSIBLE SOURCE OF PROBLEM: manual inputs for known volcanoes were tested, added new data for volcanoes
                                that not exist in the GEOROC dataase could be a problem, to be kept in mind.

    """
    colsloc = ['LOCATION-1', 'LOCATION-2', 'LOCATION-3', 'LOCATION-4', 'LOCATION-5',
               'LOCATION-6', 'LOCATION-7', 'LOCATION-8', 'LOCATION-9']           

    # handles long names
    if thisvolcano in dict_Georoc_sl.keys():
        thisvolcano = dict_Georoc_sl[thisvolcano]

    # files containing this volcano
    all_pathcsv = dict_volcano_file[thisvolcano]
    
    dfloaded = pd.DataFrame()
    for pathcsv in all_pathcsv:
        # find the latest version of the file to use
        pathcsv = fix_pathname(pathcsv)
        print('GEOROC file used:', pathcsv)
    
        dftmp = pd.read_csv("../GeorocDataset/%s" % pathcsv, low_memory=False, encoding='latin1')
        
        if 'Inclusions_comp' in pathcsv:
            # updates columns to have the same format as dataframes from other files
            dftmp = fix_inclusion(dftmp)
            
        # add manual samples
        elif 'ManualDataset' in pathcsv:
            # in case some columns are missing
            for cl in ['LATITUDE MIN', 'LATITUDE MAX', 'LONGITUDE MIN', 'LONGITUDE MAX', 'SAMPLE NAME'] +\
                      chemcols+colsrock+missing_oxides:
                if not(cl in list(dftmp)):
                    dftmp[cl] = np.nan
            # makes sure captial letters are used
            dftmp['TECTONIC SETTING'] = dftmp['TECTONIC SETTING'].str.upper()
            dftmp['LOCATION'] = dftmp['LOCATION'].str.upper()
          
        else:
            # keep only volcanic rocks
            dftmp = dftmp[dftmp['ROCK TYPE'] == 'VOL']
            dftmp = dftmp[['LOCATION'] + ['LATITUDE MIN', 'LATITUDE MAX', 'LONGITUDE MIN', 'LONGITUDE MAX',
                                          'SAMPLE NAME']+chemcols+colsrock+missing_oxides]
          
        # dfloaded = dfloaded.append(dftmp)
        dfloaded = dftmp.copy()
  
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
            # dftmp = dftmp.append(dfloaded[dfloaded[cls].isin(all_names)])
            dftmp = pd.concat([dftmp, dfloaded[dfloaded[cls].isin(all_names)]], ignore_index=True)
            
        
        # in case same match is found through several columns
        dfloaded = dftmp.drop_duplicates().copy()

    # no matter in which column the match was found, the correct name is always put in LOCATION-4
    if thisvolcano in dict_Georoc_sl.values():
        dfloaded.loc[:, 'LOCATION-4'] = ' ' + dict_Georoc_ls[thisvolcano]
    else:
        dfloaded.loc[:, 'LOCATION-4'] = ' ' + thisvolcano

    # adds dates from LOCATION COMMENT
    # finds the dates
    dfloaded.loc[:, 'GUESSED DATE'] = dfloaded['LOCATION COMMENT'].astype(str).fillna('').apply(extract_date)
    # replace NaN in ERUPTION YEAR 
    dfloaded.loc[:, 'ERUPTION YEAR'] = dfloaded['ERUPTION YEAR'].fillna(dfloaded['GUESSED DATE'])
    
    # add normalization 
    dfloaded = with_feonorm(dfloaded)
    
    # adds names to rocks whose name was not given
    dfloaded = guess_rock(dfloaded)
    
    return dfloaded


def fix_pathname(thisarc):
    """

    Args:
        thisarc: file name without any suffix

    Returns:
        file name with the right suffix (which contains the date of the latest download)

    """   
    
    if not('ManualDataset' in thisarc):
        
        folder, filename = thisarc.split('/')
        # lists files in the folder
        tmp = os.listdir('../GeorocDataset/%s' % folder)
        # now because of the new name, needs to find the file with the right suffix
        # in fact it is worse, since they changed the concatenation of words
        # so first replace hyphen and underscores with spaces, then split with respect to spaces
        words = filename.replace('-', ' ').replace('_', ' ').split(' ')
        # next find filenames that contain all the words
        # there could be several, it is assumed that the year comes first then the month
        # this should put the most recent file first
        newname = sorted([x for x in tmp if all(y in x for y in words)])[::-1]
        # if there is no year, it will come first, and it shouldn't
        if len(newname) > 1 and not(newname[0][0].isdigit()):
            # put the file name with no date at the end
            newname.insert(len(newname), newname.pop(0))
        
        thisarc = folder+'/'+newname[0]

    return thisarc
    

def fix_inclusion(thisdf):
    """

    Args:
        thisdf: GEOROC dataframe loaded from the Inclusion file

    Returns:
        the same dataframe with updated columns to match the format of dataframes from other files

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
            
    # missing chemical columns
    for cl in ['H2OT(WT%)', 'CL2(WT%)', 'CO1(WT%)', 'CH4(WT%)', 'SO4(WT%)', 'P2O5(WT%)']:
        thisdf[cl] = np.nan

    # choice of columns
    thisdf = thisdf[['LOCATION'] + ['LATITUDE MIN', 'LATITUDE MAX', 'LONGITUDE MIN', 'LONGITUDE MAX',
                                    'SAMPLE NAME'] + chemcols+colsrock+missing_oxides]
            
    # some chemicals have two numbers instead of one, keeping the first one of the pair
    for ch in chemcols:
        nofloat = [x for x in list(thisdf[ch].unique()) if (type(x) == str and '\\' in x)]
        newvalues = {}
        for x in nofloat:
            # choose the first value of the pair
            newvalues[x] = x.split('\\')[0].strip() 
    
        # replaces the pairs by their first value
        # thisdf[ch].replace(to_replace=newvalues, inplace=True)
        thisdf[ch] = thisdf[ch].replace(newvalues)
    
    return thisdf
    

def with_feonorm(thisdf):
    """

    Args:
        thisdf: GEOROC dataframe for one volcano
        
    Returns:
        Among oxydes, we have 'FE2O3(WT%)', 'FEO(WT%)', 'FEOT(WT%)'.
        If FEOT is here, discard the other two, otherwise computes FEOT based on the other two.
        The dataframe with normalized oxides is returned.

    """    
    
    # cleans up, oxides include LOI
    for col in oxides:
        # in case two measurements
        nofloat = [x for x in list(thisdf[col].unique()) if (type(x) == str and '\\' in x)]
        newvalues = {}
        for x in nofloat:
            # choose the first value of the pair
            newvalues[x] = x.split('\\')[0].strip() 
        
        # replaces the pairs by their first value
        # thisdf[col].replace(to_replace=newvalues, inplace=True)
        thisdf[col] = thisdf[col].replace(newvalues)
    
    #  replaces missing oxides and LOI data with 0
    thisdf[oxides] = thisdf[oxides].fillna(0).astype(float)
    # when FEOT(WT%) is available, disregard FE2O3(WT%) and FEO(WT%)
    # list of oxides to be considered shortened (Jan 25 2023)
    oxides_nofe =  ['SIO2(WT%)', 'TIO2(WT%)', 'AL2O3(WT%)', 'FE2O3(WT%)', 'FEO(WT%)', 'FEOT(WT%)', 'CAO(WT%)', 'MGO(WT%)', 'MNO(WT%)', 'K2O(WT%)', 'NA2O(WT%)', 'P2O5(WT%)']
    # When FEOT(WT%) is not available or empty, then FEOT(WT%) = FE2O3(WT%)/1.111 + FEO(WT%)   
    thisdf.loc[:, 'FEOT(WT%)'] = np.where(thisdf['FEOT(WT%)'] == 0, (thisdf['FE2O3(WT%)']/1.111)+thisdf['FEO(WT%)'],
                                   thisdf['FEOT(WT%)'])
   
    # the numerator is the sum of the oxides without FE203 and FEO
    # LOI shouldn't be taken, and should further be removed
    num = thisdf[oxides_nofe].sum(axis=1)-thisdf['LOI(WT%)']
    
    for col in oxides_nofe:
        # normalizes    
        thisdf.loc[:, col] = thisdf[col]*(100/num)
    
    return thisdf


def guess_rock(thisdf):
    """

    Args:
        thisdf: GEOROC dataframe for one volcano

    Returns:
        the same dataframe, with a new column called ROCK,
        which contains the name of a rock based on the TAS diagram.

    """
    # adds a new column that stores the guessed name
    thisdf.loc[:, 'ROCK'] = ['UNNAMED']*len(thisdf.index)
    
    # x- and y-axis from the TAS diagram
    x = thisdf['SIO2(WT%)'].astype('float')
    y = (thisdf['NA2O(WT%)'].astype('float') + thisdf['K2O(WT%)'].astype('float'))
    # x and y are greater than 0 (in fact both components of the sum y are greater than 0)
    cond1 = (thisdf['SIO2(WT%)'].astype('float') > 0) & (thisdf['NA2O(WT%)'].astype('float') > 0) & \
            (thisdf['K2O(WT%)'].astype('float') > 0)
    # lower anti-diagonal 1
    # a,b in ax+b
    ab = np.dot(inv(np.array([[52., 1.], [57., 1.]])), np.array([[5], [5.9]]))
    cond_ab = float(ab[0])*x+float(ab[1]) >= y
    cond_ba = float(ab[0])*x+float(ab[1]) < y
    # anti-diagonal 2
    # a,b in ax+b
    ab2 = np.dot(inv(np.array([[45., 1.], [49.4, 1.]])), np.array([[5], [7.3]]))
    cond_ab2 = float(ab2[0])*x+float(ab2[1]) < y
    cond_ba2 = float(ab2[0])*x+float(ab2[1]) >= y
    # upper anti-diagonal 3
    ab3 = np.dot(inv(np.array([[41., 1.], [52.5, 1.]])), np.array([[7], [14]]))
    # cond_ab3 = float(ab3[0])*x+float(ab3[1]) < y
    cond_ba3 = float(ab3[0])*x+float(ab3[1]) >= y
    # lower diagonal
    cd = np.dot(inv(np.array([[49.4, 1.], [52., 1.]])), np.array([[7.3], [5.]]))
    cond_cd = float(cd[0])*x+float(cd[1]) < y
    cond_dc = float(cd[0])*x+float(cd[1]) >= y
    # diagonal
    cd2 = np.dot(inv(np.array([[53., 1.], [57., 1.]])), np.array([[9.3], [5.9]]))
    cond_cd2 = float(cd2[0])*x+float(cd2[1]) < y
    cond_dc2 = float(cd2[0])*x+float(cd2[1]) >= y
    # upper diagonal
    cd3 = np.dot(inv(np.array([[57.6, 1.], [63., 1.]])), np.array([[11.7], [7.]]))
    cond_cd3 = float(cd3[0])*x+float(cd3[1]) < y
    cond_dc3 = float(cd3[0])*x+float(cd3[1]) >= y
    # lower diagonal
    ef = np.dot(inv(np.array([[49.4, 1.], [45., 1.]])), np.array([[7.3], [9.4]]))
    cond_ef = float(ef[0])*x+float(ef[1]) < y
    cond_fe = float(ef[0])*x+float(ef[1]) >= y
    # diagonal
    ef2 = np.dot(inv(np.array([[53., 1.], [48.4, 1.]])), np.array([[9.3], [11.5]]))
    cond_ef2 = float(ef2[0])*x+float(ef2[1]) < y
    cond_fe2 = float(ef2[0])*x+float(ef2[1]) >= y
    # upper diagonal
    ef3 = np.dot(inv(np.array([[57.6, 1.], [52.5, 1.]])), np.array([[11.7], [14.]]))
    cond_ef3 = float(ef3[0])*x+float(ef3[1]) < y
    cond_fe3 = float(ef3[0])*x+float(ef3[1]) >= y

    # else will be FOIDITE
    thisdf.loc[cond1, 'ROCK'] = 'FOIDITE'

    # basalt
    thisdf.loc[cond1 & (x >= 45) & (x < 52) & (y < 5), 'ROCK'] = 'BASALT'

    # basaltic andesite
    thisdf.loc[cond1 & (x >= 52) & (x < 57) & cond_ab, 'ROCK'] = 'BASALTIC ANDESITE'

    # andesite
    thisdf.loc[cond1 & (x >= 57) & (x < 63) & cond_ab, 'ROCK'] = 'ANDESITE'

    # dacite
    # a,b in ax+b 
    d = np.dot(inv(np.array([[76., 1.], [69., 1.]])), np.array([[1.], [8.]]))
    cond_d1 = (x >= 63) & (float(d[0])*x + float(d[1]) >= y)
    thisdf.loc[cond1 & cond_d1 & cond_ab, 'ROCK'] = 'DACITE'

    # trachy-basalt
    thisdf.loc[(y >= 5) & cond_dc & cond_ba2, 'ROCK'] = 'TRACHYBASALT'

    # basaltic trachy-andesite
    thisdf.loc[cond_ba & cond_ba2 & cond_cd & cond_dc2, 'ROCK'] = 'BASALTIC TRACHYANDESITE'

    # trachy-andesite
    thisdf.loc[cond_ba & cond_ba2 & cond_cd2 & cond_dc3, 'ROCK'] = 'TRACHYANDESITE'
    
    # trachy-dacite
    thisdf.loc[cond_ba & cond_ba2 & cond_cd3 & (x < 69), 'ROCK'] = 'TRACHYTE'

    # rhyolite
    # a,b in ax+b
    cond_r1 = (float(d[0])*x + float(d[1]) < y)
    thisdf.loc[cond1 & cond_r1 & (x >= 69), 'ROCK'] = 'RHYOLITE'

    # phonolite
    thisdf.loc[cond_ab2 & cond_ef3, 'ROCK'] = 'PHONOLITE'

    # tephri-phonolite
    thisdf.loc[cond_ab2 & cond_fe3 & cond_ef2 & cond_ba3, 'ROCK'] = 'TEPHRI-PHONOLITE'

    # phono-tephrite
    thisdf.loc[cond_ab2 & cond_fe2 & cond_ef & cond_ba3, 'ROCK'] = 'PHONO-TEPHRITE'

    # tephrite
    # a,b in ax+b
    t = np.dot(inv(np.array([[41., 1.], [45., 1.]])), np.array([[7.], [5.]]))
    cond_t1 = (float(t[0])*x + float(t[1]) <= y) & cond_ab2 & cond_ba3 & cond_fe
    cond_t2 = (float(t[0])*x + float(t[1]) >= y) & (y >= 3) & (x >= 41) & (x < 45)
    thisdf.loc[cond_t1 | cond_t2, 'ROCK'] = 'TEPHRITE'

    # picro-basalt
    thisdf.loc[cond1 & (y < 3) & (x >= 41) & (x < 45), 'ROCK'] = 'PICROBASALT'

    return thisdf


def extract_date(entry):
    """

        Args:
            entry: an ENTRY from LOCATION COMMENT

        Returns:
            date, if any, found in the LOCATION COMMENT

        """
    
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
        fndmonth = re.findall('(JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)|AUG(?:UST)?'
                              '|SEPT(?:EMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?) ([0-9,\s]*)', entry)
        # looks for AD
        fndad = re.findall('([0-9-.\s]{3,} AD)', entry) + re.findall('([0-9-.\s]{3,} A. D.)', entry)
        # looks for BETWEEN
        fndbetw = re.findall('BETWEEN [0-9]* AND [0-9]*', entry)
        # looks for ERUPTION YEAR(s)
        fndey = re.findall('ERUPTION YEAR [0-9]*', entry) + re.findall('ERUPTION YEARS [0-9]*', entry)
        # looks for dates separated by /
        fnddat = re.findall('\d*/\d*/\d*', entry)
        fnd = fnd1 + fnd2 + fnd3 + fndmonth + fndad + fndbetw + fndey + fnddat
        
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


def plot_tas(thisfig):
    """

    Args:
        thisfig: the figure to be updated

    Returns:
        Plots a TAS diagram in the background

    """
    xx = [[41, 41, 45, 45], [45, 45, 52, 52], [52, 52, 57, 57], [57, 57, 63, 63], [63, 63, 69, 77],
          [41, 41, 45, 49.4, 45, 45, 41], [45, 49.4, 52, 45], [45, 48.4, 53, 49.4, 45], [49.4, 53, 57, 52, 49.4],
          [53, 48.4, 52.5, 57.6, 53], [53, 57.6, 63, 57, 53]]
    yy = [[0, 3, 3, 0], [0, 5, 5, 0], [0, 5, 5.9, 0], [0, 5.9, 7, 0], [0, 7, 8, 0],
          [3, 7, 9.4, 7.3, 5, 3, 3], [5, 7.3, 5, 5], [9.4, 11.5, 9.3, 7.3, 9.4], [7.3, 9.3, 5.9, 5, 7.3],
          [9.3, 11.5, 14, 11.7, 9.3], [9.3, 11.7, 7, 5.9, 9.3]]
    tasnames = ['picro-basalt', 'basalt', 'basaltic andesite', 'andesite', 'dacite',
                'tephrite', 'trachybasalt', 'phono-tephrite', 'basaltic trachyandesite',
                'tephri-phonolite', 'trachyandesite']

    for (x, y) in zip(xx, yy):
        thisfig.add_trace(
            go.Scatter(
                x=x,
                y=y,
                mode='lines',
                line=dict(color='grey'),
                fill='toself',
                fillcolor='lightblue',
                opacity=0.2,
                name=tasnames[xx.index(x)],
                showlegend=False
            ),
        )
    # add ryholite
    thisfig.add_trace(
        go.Scatter(
            x=[69, 69],
            y=[8, 13],
            mode='lines',
            line=dict(color='lightgrey'),
            showlegend=False
        ),
    )
    thisfig.add_trace(
        go.Scatter(
            x=[69, 69, 77, 77, 69],
            y=[8, 13, 13, 0, 8],
            mode='none',
            fill='toself',
            fillcolor='lightblue',
            opacity=0.2,
            name='rhyolite',
            showlegend=False
        ),
    )
    # add trachyte
    # a = 0.562, b=-20.8
    thisfig.add_trace(
        go.Scatter(
            x=[57.8, 65],
            y=[11.7, 15.7],
            mode='lines',
            line=dict(color='lightgrey'),
            showlegend=False
        ),
    )
    thisfig.add_trace(
        go.Scatter(
            x=[57.8, 65, 69, 69, 63, 57.8],
            y=[11.7, 15.7, 13, 8, 7, 11.7],
            mode='none',
            fill='toself',
            fillcolor='lightblue',
            opacity=0.2,
            name='trachyte,<br>trachydacite',
            showlegend=False
        ),
    )
    # add phonolyte
    # a = -0.433, b=36.783
    thisfig.add_trace(
        go.Scatter(
            x=[50, 52.5],
            y=[15.13, 14],
            mode='lines',
            line=dict(color='lightgrey'),
            showlegend=False
        ),
    )
    thisfig.add_trace(
        go.Scatter(
            x=[50, 65, 57.8, 50],
            y=[15.13, 15.7, 11.7, 15.13],
            mode='none',
            fill='toself',
            fillcolor='lightblue',
            opacity=0.2,
            name='phonolyte',
            showlegend=False
        ),
    )

    thisfig.update_layout(xaxis_range=[30, 80], yaxis_range=[0, 20])

    return thisfig


def detects_chems(thisdf, chem1, chem2, theselbls):
    """

    Args:
        thisdf: a dataframe of chemicals
        chem1: list (synthax) for usual chemicals
               first is SIO2, second is NA20, 3rd id K20
        chem2: list (synthax) for more chemical
        theselbls: a set of labels for GEOROC, one for PetDB

    Returns:
        an updated dataframe containing the data for a TAS plot
        also, abnormal other chemicals are computed
        theselbls: a set of labels for GEOROC, one for PetDB

    """
    # replaces nan with 0
    thisdf = thisdf.fillna(0)
   
    # removes if 80 >= SIO2 is > 0
    thisdf = thisdf[(thisdf[chem1[0]] <= 80) & (thisdf[chem1[0]] > 0) & (thisdf['FEOT(WT%)'] > 0)]
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


def plot_chem(thisfig, thisdf, chem1, theselbls):
    """

    Args:
        thisfig: figure to be updated
        thisdf: dataframe from Georoc
        chem1: list (synthax) for usual chemicals
               first is SIO2, second is NA20, 3rd id K20
        theselbls: a set of labels for GEOROC, one for PetDB

    Returns:
        Plots a scatter plot of the chemical composition

    """
    # if theselbls == lbls2:
    #    thiscolorscale = colorscale2
    # else:
    #    thiscolorscale = colorscale
     
    # if dataframe contains VEI info, this plots different symbols depending on VEI       
    if 'VEI' in list(thisdf):
        thisdf['symbol'] = np.where(thisdf['VEI'].isnull(), 'circle', 
                                    (np.where(thisdf['VEI'].astype('float') <= 2, 'circle', 'triangle-up')))
    else:
        oldvalues = [x for x in list(thisdf['MATERIAL'].unique()) if (type(x) == str and '[' in x)]
        newvalues = {}
        for x in oldvalues:
            newvalues[x] = x.split('[')[0].strip() 
        thisdf['MATERIAL'] = thisdf['MATERIAL'].replace(newvalues)
        # in case some MATERIAL entry are missing or off
        thisdf.loc[~thisdf['MATERIAL'].isin(['WR', 'GL', 'INC', 'MIN']), 'MATERIAL'] = 'UNKNOWN'
        # adjusts symbol based on material
        thisdf['symbol'] = thisdf['MATERIAL'].replace(to_replace={'WR': 'circle', 'GL': 'diamond',
                                                                  'INC': 'square', 'MIN': 'x',
                                                                  'UNKNOWN': 'diamond-wide'})
        
    # plots by symbols (that is material)
    if 'VEI' in list(thisdf):
        full_symbol = {'circle': 'VEI<=2', 'triangle-up': 'VEI>=3'}
        short_symbol = ['circle', 'triangle-up'] 
    else:
        full_symbol = {'circle': 'whole rock', 'diamond': 'volcanic glass', 'square': 'inclusion',
                       'x': 'mineral', 'diamond-wide': 'UNKNKOWN'}
        short_symbol = ['circle', 'diamond', 'square', 'x', 'diamond-wide'] 
    
    for symbol in short_symbol:
        thismat = thisdf[thisdf['symbol'] == symbol]
        
        # custom data
        if 'VEI' in list(thisdf):
            thiscustomdata = thismat[chem1[1]].astype(str)+' '+chem1[1]+' '+thismat['MATERIAL']+' VEI='+thismat['VEI']
        else:
            thiscustomdata = thismat[chem1[1]].astype(str)+' '+chem1[1]
        
        # plots
        thisfig.add_trace(
            go.Scatter(
                x=thismat[chem1[0]],
                y=thismat[chem1[1]+'+'+chem1[2]],
                customdata=thiscustomdata,
                hovertemplate='x=%{x}<br>y=%{y}<br>%{customdata}',
                mode='markers',
                marker_symbol=thismat['symbol'],
                marker=dict(color='cornflowerblue'),
                name=full_symbol[symbol],
                showlegend=True,
            ),
        )
        
    # styles the markers
    thisfig.update_traces(marker=dict(size=12,
                                      line=dict(width=2,
                                                color='DarkSlateGrey'))
                          # selector=dict(mode='markers')
                          )
    if theselbls == lbls2:
        title = 'Chemical Rock Composition from PetDB'
    else:
        title = 'Chemical Rock Composition from Georoc'

    thisfig.update_layout(
        title='<b>'+title+'</b>',
        xaxis_title='SiO<sub>2</sub>(wt%)',
        yaxis_title='Na<sub>2</sub>O+K<sub>2</sub>O(wt%)',
        width=1.5*600,
        height=600,
    )

    return thisfig
    
    
def match_gvpdates(volcano_name, date, gvpvname):
    """

    Args:
        volcano_name: GEOROC name
        date: GEOROC date, it can also take the value "forall", in which case it maps all GEOROC dates to GVP dates
        gvpvname: GVP volcano name
    Returns:
        matching GVP dates, it is a pair for a single GEOROC date, and a list of pairs for all GEOROC dates,
        the matching is done based on years

    """
    
    date_gvp = []   
    
    # retrieves dates from georoc
    dfgeoroc = load_georoc(volcano_name)
    dvv = dfgeoroc[dfgeoroc['LOCATION-4'] == ' ' + volcano_name]
    dmy = dvv[['ERUPTION DAY', 'ERUPTION MONTH', 'ERUPTION YEAR']]
    dmy = dmy.dropna(how='all')
    
    if len(dmy.index) > 0:
        # dates from GVP
        gvpdate = df[df['Volcano Name'] == gvpvname].drop(['Start Year', 'End Year'], axis=1)
        gvpdate['Start Year'] = pd.to_numeric(df['Start Year'])
        gvpdate['End Year'] = pd.to_numeric(df['End Year'])
        # if NaN for 'End Year', uses 'Start Year'
        gvpdate['End Year'] = gvpdate.apply(
            lambda row: row['Start Year'] if pd.isnull(row['End Year']) else row['End Year'], axis=1)

        if not(date == 'forall'):
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
            fnd = gvpdate[(gvpdate['Start Year'] <= gy) & (gvpdate['End Year'] == gy)]
            if len(fnd.index) > 0:
                # gvp
                if not(date == 'forall'):
                    start_year = int(fnd['Start Year'].iloc[0])  # Use .iloc[0] for single value access
                    end_year = int(fnd['End Year'].iloc[0])  # Use .iloc[0] for single value access
                    date_gvp = [str(start_year), str(end_year)]
                else:
                    date_gvp = fnd[['Start Year', 'End Year']].astype(int).astype(str).values
            else:
                fndbefore = gvpdate[(gvpdate['Start Year'].astype(int) <= gy) & (gvpdate['End Year'].astype(int) > gy)]
                if len(fndbefore.index) > 0:
                    # this if condition is in case not confirmed eruptions are considered
                    # in the new Excel, only confirmed eruptions are here
                    if fndbefore.iloc[0]['Eruption Category'] == 'Confirmed Eruption':
                        rwidx = 0
                    elif fndbefore.iloc[1]['Eruption Category'] == 'Confirmed Eruption':
                        rwidx = 1
                    else:
                        rwidx = 2
                    if not(date == 'forall'):    
                        date_gvp = [str(int(fndbefore.iloc[rwidx]['Start Year'])),
                                    str(int(fndbefore.iloc[rwidx]['End Year']))]         
                    else:
                        date_gvp = [[str(int(fndbefore.iloc[rwidx]['Start Year'])),
                                    str(int(fndbefore.iloc[rwidx]['End Year']))]] 
                else:
                    date_gvp = ['not found']              
            
            for dg in date_gvp:
                if type(dg) != str: 
                    all_dates_gvp.append([gy, dg])
                         
        if date == 'forall':
            date_gvp = all_dates_gvp
                            
    return date_gvp

    
def update_chemchart(thisvolcano_name, thisfig, thisdate):
    """

    Args:
        thisvolcano_name: name of a volcano
        thisfig: the figure being updated
        thisdate: the eruption dates, possibly all

    Returns:
        Updates both the chemical plot based on user's inputs,
        Also the dataframe used to draw the plot

    """

    # checks if data is present
    if not (thisvolcano_name is None) and not (thisvolcano_name == "start") and thisvolcano_name.upper() in grnames:
        # loads data
        dfgeoroc = load_georoc(thisvolcano_name)
        # extracts by name
        # removes the nan rows for the 3 chemicals of interest
        dff = dfgeoroc.dropna(
            subset=['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], how='all')
          
        # update dff to detect abnormal chemicals
        dff = detects_chems(dff, ['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], morechems, lbls)   
               
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
            
    else:
        # empty dataframe with right columns
        d = {'SIO2(WT%)': [], 'NA2O(WT%)': [], 'TIO2(WT%)': [], 'AL2O3(WT%)': [], 'FEOT(WT%)': [],
             'K2O(WT%)': [], 'NA2O(WT%)+K2O(WT%)': [], 'color': [], 'P2O5(WT%)': [],
             'FEO(WT%)': [], 'CAO(WT%)': [], 'MGO(WT%)': [], 'ERUPTION YEAR': [], 'MATERIAL': []}
        dff = pd.DataFrame(data=d)

    # adds the TAS layout
    thisfig = plot_tas(thisfig)
    # draws the scatter plot
    thisfig = plot_chem(thisfig, dff, ['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], lbls)

    return thisfig, dff
    

def update_onedropdown(thisvolcano_name):
    """

    Args:
        thisvolcano_name: name of a chosen volcano

    Returns:
        Updates eruption dates choice based on volcano name

    """

    # checks if data is present
    if not (thisvolcano_name is None) and not (thisvolcano_name == "start") and thisvolcano_name.upper() in grnames:
        # extracts by name
        # loads Georoc data based on volcano_name
        dfgeoroc = load_georoc(thisvolcano_name)

        # removes the nan rows for the 3 chemicals of interest
        dff = dfgeoroc.dropna(
            subset=['SIO2(WT%)', 'NA2O(WT%)', 'K2O(WT%)'], how='all')[chemcols[1:4]]
        # removes the rows if no date is available, and then removes the duplicate dates
        dff = dff.dropna(subset=['ERUPTION DAY', 'ERUPTION MONTH', 'ERUPTION YEAR'],
                         how='all').drop_duplicates().values

        # extracts the dates for display
        dates = []
        for d in [list(x) for x in dff]:
            dd = []
            for i in range(3):
                if not(np.isnan(d[i])) and i <= 2:
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
    
    
def create_georoc_around_gvp():
    """

    Args:

    Returns:
        recreates the file GEOROCaroundGVP.csv and returns its content as dataframe

    """

    gvp_names = dfv[['Volcano Name', 'Latitude', 'Longitude']]
    # gvp_names = gvp_names.append(dfvne[['Volcano Name', 'Latitude', 'Longitude']])
    gvp_names = pd.concat([gvp_names, dfvne[['Volcano Name', 'Latitude', 'Longitude']]], ignore_index=True)

    # removes unnamed
    gvp_names = gvp_names[gvp_names['Volcano Name'] != 'Unnamed']
 
    # list all file names, takes the folder names from the Mapping folder to have only folders
    lst_arcs = []
    path_for_arcs = os.listdir('../GeorocGVPmapping')
    
    df_georoc = pd.DataFrame()
    
    for folder in path_for_arcs:
        # lists files in each folder, takes names from the Mapping folder in case different copies of the csv exist
        tmp = os.listdir('../GeorocGVPmapping/%s' % folder)
        # adds the path to include directory 
        lst_arcs += ['%s' % folder + '/' + f[:-4] + '.csv' for f in tmp]
        
    for arc in lst_arcs:
        # this finds the latest file
        newarc = fix_pathname(arc)
        
        # reads the file
        dftmp = pd.read_csv('../GeorocDataset/%s' % newarc, low_memory=False, encoding='latin1')
        if not('Inclusions' in arc) and not('Manual' in arc):
            # keeps only volcanic rocks
            dfvol = dftmp[dftmp["ROCK TYPE"] == 'VOL']
            dfvol = dfvol.drop('ROCK TYPE', 1)
        else:
            dfvol = dftmp
            
            if 'Inclusions' in arc:    
                # different names
                dfvol = dfvol.rename({'LATITUDE (MIN.)': 'LATITUDE MIN'}, axis='columns')
                dfvol = dfvol.rename({'LATITUDE (MAX.)': 'LATITUDE MAX'}, axis='columns')
                dfvol = dfvol.rename({'LONGITUDE (MIN.)': 'LONGITUDE MIN'}, axis='columns')
                dfvol = dfvol.rename({'LONGITUDE (MAX.)': 'LONGITUDE MAX'}, axis='columns')

        # gathers the GEOROC data of interest (to be displayed on the map)   
        dfvol = dfvol[['LOCATION', 'LATITUDE MIN', 'LATITUDE MAX', 'LONGITUDE MIN', 'LONGITUDE MAX', 'SAMPLE NAME']]
        dfvol['arc'] = [arc]*len(dfvol.index)
        # df_georoc = df_georoc.append(dfvol)
        df_georoc = pd.concat([df_georoc, dfvol], ignore_index=True)

        
    # GVP volcanoes, latitudes and longitudes
    gvp_nm = gvp_names['Volcano Name']
    gvp_lat = gvp_names['Latitude']
    gvp_long = gvp_names['Longitude']

    colgr = ['LOCATION', 'LATITUDE MIN', 'LATITUDE MAX', 'LONGITUDE MIN', 'LONGITUDE MAX', 'SAMPLE NAME', 'arc']

    # initializes dataframe to contatin the GEOROC samples matching GVP volcanoes
    match = pd.DataFrame()

    for nm, lt, lg in zip(gvp_nm, gvp_lat, gvp_long):
        lt_cond = (df_georoc['LATITUDE MIN']-.5 <= lt) & (df_georoc['LATITUDE MAX']+.5 >= lt)
        lg_cond = (df_georoc['LONGITUDE MIN']-.5 <= lg) & (df_georoc['LONGITUDE MAX']+.5 >= lg)
        dfgeo = df_georoc[lt_cond & lg_cond][colgr]
        if len(dfgeo.index) > 0:
            dfgeo['Volcano Name'] = [nm]*len(dfgeo.index)
            dfgeo['Latitude'] = [lt]*len(dfgeo.index)
            dfgeo['Longitude'] = [lg]*len(dfgeo.index)
            # match = match.append(dfgeo)
            match = pd.concat([match, dfgeo], ignore_index=True)


    match = match.drop_duplicates()

    # group sample names when same location
    matchgroup = match.groupby(['LOCATION', 'LATITUDE MIN', 'LATITUDE MAX', 'LONGITUDE MIN', 'LONGITUDE MAX',
                                'arc'])['SAMPLE NAME'].agg(list).to_frame().reset_index()
    # sometimes the same sample is found in several papers, this just keeps the sample name
    matchgroup['SAMPLE NAME'] = matchgroup['SAMPLE NAME'].apply(lambda x: list(set([y.split('/')[0].split('[')[0]
                                                                                    for y in x])))
    # this shortens and keeps only the first 3 samples 
    matchgroup['SAMPLE NAME'] = matchgroup['SAMPLE NAME'].apply(lambda x: x if len(x) <= 3
                                                                else x[0:3] + ['+'+str(len(x)-3)])
    # this creates a single string out of different sample names attached to one location
    matchgroup['SAMPLE NAME'] = matchgroup['SAMPLE NAME'].apply(lambda x: " ".join(list(set(x))))

    # match_only_GR.to_csv('GEOROCaroundGVP.csv')
    matchgroup.to_csv('../GeorocDataset/GEOROCaroundGVP.csv')

    return matchgroup
