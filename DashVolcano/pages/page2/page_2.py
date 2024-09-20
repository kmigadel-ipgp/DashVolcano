# ************************************************************************************* #
#
# This creates a one-page layout, that hosts side-by-side comparison of two volcanoes,
# in terms of TAS diagrams, Harker diagrams, and respective known VEI and rocks.
# Contains two functions:
# 1) update_veichart: creates the VEI plot
# 2) update_oxyde: creates the Harker diagrams
#
# Author: F. Oggier
# Editor: K. Migadel
# Last update: September 20 2024
# ************************************************************************************* #

from pages.page2.layout import create_page_layout

# Importing callbacks to register them with Dash (no need to call anything)
from pages.page2 import callbacks

class Page2:
    def __init__(self):
        # Assign the segmented layout
        self.layout = create_page_layout()

    def register_callbacks(self, app):
        """Register callbacks related to Page 2"""
        # You can delegate this to the callbacks file by importing it
        callbacks.register_callbacks_page2(app)

