
import os
import io
import pandas as pd
import panel as pn
import holoviews as hv
import hvplot.pandas

from dotenv import load_dotenv
from helpers.helpers import format_date, extract_volcano_number, extract_eruption_number
from functions.analytic_plots import plot_chemical_oxide_vei
from backend.database import Database

hv.extension('bokeh')

# ----------------------------- #
#   Configuration & Database    #
# ----------------------------- #

def load_config():
    load_dotenv()
    config = {
        "user": os.getenv("MONGO_USER"),
        "password": os.getenv("MONGO_PASSWORD"),
        "cluster": os.getenv("MONGO_CLUSTER"),
        "db_name": os.getenv("MONGO_DB"),
    }
    return config



# ----------------------------- #
#         Initialization        #
# ----------------------------- #

config = load_config()
db_client = Database(config)

# --- Cache collections --- #
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
eruption_date_filter_1 = pn.widgets.MultiChoice(name='Eruption date(s)', options=[], placeholder='Type to search...', width=300)
volcano_name_filter_2 = pn.widgets.MultiChoice(name='Volcano Name(s)', options=list(volcano_display_map.keys()), placeholder='Type to search...', width=300)
eruption_date_filter_2 = pn.widgets.MultiChoice(name='Eruption date(s)', options=[], placeholder='Type to search...', width=300)

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


# --- Update eruption filters --- #
def update_eruption_dates(selected):
    numbers = [volcano_display_map[name] for name in selected]
    filtered = eruptions[eruptions['volcano_number'].isin(numbers)]
    return list(filtered.apply(lambda r: format_date(r['start_date'], r.get('eruption_number')), axis=1))

volcano_name_filter_1.param.watch(lambda e: setattr(eruption_date_filter_1, 'options', update_eruption_dates(e.new)), 'value')
volcano_name_filter_2.param.watch(lambda e: setattr(eruption_date_filter_2, 'options', update_eruption_dates(e.new)), 'value')


# --- Generate plots --- #
def generate_plots(df_samples_1, df_samples_2):
    """Generate chemical and oxide plots for two sets of samples, with download option."""
    
    # Enable the download button if any data is available
    nb_samples_to_download = len(df_samples_1) + len(df_samples_2)

    if nb_samples_to_download > 0:
        download_button.disabled = False

        # Prepare downloadable CSV from df_samples_1 (or merge both if needed)
        csv_buffer = io.StringIO()
        df_selected_data_download = pd.concat([df_samples_1, df_samples_2], ignore_index=True)
        df_selected_data_download = df_selected_data_download.drop(columns=['location_id', 'eruption_numbers', 'date', 'oxides'], errors='ignore')
        df_selected_data_download.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)
        download_button.file = csv_buffer
        download_button.filename = 'selected_data.csv'

        note = pn.pane.Markdown(f"ℹ️ **{nb_samples_to_download} samples** included in the CSV.")
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
            return plot_chemical_oxide_vei(df)
        else:
            return (
                pn.pane.Markdown("⚠️ Select a volcano to view chemicals plot."),
                pn.pane.Markdown("⚠️ Select a volcano to view oxides plots.")
            )

    chem1, ox1 = pane_or_plot(df_samples_1)
    chem2, ox2 = pane_or_plot(df_samples_2)

    return pn.Column(
        download_row,
        pn.Row(
            pn.Column(chem1, pn.Row(ox1, styles={"align-self": "center"})),
            pn.Column(chem2, pn.Row(ox2, styles={"align-self": "center"})),
            styles={"align-self": "center"}
        )
    )


# --- Reactive detailed plot --- #
@pn.depends(
    volcano_name_filter_1.param.value,
    eruption_date_filter_1.param.value,
    volcano_name_filter_2.param.value,
    eruption_date_filter_2.param.value,
    watch=True
)
def generate_detail_plots(selected_volcano_1, selected_eruption_1, selected_volcano_2, selected_eruption_2):
    """Generate detailed plots based on selected volcano and eruption."""

    df_samples_1 = db_client.get_samples_from_volcano_eruptions(
        [extract_volcano_number(volcano) for volcano in selected_volcano_1],
        [extract_eruption_number(eruption) for eruption in selected_eruption_1]
    )
    df_samples_2 = db_client.get_samples_from_volcano_eruptions(
        [extract_volcano_number(volcano) for volcano in selected_volcano_2],
        [extract_eruption_number(eruption) for eruption in selected_eruption_2]
    )
    
    plot_container[:] = [generate_plots(df_samples_1, df_samples_2)]



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
    eruption_date_filter_1.param.value,
    eruption_date_filter_2.param.value,
)
def view():

    # Example content for the second page
    title = pn.pane.Markdown("""
    ## Compare volcanoes
    This page allow to compare volcano from **[GVP](https://volcano.si.edu/)** using chemical composition from **[GEOROC](https://georoc.eu/)** and **[PetDB](https://search.earthchem.org/)** samples.
    
    The eruption dates can be filtered, if available, to observe chemical composition of a specific eruption; however only a few eruptions are linked to GEOROC samples.
    
    We use acronym to designed different materials:
    - **WR**: Whole Rock
    - **GL**: Volcano Glass
    - **INC**: Inclusion
    - **MIN**: Mineral
            
    To compare volcanoes we provide a TAS Diagram and a Harker Diagram as well as some statistic on the rock percentage around all material type present in the GEOROC samples for the selected volcano. 
    
    **Note:** 
    > As **[PetDB](https://search.earthchem.org/)** has no sampling date, we cannot associate its samples with the GVP eruption.                       
    """)

    header = pn.Row(title)

    filter_panel = pn.Card(
        pn.Column(
            pn.FlexBox(
                volcano_name_filter_1,
                eruption_date_filter_1,
                volcano_name_filter_2,
                eruption_date_filter_2,
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
            plot_container
        ),
        title="Plots",
        min_width=1700,
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
