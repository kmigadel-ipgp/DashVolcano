# ************************************************************************************* #
#
# This file defines all the callback functions for the Dash app.
# These callbacks include updating figures like the map, TAS diagram, AFM diagram,
# and rock sample frequency radar plot.
# 
# Callback Functions:
# 1) set_tectonic_options: updates tectonic menu based on country selection.
# 2) update_map: updates the map based on user input for regions, tectonics, and rocks.
# 
# Author: F. Oggier
# Editor: K. Migadel
# Last update: September 20 2024
# ************************************************************************************* #


from dash import Input, Output

from pages.visualization import set_date_options, update_charts_rock_vei, update_store

def register_callbacks_page2(app):
    """Register all callbacks related to Page 2"""

    # ************************************#
    #
    # Callbacks for menu updates
    #
    # ************************************#

    # part 1: Update eruption date options for the first volcano dropdown
    @app.callback(
        Output("page2-erup-filter-1", "options"),  # Output for date options in dropdown 1
        Output("page2-erup-filter-1", "value"),    # Output for the selected date in dropdown 1
        # Input from the first volcano dropdown selection
        Input("page2-region-filter-1", "value"),
    )
    def set_date_options_callback(volcano_name):
        """Updates the eruption date options based on the selected volcano for the first dropdown"""
        return set_date_options(volcano_name)

    # part 2: Update eruption date options for the second volcano dropdown
    @app.callback(
        Output("page2-erup-filter-2", "options"),  # Output for date options in dropdown 2
        Output("page2-erup-filter-2", "value"),    # Output for the selected date in dropdown 2
        # Input from the second volcano dropdown selection
        Input("page2-region-filter-2", "value"),
    )
    def set_date_options2_callback(volcano_name):
        """Updates the eruption date options based on the selected volcano for the second dropdown"""
        return set_date_options(volcano_name)


    # ************************************#
    #
    # Callbacks for figure updates
    #
    # ************************************#

    # part 1: Update figures (TAS, VEI, and oxide) for the first volcano selection
    @app.callback(
        [
            Output("page2-chem-chart-georoc-1", "figure"),  # Output for TAS diagram figure
            Output("page2-vei-chart-1", "figure"),          # Output for VEI diagram figure
            Output("page2-oxyde-chart-1", "figure"),        # Output for oxide chart figure
        ],
        [
            # Input from the first volcano dropdown selection
            Input("page2-region-filter-1", "value"),
            # Input from the eruption date dropdown
            Input("page2-erup-filter-1", "value"),
        ],
    )
    def update_charts_rock_vei_callback(volcano_name, date):
        """Updates the TAS, VEI, and oxide charts based on the selected volcano and date for the first dropdown"""
        fig_chem, fig_vei, fig_oxyde, _ =  update_charts_rock_vei(volcano_name, date)
        return fig_chem, fig_vei, fig_oxyde

    # part 1: Store data and update title for TAS diagram (first set)
    @app.callback(
            Output("page2-tas-title-1", "children"),        # Output for the title of the first TAS diagram
            Input("page2-chem-chart-georoc-1", "figure")    # Input from the TAS chart figure
    )
    def update_store_callback(fig):
        """
        Updates the store and subtitle based on selected dropdown and TAS plot interactions.
        
        Args:
            fig: Current TAS diagram figure.

        Returns:
            str: Updated TAS diagram subtitle (or empty if no markers).
        """
        return update_store(fig)
    
    # part 2: Update figures (TAS, VEI, and oxide) for the second volcano selection
    @app.callback(
        [
            Output("page2-chem-chart-georoc-2", "figure"),  # Output for TAS diagram figure
            Output("page2-vei-chart-2", "figure"),          # Output for VEI diagram figure
            Output("page2-oxyde-chart-2", "figure"),        # Output for oxide chart figure
        ],
        [
            # Input from the second volcano dropdown selection
            Input("page2-region-filter-2", "value"),
            # Input from the eruption date dropdown
            Input("page2-erup-filter-2", "value"),
        ]
    )
    def update_charts_rock_vei2_callback(volcano_name, date):
        """Updates the TAS, VEI, and oxide charts based on the selected volcano and date for the second dropdown"""
        fig_chem, fig_vei, fig_oxyde, _ =  update_charts_rock_vei(volcano_name, date)
        return fig_chem, fig_vei, fig_oxyde

    # part 2: Store data and update title for TAS diagram (second set)
    @app.callback(
        Output("page2-tas-title-2", "children"),        # Output for the title of the second TAS diagram
        Input("page2-chem-chart-georoc-2", "figure"),   # Input from the TAS chart figure
    )
    def update_store2_callback(fig):
        """
        Updates the store and subtitle based on selected dropdown and TAS plot interactions.
        
        Args:
            fig: Current TAS diagram figure.

        Returns:
            str: Updated TAS diagram subtitle (or empty if no markers).
        """
        return update_store(fig)
