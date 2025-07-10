
import panel as pn
import holoviews as hv
import hvplot.pandas

from helpers.helpers import prepare_csv_download
from functions.analytic_plots import plot_vei
from backend.database import Database

hv.extension('bokeh')

# ----------------------------- #
#         Initialization        #
# ----------------------------- #

db_client = Database()

samples = pn.state.as_cached('samples', db_client.get_samples)
volcanoes = pn.state.as_cached('volcanoes', db_client.get_volcanoes)
eruptions = pn.state.as_cached('eruptions', db_client.get_eruptions)


# ----------------------------- #
#             UI               #
# ----------------------------- #

# --- Volcano filters --- #
volcano_display_map = {
    f"{row['volcano_name']} ({row['volcano_number']})": row['volcano_number']
    for _, row in volcanoes.iterrows()
}

volcano_name_filter_1 = pn.widgets.MultiChoice(name='Volcano Name(s)', options=list(volcano_display_map.keys()), placeholder='Type to search...', width=300)
volcano_name_filter_2 = pn.widgets.MultiChoice(name='Volcano Name(s)', options=list(volcano_display_map.keys()), placeholder='Type to search...', width=300)

# --- Container for plots --- #
plot_container = pn.Column(
    pn.pane.Placeholder("ℹ️ Select a volcano to view detailed plots."),
    name="Plots",
    sizing_mode='stretch_width'
)

# Create a FileDownload widget for downloading the selected data
download_button = pn.widgets.FileDownload(
    filename='selected_data.csv',
    button_type='primary',
    disabled=True
)

# ----------------------------- #
#         Query & Filters       #
# ----------------------------- #

# --- Generate plots --- #
def get_major_rocks_markdown(df):
    if df.empty:
        return pn.pane.Markdown("⚠️ Select a volcano to get its major rock composition according to GVP.")
    rocks = sum((df[c].dropna().unique().tolist() for c in ['major_rock_1', 'major_rock_2', 'major_rock_3'] if c in df), [])
    rocks_str = ', '.join(str(r) for r in rocks if r)
    text = f"**Major Rock composition according to GVP:** {rocks_str}" if rocks_str else "No major rock composition data available from GVP."
    return pn.pane.Markdown(text, height=100, width=600)

def generate_plots(df_vei_1, df_vei_2, df_volcano_info_1, df_volcano_info_2):

    # Enable the download button if any data is available
    nb_data_to_download = len(df_vei_1) + len(df_vei_2)

    if nb_data_to_download > 0:
        download_button.disabled = False

        csv_buffer, filename = prepare_csv_download([df_vei_1, df_vei_2], drop_columns=['location_id'])
        download_button.file = csv_buffer
        download_button.filename = filename

        note = pn.pane.Markdown(f"ℹ️ **{nb_data_to_download} rows** included in the CSV.")
        download_row = pn.Column(
            pn.Row(download_button, styles={'align-self': 'center'}), 
            note,
            align='center'
        )
    else:
        download_row = pn.Row(download_button, align='center')
    
    # Plotting helper
    def pane_or_plot(df):
        if not df.empty:
            return plot_vei(df)
        else:
            return pn.pane.Markdown("⚠️ Select a volcano to view vei plot.")
        
    vei_plot_1 = pane_or_plot(df_vei_1)
    vei_plot_2 = pane_or_plot(df_vei_2)

    return pn.Column(
        pn.Row(
            download_row,
            align='center'
        ),
        pn.Row(
            pn.Column(vei_plot_1, pn.Row(get_major_rocks_markdown(df_volcano_info_1))),
            pn.Column(vei_plot_2, pn.Row(get_major_rocks_markdown(df_volcano_info_2))),
            styles={"align-self": "center"}
        ),
        styles={"align-self": "center"}
    )


# --- Reactive detailed plot --- #
@pn.depends(
    volcano_name_filter_1.param.value,
    volcano_name_filter_2.param.value,
    watch=True
)
def generate_detail_plots(selected_volcano_1, selected_volcano_2):
    """Generate detailed plots based on selected volcano."""

    df_volcano_info_1 = db_client.get_volcano_info(selected_volcano_1)
    df_volcano_info_2 = db_client.get_volcano_info(selected_volcano_2)

    df_vei_1 = db_client.get_vei_from_volcano(selected_volcano_1)
    df_vei_2 = db_client.get_vei_from_volcano(selected_volcano_2)

    plot_container[:] = [generate_plots(df_vei_1, df_vei_2, df_volcano_info_1, df_volcano_info_2)]


def update_busy(event):
    busy = event.new
    if busy and isinstance(plot_container[0], pn.pane.Placeholder):
        plot_container[:] = [
            pn.pane.Placeholder("⏳ App is processing...")
        ]
    elif not busy and not (volcano_name_filter_1.value or volcano_name_filter_2.value):
        plot_container[:] = [pn.pane.Placeholder("ℹ️ Select a volcano to view detailed plots.")]

pn.state.param.watch(update_busy, 'busy')


# ----------------------------- #
#           Layout              #
# ----------------------------- #

@pn.depends(
    volcano_name_filter_1.param.value,
    volcano_name_filter_2.param.value,
)
def view():

    # Example content for the second page
    title = pn.pane.Markdown("""
    ## Compare VEI volcanoes

    This page allow to compare volcano from **[GVP](https://volcano.si.edu/)** using VEI (Volcanic Explosivity Index) from only **[GEOROC](https://georoc.eu/)** samples. 
    
    To compare volcanoes on their VEI we group eruptions by VEI and provide the rock composition of the volcano according to GVP.
    
    **Note:** 
    > GVP tends to assign a **default VEI of 2** for eruptions with **limited available information**.

    > As **[PetDB](https://search.earthchem.org/)** has no sampling date, we cannot associate its samples with the GVP eruption.
    """)

    header = pn.Row(title)

    filter_panel = pn.Card(
        pn.Column(
            pn.FlexBox(
                volcano_name_filter_1,
                volcano_name_filter_2,
                justify_content='center',
                align_items='center',
                flex_wrap='wrap',
                sizing_mode='stretch_width'
            ),
        ),
        title="Filters",
        sizing_mode='stretch_width'
    )

    plots = pn.Card(
        pn.Row(
            plot_container,
        ),
        title="Plots",
        min_width=1500,
        sizing_mode='stretch_width'
    )

    layout = pn.Column(
        header,
        filter_panel,
        pn.Spacer(height=20),
        plots,
        pn.Spacer(height=20),
        sizing_mode='stretch_width'
    )

    return layout
