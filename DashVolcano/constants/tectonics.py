# tectonics.py
"""
This file contains all the tectonics constants used across the project.
"""

ALL_TECTONIC_SETTINGS = ['Intraplate / Continental crust (>25 km)', 'Intraplate / Intermediate crust (15-25 km)',
                         'Intraplate / Oceanic crust (< 15 km)', 'Rift zone / Continental crust (>25 km)',
                         'Rift zone / Intermediate crust (15-25 km)', 'Rift zone / Oceanic crust (< 15 km)',
                         'Subduction zone / Continental crust (>25 km)',
                         'Subduction zone / Crustal thickness unknown',
                         'Subduction zone / Intermediate crust (15-25 km)',
                         'Subduction zone / Oceanic crust (< 15 km)']
                         
GEOROC_TECTONIC_SETTINGS = ['Archean Cratons', 'Complex Volcanic Settings', 'Continental Flood Basalts', 'Convergent Margins',
                            'Inclusions', 'Intraplate Volcanics', 'Ocean Basin Flood Basalts', 'Oceanic Plateaus', 'Ocean Island Groups',
                            'Rift Volcanics', 'Seamounts', 'Submarine Ridges']     
                            
NEW_TECTONIC_SETTINGS = ['Subduction zone / Oceanic', 'Subduction zone / Continental', 'Intraplate / Oceanic', 'Intraplate / Continental', 'Rift at plate boundaries / Oceanic', 'Rift at plate boundaries / Continental']

NEW_TECTONIC_DICT = {'Subduction zone / Oceanic': 'Subduction zone / Oceanic crust (< 15 km)++Subduction zone / Crustal thickness unknown;Pacific Ocean (southwestern);Bougainville and Solomon Islands;Izu, Volcano, and Mariana Islands;New Ireland;Santa Cruz Islands',
                     'Subduction zone / Continental': 'Subduction zone / Continental crust (>25 km)+Subduction zone / Intermediate crust (15-25 km)++Subduction zone / Crustal thickness unknown;North of Luzon;Lesser Sunda Islands;Fiji Islands', 
                     'Intraplate / Oceanic': 'Intraplate / Oceanic crust (< 15 km)', 
                     'Intraplate / Continental': 'Intraplate / Continental crust (>25 km)+Intraplate / Intermediate crust (15-25 km)', 
                     'Rift at plate boundaries / Oceanic': 'Rift zone / Oceanic crust (< 15 km)', 
                     'Rift at plate boundaries / Continental':  'Rift zone / Continental crust (>25 km)+Rift zone / Intermediate crust (15-25 km)'}                                                
          