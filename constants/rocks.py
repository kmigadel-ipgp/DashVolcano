# rocks.py
"""
This file contains all the rocks constants used across the project.
"""

# GVP names for rocks
ROCK_SORTED = [
    'Trachybasalt / Tephrite Basanite',
    'Foidite',
    'Basalt / Picro-Basalt',
    'Andesite / Basaltic Andesite',
    'Trachyandesite / Basaltic Trachyandesite',
    'Phono-tephrite /  Tephri-phonolite',
    'Dacite',
    'Trachyte / Trachydacite',
    'Phonolite',
    'Rhyolite'
]

ROCK_GVP = [
    'Tephrite Basanite',
    'Foidite',
    'Basalt',
    'Andesite',
    'Trachyandesite',
    'Tephri-phonolite',
    'Dacite',
    'Trachyte',
    'Phonolite',
    'Rhyolite',
]

GEOROC_TO_GVP = {
    'FOIDITE': 'Foidite',
    'PICROBASALT': 'Basalt',
    'BASALT': 'Basalt',
    'TEPHRITE/BASANITE': 'Tephrite Basanite',
    'TRACHYBASALT': 'Tephrite Basanite',
    'BASALTIC ANDESITE': 'Andesite',
    'ANDESITE': 'Andesite',
    'BASALTIC TRACHYANDESITE': 'Trachyandesite',
    'TRACHYANDESITE': 'Trachyandesite',
    'DACITE': 'Dacite',
    'RHYOLITE': 'Rhyolite',
    'TRACHYTE/TRACHYDACITE': 'Trachyte',
    'PHONO-TEPHRITE': 'Tephri-phonolite',
    'TEPHRI-PHONOLITE': 'Tephri-phonolite',
    'PHONOLITE': 'Phonolite',
}

# Example: Mapping each shorter rock name to a unique color
MAIN_ROCK_COLORS = {
    'Basalt': (0, 0, 255),     # Blue
    'Rhyolite': (200, 0, 0),   # Cyan
    'Andesite': (0, 191, 0),   # Green
    'Dacite': (255, 64, 0),    # Orange
}