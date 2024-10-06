#***********************************************************#
# WARNING: this page is still under construction
# Author: F. Oggier
# Editor: K. Migadel
# Last update: September 20 2024
#************************************************************#

from pages.page3.layout import create_page_layout

# Importing callbacks to register them with Dash (no need to call anything)
from pages.page3 import callbacks


class Page3:
    def __init__(self):
        # Assign the segmented layout
        self.layout = create_page_layout()

    def register_callbacks(self, app):
        """Register callbacks related to Page 3"""
        # You can delegate this to the callbacks file by importing it
        callbacks.register_callbacks_page3(app)
