import panel as pn

about = pn.pane.Markdown("""
# About DashVolcano

**DashVolcano** is an interactive web platform designed to explore volcanic data through geochemical analyses, eruption timelines, and allow to compare volcanoes. The application integrates multiple authoritative datasets to offer a unified and intuitive tool for volcanologists, researchers, educators, and enthusiasts.
""")

purpose = pn.pane.Markdown("""
---
## Purpose

DashVolcano aims to:
- Visualize volcanic eruptions over time.
- Analyze geochemical signatures of volcanic rock samples.
- Compare eruptions across different volcanoes and settings.
- Support educational and scientific use of curated geological data.
- Foster data accessibility and reproducibility in volcanology.
""")

database_design_1 = pn.pane.Markdown("""
---                                     
### 🔸 Database Design

We start by summarizing the features of interest from the GVP and GEOROC databases. The GVP database allows to query both volcano and eruption data (see https://volcano.si.edu/). 
We are using Holocene volcano datasets with known eruption data downloaded from the GVP volcano search URL (https://volcano.si.edu/search_volcano.cfm), including the volcano name, major and minor rocks types, the location, and the tectonic setting (Table 1). Hereafter, we only considered confirmed eruptions of GVP (https://volcano.si.edu/search_eruption.cfm) which typically include the eruption date(s), the volcanic explosivity index (VEI; Newhall and Self, 1982), among other data (Table 2). As classified by GVP. Overall, GVP contains data for about 1,400 volcanoes and 9,800 confirmed eruptions.
""")

image1 = pn.Column(
    pn.pane.Image("images/table1.jpg", width=400, alt_text="Table 1. GVP volcano datasets"),
    pn.pane.Markdown("""Table 1. GVP volcano datasets (*[source](https://www.frontiersin.org/articles/10.3389/feart.2023.1108056)*)""", styles={'align-self': 'center'}),
)

image2 = pn.Column(
    pn.pane.Image('images/table2.jpg', width=400, alt_text="Table 2. GVP eruption datasets"),
    pn.pane.Markdown("""Table 2. GVP eruption datasets (*[source](https://www.frontiersin.org/articles/10.3389/feart.2023.1108056)*)""", styles={'align-self': 'center'}),
)

database_design_2 = pn.pane.Markdown("""
The GEOROC database contains rock compositional data, including major element oxides in mass % (wt%), trace elements, and a range of isotope compositions (https://georoc.eu/) of about 384,000 volcanic sample analyses. It is possible to query the database, or to download precompiled files by locations, which are categorized by tectonic settings. Hereafter we will identify the features in GEOROC in capital letters to make it easier to distinguish between GEOROC features from those from GVP. The features of a rock sample from a precompiled file can include sample name, rock type, eruption date, sample location, and the geochemical data (only a subset of the available chemicals is reported here; Table 3).
""")

image3 = pn.Column(
    pn.pane.Image('images/table3.jpg', width=800, height=300, alt_text="Table 3. GEOROC volcanic rock sample datasets"),
    pn.pane.Markdown("""Table 3. GEOROC volcanic rock sample datasets (*[source](https://www.frontiersin.org/articles/10.3389/feart.2023.1108056)*)""", styles={'align-self': 'center'}),
)

database_design_3 = pn.pane.Markdown("""
We are only interested in volcanic rocks, so from the precompiled files only samples whose ROCK TYPE is VOL were considered. The precompiled files are grouped in 11 different folders that mainly reflect the tectonic settings: Archean cratons, complex volcanic settings, continental flood basalts, convergent margins, intraplate volcanics, ocean basin flood basalts, ocean island groups, oceanic plateaus, rift volcanics, seamounts and submarine ridges. The reported chemical compositions within those files are obtained from diverse types of material analysed: whole rock, melt inclusion, volcanic glass, and mineral. The melt inclusions analyses are reported in a separate precompiled fileMost mineral compositions are shown the plots because they are very different from the rest of the data, but when they do, their symbol is the same as whole rock.                   
To link the two databases we need to match GEOROC rock samples to GVP volcanoes and eruptions, for which we matched the geographical location and temporal features as described below (Figure 1).   

""")

image4 = pn.Column(
    pn.pane.Image('images/figure1.jpg', width=800,  height=350, alt_text="Figure 1. GVP–GEOROC schema"),
    pn.pane.Markdown("""Figure 1. GVP–GEOROC schema (*[source](https://www.frontiersin.org/articles/10.3389/feart.2023.1108056)*)""", styles={'align-self': 'center'}),
)

citation = pn.pane.Markdown("""
## Data Sources and Citation

This platform integrates data from three major databases: **GEOROC**, **PetDB**, and the **Global Volcanism Program (GVP)**. Each source has specific citation requirements outlined below.

---

### 🔸 GEOROC

The **GEOROC** (Geochemistry of Rocks of the Oceans and Continents) database compiles peer-reviewed geochemical data from the literature. Data use is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). 
                         
Data were downloaded from the GEOROC database (https://georoc.eu/) on June 2023, using the following parameters. We used precompiled files from the GEOROC repository, corresponding to the following tectonic/geologic settings:
- Archaean Cratons: [DOI](https://doi.org/10.25625/1KRR1P)
- Continental Flood Basalts: [DOI](https://doi.org/10.25625/WSTPOX)
- Convergent Margins: [DOI](https://doi.org/10.25625/PVFZCE)
- Complex Volcanic Settings: [DOI](https://doi.org/10.25625/1VOFM5)
- Intraplate Volcanic Rocks: [DOI](https://doi.org/10.25625/RZZ9VM)
- Rift Volcanics: [DOI](https://doi.org/10.25625/KAIVCT)
- Oceanic Plateaus: [DOI](https://doi.org/10.25625/JRZIJF)
- Ocean Basin Flood Basalts: [DOI](https://doi.org/10.25625/AVLFC2)
- Ocean Island Groups: [DOI](https://doi.org/10.25625/WFJZKY)
- Seamounts: [DOI](https://doi.org/10.25625/JUQK7N)

**Citing GEOROC:**
> Data were downloaded from the GEOROC database (https://georoc.eu/) in June 2023. See individual DOIs for detailed provenance.  
> Lehnert, K., Su, Y., Langmuir, C. H., Sarbas, B., & Nohl, U. (2000). A global geochemical database structure for rocks. *Geochemistry, Geophysics, Geosystems*, 1(5), 1012. https://doi.org/10.1029/1999GC000026
> Original references are included in the data downloads and displayed in plots when applicable.
                         
**Note:** Data can be download directly the whole dataset from [DOI](https://doi.org/10.21979/N9/BJENCK).

---

### 🔸 PetDB
                         
**PetDB** (Petrological Database of the Ocean Floor) is hosted by the EarthChem Library and licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

The data were downloaded from the PetDB Database (https://search.earthchem.org/) on 7 June, 2023, using the following parameters.

Parameters used:
- Location types: CONTINENTAL_RIFT, OCEAN_ISLAND, INTRAPLATE_OFF-CRATON, INTRAPLATE_CRATON, FRACTURE_ZONE, VOLCANIC_ARC, CONVERGENT_MARGIN, OCEANIC_PLATEAU, RIFT VALLEY, BACK-ARC_BASIN, INCIPIENT_RIFT, OLD_OCEANIC_CRUST, OPHIOLITE, SEAMOUNT, SPREADING_CENTER, TRANSFORM_FAULT, TRIPLE_JUNCTION, N/A
- Classification: *igneous*
- Material: *rock_samples*

                         
**Citing PetDB:**
> Original references are included in the data downloads and displayed in plots when applicable.

**Note:** PetDB does not guarantee the accuracy of identification, navigation, or metadata. Users are encouraged to report errors or concerns.

**Acknowledgement:** PetDB is supported by the U.S. National Science Foundation (NSF) as part of the IEDA data facility.           

---

### 🔸 Global Volcanism Program (GVP)

The **GVP** (Global Volcanism Program, Smithsonian Institution) is maintained by the Smithsonian Institution to support the mission of increasing and diffusing knowledge about global volcanism.

**Content license:**  
All GVP content is governed by the [Smithsonian Terms of Use](https://www.si.edu/termsofuse), and is available for personal, educational, and non-commercial use.

**Citing GVP:**
> Global Volcanism Program, 2024. *Volcanoes of the World* (v. 5.1.0; 9 June 2023). Smithsonian Institution. https://doi.org/10.5479/si.GVP.VOTW5-2023.5.1

""")

contributors = pn.pane.Markdown("""
---

## Contributors

DashVolcano was designed and developed by:
- **Fidel Costa** ([ORCID](https://orcid.org/0000-0002-1409-5325)) - Project Principal Investigator
- **Frederique Elise Oggier** ([ORCID](https://orcid.org/0000-0003-3141-3118)) - Project Principal Investigator, Coordinators, Web developer
- **Kévin Migadel** ([ORCID](https://orcid.org/0009-0006-0147-3354)) – Coordinators, Web developer
""")

latest_publications = pn.pane.Markdown("""
---
                         
## Latest Publications
> Oggier, F., Widiwijayanti, C., & Costa, F. (2023). Integrating global geochemical volcano rock composition with eruption history datasets. Frontiers in Earth Science, 11, 1108056. doi: [10.3389/feart.2023.1108056](https://www.frontiersin.org/articles/10.3389/feart.2023.1108056)
""")

license = pn.pane.Markdown("""
---

## License

This project integrates open-access datasets and adheres to the licensing requirements of each respective database.

""")

def view():
    return pn.Column(
        about, 
        purpose,
        database_design_1,
        pn.FlexBox(
            image1,
            image2,
            justify_content='center',
            align_items='center',
            flex_wrap='wrap',
            sizing_mode='stretch_width'
        ),
        database_design_2,
        pn.FlexBox(
            image3,
            justify_content='center',
            align_items='center',
            flex_wrap='wrap',
            sizing_mode='stretch_width'        
        ),
        database_design_3,
        pn.FlexBox(
            image4,
            justify_content='center',
            align_items='center',
            flex_wrap='wrap',
            sizing_mode='stretch_width'        
        ),
        citation,
        contributors,
        latest_publications,
        license,
        sizing_mode="stretch_width"
    )
