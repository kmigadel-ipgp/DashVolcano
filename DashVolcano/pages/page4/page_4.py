# ************************************************************************************* #
#
# This creates a one-page layout, with a map, a TAS diagram, and AFM diagram, 
# a rock sample frequency radar plot. two rock composition sunburst plots
# 1) create_map_samples: creates the dataframe of samples to be drawn
# 2) displays_map_samples: draws the map
# 3) update_tas: draws the TAS diagram, possibly with selected points
# 4) download_tasdata: downloads the TAS data
#
# Author: F. Oggier
# Editor: K. Migadel
# Last update: September 20 2024
# ************************************************************************************* #

from pages.page4.layout import create_page_layout

# Importing callbacks to register them with Dash (no need to call anything)
from pages.page4 import callbacks


class Page4:
    def __init__(self):
        # Assign the segmented layout
        self.layout = create_page_layout()

    def register_callbacks(self, app):
        """Register callbacks related to Page 4"""
        # You can delegate this to the callbacks file by importing it
        callbacks.register_callbacks_page4(app)

