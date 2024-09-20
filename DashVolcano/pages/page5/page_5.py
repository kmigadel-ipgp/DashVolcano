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

from pages.page5.layout import create_page_layout

# Importing callbacks to register them with Dash (no need to call anything)
from pages.page5 import callbacks

class Page5:
    def __init__(self):
        # Assign the segmented layout
        self.layout = create_page_layout()

    def register_callbacks(self, app):
        """Register callbacks related to Page 2"""
        # You can delegate this to the callbacks file by importing it
        callbacks.register_callbacks_page5(app)