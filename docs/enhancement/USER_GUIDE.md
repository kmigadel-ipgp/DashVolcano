# DashVolcano User Guide

Complete guide to using the DashVolcano v3.0 web application for exploring volcanic geochemical data.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Map Page - Main Interface](#map-page---main-interface)
3. [Analyze Volcano Page](#analyze-volcano-page)
4. [Compare Volcanoes Page](#compare-volcanoes-page)
5. [Compare VEI Page](#compare-vei-page)
6. [Timeline Page](#timeline-page)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### Accessing the Application

1. **Open your browser** and navigate to the application URL:
   - Development: `http://localhost:5173`
   - Production: Your deployment URL

2. **Wait for the map to load** - You should see a world map with volcanic sample points displayed as colored dots.

3. **Navigate between pages** using the navigation bar at the top:
   - **Map** - Interactive map with filtering and selection
   - **Analyze Volcano** - Deep dive into a single volcano
   - **Compare Volcanoes** - Side-by-side comparison of 2 volcanoes
   - **Compare VEI** - Compare eruption magnitudes
   - **Timeline** - Historical eruption timeline

### Understanding the Data

DashVolcano visualizes three main types of data:

- **Rock Samples** (~60,000+): Geochemical analysis data from volcanic rocks
  - Sources: GEOROC, PetDB databases
  - Includes major oxide compositions (SiO2, Al2O3, FeO, etc.)
  - Used for chemical classification (TAS, AFM diagrams)

- **Volcanoes** (~1,500): Metadata about volcanic centers
  - Source: Global Volcanism Program (GVP)
  - Includes location, type, elevation, eruption history

- **Eruptions** (~10,000+): Historical eruption records
  - Source: Global Volcanism Program (GVP)
  - Includes dates, VEI (explosivity), eruption types

---

## Map Page - Main Interface

The Map Page is the primary interface for exploring volcanic data. It combines interactive mapping, filtering, and data visualization.

### Map Controls

**Navigation:**
- **Pan**: Click and drag the map
- **Zoom**: Use mouse wheel, or pinch/spread on touch devices
- **Reset View**: Double-click to reset to default zoom level

**Mobile Controls:**
- **Hamburger Menu** (☰): Tap to open/close filter panel on small screens
- **Toggle Buttons**: Expand/collapse panels for more map space

### Filter Panel (Left Side)

The filter panel allows you to narrow down the displayed samples.

#### 1. Rock Type Filter

Filter samples by rock classification:

**How to use:**
1. Click the "Rock Type" dropdown
2. Select one or more rock types (e.g., Basalt, Andesite, Dacite)
3. Multiple selections are combined with OR logic (samples matching ANY selected type)
4. Clear selections to show all rock types

**Common rock types:**
- **Basalt**: Low-silica volcanic rock (SiO2 < 52%)
- **Andesite**: Intermediate-silica rock (52-63% SiO2)
- **Dacite**: High-silica rock (63-69% SiO2)
- **Rhyolite**: Very high-silica rock (>69% SiO2)

#### 2. Tectonic Setting Filter

Filter samples by their tectonic environment:

**How to use:**
1. Click the "Tectonic Setting" dropdown
2. Select one or more settings (e.g., Island Arc, Oceanic Island)
3. Multiple selections are combined with OR logic

**Common tectonic settings:**
- **Island Arc**: Volcanic arc formed by subduction (e.g., Japan, Indonesia)
- **Oceanic Island**: Hotspot volcanism (e.g., Hawaii, Iceland)

#### 3. Spatial Search (Bounding Box)

**NEW IN v3.1**: Filter samples by geographic location using bounding boxes.

The Spatial Search widget (top-left corner) allows you to limit samples to a specific geographic area, significantly improving performance when exploring regional data.

**How to use:**

**Option 1: Preset Regions (Recommended)**
1. Click to expand the "Spatial Search" panel
2. Click one of the preset region buttons:
   - **Europe**: Western Europe region
   - **North America**: North American continent
   - **Asia-Pacific**: Asia and Pacific region
   - **South America**: South American continent
3. The map automatically filters to show only samples in that region
4. Sample count updates to show filtered results

**Option 2: Custom Bounding Box (Coming Soon)**
1. Click "Draw Search Area" button
2. Click and drag on the map to draw a rectangle
3. Release to apply the bounding box filter
   - Note: Full drawing functionality is in development. Use preset regions for now.

**Features:**
- **Current Area Display**: Shows the active bounding box coordinates
- **Sample Count**: Displays number of samples within the bbox (e.g., "1,234 of 60,000 samples")
- **Clear Button** (X icon): Removes the bounding box filter to show all samples again

**Performance Benefits:**
- Reduces data transfer from ~2MB to ~50-200KB typically
- Faster map rendering with fewer points
- More responsive filtering and interaction
- Ideal for regional studies

**Example Use Cases:**
- Studying Mediterranean volcanism → Use "Europe" preset
- Analyzing Pacific Ring of Fire → Use "Asia-Pacific" preset
- Comparing Cascade Range volcanoes → Use "North America" preset then zoom in

**Tips:**
- Combine bbox with rock type filters for powerful queries (e.g., "Basalts in North America")
- Use bbox before applying other filters to reduce initial data load
- Clear bbox when switching to a different region

#### 4. Country Filter

Filter samples by country where they were collected:

**How to use:**
1. Type in the search box or scroll through the list
2. Select one or more countries
3. Multiple selections show samples from ANY selected country

**Tip:** Use the search box to quickly find countries (e.g., type "United" to find United States)

#### 5. Volcano Filter

Filter samples from specific volcanoes:

**How to use:**
1. Type in the search box to find volcanoes by name
2. Select one or more volcanoes
3. Only samples from the selected volcanoes will be displayed

**Tip:** After filtering by country, the volcano list will show only volcanoes in that country

#### 6. Apply Filters

Click the **"Apply Filters"** button to update the map with your selections. The map will reload with the filtered samples.

**Reset Filters:** Click "Reset Filters" to clear all selections and show all samples.

### Map Overlays (Right Side)

#### Tectonic Plates Overlay

Toggle the display of tectonic plate boundaries:

**How to use:**
1. Click the "Tectonic Plates" toggle button
2. When enabled, you'll see:
   - **Plate boundaries** (solid lines)
   - **Ridges** (mid-ocean spreading centers)
   - **Trenches** (subduction zones)
   - **Transforms** (strike-slip faults)

**Use case:** Understand the relationship between volcanism and plate tectonics

#### Chemical Plot Overlays

View TAS and AFM diagrams for selected samples:

**TAS Diagram (Total Alkali-Silica):**
- **X-axis**: SiO2 content (%)
- **Y-axis**: Na2O + K2O content (%)
- **Purpose**: Classify volcanic rocks by composition
- **Fields**: Shows classification polygons (basalt, andesite, rhyolite, etc.)

**AFM Diagram (Alkali-Iron-Magnesium):**
- **Ternary plot**: A (Na2O+K2O), F (FeO), M (MgO)
- **Purpose**: Distinguish tholeiitic vs calc-alkaline series
- **Boundary**: Irvine & Baragar (1971) dividing line

**How to use:**
1. Select samples using one of the selection tools (see below)
2. Click "View Charts" or toggle the chart panel
3. Both TAS and AFM diagrams will display with your selected samples highlighted
4. Click points on the charts to highlight them on the map

### Selection Tools

Three tools for selecting volcanic samples on the map:

#### 1. Single Selection (Click)

**How to use:**
1. Click on any sample point (colored dot) on the map
2. The point will be highlighted
3. Volcano information will appear in the selection panel
4. Click another point to change selection
5. Click the selected point again to deselect

**Use case:** Quick exploration of individual volcanoes

#### 2. Lasso Selection (Freehand)

**How to use:**
1. Click the "Lasso" button in the map controls
2. Click and drag on the map to draw a freehand shape
3. Release to complete the selection
4. All samples within the drawn area will be selected
5. Click "Clear Selection" to deselect all

**Use case:** Select samples from an irregular geographic area (e.g., following a volcanic arc)

**Tip:** Draw slowly for better precision on mobile devices

#### 3. Box Selection (Rectangular)

**How to use:**
1. Click the "Box" button in the map controls
2. Click and drag to draw a rectangular selection box
3. Release to complete the selection
4. All samples within the box will be selected
5. Click "Clear Selection" to deselect all

**Use case:** Select samples from a rectangular geographic area

**Tip:** Best for selecting samples in a specific region (e.g., Cascade Range, Japanese islands)

### Selection Panel (Bottom)

After selecting samples or a volcano, the selection panel displays:

**Volcano Information:**
- Volcano name and number
- Country and region
- Elevation
- Volcano type
- Last known eruption

**Sample Statistics:**
- Total number of selected samples
- Rock type distribution
- Average geochemical values

**Actions:**
- **View Detailed Analysis**: Opens the Analyze Volcano page for the selected volcano
- **Add to Comparison**: Adds the volcano to the comparison list (for Compare Volcanoes page)
- **Export Data**: Download selected samples as CSV

### Exporting Data

**Download Sample Data:**
1. Apply filters or make a selection
2. Click the **"Export CSV"** button (or press `Ctrl+D`)
3. A CSV file will download with the filtered/selected samples
4. File includes: Sample ID, Rock Type, Coordinates, Oxide data, Volcano metadata

**CSV Format:**
```csv
sample_id,rock_type,latitude,longitude,SiO2,Al2O3,FeO,MgO,CaO,Na2O,K2O,volcano_name,volcano_number
SAMPLE123,Basalt,46.2,-122.19,48.5,15.2,10.8,7.5,11.2,2.8,0.5,Mount St. Helens,213004
```

---

## Analyze Volcano Page

Deep dive into the geochemical characteristics of a single volcano.

### Getting to the Analyze Page

**Method 1: From Map Page**
1. Select a volcano on the map (click or use selection tools)
2. Click "View Detailed Analysis" in the selection panel
3. The Analyze page will load with the selected volcano

**Method 2: Direct Selection**
1. Navigate to "Analyze Volcano" in the navbar
2. Use the volcano search dropdown at the top
3. Type to search, then select a volcano from the list

### Page Layout

The Analyze Volcano page displays:

1. **Volcano Header**
   - Volcano name, number, country
   - Basic metadata (type, elevation, last eruption)
   - Geographic coordinates

2. **Sample Statistics Card**
   - Total number of samples available for this volcano
   - Sample count by rock type
   - Sample count by database source (GEOROC, PetDB)

3. **TAS Diagram (Left)**
   - Total Alkali-Silica plot for all samples from this volcano
   - Points colored by rock type
   - Classification field boundaries
   - Shows compositional range

4. **AFM Diagram (Right)**
   - Ternary diagram for this volcano's samples
   - Tholeiitic vs calc-alkaline classification
   - Points colored by rock type

### Using the Charts

**Interacting with Plots:**
- **Hover**: Shows sample details (sample ID, rock type, oxide values)
- **Zoom**: Drag to select an area to zoom in
- **Pan**: Click and drag inside the plot
- **Reset**: Double-click to reset zoom

**Legend:**
- Click legend items to show/hide rock types
- Double-click legend item to show ONLY that rock type

### Interpreting the Data

**TAS Diagram Insights:**
- **Horizontal spread**: Indicates range of SiO2 (silica) content
  - Left (low SiO2): Basaltic compositions
  - Right (high SiO2): Rhyolitic compositions
- **Vertical spread**: Indicates range of alkali content
  - Bottom: Subalkalic series (common in subduction zones)
  - Top: Alkalic series (common in ocean islands)

**AFM Diagram Insights:**
- **Above boundary line**: Calc-alkaline series (typical of subduction zones)
- **Below boundary line**: Tholeiitic series (typical of mid-ocean ridges, some ocean islands)
- **Clustering**: Tight cluster indicates consistent magma composition; spread indicates compositional diversity

**Example Interpretation:**
- **Mount St. Helens**: Samples cluster in basalt to dacite fields on TAS, plot above AFM boundary → Calc-alkaline subduction zone volcano with diverse compositions

### Exporting Analysis

Click **"Export CSV"** (or press `Ctrl+D`) to download:
- All samples from this volcano
- Includes full geochemical data
- Includes volcano metadata

**Use case:** Further analysis in Excel, R, Python, etc.

---

## Compare Volcanoes Page

Side-by-side comparison of geochemical characteristics for two volcanoes.

### How to Compare Volcanoes

**Method 1: Select from Dropdowns**
1. Navigate to "Compare Volcanoes" in the navbar
2. Use the two volcano selection dropdowns at the top
3. Select **Volcano 1** and **Volcano 2**
4. Charts will automatically update with the comparison

**Method 2: From Map Page**
1. Select a volcano on the map
2. Click "Add to Comparison" in the selection panel
3. Select a second volcano
4. Click "Add to Comparison" again
5. Navigate to "Compare Volcanoes" to see the comparison

### Page Layout

The Compare Volcanoes page displays:

1. **Volcano 1 Header (Left)**
   - Name, number, country
   - Sample count and metadata

2. **Volcano 2 Header (Right)**
   - Name, number, country
   - Sample count and metadata

3. **TAS Diagrams (Side-by-side)**
   - Left: Volcano 1 samples
   - Right: Volcano 2 samples
   - Same scale for direct comparison

4. **AFM Diagrams (Side-by-side)**
   - Left: Volcano 1 samples
   - Right: Volcano 2 samples
   - Same ternary scale

### Interpreting Comparisons

**Look for:**

**Compositional Range:**
- **Wide spread**: Diverse magma types
- **Narrow cluster**: Consistent composition

**Silica Content:**
- **Low SiO2 (left on TAS)**: Mafic, less explosive
- **High SiO2 (right on TAS)**: Felsic, more explosive

**Series Type (AFM):**
- **Calc-alkaline** (above line): Typical of subduction zones
- **Tholeiitic** (below line): Typical of rift zones and ocean islands

**Example Comparison:**
- **Kilauea (Hawaii) vs Mount St. Helens (USA)**:
  - Kilauea: Tightly clustered in basalt field (low SiO2), tholeiitic series
  - Mount St. Helens: Spread from basalt to dacite (wide SiO2 range), calc-alkaline series
  - **Interpretation**: Kilauea is a hotspot volcano with consistent basaltic magma; Mount St. Helens is a subduction zone volcano with diverse, more evolved magmas

### Exporting Comparison

Click **"Export CSV"** (or press `Ctrl+D`) to download:
- Samples from BOTH volcanoes in a single file
- "volcano_number" column distinguishes between volcanoes
- Useful for statistical analysis

---

## Compare VEI Page

Compare the distribution of eruption magnitudes (Volcanic Explosivity Index) between volcanoes.

### Understanding VEI

**Volcanic Explosivity Index (VEI)** is a scale from 0 to 8 measuring eruption magnitude:

- **VEI 0**: Non-explosive (< 10,000 m³)
- **VEI 1**: Gentle (10,000 m³ - 1 million m³)
- **VEI 2**: Explosive (1-5 million m³)
- **VEI 3**: Severe (5-25 million m³)
- **VEI 4**: Cataclysmic (0.025-0.1 km³)
- **VEI 5**: Paroxysmal (0.1-1 km³)
- **VEI 6**: Colossal (1-10 km³)
- **VEI 7**: Super-colossal (10-100 km³)
- **VEI 8**: Mega-colossal (> 100 km³)

Each step represents a 10x increase in erupted volume.

### How to Use Compare VEI

**Step 1: Select Volcanoes**
1. Use the volcano selection dropdowns
2. Select up to 5 volcanoes to compare
3. The bar chart will update automatically

**Step 2: Filter by Eruption Type (Optional)**
- **Confirmed Eruption**: Historically documented
- **Uncertain Eruption**: Evidence-based but not confirmed
- **Discredited Eruption**: Previously reported but now discredited

**Step 3: Interpret the Chart**

The bar chart shows:
- **X-axis**: VEI values (0-8)
- **Y-axis**: Number of eruptions
- **Bars**: Grouped by volcano, colored differently

**Look for:**
- **Mode**: Most common VEI for each volcano
- **Range**: Spread of VEI values
- **Maximum VEI**: Largest recorded eruption for each volcano

**Example Interpretation:**
- **Mount Etna (Italy)**: Many VEI 0-2 eruptions (frequent, low-magnitude)
- **Mount Pinatubo (Philippines)**: Few eruptions but includes VEI 6 (1991 eruption)
- **Interpretation**: Etna has frequent small eruptions; Pinatubo has infrequent but very large eruptions

### Statistics Panel

Below the chart, you'll see:
- **Total eruptions** for each volcano
- **Average VEI** for each volcano
- **Maximum VEI recorded** for each volcano
- **Date range** of eruptions in the database

### Exporting VEI Data

Click **"Export CSV"** (or press `Ctrl+D`) to download:
- All eruption records for the selected volcanoes
- Includes: Date, VEI, eruption type, area of activity
- Useful for temporal analysis

---

## Timeline Page

Explore historical eruption patterns over time.

### Page Layout

1. **Time Period Selector**
   - Buttons for different time ranges:
     - **All Time**: All eruptions in database (oldest to 2024)
     - **Last 10,000 Years**: Holocene eruptions
     - **Last 2,000 Years**: Historical period
     - **Last 500 Years**: Modern era
     - **Last 100 Years**: 20th-21st century

2. **Eruption Timeline Plot**
   - Scatter plot showing individual eruptions over time
   - **X-axis**: Year
   - **Y-axis**: VEI (0-8)
   - **Point size**: Represents erupted volume
   - **Point color**: Colored by VEI

3. **Eruption Frequency Chart**
   - Bar chart showing eruption counts by time bin
   - **X-axis**: Time periods (bins)
   - **Y-axis**: Number of eruptions
   - Shows temporal patterns and trends

### How to Use the Timeline

**Step 1: Select Time Period**
1. Click one of the time period buttons at the top
2. Both charts will update to show eruptions in that period

**Step 2: Filter by VEI (Optional)**
- Use the VEI filter dropdown
- Select minimum VEI to show only major eruptions
- Example: Set "VEI ≥ 4" to see only significant eruptions

**Step 3: Filter by Volcano (Optional)**
- Use the volcano search dropdown
- Select a specific volcano to see its eruption history
- Leave blank to show all volcanoes

**Step 4: Interpret the Timeline**

**Eruption Timeline Plot:**
- **Vertical clustering**: Multiple eruptions at similar times (eruptive episodes)
- **Gaps**: Quiescent periods (no recorded eruptions)
- **High VEI points**: Major historical eruptions
- **Recent data density**: Better records in recent times (observation bias)

**Frequency Chart:**
- **Increasing trend**: More eruptions recorded recently (due to better monitoring)
- **Spikes**: Periods of increased global volcanic activity
- **Valleys**: Periods of decreased activity or poor record-keeping

**Example Insights:**
- **Last 100 Years**: ~200-300 eruptions recorded, mostly VEI 0-3
- **Notable VEI 6+ eruptions**:
  - 1991: Mount Pinatubo (VEI 6)
  - 1980: Mount St. Helens (VEI 5)
  - 1815: Tambora (VEI 7)

### Exporting Timeline Data

Click **"Export CSV"** (or press `Ctrl+D`) to download:
- All eruptions in the selected time period
- Includes: Volcano, date, VEI, eruption type
- Useful for temporal analysis and statistics

---

## Keyboard Shortcuts

Speed up your workflow with these keyboard shortcuts:

### Global Shortcuts (All Pages)

- **`Ctrl+D` (Windows/Linux) or `Cmd+D` (Mac)**: Download/Export data
  - Map Page: Export filtered samples
  - Analyze Page: Export volcano samples
  - Compare Pages: Export comparison data
  - Timeline Page: Export eruption data

### Map Page Shortcuts

- **`Esc`**: Clear current selection
- **`L`**: Activate lasso tool
- **`B`**: Activate box tool
- **`T`**: Toggle tectonic plates overlay
- **`C`**: Open/close chart panel
- **`F`**: Open/close filter panel (mobile)

### Navigation Shortcuts

- **`Alt+M`**: Navigate to Map page
- **`Alt+A`**: Navigate to Analyze Volcano page
- **`Alt+C`**: Navigate to Compare Volcanoes page
- **`Alt+V`**: Navigate to Compare VEI page
- **`Alt+T`**: Navigate to Timeline page

### General

- **`Ctrl+/`**: Show this keyboard shortcuts reference

---

## Tips & Best Practices

### Performance Tips

1. **Limit Sample Count**
   - Filtering by rock type or tectonic setting reduces rendering load
   - On slower devices, apply filters before viewing the map
   - Use "limit" parameter when exporting large datasets

2. **Disable Tectonic Plates Overlay**
   - If map performance is slow, toggle off tectonic plates
   - Re-enable only when needed for context

3. **Close Chart Overlays**
   - Chart overlays consume resources
   - Close them when not actively viewing chemical plots

### Analysis Tips

1. **Start Broad, Then Narrow**
   - Begin with all samples to see global patterns
   - Apply filters to focus on specific regions or rock types
   - Use selection tools for even more precise analysis

2. **Use Multiple Pages**
   - Map Page: Overview and filtering
   - Analyze Page: Deep dive into single volcano
   - Compare Pages: Direct comparison between volcanoes
   - Timeline Page: Temporal patterns

3. **Combine Filters**
   - Rock Type + Tectonic Setting: Explore magma types in different tectonic environments
   - Country + Rock Type: Regional volcanic geochemistry
   - Volcano + Date Range (Timeline): Individual volcano eruption history

### Data Interpretation Tips

1. **TAS Diagram**
   - **Basalt → Andesite → Dacite → Rhyolite**: Increasing silica (magma evolution)
   - **Alkalic vs Subalkalic**: Different mantle sources and tectonic settings
   - **Clustering**: Indicates consistent magma source and processes
   - **Spread**: Indicates magma mixing or fractional crystallization

2. **AFM Diagram**
   - **Tholeiitic**: Common in ocean islands and mid-ocean ridges (less water, more iron-rich)
   - **Calc-alkaline**: Common in subduction zones (more water, more oxidized)
   - **Boundary crossing**: May indicate multiple magma sources or processes

3. **VEI Comparison**
   - **High-frequency low-VEI**: Persistently active volcanoes (e.g., Etna, Kilauea)
   - **Low-frequency high-VEI**: Explosive stratovolcanoes (e.g., Pinatubo, Krakatau)
   - **Mode VEI**: Typical eruption size for a volcano

4. **Timeline Patterns**
   - **Recent bias**: More eruptions recorded in recent times (better monitoring)
   - **VEI 5-7 eruptions**: Rare but globally significant events
   - **Frequency spikes**: May correlate with improved record-keeping or regional volcanic episodes

### Export & Further Analysis

1. **CSV Format**
   - All exports are in CSV format (comma-separated values)
   - Open in Excel, Google Sheets, R, Python, etc.
   - Column headers are self-explanatory

2. **Recommended Tools**
   - **Excel/Google Sheets**: Basic statistics, pivot tables, charts
   - **R**: Statistical analysis, advanced plots (ggplot2)
   - **Python**: Pandas for data manipulation, Matplotlib/Seaborn for plots
   - **QGIS**: Geographic analysis and custom mapping

3. **Data Citation**
   - **GEOROC**: Cite as "GEOROC Database (2023)"
   - **PetDB**: Cite as "PetDB Database (2023)"
   - **GVP**: Cite as "Global Volcanism Program (2023)"
   - See individual sample references for original publications

### Troubleshooting

**Map not loading?**
- Check that backend API is running (`http://localhost:8000/docs`)
- Check browser console for errors (F12)
- Try refreshing the page

**Charts not displaying?**
- Ensure you have samples selected or filters applied
- Check that samples have oxide data (not all samples do)
- Try reducing the number of selected samples

**Filters not working?**
- Click "Apply Filters" button after making selections
- Try "Reset Filters" and reapply
- Some combinations may return no results (e.g., "Basalt" + "Rhyolite" together won't match anything)

**Export not working?**
- Check browser's download settings (may need to allow downloads)
- Ensure you have samples to export (apply filters or make selection first)
- Try using `Ctrl+D` keyboard shortcut

**Slow performance?**
- Reduce number of visible samples (use filters)
- Disable tectonic plates overlay
- Close chart panels when not in use
- Try a different browser (Chrome/Edge recommended for best performance)

---

## Getting Help

- **Frontend Setup**: See `frontend/README.md`
- **Backend Setup**: See `backend/README.md`
- **API Documentation**: See `docs/API_EXAMPLES.md`
- **Deployment**: See `docs/DEPLOYMENT_GUIDE.md`

For technical issues or questions, contact the DashVolcano development team.

---

**Happy Exploring!** 🌋
