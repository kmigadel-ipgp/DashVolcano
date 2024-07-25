# ************************************************************************************* #
#
# This file starts the app DashVolcano.
# Type the command: python run.py
#
# The DashVolcano app was tested with: Python 3.7.4 on Ubuntu 20.04.4 LTS
#                                      Python 3.8.3 on Mac OS Monterey version 12.5.1
#
# Author: F. Oggier
# Last update: Aug 30 2022
# ************************************************************************************* #

import index

if __name__ == '__main__':
    index.app.run_server(debug=True)
