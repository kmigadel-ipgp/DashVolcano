import os
import io
import panel as pn
import holoviews as hv
import hvplot.pandas

from dotenv import load_dotenv
from helpers.helpers import format_date, extract_volcano_number, parse_formatted_date
from functions.analytic_plots import plot_eruptions_timeline, plot_samples_timeline, plot_vei_eruptions_timeline
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

samples = pn.state.as_cached('samples', db_client.get_samples)
volcanoes = pn.state.as_cached('volcanoes', db_client.get_volcanoes)


# ----------------------------- #
#             UI               #
# ----------------------------- #

# --- Volcano filters --- #
volcano_display_map = {
    f"{row['volcano_name']} ({row['volcano_number']})": row['volcano_number']
    for _, row in volcanoes.iterrows()
}

volcano_name_filter = pn.widgets.MultiChoice(name='Volcano Name(s)', options=list(volcano_display_map.keys()), placeholder='Type to search...', width=300)

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
def generate_plots(df_selected_samples, df_selected_eruptions):
    """Generate time-serie of eruptions for the selected volcano."""

    if df_selected_samples.empty:
        samples_timeline_plot = pn.pane.Markdown("⚠️ No samples available for the selected volcano.")
    else:
        # Enable the download button and set the file to the selected data
        download_button.disabled = False

        # Use StringIO to create a file-like object for the CSV data
        csv_buffer = io.StringIO()
        df_selected_data_download = df_selected_samples.drop(columns=['location_id', 'eruption_numbers', 'date', 'oxides'])
        df_selected_data_download.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)  # Rewind the buffer to the beginning

        download_button.file = csv_buffer
        download_button.filename = 'samples_data.csv'

        df_selected_samples = df_selected_samples[df_selected_samples['year'] != 0].copy()
        if df_selected_samples.empty:
            samples_timeline_plot = pn.pane.Markdown("⚠️ No samples available for the selected volcano.")
        else:
            samples_timeline_plot = plot_samples_timeline(df_selected_samples)
    
    if df_selected_eruptions.empty:
        eruptions_timeline_plot = pn.pane.Markdown("⚠️ No eruptions available for the selected volcano.")
    else:
        eruptions_timeline_plot = plot_eruptions_timeline(df_selected_eruptions)
        vei_eruptions_timeline_plot = plot_vei_eruptions_timeline(df_selected_eruptions)
    
    return pn.Column(
        pn.Row(
            download_button,
            align='center',
        ),
        pn.Row(
            eruptions_timeline_plot
        ),
        pn.Row(
            vei_eruptions_timeline_plot
        ),
        pn.Row(
            samples_timeline_plot
        ),
        align='center'
    )


# --- Reactive detailed plot --- #
@pn.depends(
    volcano_name_filter.param.value,
    watch=True
)
def generate_detail_plots(selected_volcano):
    """Generate time-serie plot based on selected volcano and sampling date."""

    volcano_numbers = [extract_volcano_number(volcano) for volcano in selected_volcano]

    df_selected_samples = db_client.get_samples_from_volcano_eruptions(volcano_numbers)

    df_selected_eruptions = db_client.get_selected_eruptions_and_events(volcano_numbers)

    plot_container[:] = [generate_plots(df_selected_samples, df_selected_eruptions)]


def update_busy(event):
    busy = event.new
    if busy and isinstance(plot_container[0], pn.pane.Placeholder):
        plot_container[:] = [
            pn.pane.Placeholder("⏳ App is processing...")
        ]
    elif not busy and not volcano_name_filter.value:
        plot_container[:] = [pn.pane.Placeholder("ℹ️ Select a volcano to view detailed plots.")]

pn.state.param.watch(update_busy, 'busy')


# ----------------------------- #
#           Layout              #
# ----------------------------- #


@pn.depends(
    volcano_name_filter.param.value,
)
def view():

    # Example content for the second page
    title = pn.pane.Markdown("""
    ## Analyze volcano timeline
    
    This page allow to analyze in more details the eruption timeline of **[GVP](https://volcano.si.edu/)** volcano from only **[GEOROC](https://georoc.eu/)** samples since **[PetDB](https://search.earthchem.org/)** samples can't be linked to a GVP volcano.
    
    You can filter per volcano to visualize only the GEOROC samples and GVP eruptions in the timeline.

    **Note:**
    > GVP tends to assign a **default VEI of 2** for eruptions with **limited available information**.
                             
    > GEOROC assign **year 0** for samples with an **unknown date**. These samples are not shown on the timeline, but you can still download them.

    """)

    header = pn.Row(title)

    filter_panel = pn.Card(
        pn.Column(
            pn.FlexBox(
                volcano_name_filter,
                justify_content='center',
                align_items='center',
                flex_wrap='wrap',
                sizing_mode='stretch_width'
            ),
        ),
        title="Filters",
        sizing_mode='stretch_width'
    )

    insight_plot = pn.Card(
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
        insight_plot,
        pn.Spacer(height=20),
        sizing_mode='stretch_width'
    )

    return layout
