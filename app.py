import panel as pn
from pages.map_page import view as map_view
from pages.compare_volcanoes import view as compare_view
from pages.compare_vei_volcanoes import view as compare_vei_view
from pages.analyze_volcano import view as analize_view
from pages.timeline_volcano import view as timeline_view
from pages.about import view as about_view


pn.extension('plotly')

# --------------------------
# Main Template Setup
# --------------------------

# Link the selection only to the points layer
template = pn.template.FastListTemplate(
    title="DashVolcano",
    sidebar=[
        pn.pane.Markdown("## Navigation"),
        pn.layout.Divider(),
        pn.pane.Markdown("[Map Page](?page=map)"),
        pn.pane.Markdown("[Compare Page](?page=compare)"),
        pn.pane.Markdown("[Compare VEI Page](?page=vei)"),
        pn.pane.Markdown("[Analyze Volcano Page](?page=analyze)"),
        pn.pane.Markdown("[Time series Volcano Page](?page=timeline)"),
        pn.pane.Markdown("[About Page](?page=about)"),
    ],
)

# --------------------------
# Routing Pages
# --------------------------

# Function to serve the appropriate page based on the URL
def get_page():
    # Access query parameters correctly
    query_params = pn.state.location.query_params
    page = query_params.get('page', 'map')  # Default to 'map' if no page is specified
    
    if page == 'map':
        return map_view()
    elif page == 'compare':
        return compare_view()
    elif page == 'vei':
        return compare_vei_view()
    elif page == 'analyze':
        return analize_view()
    elif page == 'timeline':
        return timeline_view()
    elif page == 'about':
        return about_view()
    else:
        return pn.pane.Markdown("Page not found.")

# Set the main area of the template to the function that serves the pages
template.main[:] = [get_page]

# Serve the template
template.servable()