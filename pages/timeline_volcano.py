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

    # --- SAMPLES ---
    if df_selected_samples.empty:
        samples_timeline_plot = pn.pane.Markdown("⚠️ No samples available for the selected volcano.")
        download_row = pn.Row(download_button, align='center')  # Just the button
    else:
        download_button.disabled = False

        # Prepare downloadable CSV (clean up)
        csv_buffer = io.StringIO()
        df_selected_data_download = df_selected_samples.drop(columns=['location_id', 'eruption_numbers', 'date', 'oxides'])
        df_selected_data_download.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)
        download_button.file = csv_buffer
        download_button.filename = 'selected_data.csv'

        # Count samples without year
        missing_year_count = df_selected_samples['year'].isna().sum()

        # Filter valid-year samples for plotting
        df_samples_with_year = df_selected_samples[df_selected_samples['year'].notna()].copy()

        if df_samples_with_year.empty:
            samples_timeline_plot = pn.pane.Markdown("⚠️ No dated samples to display on the timeline.")
        else:
            samples_timeline_plot = plot_samples_timeline(df_samples_with_year)

        # Create note if needed
        if missing_year_count > 0:
            note = pn.pane.Markdown(
                f"ℹ️ **{missing_year_count} samples** do not have a year and are not shown in the timeline but are included in the CSV.",
                width=500,
            )
            download_row = pn.Column(
                pn.Row(
                    download_button,
                    styles={'align-self': 'center'}
                ), 
                note, 
                align='center'
            )
        else:
            download_row = pn.Row(download_button, align='center')

    # --- ERUPTIONS ---
    if df_selected_eruptions.empty:
        eruptions_timeline_plot = pn.pane.Markdown("⚠️ No eruptions available for the selected volcano.")
        vei_eruptions_timeline_plot = pn.pane.Markdown("⚠️ No eruptions available for the selected volcano.")
    else:
        eruptions_timeline_plot = plot_eruptions_timeline(df_selected_eruptions)
        vei_eruptions_timeline_plot = plot_vei_eruptions_timeline(df_selected_eruptions)

    return pn.Column(
        download_row,
        pn.Row(eruptions_timeline_plot),
        pn.Row(vei_eruptions_timeline_plot),
        pn.Row(samples_timeline_plot),
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
    
    This page allow to analyze in more details the eruption timeline of **[GVP](https://volcano.si.edu/)** volcano from **[GEOROC](https://georoc.eu/)** and **[PetDB](https://search.earthchem.org/)** samples.
    
    You can filter per volcano to visualize rock samples and GVP eruptions in the timeline.

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
