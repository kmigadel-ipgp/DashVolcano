import { useState, useRef, useEffect } from 'react';
import { Filter as FilterIcon } from 'lucide-react';
import { VolcanoMap, LayerControls, ViewportControls, SampleDetailsPanel, SummaryStats, ChartPanel, SelectionOverlay } from '../components/Map';
import { FilterPanel } from '../components/Filters';
import { SelectionToolbar } from '../components/Selection';
import { useSamples } from '../hooks/useSamples';
import { useVolcanoes } from '../hooks/useVolcanoes';
import { useTectonic } from '../hooks/useTectonic';
import { useSelectionStore } from '../store';
import { Loader } from '../components/Common/Loader';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { exportSamplesToCSV } from '../utils/csvExport';
import { useKeyboardShortcuts, commonShortcuts } from '../hooks/useKeyboardShortcuts';
import type { Volcano, Sample, SampleFilters, VolcanoFilters } from '../types';

const INITIAL_VIEWPORT = {
  longitude: 0,
  latitude: 20,
  zoom: 2,
};

const MapPage = () => {
  // Layer visibility state
  const [showVolcanoes, setShowVolcanoes] = useState(true);
  const [showSamplePoints, setShowSamplePoints] = useState(true);
  const [showTectonicBoundaries, setShowTectonicBoundaries] = useState(true);

  // Viewport state
  const [viewport, setViewport] = useState(INITIAL_VIEWPORT);

  // Filter state
  const [sampleFilters, setSampleFilters] = useState<SampleFilters>({limit: 100000}); // Increased default limit
  const [volcanoFilters, setVolcanoFilters] = useState<VolcanoFilters>({ limit: 5000 }); // Increased default limit
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Chart panel state
  const [chartPanelOpen, setChartPanelOpen] = useState(false);

  // Selection state - using individual selectors for better reactivity
  const selectedSamples = useSelectionStore((state) => state.selectedSamples);
  const selectionMode = useSelectionStore((state) => state.selectionMode);
  const setSelectionMode = useSelectionStore((state) => state.setSelectionMode);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const addSelectedSamples = useSelectionStore((state) => state.addSelectedSamples);

  // Map container ref and dimensions for SelectionOverlay
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });

  // Track map container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (mapContainerRef.current) {
        setMapDimensions({
          width: mapContainerRef.current.clientWidth,
          height: mapContainerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Sample details state (for details panel)
  const [clickedSample, setClickedSample] = useState<Sample | null>(null);

  // Fetch data using custom hooks (with filters)
  const { samples, loading: samplesLoading, error: samplesError } = useSamples(sampleFilters);
  const { volcanoes, loading: volcanoesLoading, error: volcanoesError } = useVolcanoes(volcanoFilters);
  const { boundaries, loading: tectonicLoading, error: tectonicError } = useTectonic();

  // Convert boundaries response to array
  const tectonicBoundaries = boundaries?.features || [];

  // Zoom to selected volcano when volcano_name filter is applied
  useEffect(() => {
    if (volcanoFilters.volcano_name && volcanoes && volcanoes.length > 0) {
      const selectedVolcano = volcanoes.find(v => v.volcano_name === volcanoFilters.volcano_name);
      if (selectedVolcano?.geometry?.coordinates) {
        const [longitude, latitude] = selectedVolcano.geometry.coordinates;
        setViewport({
          longitude,
          latitude,
          zoom: 8, // Close zoom to see volcano and samples
        });
      }
    }
  }, [volcanoFilters.volcano_name, volcanoes]);

  // Loading state
  const isLoading = samplesLoading || volcanoesLoading || tectonicLoading;
  const error = samplesError || volcanoesError || tectonicError;

  // Handle volcano click
  const handleVolcanoClick = (volcano: Volcano) => {
    console.log('Volcano clicked:', volcano);
    // Future: Show volcano details in a sidebar or modal
  };

  // Download CSV handler
  const handleDownloadCSV = () => {
    exportSamplesToCSV(selectedSamples);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    commonShortcuts.download(handleDownloadCSV),
  ]);

  // Handle sample click
  const handleSampleClick = (sample: Sample) => {
    setClickedSample(sample);
  };

  // Handle adding sample to selection
  const handleAddToSelection = (sample: Sample) => {
    // Check if sample is already in selection
    const isAlreadySelected = selectedSamples.some(s => s._id === sample._id);
    if (!isAlreadySelected) {
      addSelectedSamples([sample]);
    }
  };

  // Handle viewport changes from map
  const handleViewportChange = (newViewport: { longitude: number; latitude: number; zoom: number }) => {
    setViewport({
      longitude: newViewport.longitude,
      latitude: newViewport.latitude,
      zoom: newViewport.zoom,
    });
  };

  // Zoom controls
  const handleZoomIn = () => {
    setViewport((prev) => ({ ...prev, zoom: prev.zoom + 1 }));
  };

  const handleZoomOut = () => {
    setViewport((prev) => ({ ...prev, zoom: Math.max(0, prev.zoom - 1) }));
  };

  const handleResetView = () => {
    setViewport(INITIAL_VIEWPORT);
  };

  // Handle selection overlay completion
  const handleSelectionComplete = (newSelectedSamples: Sample[]) => {
    addSelectedSamples(newSelectedSamples);
    setSelectionMode('none');
  };

  // Handle selection cancel
  const handleSelectionCancel = () => {
    setSelectionMode('none');
  };

  return (
    <div ref={mapContainerRef} className="relative w-full h-full">
      {/* Error Message */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 max-w-md">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Map Component */}
      <VolcanoMap
        samples={samples}
        volcanoes={volcanoes}
        tectonicBoundaries={tectonicBoundaries}
        viewState={viewport}
        showVolcanoes={showVolcanoes}
        showSamplePoints={showSamplePoints}
        showTectonicBoundaries={showTectonicBoundaries}
        selectedVolcanoName={volcanoFilters.volcano_name}
        loading={isLoading}
        onVolcanoClick={handleVolcanoClick}
        onSampleClick={handleSampleClick}
        onViewportChange={handleViewportChange}
      />

      {/* Selection Overlay (for lasso/box selection) */}
      {(selectionMode === 'lasso' || selectionMode === 'box') && mapDimensions.width > 0 && (
        <SelectionOverlay
          mode={selectionMode}
          samples={samples}
          onSelectionComplete={handleSelectionComplete}
          onCancel={handleSelectionCancel}
          viewState={viewport}
          width={mapDimensions.width}
          height={mapDimensions.height}
        />
      )}

      {/* Sample Details Panel */}
      <SampleDetailsPanel
        sample={clickedSample}
        onClose={() => setClickedSample(null)}
        onAddToSelection={handleAddToSelection}
        isSelected={clickedSample ? selectedSamples.some(s => s._id === clickedSample._id) : false}
      />

      {/* Summary Stats */}
      <SummaryStats
        samples={samples}
        volcanoes={volcanoes}
        selectedSamples={selectedSamples}
        loading={isLoading}
      />

      {/* Layer Controls */}
      <LayerControls
        showVolcanoes={showVolcanoes}
        showSamplePoints={showSamplePoints}
        showTectonicBoundaries={showTectonicBoundaries}
        onVolcanoesChange={setShowVolcanoes}
        onSamplePointsChange={setShowSamplePoints}
        onTectonicsChange={setShowTectonicBoundaries}
      />

      {/* Viewport Controls */}
      <ViewportControls
        viewport={viewport}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
      />

      {/* Selection Toolbar */}
      <SelectionToolbar
        mode={selectionMode}
        selectedCount={selectedSamples.length}
        onModeChange={setSelectionMode}
        onClearSelection={clearSelection}
        onDownloadSelection={() => {
          exportSamplesToCSV(selectedSamples);
        }}
        onShowCharts={() => setChartPanelOpen(true)}
      />

      {/* Chart Panel */}
      <ChartPanel
        samples={selectedSamples}
        isOpen={chartPanelOpen}
        onToggle={() => setChartPanelOpen(prev => !prev)}
        onClose={() => setChartPanelOpen(false)}
      />

      {/* Filter Button */}
      <button
        onClick={() => setFilterPanelOpen(true)}
        className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors duration-200"
        title="Open Filters"
        aria-label="Open filter panel"
      >
        <FilterIcon className="w-5 h-5 text-volcano-600" aria-hidden="true" />
        <span className="sr-only">Filters</span>
      </button>

      {/* Filter Panel */}
      <FilterPanel
        sampleFilters={sampleFilters}
        volcanoFilters={volcanoFilters}
        onSampleFiltersChange={setSampleFilters}
        onVolcanoFiltersChange={setVolcanoFilters}
        isOpen={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <Loader size="lg" text="Loading map data..." />
        </div>
      )}
    </div>
  );
};

export default MapPage;
