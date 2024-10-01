# **********************************************************************************#
#
# This contains functions to manipulate GVP data.
# ----------------------------------------------
# * retrieve_vinfo: loads data for one volcano from 2 dataframes
# * rocks_to_color: computes color based on rock composition
# * extracts_by_filter: finds volcanoes as per filter input
# * extract_by_event: finds volcanoes with given events
# * update_chronogram
# * fix_dates_VEI
# * fix_events
# * update_rockchart: plots sunburst chart of major rocks
# * read_gmt: reads a gmt file
# * update_tectonicmenu
# * update_tectonicGEOROC
# * filter_GVPtoGeoroc
# * find_new_tect_setting: find new tectonic setting for a GVP volcano
# * compute_eruptionperiods:
#
# Author: F. Oggier
# Editor: K. Migadel
# Last update: September 20 2024
# **********************************************************************************#

import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objs as go

from datetime import datetime

from constants.rocks import ROCK_COL, ROCK_SORTED
from constants.tectonics import ALL_TECTONIC_SETTINGS
from constants.shared_data import df_volcano, df_events, df_eruption, dict_gvp_georoc, dict_volcano_file

from functions.georoc import rocks_to_color

from helpers.helpers import create_menu_options

def retrieve_vinfo(name, df1, df2, whichrocks):
    """
    Args:
        name: name (string) of the volcano whose data is to be retrieved from df1, df2
        df1: dataframe volcanoes (dfv)
        df2: dataframe eruptions (df)
        whichrocks:

    Returns: a list containing the volcano name, its VEIs, its rocks, the eruption times

    """
    # volcano name
    datv = [name]
    # extracts vei
    lstvei = list(df2[df2['Volcano Name'] == name]['VEI'].values)
    datv.append(lstvei)
    # extracts rocks
    rocks_orig = list(df1[df1[list(df1)[1]] == name][whichrocks].values[0])
    # '\xa0' is used when the data is not there
    rocks = [rr for rr in rocks_orig if not (rr in ['\xa0', 'No Data (checked)'])]
    ridx = [0] * 10
    for rr in rocks:
        ridx[ROCK_SORTED.index(rr)] = rocks_orig.index(rr) + 1
    # append rock composition
    datv.append(ridx)
    # volume info not available for gvp?
    # retrieves dates
    days1 = list(df2[df2['Volcano Name'] == name]['Start Day'].values)
    days2 = list(df2[df2['Volcano Name'] == name]['End Day'].values)
    months1 = list(df2[df2['Volcano Name'] == name]['Start Month'].values)
    months2 = list(df2[df2['Volcano Name'] == name]['End Month'].values)
    year1 = list(df2[df2['Volcano Name'] == name]['Start Year'].values)
    year2 = list(df2[df2['Volcano Name'] == name]['End Year'].values)
    datv.append([days1, days2, months1, months2, year1, year2])

    return datv


def extract_by_filter(countryname, tectonicsetting, df_volcano):
    """

    Args:
        countryname: the name of a country (string)
        tectonicsetting: the name of a tectonic setting (string)

    Returns: list of volcanoes filtered by choice of input

    """
    if countryname == 'all':
        dftmp = df_volcano
    else:
        dftmp = df_volcano[df_volcano['Country'] == countryname]

    lst_tect = [tt.strip() for tt in tectonicsetting if tt != 'start' and tt is not None]

    if len(lst_tect) > 0:
        dftmp = dftmp[dftmp['Tectonic Settings'].isin(lst_tect)]

    lst_byfilter = list(set(dftmp['Volcano Name'].unique()))

    return lst_byfilter


def extract_by_event(lstvolc, lstev):
    """

    Args:
        lstvolc: a list of volcanoes
        lstev: a list of events

    Returns: events associated to volcanoes

    """
    events_cols = []
    dfevent = pd.DataFrame()
    # narrows down events to volcanoes in lstvolc (possibly empty)
    dftmp = df_events[df_events['Volcano Name'].isin(lstvolc)]

    if len(dftmp.index) > 0:
        # shortlists based on input
        event_type = lstev
        for nm in lstvolc:
            # extracts events per volcano
            events_pervolc = list(dftmp[dftmp['Volcano Name'] == nm]['Event Type'].values)
            # for every volcano, keeps a list that counts each event
            eidx = [0] * len(event_type)
            for ev in events_pervolc:
                if ev in event_type:
                    eidx[event_type.index(ev)] = len([x for x in events_pervolc if x == ev])
            events_cols.append(eidx)
        # attach event types to volcanoes
        dfevent['Volcano Name'] = pd.Series(np.array(lstvolc)).values
        for event in event_type:
            newcol = [x[event_type.index(event)] for x in events_cols]
            dfevent[event] = pd.Series(np.array(newcol)).values

    return dfevent
    
    
def update_chronogram(thesevolcanoes, period, df_eruption, df_events):
    """ 
    Args:
        thesevolcanoes: a list of volcanoes
        period: there are 3 choices of periods

    Returns: chronogram of eruptions
    """
    event_discrete_map = {}
    for c in ['1', '2', '4', '6', '8']:
        event_discrete_map[c] = px.colors.sequential.Reds[int(c)]

    # names indices and back
    # this is to escape the default categorical axes
    dict_names = {}
    dict_names_rev = {}
    # removes possible duplicates
    thesevolcanoes = list(set(thesevolcanoes))
    for nm in thesevolcanoes:
        dict_names[nm] = thesevolcanoes.index(nm)
        dict_names_rev[thesevolcanoes.index(nm)] = nm

    # extracts data for set of volcanoes
    thisdf = df_eruption[df_eruption['Volcano Name'].isin(thesevolcanoes)]

    # start dates
    # removes if no start year
    thisdf = thisdf[thisdf['Start Year'].notna()]

    # lower bound of dates
    # choose the earliest date with VEI data across volcanoes
    earliest_date = thisdf[thisdf["VEI"].notna()]["Start Year"].astype('float').min()
    # issues with timestamp and nanoseconds before 1678
    # pd.Timestamp.min
    # Timestamp('1677-09-21 00:12:43.145224193')
    earlydf = thisdf[thisdf["Start Year"].astype('float') <= 1678]
    thisdf = thisdf[thisdf["Start Year"].astype('float') >= max(earliest_date, 1678)]

    if period == '1679 and after':
        # fixes dates
        if len(thisdf.index) > 0:
            dff = fix_dates_VEI(thisdf, dict_names, False)
        else:
            return go.Figure()

        # after 1678 (not included)
        # if no data with dates
        if len(dff.index) == 0:
            return go.Figure()

        # events
        dff = dff.merge(fix_events(thisdf, False, df_events), on='Eruption Number', how='left')
        # plots the timeline
        thisfig = px.timeline(dff, x_start="Start Date", x_end="End Date", y="Volcano Name",
                              color='Color', color_discrete_map=event_discrete_map,
                              hover_data={'Recorded start': True, 'Recorded end': True, 'Count': True,
                                          'Event List': True, 'Color': False, 'Volcano Name': False})

        for i in range(len(thesevolcanoes)):
            # retrieves VEI info
            thisdfv = dff[dff["Volcano Name"] == i]
            thisfig.add_trace(
                go.Scatter(
                    x=thisdfv['Start Date'],
                    mode='markers+lines',
                    marker_symbol=thisdfv['symbol'],
                    y=(i - .4) + thisdfv['VEI'].astype(float) / 9,
                    text=thisdfv['VEI'],
                    hovertemplate='VEI: %{text} <br> %{x}',
                    name='VEI',
                    showlegend=False
                )
            )

    else:
        # retrieves earlier data
        if len(earlydf.index) > 0:
            earlydff = fix_dates_VEI(earlydf, dict_names, True)
        else:
            earlydff = earlydf
        # if no data with dates
        if len(earlydff.index) == 0:
            return go.Figure()

        # extracts the right period
        if period == 'before 1679':
            earlydff = earlydff[earlydff['BC'] == 1]
        else:
            earlydff = earlydff[earlydff['BC'] == 0]
        # if no data with dates
        if len(earlydff.index) == 0:
            return go.Figure()

        # events
        earlydff = earlydff.merge(fix_events(earlydf, True, df_events), on='Eruption Number', how='left')

        thisfig = go.Figure()
        for i in range(len(thesevolcanoes)):
            thisdfv = earlydff[earlydff["Volcano Name"] == i]
            # add 2 years for more visibility
            if period == 'before 1679':
                duration = abs(thisdfv['End Year'] - thisdfv['Start Year']) + 2
            else:
                # add 20 years for more visibility
                duration = abs(thisdfv['End Year'] - thisdfv['Start Year']) + 20
                  
            thisfig.add_trace(
                go.Bar(x=thisdfv['Start Year'],
                       y=[.9] * len(thisdfv.index),
                       base=i - .4,
                       marker_color=thisdfv['Color'],
                       hovertemplate=thisdfv['Recorded start'] + '<br>' + thisdfv['Recorded end']+'<br>' + thisdfv['Event List'],
                       showlegend=False,
                       name='',
                       )
            )

            thisfig.add_trace(
                go.Scatter(
                    x=thisdfv['Start Year'],
                    mode='markers+lines',
                    marker_symbol=thisdfv['symbol'],
                    y=(i - .4) + thisdfv['VEI'].astype(float) / 9,
                    text=thisdfv['VEI'],
                    hovertemplate='VEI: %{text} <br> %{x}',
                    name='VEI',
                    showlegend=False
                )
            )
        # only integer ticks (so I get only years and not something like 1525.6)
        thisfig.update_layout(xaxis={'tickformat': ',d'})

    # adjustes ticks
    thisfig.update_layout(
        yaxis=dict(
            tickmode='array',
            tickvals=[x for x in range(len(thesevolcanoes))],
            ticktext=[dict_names_rev[x] for x in range(len(thesevolcanoes))]
        )
    )
    thisfig.update_xaxes(rangeslider_visible=True)
    thisfig.update_layout(showlegend=False)

    return thisfig
    

def fix_dates_VEI(df_missing, thisdict_names, bns):
    """

    Args:
        df_missing: dataframe with missing dates
        thisdict_names
        bns: before nanoseconds (before 1678)

    Returns: adjust the missing dates in dataframe as well as the missing VEI

    """

    # first create a symbol (star) if VEI is missing, and another (circle) if VEI is here
    symb = df_missing.apply(
        lambda row: 'star' if pd.isnull(row['VEI']) else 'circle', axis=1)
    # replace every unvalid VEI with the one before in time (next in df)
    # use next valid observation to fill gap
    df_missing['VEI'].bfill()
    # when there is nothing after (in df), just use 2
    df_missing['VEI'] = df_missing['VEI'].fillna('2')
    
    # stores the dates before adjusting them
    true_start = df_missing['Start Year'].astype(str) + '-' + df_missing['Start Month'].astype(str) + '-' + df_missing['Start Day'].astype(str)
    true_end = df_missing['End Year'].astype(str) + '-' + df_missing['End Month'].astype(str) + '-' + df_missing['End Day'].astype(str)

    if bns:
        # before nanosecond, just uses year
        # data with no start year should have been removed before this function
        # if end year is missing, uses the same year
        df_missing['End Year'] = df_missing.apply(
            lambda row: row['Start Year'] if pd.isnull(row['End Year']) else row['End Year'], axis=1)
        # could be negative years (BC)
        BC = df_missing.apply(lambda row: 0 if int(row['Start Year']) < 0 else 1, axis=1)

        # creates new dataframe
        headers = ['Eruption Number', "Volcano Name", "VEI", "Start Year", "End Year", 'symbol', 'BC', 'Recorded start', 'Recorded end']
        df3 = pd.concat([df_missing['Eruption Number'], df_missing['Volcano Name'].replace(thisdict_names),
                         df_missing['VEI'], df_missing['Start Year'].astype(int),
                         df_missing['End Year'].astype(int), symb, BC, true_start, true_end], axis=1, keys=headers)
    else:
        # MISSING START 
        # missing start month, available end month and end year
        cond_start = (df_missing['Start Month'] == '0') | pd.isnull(df_missing['Start Month'])
        cond_end = ~(df_missing['End Month'] == '0') & ~pd.isnull(df_missing['End Month']) & ~pd.isnull(df_missing['End Year'])

        # if start year not equal to end year, then use start month = end month
        df_missing.loc[:, 'Start Month'] = (
            np.where(
                (cond_start & cond_end & ~(df_missing['Start Year'] == df_missing['End Year'])),
                df_missing['End Month'], df_missing['Start Month'])
        )
        
        # refreshes missing data
        # then years are the same
        cond_start = (df_missing['Start Month'] == '0') | pd.isnull(df_missing['Start Month'])
        cond_end = ~(df_missing['End Month'] == '0') & ~pd.isnull(df_missing['End Month']) & ~pd.isnull(df_missing['End Year'])
        # if start year = end year, and if end month greater than 3, then use end month minus 3 months
        df_missing.loc[:, 'Start Month'] = (
            np.where(
                (cond_start & cond_end & (df_missing['End Month'].astype('float') > 3)),
                df_missing['End Month'].astype('float') - 3, df_missing['Start Month'])
        )
        # refreshes missing data
        # then end month is <= 3
        cond_start = (df_missing['Start Month'] == '0') | pd.isnull(df_missing['Start Month'])
        cond_end = ~(df_missing['End Month'] == '0') & ~pd.isnull(df_missing['End Month']) & ~pd.isnull(df_missing['End Year'])
        # if start year = end year, and if end month less than 3 
        df_missing.loc[:, 'Start Month'] = (
            np.where(
                (cond_start & cond_end),
                '1', df_missing['Start Month'])
        )
        
        # MISSING END 
        # start has only year
        cond_start = (df_missing['Start Month'] == '0') | pd.isnull(df_missing['Start Month'])
        # end monthy is missing, end year could be here or not
        cond_end = ((df_missing['End Month'] == '0') | pd.isnull(df_missing['End Month']))

        # no start month, use 6 (June)
        # this puts this category into start has year and month
        df_missing.loc[:, 'Start Month'] = (
            np.where(
                (cond_start & cond_end),
                '6', df_missing['Start Month'])
        )

        # start month is known
        cond_start = ~(df_missing['Start Month'] == '0') & ~pd.isnull(df_missing['Start Month'])
        # end completely missing
        cond_end = ((df_missing['End Month'] == '0') | pd.isnull(df_missing['End Month'])) & pd.isnull(df_missing['End Year'])

        # add end year
        # this puts this category into start has year and month, end has only year
        # no end year, use either start if month is less than 10
        df_missing['End Year'] = (
            np.where(
                (cond_start & cond_end & (df_missing['Start Month'].astype('float') < 10)),
                df_missing['Start Year'], df_missing['End Year'])
        )
        # no end year, use start + 1 if month is more than 10
        df_missing['End Year'] = (
            np.where(
                (cond_start & cond_end & (df_missing['Start Month'].astype('float') >= 10)),
                df_missing['Start Year'].astype('float')+1, df_missing['End Year'])
        )
        
        # start month is known
        cond_start = ~(df_missing['Start Month'] == '0') & ~pd.isnull(df_missing['Start Month'])
        # only end year is known
        cond_end = ((df_missing['End Month'] == '0') | pd.isnull(df_missing['End Month'])) & ~pd.isnull(df_missing['End Year'])

        # if start year not equal to end year, then use start month = end month
        df_missing.loc[:, 'End Month'] = (
            np.where(
                (cond_start & cond_end & ~(df_missing['Start Year'] == df_missing['End Year'])),
                df_missing['Start Month'], df_missing['End Month'])
        )
        # refreshes missing data
        # then years are the same
        cond_start = ~(df_missing['Start Month'] == '0') & ~pd.isnull(df_missing['Start Month'])
        cond_end = ((df_missing['End Month'] == '0') | pd.isnull(df_missing['End Month'])) & ~pd.isnull(df_missing['End Year'])
        # if start year = end year, and if start month less than 10, then use start month plus 3 months
        df_missing.loc[:, 'End Month'] = (
            np.where(
                (cond_start & cond_end & (df_missing['Start Month'].astype('float') < 10)),
                df_missing['Start Month'].astype('float') + 3, df_missing['End Month'])
        )
        # refreshes missing data
        # then start month is > 10
        cond_start = ~(df_missing['Start Month'] == '0') & ~pd.isnull(df_missing['Start Month'])
        cond_end = ((df_missing['End Month'] == '0') | pd.isnull(df_missing['End Month'])) & ~pd.isnull(df_missing['End Year'])
        # if start year = end year, and if end month less than 3
        df_missing.loc[:, 'End Month'] = (
            np.where(
                (cond_start & cond_end),
                '12', df_missing['End Month'])
        )
        # at this point, all years and months are complete
        cond_start = (df_missing['Start Day'] == '0') | pd.isnull(df_missing['Start Day'])

        # if no start day, use 1
        df_missing.loc[:, 'Start Day'] = (
            np.where(
                cond_start,
                '1', df_missing['Start Day'])
        )
        
        cond_end = (df_missing['End Day'] == '0') | pd.isnull(df_missing['End Day'])
        # if no end day, use 28
        df_missing.loc[:, 'End Day'] = (
            np.where(
                cond_end,
                '28', df_missing['End Day'])
        )
        
        # plotly doesn't seem to plot if end and start are the same, so shifts the end/start by 2 days
        sameday = (df_missing['Start Year'] == df_missing['End Year']) & (df_missing['Start Month'] == df_missing['End Month']) & (df_missing['Start Day'] == df_missing['End Day'])
        df_missing['End Day'] = np.where((sameday & (df_missing['End Day'].astype('float') < 27)),
                                         df_missing['End Day'].astype('int')+2, df_missing['End Day'])
        df_missing['Start Day'] = np.where((sameday & (df_missing['End Day'].astype('float') >= 27)),
                                           df_missing['Start Day'].astype('int')-2, df_missing['Start Day'])
        
        # compiles whole date
        start = df_missing['Start Year'].astype('int').astype(str) + '-' + df_missing['Start Month'].astype('int').astype(str) + '-' + df_missing['Start Day'].astype('int').astype(str)
          
        # compile whole date
        end = df_missing['End Year'].astype('int').astype(str) + '-' + df_missing['End Month'].astype('int').astype(str) + '-' + \
              df_missing['End Day'].astype('int').astype(str)

        # creates new dataframe
        headers = ['Eruption Number', "Volcano Name", "VEI", "Start Date", "End Date", 'symbol', 'Recorded start', 'Recorded end']
        df3 = pd.concat(
            [df_missing['Eruption Number'], df_missing['Volcano Name'].replace(thisdict_names), df_missing['VEI'],
             start, end, symb, true_start, true_end], axis=1, keys=headers)

    return df3


def fix_events(df_be, bns, df_events):
    """ 
    Args:
        bns = before nanoseconds (before 1678)
    """
    eruption_events = ['Phreatic activity', 'Lava lake', 'Lava fountains',
                       'Cinder cone formation', 'Fissure formation', 'Lava flow(s)',
                       'Island formation', 'Lava dome formation', 'Spine formation',
                       'Phreatomagmatic eruption', 'Explosion',
                       'Partial collapse at end of eruption', 'Avalanche', 'Tsunami',
                       'Directed explosion', 'Crater formation', 'Caldera formation']

    erupnos = list(df_be['Eruption Number'].unique())
    thisdfev = df_events[df_events['Eruption Number'].isin(erupnos)]
    thisdfev = thisdfev[thisdfev['Event Type'].isin(eruption_events)]
    ev_count = []
    for en in erupnos:
        theseevs = list(thisdfev[thisdfev['Eruption Number'] == en]['Event Type'].values)
        ev_str = ''
        # list of events per eruption
        three_events = 0
        for ev in theseevs:
            three_events += 1
            if (three_events % 3) == 0:
                ev_str += ev + ',<br>'
            else:
                ev_str += ev + ', '
        if ev_str.endswith(','):
            ev_str = ev_str[:-1]
        # choose color
        if bns == False:
            # data for discrete_map
            if len(theseevs) <= 2:
                col = '1'
            elif len(theseevs) > 2 and len(theseevs) <= 6:
                col = '2'
            elif len(theseevs) > 6 and len(theseevs) <= 12:
                col = '4'
            elif len(theseevs) > 12 and len(theseevs) <= 17:
                col = '6'
            else:
                col = '8'
        else:
            # color directly in this column
            if len(theseevs) <= 2:
                col = px.colors.sequential.Reds[1]
            elif len(theseevs) > 2 and len(theseevs) <= 6:
                col = px.colors.sequential.Reds[2]
            elif len(theseevs) > 6 and len(theseevs) <= 12:
                col = px.colors.sequential.Reds[4]
            elif len(theseevs) > 12 and len(theseevs) <= 17:
                col = px.colors.sequential.Reds[6]
            else:
                col = px.colors.sequential.Reds[8]
        ev_count.append([en, ev_str, len(theseevs), col])

    df4 = pd.DataFrame(ev_count, columns=['Eruption Number', 'Event List', 'Count', 'Color'])
    return df4


def update_rockchart(thisvolcanolist, thisfig, df_volcano):
    """

    Args:
        thisvolcanolist: lists of names of GVP volcanoes 
        thisfig: figure to be updated

    Returns: figure with sunburst chart of major rocks for volcanoes on the list

    """
    
    this_discrete_map = {}
    for r in ROCK_COL:
        z = [0] * len(ROCK_COL)
        z[ROCK_COL.index(r)] = 1
        this_discrete_map[r] = 'rgb' + str(rocks_to_color(z))
    
    # checks if data is present
    if len(thisvolcanolist) > 0:
        if len(thisvolcanolist) == len(set(df_volcano['Volcano Name'].unique())):
            dff = df_volcano.replace(ROCK_SORTED, ROCK_COL)
         
        else:
            dff = df_volcano[df_volcano['Volcano Name'].isin(thisvolcanolist)].replace(ROCK_SORTED, ROCK_COL)
        
        # px to use the path option
        thisfig = px.sunburst(dff.replace({'\xa0': ' ', 'No Data (checked)': ' '}), path=["Major Rock 1", "Major Rock 2", "Major Rock 3"],
                              color='Major Rock 1', color_discrete_map=this_discrete_map)

        label = thisfig['data'][0]['labels']
        current_colors = thisfig['data'][0]['marker']['colors']
        new_colors = []
        for lab, colr in zip(label, current_colors):
            if lab != ' ':
                new_colors.append(colr)
            else:
                new_colors.append('rgb(255, 255, 255)')                        
        
        thisfig['data'][0]['marker']['colors'] = new_colors
        
        txt = str(len(dff.index)) + ' volcano(es)'    
        thisfig.update_layout(
            annotations=[dict(xref='paper',
                              yref='paper',
                              x=0.5, y=-0.25,
                              showarrow=False,
                              text=txt)],
                ) 

    else:
        thisfig.add_traces(
            go.Sunburst(
                labels=['Major Rock 1', 'Major Rock 2', 'Major Rock 3'],
                parents=['', 'Major Rock 1', 'Major Rock 2'],
                marker=dict(
                    colorscale='Greys'
                )
            ),
        )

    # title
    thisfig.update_layout(title='<b>Rock Composition from GVP</b> <br>')
    
    return thisfig

    
def update_tectonicmenu(thiscountry, df_volcano):
    """  
    Updates tectonic setting menu based on country
    """
    disable_state = {ts: False for ts in ALL_TECTONIC_SETTINGS}

    if thiscountry not in ['all', 'start']:
        lst_ts = list(df_volcano[df_volcano['Country'] == thiscountry]['Tectonic Settings'].unique())
        for ts in ALL_TECTONIC_SETTINGS:
            if ts.strip() not in lst_ts:
                disable_state[ts] = True

    return create_menu_options(ALL_TECTONIC_SETTINGS, disable_state)
    
  
def filter_GVPtoGeoroc(country, gvp_tectonic):
    """
    Args:

    Returns: 
        list of GEOROC tectonic settings matching GVP names
    """    
     
    # GVP tectonic settings
    chosen_gvp = [x.strip() for x in gvp_tectonic if x != 'start']
    
    # country fiilter  
    if country != 'all' and country != 'start':
        if len(chosen_gvp) == 0:
            # a country is chosen, but no tectonic setting
            filter_gvp = list(df_volcano[df_volcano['Country'] == country]['Volcano Name'])     
        else:
            # a country is chosen, and tectonic settings are
            filter_gvp = list(df_volcano[(df_volcano['Country'] == country) & (df_volcano['Tectonic Settings'].isin(chosen_gvp))]['Volcano Name']) 
    elif country == 'all':
        if len(chosen_gvp) == 0:
            # all countries, but no tectonic setting
            filter_gvp = list(df_volcano['Volcano Name'])     
        else:
            # all countries are  chosen, and tectonic settings are
            filter_gvp = list(df_volcano[df_volcano['Tectonic Settings'].isin(chosen_gvp)]['Volcano Name']) 
    else:
        filter_gvp = []
        
    filter_georoc = [dict_gvp_georoc[x] for x in filter_gvp if x in dict_gvp_georoc.keys()]     
    
    georoc_tectonic = []
    for x in filter_georoc: 
        georoc_tectonic += dict_volcano_file[x] 
    georoc_tectonic = list(set(georoc_tectonic))
    georoc_tectonic = list(set([x.split('/')[0].split('_comp')[0].replace('_', ' ') for x in georoc_tectonic]))
    
    return georoc_tectonic


def compute_eruptionperiods(keys):   
    """
    Args:
        keys = list of volcanoes coming from a dictionary
    Returns:
        a dataframe with eruption dates and long, short, medium eruptions, and one dataframe for repose data
        
    """
    # extracts data for set of volcanoes
    dict_names = {}
    dict_names_rev = {}
    thesevolcanoes = list(keys)
     
    for nm in thesevolcanoes:
        dict_names[nm] = thesevolcanoes.index(nm)
        dict_names_rev[thesevolcanoes.index(nm)] = nm

    params = ['Volcano Name', 'VEI', 'Start Year', 'End Year', 'Start Month', 'End Month',  'Eruption Number', 'Start Day', 'End Day']
    thisdf = df_eruption[df_eruption['Volcano Name'].isin(thesevolcanoes)][params]

    # start dates
    # removes if no start year
    thisdf = thisdf[thisdf['Start Year'].notna()]

    # lower bound of dates
    # choose the earliest date with VEI data across volcanoes
    earliest_date = thisdf[thisdf["VEI"].notna()]["Start Year"].astype('float').min()
    # issues with timestamp and nanoseconds before 1678
    # pd.Timestamp.min
    # Timestamp('1677-09-21 00:12:43.145224193')
    earlydf = thisdf[thisdf["Start Year"].astype('float') <= 1678]
    thisdf = thisdf[thisdf["Start Year"].astype('float') >= max(earliest_date, 1678)]

    # fixes dates
    dfd = fix_dates_VEI(thisdf, dict_names, False)
    dfd['duration'] = dfd['End Date'].apply(lambda x: int(x.split('-')[0])) - dfd['Start Date'].apply(lambda x: int(x.split('-')[0]))
    dfd['Start Year'] = dfd['Start Date'].apply(lambda x: int(x.split('-')[0]))
    # short eruption < 1 year
    # medium eruption = 1 year < 5 years
    # long eruption = above 5 years
    dfd['long eruption'] = np.where(dfd['duration'] >= 5, 1, 0)
    dfd['medium eruption'] = np.where((dfd['duration'] >= 1) & (dfd['duration'] < 5), 1, 0)
    dfd['short eruption'] = np.where(dfd['duration'] < 1, 1, 0)
    dfd['Volcano Name'] = dfd['Volcano Name'].replace(dict_names_rev)
    
    # repose
    thisyear = int(datetime.today().strftime('%Y'))
    dfr = dfd[['Volcano Name', 'Start Year']].groupby('Volcano Name')['Start Year'].apply(list).reset_index(name='starts')
    dfr['repose'] = dfr['starts'].apply(lambda x: [s-f for s, f in zip(sorted(x)+[thisyear], [0]+sorted(x))])

    # retrieves earlier data
    earlydff = fix_dates_VEI(earlydf, dict_names, True)
    earlydff['duration'] = earlydff['End Year']-earlydff['Start Year']
    # short eruption < 1 year
    # medium eruption = 1 year < 5 years
    # long eruption = above 5 years
    earlydff['long eruption'] = np.where(earlydff['duration'] >= 5, 1, 0)
    earlydff['medium eruption'] = np.where((earlydff['duration'] >= 1) & (earlydff['duration'] < 5), 1, 0)
    earlydff['short eruption'] = np.where(earlydff['duration'] < 1, 1, 0)
    earlydff['Volcano Name'] = earlydff['Volcano Name'].replace(dict_names_rev)
    
    # repose
    earlydfr = earlydff[['Volcano Name', 'Start Year']].groupby('Volcano Name')['Start Year'].apply(list).reset_index(name='starts')
    earlydfr['repose'] = earlydfr['starts'].apply(lambda x: [abs(s-f) for s, f in zip(sorted(x)+[thisyear], [0]+sorted(x))])

    dfd = pd.concat([dfd, earlydff])
    dfr = dfr.merge(earlydfr, on='Volcano Name', how='outer')
    # replaces NaN by empty lists
    isna = dfr['repose_x'].isna()
    dfr.loc[isna, 'repose_x'] = pd.Series([[]] * isna.sum()).values
    isna = dfr['repose_y'].isna()
    dfr.loc[isna, 'repose_y'] = pd.Series([[]] * isna.sum()).values

    return dfd, dfr
