import { useState, useRef, useEffect } from 'react';
import { Filter as FilterIcon } from 'lucide-react';
import { VolcanoMap, LayerControls, ViewportControls, SampleDetailsPanel, SummaryStats, ChartPanel, SelectionOverlay } from '../components/Map';
import { BboxSearchWidget } from '../components/Map/BboxSearchWidget';
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
import { formatBboxForAPI } from '../hooks/useBboxDraw';
import type { Volcano, Sample, SampleFilters, VolcanoFilters, BBox } from '../types';

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

  // Bbox state
  const [currentBbox, setCurrentBbox] = useState<BBox | null>(null);
  const [isDrawingBbox, setIsDrawingBbox] = useState(false);
  const [totalSamplesCount, setTotalSamplesCount] = useState<number | undefined>(undefined);

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

  // Bbox drawing state
  const [drawingStart, setDrawingStart] = useState<{ lon: number; lat: number } | null>(null);
  const [drawingCurrent, setDrawingCurrent] = useState<{ lon: number; lat: number } | null>(null);

  // Bbox handlers
  const handleStartDrawing = () => {
    setIsDrawingBbox(true);
    setDrawingStart(null);
    setDrawingCurrent(null);
    // Clear any existing selection mode to avoid conflicts
    if (selectionMode !== 'none') {
      setSelectionMode('none');
    }
  };

  const handleMapClick = (info: any) => {
    if (!isDrawingBbox) return;

    const { coordinate } = info;
    if (!coordinate) return;

    const [lon, lat] = coordinate;

    if (!drawingStart) {
      // First click - set start point
      setDrawingStart({ lon, lat });
    } else {
      // Second click - complete the bbox
      const minLon = Math.min(drawingStart.lon, lon);
      const maxLon = Math.max(drawingStart.lon, lon);
      const minLat = Math.min(drawingStart.lat, lat);
      const maxLat = Math.max(drawingStart.lat, lat);

      // Validate minimum size (at least 0.1 degrees)
      if (Math.abs(maxLon - minLon) > 0.1 && Math.abs(maxLat - minLat) > 0.1) {
        const newBbox: BBox = { minLon, minLat, maxLon, maxLat };
        setCurrentBbox(newBbox);
        const bboxString = formatBboxForAPI(newBbox);
        setSampleFilters(prev => ({ ...prev, bbox: bboxString }));
      }

      // Reset drawing state
      setIsDrawingBbox(false);
      setDrawingStart(null);
      setDrawingCurrent(null);
    }
  };

  const handleMapHover = (info: any) => {
    if (!isDrawingBbox || !drawingStart) return;

    const { coordinate } = info;
    if (!coordinate) return;

    const [lon, lat] = coordinate;
    setDrawingCurrent({ lon, lat });
  };

  const handleSetPresetRegion = (bbox: BBox) => {
    setCurrentBbox(bbox);
    // Update filters with bbox
    const bboxString = formatBboxForAPI(bbox);
    setSampleFilters(prev => ({ ...prev, bbox: bboxString }));
  };

  const handleClearBbox = () => {
    setCurrentBbox(null);
    setIsDrawingBbox(false);
    setDrawingStart(null);
    setDrawingCurrent(null);
    // Remove bbox from filters
    setSampleFilters(prev => {
      const { bbox, ...rest } = prev;
      return rest;
    });
  };

  // Calculate drawing rectangle for visualization
  const getDrawingBbox = (): BBox | null => {
    if (!drawingStart || !drawingCurrent) return null;
    
    return {
      minLon: Math.min(drawingStart.lon, drawingCurrent.lon),
      maxLon: Math.max(drawingStart.lon, drawingCurrent.lon),
      minLat: Math.min(drawingStart.lat, drawingCurrent.lat),
      maxLat: Math.max(drawingStart.lat, drawingCurrent.lat),
    };
  };

  // Track total sample count when bbox is applied
  useEffect(() => {
    if (samples && samples.length > 0) {
      setTotalSamplesCount(samples.length);
    }
  }, [samples]);

  // ESC key to cancel bbox drawing
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDrawingBbox) {
        handleClearBbox();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isDrawingBbox]);

  return (
    <div ref={mapContainerRef} className="relative w-full h-full">
      {/* Error Message */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 max-w-md">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Drawing Instructions Overlay */}
      {isDrawingBbox && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="bg-orange-500 text-white px-6 py-4 rounded-lg shadow-xl">
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold">
                {drawingStart ? 'Click to complete rectangle' : 'Click to start drawing'}
              </div>
              <div className="text-sm">
                {drawingStart ? 'Second click sets the opposite corner' : 'First click sets one corner of the bounding box'}
              </div>
              <button
                onClick={handleClearBbox}
                className="mt-3 px-4 py-2 bg-white text-orange-600 rounded-md hover:bg-gray-100 font-medium"
              >
                Cancel Drawing (ESC)
              </button>
            </div>
          </div>
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
        activeBbox={currentBbox}
        drawingBboxProp={getDrawingBbox()}
        isDrawingBbox={isDrawingBbox}
        onMapClick={handleMapClick}
        onMapHover={handleMapHover}
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

      {/* Left Toolbar Container - Selection & Spatial Search */}
      <div className="absolute top-20 left-4 z-10 flex flex-col gap-4">
        {/* Selection Toolbar */}
        <SelectionToolbar
          mode={selectionMode}
          selectedCount={selectedSamples.length}
          filteredSampleCount={samples.length}
          hasBboxFilter={currentBbox !== null}
          onModeChange={setSelectionMode}
          onClearSelection={clearSelection}
          onDownloadSelection={() => {
            // Download manually selected samples if any, otherwise download filtered samples
            const samplesToDownload = selectedSamples.length > 0 ? selectedSamples : samples;
            exportSamplesToCSV(samplesToDownload);
          }}
          onShowCharts={() => setChartPanelOpen(true)}
        />

        {/* Bbox Search Widget */}
        <BboxSearchWidget
          bbox={currentBbox}
          isDrawing={isDrawingBbox}
          sampleCount={samples?.length}
          totalSamples={totalSamplesCount}
          onStartDrawing={handleStartDrawing}
          onSetPresetRegion={handleSetPresetRegion}
          onClearBbox={handleClearBbox}
        />
      </div>

      {/* Chart Panel */}
      <ChartPanel
        samples={selectedSamples.length > 0 ? selectedSamples : samples}
        isOpen={chartPanelOpen}
        onToggle={() => setChartPanelOpen(prev => !prev)}
        onClose={() => setChartPanelOpen(false)}
      />

      {/* Filter Button */}
      <button
        onClick={() => setFilterPanelOpen(true)}
        className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 hover:bg-gray-50 transition-colors duration-200"
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
