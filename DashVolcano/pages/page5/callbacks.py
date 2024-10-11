# ************************************************************************************* #
#
# This creates a one-page layout, that hosts side-by-side two TAS diagrams for the same
# volcano, with below its chronogram.
# Contains two functions:
# 1) update_joint_chemchart: jointly updates both TAS diagrams
# 2) add_chems: superimpose chemicals on chronogram
#
# Author: F. Oggier
# Editor: K. Migadel
# Last update: September 20 2024
# ************************************************************************************* #


from dash import Input, Output
import plotly.graph_objs as go
from plotly.subplots import make_subplots


# import variables common to all files
# this includes loading the dataframes
from constants.shared_data import df_eruption, dict_georoc_sl, dict_georoc_gvp, df_events

# import functions to process GVP and GEOROC data
from functions.gvp import update_chronogram
from functions.georoc import plot_tas

from pages.visualization import set_date_options, update_joint_chemchart, add_chems, update_store, update_charts_rock_vei

def register_callbacks_page5(app):
    """Register all callbacks related to Page 5"""

    # ************************************#
    #
    # Callbacks for menu updates
    #
    # ************************************#

    # Update eruption date options for the first volcano dropdown
    @app.callback(
        Output("page5-erup-filter", "options"),  # Output for date options in dropdown 1
        Output("page5-erup-filter", "value"),    # Output for the selected date in dropdown 1
        # Input from the first volcano dropdown selection
        Input("page5-region-filter", "value"),
    )
    def set_date_options_callback(volcano_name):
        """Updates the eruption date options based on the selected volcano for the first dropdown"""
        return set_date_options(volcano_name)


    # ************************************#
    #
    # Callbacks for figure updates
    #
    # ************************************#

    @app.callback(
        [
            # Outputs: Update three different charts based on inputs
            Output("page5-chem-chart-georoc-1", "figure"),
            Output("page5-vei-chart", "figure"),
            Output("page5-chem-chart-georoc-2", "figure"),
        ],
        [
            # Inputs: From various UI components
            Input("page5-region-filter", "value"),        # Region filter (volcano name)
            Input("page5-erup-filter", "value"),          # Date filter (eruption date)
            Input("page5-period-button", "value"),        # Period selection (radio button)
            Input("page5-georoc-sample-filter", "value"), # GEOROC sample filter (checkbox)
        ]
    )
    def update_charts_rock_vei_callback(volcano_name, date, period_choice, add_georoc):
        """
        Updates charts based on user inputs: volcano name, eruption date, period choice, and whether to add GEOROC samples.

        Args:
            volcano_name: Name of the selected volcano (from dropdown).
            date: Selected eruption dates (from dropdown).
            period_choice: Selected time period ('1679 and after', 'before 1679', etc.).
            add_georoc: List indicating whether to add GEOROC chemical samples to the plots.

        Returns:
            Updated figures for the chemical charts and VEI chronogram.
        """

        # 1. First figure: TAS diagram with GEOROC chemical data
        fig, _, _, dfchem = update_charts_rock_vei(volcano_name, date)
                
        # 2. Second figure: Chronogram for VEI (Volcanic Explosivity Index)
        if volcano_name and volcano_name != "start":  # Ensure a valid volcano name is selected
            # Handle long or alternative volcano names
            n = dict_georoc_sl.get(volcano_name, volcano_name)
            n = dict_georoc_gvp.get(n, volcano_name.title())
            
            # Update the chronogram with eruption data for the selected period
            fig2 = update_chronogram([n], period_choice, df_eruption, df_events)
            
            # Optionally add GEOROC chemical data to the chronogram
            if add_georoc:
                fig2 = add_chems(dfchem, fig2, period_choice)
            
            # 3. Third figure: Combined chemical chart for GVP and GEOROC data
            figgvp = make_subplots(
                rows=2, cols=1, shared_xaxes=True, row_width=[0.85, 0.2], vertical_spacing=0.05
            )
            figgvp = update_joint_chemchart(volcano_name, dfchem, figgvp, date)
        
        else:
            # If no valid volcano is selected, return empty or default plots
            fig2 = go.Figure()  # Empty chronogram figure
            figgvp = plot_tas()  # Default TAS diagram plot

        # Set the height of the figgvp figure to 700
        figgvp.update_layout(height=700)
        figgvp.update_layout(title='<b>Chemical Rock Composition from Georoc (with known eruptions)</b><br>')

        # Return the updated figures for all three charts
        return fig, fig2, figgvp
    

    # part 1: Store data and update title for TAS diagram (first set)
    @app.callback(
        Output("page5-tas-title-1", "children"),        # Output for the title of the second TAS diagram
        Input("page5-chem-chart-georoc-1", "figure"),   # Input from the TAS chart figure
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

