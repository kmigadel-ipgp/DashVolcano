import os
import panel as pn
import holoviews as hv
import hvplot.pandas

from dotenv import load_dotenv
from helpers.helpers import format_date, extract_volcano_number, extract_eruption_number
from functions.analytic_plots import plot_chemicals, plot_chemicals_vei
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
eruptions = pn.state.as_cached('eruptions', db_client.get_eruptions)


# ----------------------------- #
#             UI               #
# ----------------------------- #

# --- Volcano filters --- #
volcano_display_map = {
    f"{row['volcano_name']} ({row['volcano_number']})": row['volcano_number']
    for _, row in volcanoes.iterrows()
}

volcano_name_filter = pn.widgets.MultiChoice(name='Volcano Name(s)', options=list(volcano_display_map.keys()), placeholder='Type to search...', width=300)
eruption_date_filter = pn.widgets.MultiChoice(name='Eruption date(s)', options=[], placeholder='Type to search...', width=300)

# --- Container for plots --- #
plot_container = pn.Column(
    pn.pane.Placeholder("ℹ️ Select a volcano to view detailed plots."),
    name="Plots",
    sizing_mode='stretch_width'
)

# ----------------------------- #
#         Query & Filters       #
# ----------------------------- #


# --- Update eruption filters --- #
def update_eruption_dates(selected):
    numbers = [volcano_display_map[name] for name in selected]
    filtered = eruptions[eruptions['volcano_number'].isin(numbers)]
    return list(filtered.apply(lambda r: format_date(r['start_date'], r.get('eruption_number')), axis=1))

volcano_name_filter.param.watch(lambda e: setattr(eruption_date_filter, 'options', update_eruption_dates(e.new)), 'value')


# --- Generate plots --- #
def generate_plots(df_samples):
    """Generate chemical composition plot using the selected samples."""

    def pane_or_plot(df):
        return (plot_chemicals(df), plot_chemicals_vei(df)) if not df.empty else (
            pn.pane.Markdown("⚠️ Select a volcano to view chemicals plot."),
            pn.pane.Markdown("⚠️ Select a volcano to view chemicals plot.")
        )
    
    chemicals_plot, chemicals_plot_vei = pane_or_plot(df_samples)

    return pn.Row(
        chemicals_plot, 
        chemicals_plot_vei, 
        align='center'
    )


# --- Reactive detailed plot --- #
@pn.depends(
    volcano_name_filter.param.value,
    eruption_date_filter.param.value,
    watch=True
)
def generate_detail_plots(selected_volcano, selected_eruption):
    """Generate chemical composition plots based on selected volcano and eruption."""

    df_samples = db_client.get_samples_from_volcano_eruptions(
        [extract_volcano_number(volcano) for volcano in selected_volcano],
        [extract_eruption_number(eruption) for eruption in selected_eruption]
    )

    plot_container[:] = [generate_plots(df_samples)]


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
    eruption_date_filter.param.value,
)
def view():

    # Example content for the second page
    title = pn.pane.Markdown("""
    ## Analyze volcano
    
    This page allow to analyze in more details the chemicals composition of **[GVP](https://volcano.si.edu/)** volcano from only **[GEOROC](https://georoc.eu/)** samples since **[PetDB](https://search.earthchem.org/)** samples can't be linked to a GVP volcano.
    
    To analyze a volcano we provide two TAS Diagram as well as some statistic on the rock percentage around all material type present in the GEOROC samples for the selected volcano.

    The first TAS Diagram show the chemical composition of GEOROC samples by type of material.
    
    We use acronym to designed different materials:
    - **WR**: Whole Rock
    - **GL**: Volcano Glass
    - **INC**: Inclusion
    - **MIN**: Mineral

    The second TAS Diagram show the chemical composition of GEOROC samples by VEI (Volcanic Explosivity Index).

    **Note:** 
    > GVP tends to assign a **default VEI of 2** for eruptions with **limited available information**.
    """)

    header = pn.Row(title)

    filter_panel = pn.Card(
        pn.Column(
            pn.FlexBox(
                volcano_name_filter,
                eruption_date_filter,
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
