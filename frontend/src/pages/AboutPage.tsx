import { Info, Database, Microscope, Code, Star, Users, FileText, ExternalLink, Mountain } from 'lucide-react';

const AboutPage = () => {
  const externalLinks = {
    georoc: 'https://georoc.eu/',
    gvp: 'https://volcano.si.edu/',
    ipgp: 'https://www.ipgp.fr/',
    github: 'https://github.com/kmigadel-ipgp/DashVolcano',
    react: 'https://react.dev/',
    fastapi: 'https://fastapi.tiangolo.com/',
    mongodb: 'https://www.mongodb.com/',
    deckgl: 'https://deck.gl/',
    plotly: 'https://plotly.com/javascript/'
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-volcano-50 rounded-lg">
              <Info className="w-8 h-8 text-volcano-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                About DashVolcano v3.0
              </h1>
              <p className="text-lg text-gray-600">
                An interactive web platform for exploring and analyzing global volcanic data, 
                combining geochemical information from GEOROC with eruption history from the Global Volcanism Program.
              </p>
            </div>
          </div>
        </div>

        {/* Project Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Mountain className="w-6 h-6 text-volcano-600" />
            <h2 className="text-2xl font-bold text-gray-900">Project Overview</h2>
          </div>
          <div className="space-y-4 text-gray-700">
            <p>
              <strong>DashVolcano</strong> is a comprehensive web application designed to help researchers, 
              students, and volcano enthusiasts explore volcanic data from around the world. This v3.0 redesign 
              features a modern architecture with a React frontend and FastAPI backend, providing fast, 
              interactive visualizations and powerful analytical tools.
            </p>
            <p>
              The platform integrates two major data sources to provide a complete picture of volcanic systems: 
              geochemical analyses of volcanic rocks from GEOROC and historical eruption records from GVP. 
              This combination enables users to understand both the chemical evolution of volcanic systems 
              and their eruption history.
            </p>
            <p>
              Key capabilities include interactive 3D globe visualization, geochemical classification diagrams, 
              comparative analysis between volcanoes, timeline visualization of eruption patterns, and 
              comprehensive filtering by tectonic setting, rock type, and eruption characteristics.
            </p>
          </div>
        </div>

        {/* Data Sources */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-volcano-600" />
            <h2 className="text-2xl font-bold text-gray-900">Data Sources</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {/* GEOROC */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold text-gray-900">GEOROC</h3>
                <a 
                  href={externalLinks.georoc} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-volcano-600 hover:text-volcano-700 transition-colors"
                  aria-label="Visit GEOROC website"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
              <p className="text-gray-700 mb-3">
                <strong>Geochemistry of Rocks of the Oceans and Continents</strong>
              </p>
              <p className="text-gray-600 text-sm leading-relaxed">
                GEOROC is a comprehensive database hosted by the Max Planck Institute for Chemistry. 
                It provides high-quality geochemical data for igneous and volcanic rocks from around the world, 
                including major element oxides (SiO₂, TiO₂, Al₂O₃, etc.), trace elements, and isotopic compositions. 
                Our dataset includes thousands of analyzed samples that enable detailed geochemical classification 
                and comparison of volcanic rocks.
              </p>
            </div>

            {/* GVP */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold text-gray-900">Global Volcanism Program</h3>
                <a 
                  href={externalLinks.gvp} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-volcano-600 hover:text-volcano-700 transition-colors"
                  aria-label="Visit GVP website"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
              <p className="text-gray-700 mb-3">
                <strong>Smithsonian Institution</strong>
              </p>
              <p className="text-gray-600 text-sm leading-relaxed">
                The Global Volcanism Program maintains the most comprehensive database of volcanic eruptions 
                and volcano information worldwide. Their data includes eruption dates, Volcanic Explosivity 
                Index (VEI) values, eruption types, geographic coordinates, and tectonic settings. 
                We use this authoritative source to provide historical context and eruption statistics 
                for volcanic systems around the globe.
              </p>
            </div>
          </div>
        </div>

        {/* Methodology */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Microscope className="w-6 h-6 text-volcano-600" />
            <h2 className="text-2xl font-bold text-gray-900">Scientific Methodology</h2>
          </div>
          <div className="space-y-6">
            {/* TAS Diagram */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                TAS Diagram (Total Alkali-Silica)
              </h3>
              <p className="text-gray-700 leading-relaxed">
                The TAS diagram is the primary classification scheme for volcanic rocks based on their 
                chemical composition. It plots total alkalis (Na₂O + K₂O) against silica content (SiO₂) 
                to categorize rocks into types such as basalt, andesite, dacite, and rhyolite. This 
                classification helps identify the evolutionary stage of magma and the tectonic environment 
                of volcanism. Our implementation follows the IUGS (International Union of Geological Sciences) 
                classification boundaries.
              </p>
            </div>

            {/* AFM Diagram */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                AFM Diagram (Alkali-FeO-MgO)
              </h3>
              <p className="text-gray-700 leading-relaxed">
                The AFM ternary diagram distinguishes between tholeiitic and calc-alkaline magma series, 
                which represent different tectonic settings and magmatic evolution paths. Tholeiitic series 
                are typically found at mid-ocean ridges and oceanic islands, showing iron enrichment, while 
                calc-alkaline series are characteristic of subduction zones. This classification is crucial 
                for understanding the geodynamic context of volcanic activity.
              </p>
            </div>

            {/* VEI */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                VEI (Volcanic Explosivity Index)
              </h3>
              <p className="text-gray-700 leading-relaxed">
                The Volcanic Explosivity Index is a logarithmic scale (0-8) that measures the explosiveness 
                of volcanic eruptions based on eruption volume, column height, and duration. A VEI of 0-1 
                represents non-explosive to gentle eruptions, 2-3 are moderate explosive events, 4-5 are 
                large to very large eruptions (like Mount St. Helens 1980 - VEI 5), and 6-8 are colossal 
                to mega-colossal eruptions with global impacts. Our platform uses VEI data to analyze 
                eruption frequency, intensity patterns, and volcanic hazards.
              </p>
            </div>
          </div>
        </div>

        {/* Latest Publications */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-volcano-600" />
            <h2 className="text-2xl font-bold text-gray-900">Latest Publications</h2>
          </div>
          <div className="space-y-4">
            <div className="border-l-4 border-volcano-500 pl-4 bg-gray-50 p-4 rounded">
              <p className="text-gray-700 leading-relaxed">
                Oggier, F., Widiwijayanti, C., & Costa, F. (2023). 
                <strong> Integrating global geochemical volcano rock composition with eruption history datasets</strong>. 
                <em> Frontiers in Earth Science</em>, 11, 1108056.{' '}
                <a 
                  href="https://www.frontiersin.org/articles/10.3389/feart.2023.1108056"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-volcano-600 hover:text-volcano-700 underline inline-flex items-center gap-1"
                >
                  doi: 10.3389/feart.2023.1108056
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
            <p className="text-sm text-gray-600">
              This publication describes the methodology for integrating global geochemical datasets 
              (GEOROC, PetDB) with the Global Volcanism Program's eruption history database, forming 
              the foundation of DashVolcano's data infrastructure.
            </p>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Code className="w-6 h-6 text-volcano-600" />
            <h2 className="text-2xl font-bold text-gray-900">Technology Stack</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {/* Backend */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-3">Backend</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-volcano-600 mt-1">•</span>
                  <span>
                    <a 
                      href={externalLinks.fastapi} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-volcano-600 hover:text-volcano-700 underline"
                    >
                      FastAPI
                    </a> - High-performance Python web framework
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-volcano-600 mt-1">•</span>
                  <span>
                    <a 
                      href={externalLinks.mongodb} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-volcano-600 hover:text-volcano-700 underline"
                    >
                      MongoDB
                    </a> - NoSQL database for flexible data storage
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-volcano-600 mt-1">•</span>
                  <span>Pydantic - Data validation and settings management</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-volcano-600 mt-1">•</span>
                  <span>Motor - Async MongoDB driver for Python</span>
                </li>
              </ul>
            </div>

            {/* Frontend */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-3">Frontend</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-volcano-600 mt-1">•</span>
                  <span>
                    <a 
                      href={externalLinks.react} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-volcano-600 hover:text-volcano-700 underline"
                    >
                      React 18
                    </a> + TypeScript - Modern UI framework
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-volcano-600 mt-1">•</span>
                  <span>
                    <a 
                      href={externalLinks.deckgl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-volcano-600 hover:text-volcano-700 underline"
                    >
                      Deck.gl
                    </a> - WebGL-powered geospatial visualization
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-volcano-600 mt-1">•</span>
                  <span>
                    <a 
                      href={externalLinks.plotly} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-volcano-600 hover:text-volcano-700 underline"
                    >
                      Plotly.js
                    </a> - Interactive scientific charts
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-volcano-600 mt-1">•</span>
                  <span>Tailwind CSS - Utility-first styling</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-volcano-600 mt-1">•</span>
                  <span>React Router - Client-side routing</span>
                </li>
              </ul>
            </div>
          
            {/* Data Processing */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-3">Data Processing & Analysis</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-volcano-600 mt-1">•</span>
                  <span>NumPy & Pandas - Data manipulation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-volcano-600 mt-1">•</span>
                  <span>Shapely - Geospatial operations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-volcano-600 mt-1">•</span>
                  <span>GeoJSON - Spatial data format</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-volcano-600 mt-1">•</span>
                  <span>Caching - Redis-based response caching</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Star className="w-6 h-6 text-volcano-600" />
            <h2 className="text-2xl font-bold text-gray-900">Key Features</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-2">🗺️ Interactive 3D Globe</h3>
              <p className="text-gray-600 text-sm">
                Explore volcanoes worldwide with an interactive 3D globe powered by Deck.gl, 
                with tectonic plate boundaries and spatial filtering
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-2">📊 Geochemical Analysis</h3>
              <p className="text-gray-600 text-sm">
                Visualize rock compositions with TAS and AFM diagrams, analyze chemical trends, 
                and classify volcanic rock types
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-2">🌋 Eruption History</h3>
              <p className="text-gray-600 text-sm">
                Track historical eruptions with timeline visualizations, VEI analysis, 
                and frequency patterns over time
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-2">🔍 Comparative Analysis</h3>
              <p className="text-gray-600 text-sm">
                Compare multiple volcanoes side-by-side for geochemical composition, 
                eruption patterns, and VEI statistics
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-2">🎯 Advanced Filtering</h3>
              <p className="text-gray-600 text-sm">
                Filter by tectonic setting, rock type, VEI range, geographic region, 
                and eruption characteristics
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-2">📥 Data Export</h3>
              <p className="text-gray-600 text-sm">
                Export filtered data and analysis results to CSV format for further 
                research and analysis
              </p>
            </div>
          </div>
        </div>

        {/* Contributors */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-volcano-600" />
            <h2 className="text-2xl font-bold text-gray-900">Contributors</h2>
          </div>
          <div className="space-y-4">
            <p className="text-gray-700">
              <strong>DashVolcano</strong> was designed and developed by:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Contributor 1 */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-2">Fidel Costa</h3>
                <p className="text-sm text-gray-600 mb-2">Project Principal Investigator</p>
                <a 
                  href="https://orcid.org/0000-0002-1409-5325"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-volcano-600 hover:text-volcano-700"
                >
                  <img 
                    src="https://orcid.org/sites/default/files/images/orcid_16x16.png" 
                    alt="ORCID logo"
                    className="w-4 h-4"
                  />
                  ORCID: 0000-0002-1409-5325
                </a>
              </div>
              
              {/* Contributor 2 */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-2">Frederique Elise Oggier</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Project Principal Investigator, Coordinator, Web Developer
                </p>
                <a 
                  href="https://orcid.org/0000-0003-3141-3118"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-volcano-600 hover:text-volcano-700"
                >
                  <img 
                    src="https://orcid.org/sites/default/files/images/orcid_16x16.png" 
                    alt="ORCID logo"
                    className="w-4 h-4"
                  />
                  ORCID: 0000-0003-3141-3118
                </a>
              </div>
              
              {/* Contributor 3 */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-2">Kévin Migadel</h3>
                <p className="text-sm text-gray-600 mb-2">Coordinator, Web Developer</p>
                <a 
                  href="https://orcid.org/0009-0006-0147-3354"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-volcano-600 hover:text-volcano-700"
                >
                  <img 
                    src="https://orcid.org/sites/default/files/images/orcid_16x16.png" 
                    alt="ORCID logo"
                    className="w-4 h-4"
                  />
                  ORCID: 0009-0006-0147-3354
                </a>
              </div>
            </div>
            
            <p className="text-gray-700 mt-4">
              This project is developed and maintained at the{' '}
              <a 
                href={externalLinks.ipgp}
                target="_blank"
                rel="noopener noreferrer"
                className="text-volcano-600 hover:text-volcano-700 underline font-semibold"
              >
                Institut de Physique du Globe de Paris (IPGP)
              </a>
              , a leading research institution in Earth sciences and volcanology.
            </p>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 mt-4">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Code className="w-5 h-5 text-volcano-600" />
                Open Source
                <a 
                  href={externalLinks.github} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-volcano-600 hover:text-volcano-700 transition-colors"
                  aria-label="Visit GitHub repository"
                >
                  <ExternalLink className="w-4 h-4"/>
                </a>
              </h3>
              <p className="text-gray-600 text-sm">
                This project is open source and available on GitHub. Contributions, bug reports, 
                and feature requests are welcome.
              </p>
            </div>
          </div>
        </div>

        {/* Data Sources and Citation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-volcano-600" />
            <h2 className="text-2xl font-bold text-gray-900">Data Sources and Citation</h2>
          </div>
          
          <div className="space-y-6 text-gray-700">
            <p className="text-lg font-medium">
              This platform integrates data from three major databases: <strong>GEOROC</strong>, 
              <strong> PetDB</strong>, and the <strong>Global Volcanism Program (GVP)</strong>. 
              Each source has specific citation requirements outlined below.
            </p>
            
            {/* GEOROC Section */}
            <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900">🔸 GEOROC</h3>
                <a 
                  href={externalLinks.georoc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-volcano-600 hover:text-volcano-700"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
              
              <p className="mb-3">
                The <strong>GEOROC</strong> (Geochemistry of Rocks of the Oceans and Continents) 
                database compiles peer-reviewed geochemical data from the literature. Data use is 
                licensed under{' '}
                <a 
                  href="https://creativecommons.org/licenses/by-sa/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-volcano-600 hover:text-volcano-700 underline"
                >
                  CC BY-SA 4.0
                </a>.
              </p>
              
              <p className="mb-3 text-sm">
                Data were downloaded from the GEOROC database on <strong>June 2023</strong>, using 
                precompiled files corresponding to the following tectonic/geologic settings (with DOIs):
              </p>
              
              <ul className="space-y-1 text-xs ml-4 mb-3">
                <li>• Archaean Cratons: <a href="https://doi.org/10.25625/1KRR1P" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">10.25625/1KRR1P</a></li>
                <li>• Continental Flood Basalts: <a href="https://doi.org/10.25625/WSTPOX" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">10.25625/WSTPOX</a></li>
                <li>• Convergent Margins: <a href="https://doi.org/10.25625/PVFZCE" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">10.25625/PVFZCE</a></li>
                <li>• Complex Volcanic Settings: <a href="https://doi.org/10.25625/1VOFM5" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">10.25625/1VOFM5</a></li>
                <li>• Intraplate Volcanic Rocks: <a href="https://doi.org/10.25625/RZZ9VM" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">10.25625/RZZ9VM</a></li>
                <li>• Rift Volcanics: <a href="https://doi.org/10.25625/KAIVCT" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">10.25625/KAIVCT</a></li>
                <li>• Oceanic Plateaus: <a href="https://doi.org/10.25625/JRZIJF" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">10.25625/JRZIJF</a></li>
                <li>• Ocean Basin Flood Basalts: <a href="https://doi.org/10.25625/AVLFC2" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">10.25625/AVLFC2</a></li>
                <li>• Ocean Island Groups: <a href="https://doi.org/10.25625/WFJZKY" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">10.25625/WFJZKY</a></li>
                <li>• Seamounts: <a href="https://doi.org/10.25625/JUQK7N" target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:underline">10.25625/JUQK7N</a></li>
              </ul>
              
              <div className="bg-volcano-50 border border-volcano-200 rounded p-3">
                <p className="text-sm font-semibold mb-2">Citing GEOROC:</p>
                <p className="text-xs italic">
                  Lehnert, K., Su, Y., Langmuir, C. H., Sarbas, B., & Nohl, U. (2000). 
                  A global geochemical database structure for rocks. <em>Geochemistry, Geophysics, Geosystems</em>, 
                  1(5), 1012.{' '}
                  <a 
                    href="https://doi.org/10.1029/1999GC000026"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-volcano-600 hover:underline"
                  >
                    https://doi.org/10.1029/1999GC000026
                  </a>
                </p>
              </div>
            </div>
            
            {/* PetDB Section */}
            <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900">🔸 PetDB</h3>
                <a 
                  href="https://search.earthchem.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-volcano-600 hover:text-volcano-700"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
              
              <p className="mb-3">
                <strong>PetDB</strong> (Petrological Database of the Ocean Floor) is hosted by the
                EarthChem Library and licensed under{" "}
                <a 
                  href="https://creativecommons.org/licenses/by-sa/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-volcano-600 hover:text-volcano-700 underline"
                >
                  CC BY-SA 4.0
                </a>.
              </p>

              <p className="mb-3 text-sm">
                This application uses{" "}
                <a 
                  href="https://earthchem.org/petdb" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-volcano-600 hover:text-volcano-700 underline"
                >
                  PetDB 2.0
                </a>, accessed via the <strong> EarthChem Data Synthesis API</strong> (PetDB API v4.50, Export Service v3.0).
                PetDB 2.0 provides modern, FAIR-compliant access to geochemical, geochronological,
                and petrological data, enabling improved data discovery, reuse, and long-term
                preservation.
              </p>

              <div className="bg-volcano-50 border border-volcano-200 rounded p-3">
                <p className="text-sm font-semibold mb-2">Citing PetDB:</p>
                <p className="text-xs italic">
                  Lehnert, K. A., et al. (2000). A Global Geochemical Database Structure for Rocks.{" "}
                  <em>Geochemistry, Geophysics, Geosystems</em>, 1(5).{" "}
                  <a 
                    href="https://doi.org/10.1029/1999GC000026"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-volcano-600 hover:underline"
                  >
                    https://doi.org/10.1029/1999GC000026
                  </a>
                </p>
              </div>
            </div>

            
            {/* GVP Section */}
            <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900">🔸 Global Volcanism Program</h3>
                <a 
                  href={externalLinks.gvp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-volcano-600 hover:text-volcano-700"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
              
              <p className="mb-3">
                The <strong>Global Volcanism Program</strong> maintains comprehensive records of volcanic 
                eruptions and volcano information worldwide.
              </p>
              
              <div className="bg-volcano-50 border border-volcano-200 rounded p-3">
                <p className="text-sm font-semibold mb-2">Citing GVP:</p>
                <p className="text-xs italic">
                  Global Volcanism Program, 2013. Volcanoes of the World, v. 4.11.0. 
                  Venzke, E (ed.). Smithsonian Institution.{' '}
                  <a 
                    href="https://doi.org/10.5479/si.GVP.VOTW4-2013"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-volcano-600 hover:underline"
                  >
                    https://doi.org/10.5479/si.GVP.VOTW4-2013
                  </a>
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-4">
              For questions, collaboration opportunities, or technical support, please contact us through 
              our GitHub repository or the IPGP website.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
