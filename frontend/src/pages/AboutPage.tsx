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
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 mt-6">
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

        {/* Team & Development */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-volcano-600" />
            <h2 className="text-2xl font-bold text-gray-900">Team & Development</h2>
          </div>
          <div className="space-y-4 text-gray-700">
            <p>
              <strong>DashVolcano</strong> is developed and maintained by researchers at the{' '}
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
            <p>
              The project aims to make volcanic data more accessible to the scientific community 
              and the public, promoting education and research in volcanology and geochemistry.
            </p>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
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
              <p className="text-gray-600 text-sm mb-3">
                This project is open source and available on GitHub. Contributions, bug reports, 
                and feature requests are welcome.
              </p>
              
            </div>
          </div>
        </div>

        {/* License & Usage */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-volcano-600" />
            <h2 className="text-2xl font-bold text-gray-900">License & Usage</h2>
          </div>
          <div className="space-y-4 text-gray-700">
            <p>
              <strong>DashVolcano</strong> is provided for educational and research purposes. 
              The application and its source code are available under an open-source license.
            </p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Data Attribution</h3>
              <p className="text-sm text-gray-600 mb-2">
                When using data from DashVolcano in publications or presentations, please cite:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>
                  • <strong>GEOROC:</strong> Geochemistry of Rocks of the Oceans and Continents Database. 
                  Max Planck Institute for Chemistry.{' '}
                  <a href={externalLinks.georoc} target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:text-volcano-700 underline">https://georoc.eu/</a>
                </li>
                <li>
                  • <strong>GVP:</strong> Global Volcanism Program, 2013. Volcanoes of the World, v. 4.11.0. 
                  Venzke, E (ed.). Smithsonian Institution.{' '}
                  <a href={externalLinks.gvp} target="_blank" rel="noopener noreferrer" className="text-volcano-600 hover:text-volcano-700 underline">https://volcano.si.edu/</a>
                </li>
              </ul>
            </div>

            <p className="text-sm text-gray-600">
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
