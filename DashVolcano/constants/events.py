# events.py
"""
This file contains all the events constants used across the project.
"""

NOT_ERUPTIVE = ['VEI (Explosivity Index)', 'Property damage', 'Fatalities', 'Evacuations',
               'Fauna kill', 'Seismicity (volcanic)', 'Edifice destroyed', 'Thermal anomaly',
               'Earthquakes (undefined)', 'Deformation (inflation)', 'Deformation (deflation)',
               'Earthquake (tectonic)', 'Deformation (undefined)', 'Volcanic tremor']

GROUPED_EVENTS = [['Glow', 'Liquid sulfur', 'Loud audible noises', 'Fumarolic or solfataric', 'Lightning',
                   'Eruption cloud', 'Volcanic smoke', 'Degassing'],
                  ['Directed explosion', 'Lava lake',
                   'Flames', 'Lahar or mudflow', 'Ashfall', 'Lapilli', 'Avalanche'],
                  ['Incandescent ejecta', 'Scoria', 'Lava dome formation', 'Lava fountains'],
                  ['Caldera formation', 'Cinder cone formation', 'Crater formation',
                   'Island formation', 'Fissure formation', 'Spine formation',
                   'Partial collapse at end of eruption'],
                  ['Lava flow(s)', 'Explosion', 'Blocks', 'Bombs', 'Ash Plume',
                   'Tephra', 'Pyroclastic flow', 'Ash'],
                  ['Jokulhaup', 'Phreatic activity', 'Phreatomagmatic eruption', 'Pumice',
                   'Mud', 'Tsunami', 'Water fountain']]

BY_SEVERITY_EVENTS = [
    # Possible to be existed without any magmatic activity
    ['Fumarolic or solfataric', 'Degassing', 'Loud audible noises', 'Water fountain',
     'Mud', 'Flames', 'Glow', 'Liquid sulfur', 'Lahar or mudflow', 'Jokulhaup', 'Volcanic smoke',
     'Phreatic activity', 'Ash', 'AshFall'],
    # Existed due to magmatic eruption (effusive)
    ['Lava lake', 'Lava fountains', 'Cinder cone formation', 'Fissure formation', 'Lava flow(s)',
     'Island formation', 'Lava dome formation', 'Spine formation', 'Incandescent ejecta', 'Blocks'],
    # Existed due to magmatic eruption (explosive)
    ['Pyroclastic flow', 'Phreatomagmatic eruption', 'Explosion', 'Ash Plume', 'Eruption cloud',
     'Lightning', 'Tephra', 'Lapilli', 'Scoria', 'Bombs', 'Pumice'],
    # Extreme volcanic phenomena
    ['Partial collapse at end of eruption', 'Avalanche', 'Tsunami', 'Directed explosion', 'Crater formation',
     'Caldera formation']
]