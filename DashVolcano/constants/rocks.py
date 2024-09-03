# rocks.py
"""
This file contains all the rocks constants used across the project.
"""

# GVP names for rocks
ROCK_SORTED = ['Trachybasalt / Tephrite Basanite', 'Foidite', 'Basalt / Picro-Basalt',
               'Andesite / Basaltic Andesite', 'Trachyandesite / Basaltic Trachyandesite',
               'Phono-tephrite /  Tephri-phonolite', 'Dacite', 'Trachyte / Trachydacite',
               'Phonolite', 'Rhyolite']

# this is where the rock data is
ALL_ROCKS = ['Major Rock ' + str(i) for i in range(1, 6)] + ['Minor Rock ' + str(i) for i in range(1, 6)]
MAJOR_ROCKS = ['Major Rock ' + str(i) for i in range(1, 6)]

# corresponding shorter names that will be used as column names
ROCK_COL = ['Tephrite Basanite', 'Foidite', 'Basalt', 
            'Andesite', 'Trachyandesite', 
            'Tephri-phonolite', 'Dacite', 'Trachyte',
            'Phonolite', 'Rhyolite']

# main rocks
MAIN_ROCKS = ['Basalt', 'Andesite', 'Dacite', 'Rhyolite']

ROCK_COL_LONG = MAIN_ROCKS + \
                ['Weighted Basalt', 'Weighted Andesite', 'Weighted Dacite', 'Weighted Rhyolite'] + \
                ['Felsic', 'Intermediate', 'Mafic']

ROCK_GROUPS = ['Basalt,Andesite,Dacite,Rhyolite', 'Weighted {Basalt,Andesite,Dacite,Rhyolite}',
               'Felsic,Intermediate,Mafic']

# cautious, both lists have the same ordering!!               
GEOROC_ROCKS = ['FOIDITE', 'PICROBASALT', 'BASALT', 'TEPHRITE/BASANITE', 'TRACHYBASALT',
                'BASALTIC ANDESITE', 'ANDESITE', 'BASALTIC TRACHYANDESITE', 'TRACHYANDESITE',
                'DACITE', 'RHYOLITE', 'TRACHYTE/TRACHYDACITE',
                'PHONO-TEPHRITE', 'TEPHRI-PHONOLITE', 'PHONOLITE']
GEOROC_ROCK_COL = ['Foidite', 'Basalt', 'Basalt', 'Tephrite Basanite', 'Tephrite Basanite',
                   'Andesite', 'Andesite', 'Trachyandesite', 'Trachyandesite',
                   'Dacite', 'Rhyolite', 'Trachyte',
                   'Tephri-phonolite', 'Tephri-phonolite', 'Phonolite']


VEI_COLS = ['max VEI', 'mean VEI', 'min VEI']

# Primary Volcano Classification
SHAPES = ['Shield(s)', 'Stratovolcano(es)', 'Caldera', 'Stratovolcano', 'Submarine',
          'Shield', 'Fissure vent(s)', 'Complex', 'Pyroclastic shield',
          'Pyroclastic cone(s)', 'Pyroclastic cone', 'Volcanic field', 'Caldera(s)',
          'Lava dome(s)', 'Lava cone', 'Compound', 'Maar', 'Crater rows', 'Tuff ring(s)',
          'Explosion crater(s)', 'Complex(es)', 'Tuff cone(s)', 'Fissure vent',
          'Subglacial', 'Cone(s)', 'Maar(s)', 'Lava dome', 'Stratovolcano?']
          