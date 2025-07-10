import param
import panel as pn
import holoviews as hv
import hvplot.pandas

from holoviews.streams import Selection1D

from helpers.helpers import load_tectonic_lines, get_tectonic_plate_overlay, prepare_csv_download

from functions.analytic_plots import get_plots

from constants.chemicals import SIO2_WT_PERCENT
from constants.tectonics import NEW_TECTONIC_SETTINGS, ALL_TECTONIC_SETTINGS
from constants.paths import RIDGE_GMT, TRANSFORM_GMT, TRENCH_GMT
from constants.rocks import GEOROC_TO_GVP

from backend.database import Database

hv.extension('bokeh')

class SelectionManager(param.Parameterized):
    selected_indexes = param.List(default=[])

    def update_selection(self, indexes):
        self.selected_indexes = indexes

selection_manager = SelectionManager()

# ----------------------------- #
#         Initialization        #
# ----------------------------- #

db_client = Database()

samples = pn.state.as_cached('samples', db_client.get_samples)
volcanoes = pn.state.as_cached('volcanoes', db_client.get_volcanoes)
eruptions = pn.state.as_cached('eruptions', db_client.get_eruptions)
countries = pn.state.as_cached('countries', db_client.get_countries)
tectonic_settings = pn.state.as_cached('tectonic_settings', db_client.get_tectonic_settings)
volcano_names = pn.state.as_cached('volcano_names', db_client.get_volcano_names)

ridges = load_tectonic_lines(RIDGE_GMT)
trenches = load_tectonic_lines(TRENCH_GMT)
transforms = load_tectonic_lines(TRANSFORM_GMT)
tectonic_plates = get_tectonic_plate_overlay()

# Global stream to track selection
selection_stream = Selection1D()

# ----------------------------- #
#             UI               #
# ----------------------------- #

tectonic_layer_filter = pn.widgets.MultiChoice(
    name='Tectonic Layers', 
    options=['Show Tectonic Plates', 'Rift', 'Subduction', 'Intraplate'],
    width=250
)

rock_db_filter = pn.widgets.MultiChoice(name='Rock Database', options=['GVP', 'PetDB', 'GEOROC'], value=['GVP', 'PetDB', 'GEOROC'], width=300)
rock_tectonic_filter = pn.widgets.MultiChoice(name='Rock Tectonic Settings', options=NEW_TECTONIC_SETTINGS, width=300)
rock_wr_tectonic_filter = pn.widgets.MultiChoice(name='Rock Tectonic Settings', options=NEW_TECTONIC_SETTINGS, width=300)
rock_density_filter = pn.widgets.MultiChoice(name='Rock Density', options=list(GEOROC_TO_GVP.keys()) + [SIO2_WT_PERCENT], width=300)

country_filter = pn.widgets.MultiChoice(name='GVP Country', options=countries, width=300)
gvp_tectonic_filter = pn.widgets.MultiChoice(name='GVP Tectonic Settings', options=ALL_TECTONIC_SETTINGS + ['Unknown'], width=300)

volcano_display_map = {
    f"{row['volcano_name']} ({row['volcano_number']})": row['volcano_number']
    for _, row in volcanoes.iterrows()
}
volcano_name_filter = pn.widgets.MultiChoice(name='Volcano Name(s)', options=list(volcano_display_map.keys()), placeholder='Type to search...', width=250)

search_button = pn.widgets.Button(name='Search', button_type='primary')
map_plot = pn.pane.HoloViews()

insight_container = pn.Column(
    pn.pane.Placeholder("⚠️ Select points on the map to view detailed plots. You need to remove 'GVP' from the filters and remove 'Tectonic Layers'."),
    name="Plots",
    sizing_mode='stretch_width'
)

# Create IntInput widgets for min and max values
min_input = pn.widgets.IntInput(name='Location with a min samples equal to:', value=1, start=1)
max_input = pn.widgets.IntInput(name='Location with a max samples equal to:', value=100, start=1)

# Create a select widget
select_widget = pn.widgets.Select(name='View all samples', options=['Yes', 'No'])

# Panel widgets to display the values
nb_wr_samples_selected_widget = pn.widgets.StaticText(name="Total number of selected Whole Rock samples", value="0")
nb_wr_georoc_samples_widget = pn.widgets.StaticText(name="Total GEOROC Whole Rock samples in database", value="0")
nb_wr_petdb_samples_widget = pn.widgets.StaticText(name="Total PetDB Whole Rock samples in database", value="0")

# Create a FileDownload widget for downloading the selected data
download_button = pn.widgets.FileDownload(
    filename='selected_data.csv',
    button_type='primary',
    disabled=True
)

# ----------------------------- #
#         Query & Filters       #
# ----------------------------- #


@pn.depends(
    rock_db_filter.param.value,
    rock_tectonic_filter.param.value,
    rock_density_filter.param.value,
    gvp_tectonic_filter.param.value,
    country_filter.param.value,
    volcano_name_filter.param.value,
    tectonic_layer_filter.param.value
)
def generate_map_overlay():
    overlay = []

    if "GVP" in rock_db_filter.value:
        volcanoes = db_client.filter_volcanoes_by_selection(
            volcano_name_filter.value, 
            country_filter.value, 
            gvp_tectonic_filter.value
        )

        if len(volcanoes) == 1:
            lat = volcanoes.iloc[0]['latitude']
            lon = volcanoes.iloc[0]['longitude']
            lat_pad = 1
            lon_pad = 1
            xlim = (lon - lon_pad, lon + lon_pad)
            ylim = (lat - lat_pad, lat + lat_pad)
        else:
            xlim = None
            ylim = None
        

        # Plot volcano positions
        volcano_points = volcanoes.hvplot.points(
            'longitude', 'latitude', geo=True, tiles='CartoLight',
            size=10, alpha=0.8, color='red',
            hover_cols=[
                'volcano_name', 
                'volcano_number',
                'primary_volcano_type',
                'latitude', 
                'longitude', 
                'tectonic_setting', 
                'country',
                'evidence_category',
                'major_rock_1',
                'major_rock_2',
                'major_rock_3',
                'reference'
            ],
            hover_tooltips=[
                ('Volcano Name', '@volcano_name'), 
                ('Volcano Number', '@volcano_number'), 
                ('Volcano Type', '@primary_volcano_type'),
                ('Latitude', '@latitude'), 
                ('Longitude', '@longitude'), 
                ('Tectonic setting', '@tectonic_setting'), 
                ('Country', '@country'), 
                ('Evidence category', '@evidence_category'),
                ('Major rock 1', '@major_rock_1'),
                ('Major rock 2', '@major_rock_2'),
                ('Major rock 3', '@major_rock_3'),
                ('Reference', '@reference')
            ],
            tools=['pan', 'wheel_zoom', 'reset', 'hover', 'box_select', 'lasso_select'],
            xlim=xlim,
            ylim=ylim,
            responsive=True, min_width=800, min_height=600
        ).opts(active_tools=['pan', 'wheel_zoom'])

        overlay.append(volcano_points)

    if "GEOROC" in rock_db_filter.value or "PetDB" in rock_db_filter.value:

        samples = db_client.filter_samples_by_selection(volcano_name_filter.value, rock_db_filter.value, rock_tectonic_filter.value, rock_density_filter.value)

        grouped_samples = (
            samples.groupby(['latitude', 'longitude', 'db'])
            .agg({'_id': 'count', SIO2_WT_PERCENT: 'mean', 'tectonic_setting': 'first'})
            .reset_index()
            .rename(columns={'_id': 'count', SIO2_WT_PERCENT: 'SIO2(WT%) mean'})
        )
        grouped_samples['index'] = grouped_samples.index

        # Scale the point sizes
        grouped_samples['size'] = grouped_samples['count'] + 10

        # Determine the color field based on whether SIO2_WT_PERCENT is selected
        color_field = 'SIO2(WT%) mean' if SIO2_WT_PERCENT in rock_density_filter.value else 'db'
        cmap = 'bmy' if color_field == 'SIO2(WT%) mean' else None

        sample_points = grouped_samples.hvplot.points(
            'longitude', 'latitude', geo=True, tiles='CartoLight',
            size='size', alpha=0.6, color=color_field, cmap=cmap,
            tools=['pan', 'wheel_zoom', 'reset', 'hover', 'box_select', 'lasso_select'],
            hover_cols=['db', 'latitude', 'longitude', 'count', 'SIO2(WT%) mean', 'tectonic_setting'],
            hover_tooltips=[
                ('Database', '@db'), 
                ('Tectonic setting', '@tectonic_setting'),
                ('Number of samples', '@count'), 
                ('SIO2(WT%) mean', '@{SIO2(WT%) mean}'),
            ],
            responsive=True, min_width=800, min_height=600
        ).opts(active_tools=['box_select', 'wheel_zoom'])


        selection_stream.source = sample_points
        overlay.append(sample_points)

    if "Rift" in tectonic_layer_filter.value:
        overlay.append(ridges.hvplot(geo=True, color='blue', line_width=2, label="Rift", hover_cols=['name'], hover_tooltips=['name']).opts(active_tools=['pan', 'wheel_zoom']))
    if "Subduction" in tectonic_layer_filter.value:
        overlay.append(trenches.hvplot(geo=True, color='red', line_width=2, label="Subduction",  hover_cols=['name'], hover_tooltips=['name']).opts(active_tools=['pan', 'wheel_zoom']))
    if "Intraplate" in tectonic_layer_filter.value:
        overlay.append(transforms.hvplot(geo=True, color='green', line_width=2, label="Intraplate",  hover_cols=['name'], hover_tooltips=['name']).opts(active_tools=['pan', 'wheel_zoom']))
    if "Show Tectonic Plates" in tectonic_layer_filter.value:
        overlay.append(tectonic_plates.hvplot(geo=True, alpha=0.1, line_width=0.5, hover_cols=['PlateName'], hover_tooltips=[('Tectonic Plate', '@PlateName')], label='Tectonic Plates').opts(active_tools=['pan', 'wheel_zoom']))

    # Combine overlays into a single plot
    combined_overlay = overlay[0]

    for plot in overlay[1:]:
        combined_overlay = combined_overlay * plot
    
    return combined_overlay


@pn.depends(selection_stream.param.index, watch=True)
def on_selection_change(indexes):   
    selection_manager.update_selection(indexes)


@pn.depends(select_widget.param.value)
def toggle_min_max_inputs(select_value):
    disabled = (select_value == 'Yes')
    min_input.disabled = disabled
    max_input.disabled = disabled


def generate_plots(df_selected_data, df_selected_wr_agg, df_wr_agg, df_wr_composition_samples, df_wr_composition_volcanoes, samples_tectonic_setting, volcanoes_tectonic_setting):
    """Generate plots using the provided data."""
    
    tas_plot, afm_plot, selected_rock_plot, rock_plot, rock_composition_samples_plot, rock_composition_volcanoes_plot = get_plots(
        df_selected_data, 
        df_selected_wr_agg, 
        df_wr_agg, 
        df_wr_composition_samples, 
        df_wr_composition_volcanoes, 
        samples_tectonic_setting, 
        volcanoes_tectonic_setting
    )

    # Count samples available to download
    nb_samples_to_download = len(df_selected_data)

    # Create note if needed
    if nb_samples_to_download > 0:
        note = pn.pane.Markdown(
            f"ℹ️ **{nb_samples_to_download} samples** included in the CSV.",
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
    
    plot_layout = pn.Column(
        pn.Row(
            download_row,
            align='center'
        ),
        pn.Row(
            tas_plot, 
            afm_plot,
            align='center'
        ),
        pn.Spacer(height=80),
        pn.Row(
            selected_rock_plot,
            rock_plot,
            pn.Column(
                pn.pane.Markdown("### Filter by number of Whole Rock samples"),
                min_input, 
                max_input,
                select_widget,
                rock_wr_tectonic_filter,
                nb_wr_samples_selected_widget,
                nb_wr_georoc_samples_widget,
                nb_wr_petdb_samples_widget,
                width=400
            ),   
        ),
        pn.Spacer(height=20),
        pn.Row(
            rock_composition_samples_plot,
            rock_composition_volcanoes_plot,
            align='center',
        ),
        styles={"align-self": "center"}
    )

    return plot_layout


@pn.depends(
    selection_manager.param.selected_indexes,
    volcano_name_filter.param.value,
    select_widget.param.value,
    min_input.param.value,
    max_input.param.value,
    rock_db_filter.param.value,
    rock_tectonic_filter.param.value,
    gvp_tectonic_filter.param.value,
    rock_density_filter.param.value,
    country_filter.param.value,
    rock_wr_tectonic_filter.param.value,
    watch=True
)
def generate_detail_plots(selected, volcano_names, select_value, min_value, max_value, selected_db, samples_tectonic_setting, volcanoes_tectonic_setting, rock_density, country_selected, wr_db_tectonic_setting):
    """Generate detailed plots based on selected points on the map."""

    if not selected:
        return
    
    # Step 1: Get location selected
    location_selected = db_client.get_location_selected(selected, volcano_names, selected_db, samples_tectonic_setting, rock_density)
    if not location_selected:
        download_button.disabled = True
        insight_container.clear()
        insight_container.append(
            pn.pane.Placeholder("⚠️ No valid locations selected.")
        )
        return
    
    # Step 2: Get selected data
    df_selected_data = db_client.get_selected_data(location_selected, volcano_names, selected_db)
    if df_selected_data is None:
        download_button.disabled = True
        insight_container.clear()
        insight_container.append(
            pn.pane.Placeholder("⚠️ No matching documents found in the database.")
        )
        return
    
    # Enable the download button and set the file to the selected data
    download_button.disabled = False

    csv_buffer, filename = prepare_csv_download(df_selected_data)
    download_button.file = csv_buffer
    download_button.filename = filename

    # Step 3: Get WR selected data
    df_selected_wr_agg = db_client.aggregate_selected_wr_data(location_selected)

    # Step 4: Get WR database data
    df_wr_agg = db_client.aggregate_wr_data(min_value, max_value, select_value, wr_db_tectonic_setting)

    # Step 5: Get rock composition of volcanoes from samples
    df_wr_composition_samples = db_client.aggregate_wr_composition_samples(
        samples_tectonic_setting
    )

    # Group by 'db' and sum the 'count' column to get the number of samples for each database
    db_counts = df_wr_agg.groupby('db')['count'].sum()

    nb_wr_samples_selected_widget.value = df_selected_wr_agg['count'].sum()
    nb_wr_georoc_samples_widget.value = db_counts.get('GEOROC', 0)
    nb_wr_petdb_samples_widget.value = db_counts.get('PetDB', 0)

    # Step 6: Get rock composition of volcanoes from GVP volcanoes
    df_wr_composition_volcanoes = db_client.aggregate_wr_composition_volcanoes(
        volcanoes_tectonic_setting, 
        country_selected
    )

    # Step 7: Generate plots
    plot_layout = generate_plots(df_selected_data, df_selected_wr_agg, df_wr_agg, df_wr_composition_samples, df_wr_composition_volcanoes, samples_tectonic_setting, volcanoes_tectonic_setting)
    
    # Update the insight container
    insight_container.clear()
    insight_container.append(plot_layout)

   
def update_busy_indicator(event=None):
    busy = event.new

    has_plots = False
    if len(insight_container) > 0:
        first_pane = insight_container[0]
        # Assuming plots are shown as a Column or Row (or something other than Placeholder)
        if not isinstance(first_pane, pn.pane.Placeholder):
            has_plots = True

    if busy and not has_plots:
        insight_container.clear()
        insight_container.append(pn.pane.Placeholder("⏳ App is processing..."))
    elif not has_plots:
        insight_container.clear()
        if "GVP" not in rock_db_filter.value and not tectonic_layer_filter.value:
            msg = "✅ You can now select points on the map to view plots!"
        elif "GVP" in rock_db_filter.value and not tectonic_layer_filter.value:
            msg = "ℹ️ Remove 'GVP' from Rock Database to select points and view plots."
        elif "GVP" not in rock_db_filter.value and tectonic_layer_filter.value:
            msg = "ℹ️ Remove 'Tectonic Layers' filter to select points and view plots."
        else:
            msg = "⚠️ Select points on the map to view detailed plots. You need to remove 'GVP' from the filters and remove 'Tectonic Layers'."
        insight_container.append(pn.pane.Placeholder(msg))



def update_map(event=None):
    selection_stream.event(index=[])
    insight_container.clear()
    insight_container.append(pn.pane.Placeholder("⏳ App is processing..."))
    map_plot.object = generate_map_overlay()

# ----------------------------- #
#           Layout              #
# ----------------------------- #

search_button.on_click(update_map)
pn.state.param.watch(update_busy_indicator, ['busy'])
toggle_min_max_inputs(select_widget.value)


@pn.depends(
    rock_db_filter.param.value,
    rock_tectonic_filter.param.value,
    rock_density_filter.param.value,
    gvp_tectonic_filter.param.value,
    country_filter.param.value,
)
def view():
    update_map()

    toggle_panel = toggle_min_max_inputs

    title = pn.pane.Markdown("## Map Page")
    
    description = pn.pane.Markdown("""
    This map shows **[GVP](https://volcano.si.edu/)** volcanoes and the location of **[GEOROC](https://georoc.eu/)** and **[PetDB](https://search.earthchem.org/)** samples. 
    Use the filters to visualize the **samples** and **volcanoes** you are interested in. For more details, see tooltip above.
    
    From the interactive map, you can select samples using the Lasso or Box selection tools to explore their geochemical compositions.

    Based on your selection, multiple plots will be generated, and you'll have the option to download the selected data as a CSV file.

    Below the map, you’ll find TAS and AFM diagrams, along with rock type frequency plots, which allow you to compare the Whole Rock samples from your selection with the Whole Rock samples from the entire database.

    To refine your comparison, a filter is available that adjusts the frequency plot to reflect an equivalent number of Whole Rock samples. If you wish to focus on a specific tectonic setting, you can use the Rock Tectonic Settings filter.

    Lastly, we display the proportions of rock compositions from both GEOROC and GVP perspectives, with an option to filter by tectonic setting using Rock Tectonic Settings and GVP Tectonic Settings.
                                   
    **Note:** 
    > - Lasso selection may take longer to process. Check the busy indicator next to the sun icon (top right) to confirm it's rendering.           
    > - The data displayed in the TAS and AFM diagrams aren't filtered as PetDB mentioned they don't guarantee the accuracy of identification, navigation, or metadata. Users are encouraged to report errors or concerns.

    """)

    tooltip = pn.widgets.TooltipIcon(
        value=(
            "This map shows **[GVP](https://volcano.si.edu/)** volcanoes and the location of **[GEOROC](https://georoc.eu/)** and **[PetDB](https://search.earthchem.org/)** samples.  \n"
            "Use the filters to visualize the **samples** and **volcanoes** you are interested in. \n"
            "There are three types of filters (per volcano, per samples and per tectonic plates). \n\n"
            "Volcanoes: \n"
            "- **Filter by tectonic settings** to visualize only volcanoes related to a specific tectonic area.\n"
            "- **Filter by country** to visualize only volcanoes related to a specific country.\n"
            "- **Filter by volcano name** to visualize only specific volcanoes.\n\n"

            "Samples: \n"
            "- **Filter by tectonic settings** to visualize only samples related to a specific tectonic area.\n"
            "- **Filter by database** (GEOROC, PetDB, GVP) to visualize the data you're interested in. \n"
            "- **Filter by type of rock** or **SIO2(WT%)** to visualize only samples related to a specific rock type. \n\n"
            
            "Tectonic plates: \n"
            "- You can display the tectonic plates and their boundaries using **Tectonic Layers** \n\n"
            
            "From the generated map, you can select **samples** using **Lasso selection** or **Box selection** to explore their compositions. \n\n"
            
            "**Note:** \n\n" 
            "> Lasso selection may take longer to process. Check the busy indicator next to the sun icon (top right) to confirm it's rendering. \n\n"
            "> The data displayed in the TAS and AFM diagrams aren't filtered as PetDB mentioned they don't guarantee the accuracy of identification, navigation, or metadata. Users are encouraged to report errors or concerns. \n\n"

        )
    )

    header = pn.Row(title, tooltip)

    filter_panel = pn.Card(
        pn.Column(
            pn.FlexBox(  # Row 1: rock filters
                rock_tectonic_filter,
                rock_db_filter,
                rock_density_filter,
                justify_content='center',
                align_items='center',
                flex_wrap='wrap',
                sizing_mode='stretch_width'
            ),
            pn.FlexBox(  # Row 2: country, tectonic, volcano, layers
                gvp_tectonic_filter,
                country_filter,
                volcano_name_filter,
                tectonic_layer_filter,
                justify_content='center',
                align_items='center',
                flex_wrap='wrap',
                sizing_mode='stretch_width'
            ),
            pn.FlexBox(  # Row 3: search button
                search_button,
                justify_content='center',
                align_items='center',
                sizing_mode='stretch_width'
            ),
        ),
        title="Filters",
        collapsible=True,
        sizing_mode='stretch_width'
    )

    insight_plot = pn.Card(
        pn.Row(
            insight_container,
        ),
        title="Plots",
        min_width=1500,
        min_height=1800,
        sizing_mode='stretch_width'
    )

    layout = pn.Column(
        header,
        description,
        filter_panel,
        toggle_panel,
        pn.Spacer(height=10),
        map_plot,
        pn.Spacer(height=20),
        insight_plot,
        pn.Spacer(height=20),
        sizing_mode='stretch_width',
    )

    return layout