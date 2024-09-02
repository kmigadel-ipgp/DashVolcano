# chemicals.py
"""
This file contains all the chemicals constants used across the project.
"""

# GEOROC labels
LBLS = ['none', 'FEO(WT%)', 'CAO(WT%)', 'FEO(WT%)+CAO(WT%)', 'MGO(WT%)', 'FEO(WT%)+MGO(WT%)',
        'CAO(WT%)+MGO(WT%)', 'FEO(WT%)+CAO(WT%)+MGO(WT%)']
        
# PET DB
LBLS2 = ['none', 'FEO', 'CAO', 'FEO+CAO', 'MGO', 'FEO+MGO', 'CAO+MGO', 'FEO+CAO+MGO']
  

# columns of interest
CHEM_COLS = ['ROCK NAME', 'ERUPTION DAY', 'ERUPTION MONTH', 'ERUPTION YEAR',
            'SIO2(WT%)', 'TIO2(WT%)', 'AL2O3(WT%)', 'FEOT(WT%)',
            'FE2O3(WT%)', 'CAO(WT%)', 'MGO(WT%)', 'MNO(WT%)',
            'FEO(WT%)', 'K2O(WT%)', 'NA2O(WT%)', 'P2O5(WT%)',
            'H2O(WT%)', 'H2OP(WT%)', 'H2OM(WT%)']

MORE_CHEMS = ['FEO(WT%)', 'CAO(WT%)', 'MGO(WT%)']
              
OXIDES = ['SIO2(WT%)', 'TIO2(WT%)', 'AL2O3(WT%)', 
          'FE2O3(WT%)', 'CAO(WT%)', 'MGO(WT%)', 'MNO(WT%)',
          'FEO(WT%)', 'K2O(WT%)', 'NA2O(WT%)', 'P2O5(WT%)',
          'FEOT(WT%)'] + ['LOI(WT%)']                        
              
CHEMICALS_SETTINGS = ['SIO2(WT%)', 'TIO2(WT%)', 'AL2O3(WT%)', 'FEOT(WT%)', 'CAO(WT%)', 'MGO(WT%)', 'NA2O(WT%)', 'K2O(WT%)',
                      'PB206_PB204', 'PB207_PB204', 'PB208_PB204', 'SR87_SR86', 'ND143_ND144']
ISOTOPES = ['PB206_PB204', 'PB207_PB204', 'PB208_PB204', 'SR87_SR86', 'ND143_ND144']
                                  
COLS_ROCK = ['UNIQUE_ID', 'TECTONIC SETTING', 'MATERIAL', 'LOCATION COMMENT']

# GEOROC
COLOR_SCALE = {'none': 'blue', 'FEO(WT%)': '#FA8072', 'CAO(WT%)': '#E9967A',
              'FEO(WT%)+CAO(WT%)': '#FFA07A', 'MGO(WT%)': '#DC143C',
              'FEO(WT%)+MGO(WT%)': '#FF0000', 'CAO(WT%)+MGO(WT%)': '#B22222',
              'FEO(WT%)+CAO(WT%)+MGO(WT%)': '#8B0000'}