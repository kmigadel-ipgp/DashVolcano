import pandas as pd
import panel as pn
import holoviews as hv
import plotly.graph_objs as go
import plotly.express as px


from holoviews import opts
from bokeh.palettes import Category10

from helpers.helpers import get_discrete_color_map_samples, get_discrete_color_map_volcanoes, safe_parse_events, compute_date_info, compute_end, format_date_uncertainty
from constants.rocks import ROCK_SORTED, ROCK_GVP

pd.set_option('future.no_silent_downcasting', True)


def get_plots(df_selected, df_selected_wr_agg, df_wr_agg, df_wr_composition_samples, df_wr_composition_volcanoes, samples_tectonic_setting, volcanoes_tectonic_setting):
    """
    Generates TAS and AFM plots based on the provided DataFrame.
    Parameters:
        df_selected (pd.DataFrame): DataFrame containing selected data for plotting.
        df_selected_wr_agg (pd.DataFrame): DataFrame containing aggregated WR of the selected data.
        df_wr_agg (pd.DataFrame): DataFrame containing aggregated WR data from the database.
        df_wr_composition_samples (pd.DataFrame): DataFrame containing WR composition of volcanoes.
    Returns:
        tuple: A tuple containing the TAS and AFM plots.
    """

    if 'oxides' not in df_selected.columns:
        return pn.pane.Markdown("⚠️ Oxide data not available.")

    df_selected['short_reference'] = df_selected['reference'].str.slice(0, 40) + '...'

    # Only calculate if both Na2O and K2O are available
    df_selected['NA2O+K2O'] = df_selected['NA2O(WT%)'] + df_selected['K2O(WT%)']

    if df_selected.empty:
        return pn.pane.Markdown("⚠️ No valid oxide data for diagrams.")

    tas_plot = plot_tas(df_selected)
    afm_plot = plot_afm(df_selected)

    if not df_wr_composition_samples.empty:
        rock_composition_samples_plot = plot_rock_composition_samples(df_wr_composition_samples, samples_tectonic_setting)
    else:
        rock_composition_samples_plot = pn.pane.Markdown("⚠️ No tectonic setting data available for rock composition.")

    if not df_wr_composition_volcanoes.empty:
        rock_composition_volcanoes_plot = plot_rock_composition_volcanoes(df_wr_composition_volcanoes, volcanoes_tectonic_setting)
    else:
        rock_composition_volcanoes_plot = pn.pane.Markdown("⚠️ No tectonic setting data available for rock composition.")
    
 
    if not df_selected_wr_agg.empty:
        selected_rock_plot = plot_rock(df_selected_wr_agg).opts(
            title='Rock Type Frequency of Selected Data (Only Whole Rock)',
            legend_position='top_right',
            legend_opts={"click_policy": "hide"},
            multi_level=False
        )
        rock_plot = plot_rock(df_wr_agg).opts(
            title='Rock Type Frequency of Database (Only Whole Rock)',
            legend_position='top_right',
            legend_opts={"click_policy": "hide"},
            multi_level=False
        )
        
    else:
        selected_rock_plot = pn.pane.Markdown("⚠️ No matching documents found in the database.")
        rock_plot = pn.pane.Markdown("⚠️ No matching documents found in the database.")
        

    return tas_plot, afm_plot, selected_rock_plot, rock_plot, rock_composition_samples_plot, rock_composition_volcanoes_plot



def plot_tas(df):
    
    tas_polygons = plot_tas_polygons()

    points = hv.NdOverlay({
        material: hv.Points(
            group,
            kdims=['SIO2(WT%)', 'NA2O+K2O'],
            label=material
        ).opts(
            xlabel='SiO2 (WT%)',
            ylabel='Na2O+K2O (WT%)',
            size=8,
            cmap='Category10',
            tools=['hover'],
            hover_tooltips=[
                ('db', '@db'),
                ('Name', '@name'),
                ('Latitude', '@latitude'),
                ('Longitude', '@longitude'),
                ('Material', '@material'),
                ('Rock', '@rock'),
                ('SiO2 (WT%)', '@SIO2(WT%)'),
                ('Na2O+K2O (WT%)', '@{NA2O+K2O}'),
                ('Reference', '@short_reference')
            ],
            alpha=0.6,
            height=400,
            width=800,
            xlim=(30, 80),
            ylim=(0, 20),
            muted_alpha=0,
            line_color='black',
            line_width=1
        )
        for material, group in df[['db', 'name', 'latitude', 'longitude', 'rock', 'SIO2(WT%)', 'NA2O+K2O', 'material', 'short_reference']].groupby('material')
    }).opts(legend_position='top_left', legend_opts={"click_policy": "hide"})

    # Compute percentage of each material
    material_counts = df['rock'].value_counts(normalize=True) * 100
    material_desc = "Selected Data - Rock percentages:<br>" + ", ".join(
        [f"{mat}: {pct:.2f}%" for mat, pct in material_counts.items()]
    )

    # Add description as a text pane above the plot
    description = pn.pane.Markdown(f"**{material_desc}**", height=100, width=800)

    plot = pn.Column(
        description,
        (tas_polygons * points).opts(
            title='TAS Diagram',
        )
    )

    return plot



def plot_tas_polygons():
    """
    Plots a TAS (Total Alkali-Silica) diagram in the background of the given figure.

    Returns:
        fig: The updated figure with TAS diagram plotted.
    """

    # Define the x and y coordinates for different TAS regions
    X = [
        [41, 41, 45, 45], 
        [45, 45, 52, 52], 
        [52, 52, 57, 57], 
        [57, 57, 63, 63], 
        [63, 63, 69, 77],
        [41, 41, 45, 49.4, 45, 45, 41], 
        [45, 49.4, 52, 45], 
        [45, 48.4, 53, 49.4, 45],
        [49.4, 53, 57, 52, 49.4], 
        [53, 48.4, 52.5, 57.6, 53], 
        [53, 57.6, 63, 57, 53],
        [69, 69, 77, 77, 69],
        [57.6, 65, 69, 69, 63, 57.6],
        [50, 65, 57.6, 50]
    ]
    
    Y = [
        [0, 3, 3, 0], 
        [0, 5, 5, 0], 
        [0, 5, 5.9, 0], 
        [0, 5.9, 7, 0], 
        [0, 7, 8, 0],
        [3, 7, 9.4, 7.3, 5, 3, 3], 
        [5, 7.3, 5, 5], 
        [9.4, 11.5, 9.3, 7.3, 9.4],
        [7.3, 9.3, 5.9, 5, 7.3], 
        [9.3, 11.5, 14, 11.7, 9.3], 
        [9.3, 11.7, 7, 5.9, 9.3],
        [8, 13, 13, 0, 8],
        [11.7, 15.7, 13, 8, 7, 11.7],
        [15.13, 15.7, 11.7, 15.13]
    ]
    
    # Names of the geological regions corresponding to the X and Y coordinates
    tasnames = [
        'picro-basalt', 
        'basalt', 
        'basaltic andesite', 
        'andesite',
        'dacite',
        'tephrite',
        'trachybasalt',
        'phono-tephrite',
        'basaltic trachyandesite',
        'tephri-phonolite',
        'trachyandesite',
        'rhyolite',
        'trachyte, trachydacite',
        'phonolyte'
    ]
    

    # Add filled traces for each region in the TAS diagram
    tas_polygons = []
    for x, y, name in zip(X, Y, tasnames):
        poly = {
            'x': x,
            'y': y,
            'v1': name
        }
        tas_polygons.append(poly)

    tas_polygons = hv.Polygons(tas_polygons, vdims=['v1']).opts(
        color='lightblue', 
        tools=['hover'],
        hover_tooltips=[
            ('name', '@{v1}'),
        ],
        alpha=0.2, 
        line_color='grey', 
        show_legend=False
    )
    
    # Add Alkali line
    alkali_x = [39.2, 40, 43.2, 45, 48, 50, 53.7, 55, 60, 65, 74.4]
    alkali_y = [0, 0.4, 2, 2.8, 4, 4.75, 6, 6.4, 8, 8.8, 10]
    alkali_line = hv.Curve((alkali_x, alkali_y)).opts(
        line_width=2, color='black', line_dash='dashed', show_legend=False
    )

    return (tas_polygons * alkali_line)



def plot_afm(df):
    """
    Updates the AFM diagram based on the volcano name and TAS data.
    
    Parameters:
        df: TAS geochemical data for plotting the AFM diagram.
    
    Returns:
        fig: Updated Plotly figure for the AFM diagram.
    """

    # Create scatter ternary plot with hover_data
    fig = px.scatter_ternary(
        df, 
        a="FEOT(WT%)", 
        b='NA2O+K2O', 
        c='MGO(WT%)', 
        color='material',
    )

    # Customdata to control hover order
    fig.update_traces(
        customdata=df[['db', 'name', 'latitude', 'longitude', 'material', 'rock', 'FEOT(WT%)', 'NA2O+K2O', 'MGO(WT%)', 'short_reference']],
        hovertemplate=(
            "<b>Database:</b> %{customdata[0]}<br>" +
            "<b>Name:</b> %{customdata[1]}<br>" +
            "<b>Latitude:</b> %{customdata[2]:.2f}<br>" +
            "<b>Longitude:</b> %{customdata[3]:.2f}<br>" +
            "<b>Material:</b> %{customdata[4]}<br>" +
            "<b>Rock:</b> %{customdata[5]}<br>" +
            "<b>FEOT(WT%):</b> %{customdata[6]:.2f}<br>" +
            "<b>NA2O+K2O(WT%):</b> %{customdata[7]:.2f}<br>" +
            "<b>MGO(WT%):</b> %{customdata[8]:.2f}<br>" +
            "<b>Reference:</b> %{customdata[9]}<br>"
        ),
        marker=dict(
            opacity=0.6,
            line=dict(color='black', width=1)
        )
    )

    # Add trace for the AFM boundary lines
    fig.add_trace(
        go.Scatterternary(
            a=[39, 50, 56, 53, 45, 26],
            b=[11, 14, 18, 28, 40, 70],
            c=[50, 36, 26, 20, 15, 4],
            mode='lines',
            line=dict(width=4),
            showlegend=False
        )
    )
    
    # Update layout
    fig.update_layout(
        title={
            'text': '<b>AFM Diagram</b>',
            'x': 0.5,  # Center the title
            'xanchor': 'center'  # Ensure the anchor point is the center
        },
        width=600,
        height=600,
        hovermode='closest',  # Keep tooltip offset from cursor
        hoverlabel=dict(
            align='left',
            bgcolor='rgba(255,255,255,0.9)',  # Optional: lighter background
            bordercolor='gray',
            font=dict(color='black', size=12)
        )
    )
    
    return fig



def plot_rock(df):
    """
    Plots the rock type frequency diagram based on the provided DataFrame.
    Parameters:
        df (pd.DataFrame): DataFrame containing rock type data with '_id' and 'count' columns.
    Returns:
        hvplot object: A bar plot showing the frequency of rock types.
    """

    df[['rock', 'db', 'material', 'latitude', 'longitude']] = pd.DataFrame(df['_id'].tolist(), index=df.index)
    df.drop(columns=['_id'], inplace=True)

    # Calculate the number of unique locations for each rock type
    unique_locations = df.groupby('rock').agg(
        unique_location_count=('latitude', lambda x: len(set(zip(df.loc[x.index, 'latitude'], df.loc[x.index, 'longitude']))))
    )

    df = df.groupby('rock').agg({
        'count': 'sum',
        'db': 'first',
        'material': 'first',  
    }).reset_index()

    # Merge the unique location count back into the DataFrame
    df = df.merge(unique_locations, on='rock')

    # Calculate the total count of all rocks
    total_count = df['count'].sum()

    # Compute the frequency as a percentage
    df['frequency'] = (df['count'] / total_count) * 100

    rock_plot = df.hvplot.bar(
        x='rock',
        y='frequency',
        by='db',
        stacked=False,
        tools=['hover'],
        hover_cols=['rock', 'material', 'count', 'frequency', 'unique_location_count'],
        hover_tooltips=[
            ('Rock', '@rock'),
            ('Material', '@material'),
            ('Nb of samples', '@count'),
            ('Frequency (%)', '@frequency{0.2f}'),
            ('Nb of locations', '@unique_location_count'),
        ],
        xlabel='Rock Type',
        ylabel='Frequency (%)',
        rot=45,
        width=500,
        height=400
    )

    return rock_plot
    


def plot_rock_composition_samples(df, tectonic_setting): 
    """
    Plots a sunburst chart of rock composition based on the provided DataFrame.
    Parameters:
        df (pd.DataFrame): DataFrame containing rock composition data with columns 'major_rock_1', 'major_rock_2', 'major_rock_3', and 'db'.
        tectonic_setting (list): List of tectonic settings to be included in the chart title.
    Returns:
        fig: A Plotly sunburst chart showing the rock composition.
    """

    df = df.fillna(" ")
    
    # Create the sunburst chart
    fig = px.sunburst(
        df,
        path=['major_rock_1', 'major_rock_2', 'major_rock_3'],
        color='major_rock_1',
        color_discrete_map=get_discrete_color_map_samples(),
    )

    # Update colors for the sunburst chart: set color to white if label == " "
    fig.update_traces(
        marker=dict(
            colors=[
                'rgb(255, 255, 255)' if label == " " else color
                for label, color in zip(fig.data[0].labels, fig.data[0].marker.colors)
            ]
        )
    )

    # Prepare tectonic settings to include in the title
    tectonic_setting_text = ', '.join(tectonic_setting) if tectonic_setting else 'No specific tectonic setting'
    
    fig.update_layout(
        annotations=[dict(
            xref='paper', 
            yref='paper',
            x=0.5, 
            y=-0.25, 
            showarrow=False,
            text=f'{len(df.index)} volcano(es)<br><sub>Tectonic settings: {tectonic_setting_text}</sub>'
        )],
        paper_bgcolor='rgba(0,0,0,0)',
        title={
            'text': '<b>Rock composition of volcano using GEOROC</b>',
            'x': 0.5,  # Center the title
            'xanchor': 'center'  # Ensure the anchor point is the center
        },
        width=400,
        height=450
    )

    return fig


def plot_rock_composition_volcanoes(df, tectonic_setting): 
    """
    Plots a sunburst chart of rock composition based on the provided DataFrame.
    Parameters:
        df (pd.DataFrame): DataFrame containing rock composition data with columns 'major_rock_1', 'major_rock_2', 'major_rock_3', and 'db'.
        tectonic_setting (list): List of tectonic settings to be included in the chart title.
    Returns:
        fig: A Plotly sunburst chart showing the rock composition.
    """

    df = df.fillna(" ")

    df = df.replace(ROCK_SORTED, ROCK_GVP)
    
    # Create the sunburst chart
    fig = px.sunburst(
        df,
        path=['major_rock_1', 'major_rock_2', 'major_rock_3'],
        color='major_rock_1',
        color_discrete_map=get_discrete_color_map_volcanoes(),
    )

    # Update colors for the sunburst chart: set color to white if label == " "
    fig.update_traces(
        marker=dict(
            colors=[
                'rgb(255, 255, 255)' if label == " " else color
                for label, color in zip(fig.data[0].labels, fig.data[0].marker.colors)
            ]
        )
    )

    # Prepare tectonic settings to include in the title
    tectonic_setting_text = ', '.join(tectonic_setting) if tectonic_setting else 'No specific tectonic setting'
    
    fig.update_layout(
        annotations=[dict(
            xref='paper', 
            yref='paper',
            x=0.5, 
            y=-0.25, 
            showarrow=False,
            text=f'{len(df.index)} volcano(es)<br><sub>Tectonic settings: {tectonic_setting_text}</sub>'
        )],
        paper_bgcolor='rgba(0,0,0,0)',
        title={
            'text': '<b>Rock composition of volcano using GVP</b>',
            'x': 0.5,  # Center the title
            'xanchor': 'center'  # Ensure the anchor point is the center
        },
        width=400,
        height=450
    )

    return fig



def plot_chemical_oxide_vei(df_selected_data):
    """
    Parameters:
        volcano_name: name of the selected volcano
        date: selected eruption dates (or 'all')
    
    Returns: 
        Updated figures for the TAS diagram, VEI chart, and oxide chart
    """

    # Initialize subplots for the TAS chart
    chemicals_plot = plot_chemicals(df_selected_data)
    
    # Update the oxide chart
    oxides_plot = plot_oxides(df_selected_data)

    return chemicals_plot, oxides_plot 


def plot_chemicals(df):

    df['NA2O+K2O'] = df['NA2O(WT%)'] + df['K2O(WT%)']

    df['short_reference'] = df['reference'].str.slice(0, 40) + '...'

    if "eruptions" in df.columns:
        df['eruptions_str'] = df['eruptions'].apply(lambda x: ', '.join(map(str, x)) if isinstance(x, list) else str(x))
    else:
        df['eruptions_str'] = None

    tas_polygons = plot_tas_polygons()

    points = hv.NdOverlay({
        material: hv.Points(
            group,
            kdims=['SIO2(WT%)', 'NA2O+K2O'],
            label=material
        ).opts(
            xlabel='SiO2 (WT%)',
            ylabel='Na2O+K2O (WT%)',
            size=8,
            cmap='Category10',
            tools=['hover'],
            hover_tooltips=[
                ('db', '@db'),
                ('Name', '@name'),
                ('Latitude', '@latitude'),
                ('Longitude', '@longitude'),
                ('Material', '@material'),
                ('Rock', '@rock'),
                ('Eruption(s)', '@eruptions_str'),
                ('SiO2 (WT%)', '@SIO2(WT%)'),
                ('Na2O+K2O (WT%)', '@{NA2O+K2O}'),
                ('Reference', '@short_reference')
            ],
            alpha=0.6,
            height=400,
            width=500,
            xlim=(30, 80),
            ylim=(0, 20),
            muted_alpha=0,
            line_color='black',
            line_width=1
        )
        for material, group in df[['db', 'volcano_name', 'name', 'latitude', 'longitude', 'rock', 'SIO2(WT%)', 'NA2O+K2O', 'material', 'eruptions_str', 'short_reference']].groupby('material')
    }).opts(legend_position='top_left', legend_opts={"click_policy": "hide"})
    
    hist_tas_plot = points.hist(dimension=['SIO2(WT%)', 'NA2O+K2O'], num_bins=100).opts(
        opts.Histogram(
            title='2D Histogram of SiO2 (WT%) vs NA2O+K2O (WT%)',
            tools=['hover'],
            colorbar=True,
        )
    )

    # Compute percentage of each rock type

    rock_counts = df['rock'].value_counts(normalize=True) * 100
    rock_desc = "All material types - Rock percentages: <br>" + ", ".join(
        [f"{mat}: {pct:.2f}%" for mat, pct in rock_counts.items()]
    )

    # Add description as a text pane above the plot
    description = pn.pane.Markdown(f"**{rock_desc}**", height=100, width=800)

    plot = pn.Column(
        (tas_polygons * points * hist_tas_plot).opts(
            title='TAS Diagram',
        ),
        description

    )

    return plot


def plot_oxides(df):

    df['short_reference'] = df['reference'].str.slice(0, 40) + '...'

    # Titles and y-axis limits for each oxide subplot
    titles = [
        "TiO2(wt%)",
        "Al2O3(wt%)",
        "FeOT(wt%)",
        "MgO(wt%)",
        "CaO(wt%)",
        "Na2O(wt%)",
        "K2O(wt%)",
        "P2O5(wt%)"
    ]

    # Create a list to hold all the scatter plots
    scatter_plots = []

    # Loop through each chemical oxide and plot it as a scatter plot
    for title in titles:
        scatter = df.hvplot.scatter( 
            'SIO2(WT%)', 
            title.upper(),
            xlabel='SiO2(wt%)',
            ylabel=title,
            xlim=(30, 80),
            width=250,
            height=250,
            size=10,
            tools=['hover'],
            hover_cols=[
                'db', 
                'name', 
                'latitude', 
                'longitude', 
                'material', 
                'rock', 
                'eruptions_str', 
                'SIO2(WT%)', 
                'NA2O+K2O', 
                'short_reference',
                title.upper()
            ],
            hover_tooltips=[
                ('db', '@db'),
                ('Name', '@name'),
                ('Latitude', '@latitude'),
                ('Longitude', '@longitude'),
                ('Material', '@material'),
                ('Rock', '@rock'),
                ('Eruption(s)', '@eruptions_str'),
                ('SiO2 (WT%)', '@SIO2(WT%)'),
                (title, f'@{{{title.upper()}}}'),
                ('Na2O+K2O (WT%)', '@{NA2O+K2O}'),
                ('Reference', '@short_reference')
            ],
            grid=True,
            line_color='black',
            line_width=1,
            fill_alpha=0.8
        )
        scatter_plots.append(scatter)

    # Add curves to the K2O plot
    if len(scatter_plots) >= 7:  # Ensure there are enough plots
        k2o_plot_index = 6  # Index of K2O plot in the scatter_plots list
        k2o_plot = scatter_plots[k2o_plot_index]

        # Define the lines for alkaline series
        line1 = hv.Curve([(48, 0.3), (52, 0.5), (56, 0.7), (63, 1.0), (70, 1.3), (78, 1.6)]).opts(
            opts.Curve(color='black', line_width=2)
        )
        line2 = hv.Curve([(48, 1.2), (52, 1.5), (56, 1.8), (63, 2.4), (70, 3.0)]).opts(
            opts.Curve(color='black', line_width=2)
        )
        line3 = hv.Curve([(48, 1.6), (52, 2.4), (56, 3.2), (63, 4.0)]).opts(
            opts.Curve(color='black', line_width=2)
        )

        # Overlay the lines on the K2O plot
        k2o_plot_with_lines = (k2o_plot * line1 * line2 * line3)

        # Replace the K2O plot in the layout with the plot that includes lines
        scatter_plots[k2o_plot_index] = k2o_plot_with_lines

    # Recreate the layout with the updated K2O plot
    plot = hv.Layout(scatter_plots).cols(2).opts(
        opts.Layout(title='<b>Harker Diagrams from GEOROC</b>')
    )

    return plot


def plot_vei(df):
    # Replace NaN VEI with -1 and convert to int
    df['vei'] = df['vei'].fillna(-1).astype(int)

    # Group by VEI
    df_grouped = df.groupby('vei').agg(
        counts=('vei', 'size'),
        nb_samples=('nb_samples', 'sum')
    ).reset_index()

    # Sort numerically so -1 ("Unknown") comes first
    df_grouped = df_grouped.sort_values('vei')

    # Map VEI -1 to 'Unknown VEI' for display
    df_grouped['vei_label'] = df_grouped['vei'].apply(lambda x: 'Unknown VEI' if x == -1 else str(x))

    # Create the bar plot using `vei_label` for x-axis
    vei_plot = hv.Bars(df_grouped, kdims='vei_label', vdims=['counts', 'nb_samples']).opts(
        xlabel='VEI Range',
        ylabel='Count',
        title="Number of eruptions per VEI",
        hover_tooltips=[
            ('VEI', '@vei_label'),
            ('Nb of eruptions', '@counts'),
            ('Nb of GEOROC samples', '@nb_samples'),
        ],
        width=600,
        height=400,
        tools=['hover']
    )

    return vei_plot


def plot_chemicals_vei(df):

    df['NA2O+K2O'] = df['NA2O(WT%)'] + df['K2O(WT%)']

    df['short_reference'] = df['reference'].str.slice(0, 40) + '...'

    if "vei" in df.columns:
        df['vei_label'] = df['vei'].apply(lambda x: str(x[0]) if isinstance(x, list) and len(x) > 0 else "Unknown")
    else:
        df['vei_label'] = None

    if "eruptions" in df.columns:
        df['eruptions_str'] = df['eruptions'].apply(lambda x: ', '.join(map(str, x)) if isinstance(x, list) else str(x))
    else:
        df['eruptions_str'] = None

    tas_polygons = plot_tas_polygons()

    points = hv.NdOverlay({
        vei: hv.Points(
            group,
            kdims=['SIO2(WT%)', 'NA2O+K2O'],
            label=vei
        ).opts(
            xlabel='SiO2 (WT%)',
            ylabel='Na2O+K2O (WT%)',
            size=8,
            cmap='Category10',
            tools=['hover'],
            hover_tooltips=[
                ('db', '@db'),
                ('Name', '@name'),
                ('Rock', '@rock'),
                ('SiO2 (WT%)', '@SIO2(WT%)'),
                ('Na2O+K2O (WT%)', '@{NA2O+K2O}'),
                ('Material', '@material'),
                ('Volcano', '@volcano_name'),
                ('Eruption(s)', '@eruptions_str'),
                ('VEI', '@vei_label'),
                ('Reference', '@short_reference')
            ],
            alpha=0.6,
            height=400,
            width=500,
            xlim=(30, 80),
            ylim=(0, 20),
            muted_alpha=0,
            line_color='black',
            line_width=1
        )
        for vei, group in df[['db', 'volcano_name', 'name', 'rock', 'SIO2(WT%)', 'NA2O+K2O', 'material', 'eruptions_str', 'vei_label', 'short_reference']].groupby('vei_label')
    }).opts(legend_position='top_left', legend_opts={"click_policy": "hide"})
    
    hist_tas_plot = points.hist(dimension=['SIO2(WT%)', 'NA2O+K2O'], num_bins=100).opts(
        opts.Histogram(
            title='2D Histogram of SiO2 (WT%) vs NA2O+K2O (WT%)',
            tools=['hover'],
            colorbar=True,
        )
    )

    # Compute percentage of each material
    material_counts = df['rock'].value_counts(normalize=True) * 100
    material_desc = "All material types - Rock percentages: <br>" + ", ".join(
        [f"{mat}: {pct:.2f}%" for mat, pct in material_counts.items()]
    )

    # Add description as a text pane above the plot
    description = pn.pane.Markdown(f"**{material_desc}**", height=200, width=500)

    plot = pn.Column(
        (tas_polygons * points * hist_tas_plot).opts(
            title='TAS Diagram by VEI',
        ),
        description

    )
            
    return plot


def plot_samples_timeline(df_samples):

    # --- Samples ---
    df_samples[['date', 'date_start', 'date_end']] = df_samples.apply(
        lambda r: pd.Series(compute_date_info(r['year'], r['month'], r['day'], r['uncertainty_days'])), axis=1
    )

    df_samples['date_uncertainty'] = df_samples.apply(
        lambda r: format_date_uncertainty(r['date'], r['uncertainty_days']), axis=1
    )

    grouped_samples = df_samples.groupby(['date_uncertainty', 'volcano_name']).agg({
        'date_start': 'first', 
        'date_end': 'first',
        'date': 'first',
        'db': lambda x: ', '.join(set(x.dropna().astype(str))),
        'rock': lambda x: ', '.join(set(x.dropna().astype(str))),
        'SIO2(WT%)': 'mean',
        'material': lambda x: ', '.join(set(x.dropna().astype(str))),
        'name': 'count'
    }).reset_index().rename(columns={'name': 'sample_count'})

    samples_segments = hv.Segments(
        grouped_samples,
        kdims=['date_start', 'volcano_name', 'date_end', 'volcano_name'],
        vdims=['db', 'rock', 'SIO2(WT%)', 'material', 'date_uncertainty', 'sample_count']
    ).opts(
        line_width=10, 
        alpha=0.5,
        tools=['hover'],
        hover_tooltips=[
            ('Database', '@db'), 
            ('Date', '@date_uncertainty'), 
            ('Rock', '@rock'),
            ('SiO2 (WT%)', '@{SIO2(WT%)}{0.2f}'), 
            ('Material', '@material'),
            ('Nb of GEOROC samples', '@sample_count'),
        ]
    )

    samples_points = hv.Points(
        grouped_samples,
        kdims=['date', 'volcano_name'],
        vdims=['db', 'rock', 'SIO2(WT%)', 'material', 'date_uncertainty', 'sample_count']
    ).opts(
        color='red',
        size=8,
        marker='star',
        tools=['hover'],
        hover_tooltips=[
            ('Database', '@db'), 
            ('Date', '@{date_uncertainty}'), 
            ('Rock', '@rock'),
            ('SiO2 (WT%)', '@{SIO2(WT%)}{0.2f}'), 
            ('Material', '@material'),
            ('Nb of GEOROC samples', '@sample_count'),
        ]
    )

    return hv.Overlay(samples_segments * samples_points).opts(
        legend_position='top_left',
        legend_opts={'click_policy': 'hide'},
        title='GEOROC Sampling Timeline',        
        height=400,
        width=1500,
        xlabel='Year',
        ylabel='Volcano'
    )

def plot_eruptions_timeline(df_eruptions):

    # --- Compute datetimes ---
    df_eruptions[['start_datetime', 'start_min', 'start_max']] = df_eruptions.apply(
        lambda r: pd.Series(compute_date_info(r['start_year'], r['start_month'], r['start_day'], r['start_uncertainty_days'])), axis=1
    )
        
    df_eruptions[['end_datetime', 'end_min', 'end_max']] = df_eruptions.apply(compute_end, axis=1)

    df_eruptions['vei'] = df_eruptions['vei'].fillna(-1)
    df_eruptions['vei_label'] = df_eruptions['vei'].apply(lambda x: 'Unknown' if x == -1 else str(int(x)))
    df_eruptions['events'] = df_eruptions['events'].apply(safe_parse_events)
    df_eruptions['event_count'] = df_eruptions['events'].apply(len)

    # --- Format date uncertainty ---
    df_eruptions['start_uncertainty'] = df_eruptions.apply(
        lambda r: format_date_uncertainty(r['start_datetime'], r['start_uncertainty_days']), axis=1
    )

    df_eruptions['end_uncertainty'] = df_eruptions.apply(
        lambda r: format_date_uncertainty(r['end_datetime'], r['end_uncertainty_days']), axis=1
    )

    # --- Color mapping ---
    unique_vei = sorted(df_eruptions['vei_label'].unique())
    palette = Category10[max(3, min(10, len(unique_vei)))]  # Pick appropriate size
    vei_color_map = dict(zip(unique_vei, palette))

    # --- Segments per VEI ---
    eruption_segments = []
    for vei_label, group in df_eruptions.groupby('vei_label'):
        seg = hv.Segments(
            group,
            kdims=['start_min', 'volcano_name', 'end_max', 'volcano_name'],
            vdims=['start_uncertainty', 'end_uncertainty', 'vei_label', 'event_count', 'events', 'evidence_method_dating'],
            label=vei_label
        ).opts(
            color=vei_color_map[vei_label],
            line_width=10,
            alpha=0.7,
            tools=['hover'],
            hover_tooltips=[
                ('Volcano', '@volcano_name'),
                ('Start date', '@start_uncertainty'),
                ('End date', '@end_uncertainty'),
                ('Dating Method', '@evidence_method_dating'),
                ('VEI', '@vei_label'),
                ('Event Count', '@event_count'),
                ('Events', '@events'),
            ],
            show_legend=True
        )

        point = hv.Points(
            group,
            kdims=['start_datetime', 'volcano_name'],
            vdims=['start_uncertainty', 'end_uncertainty', 'vei_label', 'event_count', 'events', 'evidence_method_dating'],
        ).opts(
            color='red',
            size=8,
            marker='star',
            tools=['hover'],
            hover_tooltips=[
                ('Volcano', '@volcano_name'),
                ('Start date', '@start_uncertainty'),
                ('End date', '@end_uncertainty'),
                ('Dating Method', '@evidence_method_dating'),
                ('VEI', '@vei_label'),
                ('Event Count', '@event_count'),
                ('Events', '@events'),
            ],
        )
        eruption_segments.append(seg)
        eruption_segments.append(point)

    # --- Eruption timeline (segments + stars for sparse) ---
    return hv.Overlay(eruption_segments).opts(
        legend_position='top_left',
        legend_opts={'click_policy': 'hide'},
        title='Eruption Timeline by VEI',
        height=400,
        width=1500,
        xlabel='Year',
        ylabel='Volcano'
    )


def plot_vei_eruptions_timeline(df_eruptions):

    # --- Compute datetimes ---
    df_eruptions[['start_datetime', 'start_min', 'start_max']] = df_eruptions.apply(
        lambda r: pd.Series(compute_date_info(r['start_year'], r['start_month'], r['start_day'], r['start_uncertainty_days'])), axis=1
    )
        
    df_eruptions[['end_datetime', 'end_min', 'end_max']] = df_eruptions.apply(compute_end, axis=1)

    df_eruptions['vei'] = df_eruptions['vei'].fillna(-1)
    df_eruptions['vei_label'] = df_eruptions['vei'].apply(lambda x: 'Unknown' if x == -1 else str(int(x)))
    df_eruptions['events'] = df_eruptions['events'].apply(safe_parse_events)
    df_eruptions['event_count'] = df_eruptions['events'].apply(len)

    # --- Format date uncertainty ---
    df_eruptions['start_uncertainty'] = df_eruptions.apply(
        lambda r: format_date_uncertainty(r['start_datetime'], r['start_uncertainty_days']), axis=1
    )

    df_eruptions['end_uncertainty'] = df_eruptions.apply(
        lambda r: format_date_uncertainty(r['end_datetime'], r['end_uncertainty_days']), axis=1
    )

    # --- One VEI Curve per volcano ---
    curves = []

    for volcano_name, group in df_eruptions.groupby('volcano_name'):
        group = group.sort_values("start_datetime")
        dataset = hv.Dataset(
            group,
            kdims=['start_datetime'],
            vdims=[
                'vei', 'volcano_name', 'start_uncertainty', 'end_uncertainty',
                'vei_label', 'event_count', 'events', 'evidence_method_dating'
            ]
        )
        curve = hv.Curve(
            dataset, 
            kdims='start_datetime', 
            vdims=[
                'vei', 
                'volcano_name', 
                'start_uncertainty', 
                'end_uncertainty',
                'vei_label', 
                'event_count', 
                'events',
                'evidence_method_dating'
            ],
            label=volcano_name
        ).opts(
            line_width=2,
            tools=['hover'],
            hover_tooltips=[
                ('Volcano', '@volcano_name'),
                ('Start date', '@start_uncertainty'),
                ('End date', '@end_uncertainty'),
                ('Dating Method', '@evidence_method_dating'),
                ('VEI', '@{vei_label}'),
                ('Event Count', '@event_count'),
                ('Events', '@events'),
            ],
            show_legend=True
        )
        curves.append(curve)

    # Combine all volcano curves into one overlay
    return hv.Overlay(curves).opts(
        legend_position='top_left',
        legend_opts={'click_policy': 'hide'},
        title='VEI Intensity Over Time',
        height=400,
        width=1500,
        xlabel='Year',
        ylabel='VEI',
    )