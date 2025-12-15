import { useState, useRef, useEffect, useMemo } from 'react';
import { Filter as FilterIcon } from 'lucide-react';
import { VolcanoMap, LayerControls, ViewportControls, SampleDetailsPanel, SummaryStats, ChartPanel, SelectionOverlay } from '../components/Map';
import { BboxSearchWidget } from '../components/Map/BboxSearchWidget';
import { FilterPanel } from '../components/Filters';
import { SelectionToolbar } from '../components/Selection';
import { useVolcanoes } from '../hooks/useVolcanoes';
import { useTectonic } from '../hooks/useTectonic';
import { useSelectionStore } from '../store';
import { Loader } from '../components/Common/Loader';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { exportSamplesToCSV } from '../utils/csvExport';
import { useKeyboardShortcuts, commonShortcuts } from '../hooks/useKeyboardShortcuts';
import { formatBboxForAPI } from '../hooks/useBboxDraw';
import { fetchSamples } from '../api/samples';
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
  const [sampleFilters, setSampleFilters] = useState<SampleFilters>({}); // Start with no filters - user must apply filters or bbox
  const [volcanoFilters, setVolcanoFilters] = useState<VolcanoFilters>({}); // Increased default limit
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false); // Track if user has applied any filters
  const [showNoSamplesMessage, setShowNoSamplesMessage] = useState(true); // Control visibility of "No Samples" popup
  
  // Separate state for volcano samples and bbox samples (for OR logic)
  const [volcanoSamples, setVolcanoSamples] = useState<Sample[]>([]);
  const [bboxSamples, setBboxSamples] = useState<Sample[]>([]);
  const [loadingVolcanoSamples, setLoadingVolcanoSamples] = useState(false);
  const [loadingBboxSamples, setLoadingBboxSamples] = useState(false);
  const [volcanoSamplesError, setVolcanoSamplesError] = useState<string | null>(null);
  const [bboxSamplesError, setBboxSamplesError] = useState<string | null>(null);

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
  const { volcanoes, loading: volcanoesLoading, error: volcanoesError } = useVolcanoes(volcanoFilters);
  const { boundaries, loading: tectonicLoading, error: tectonicError } = useTectonic();
  
  // Merge volcano samples and bbox samples (OR logic)
  const samples = useMemo(() => {
    // If we have both, merge and deduplicate by sample _id
    if (volcanoSamples.length > 0 && bboxSamples.length > 0) {
      const sampleMap = new Map<string, Sample>();
      
      // Add volcano samples first
      volcanoSamples.forEach(sample => {
        if (sample._id) sampleMap.set(sample._id, sample);
      });
      
      // Add bbox samples (won't overwrite duplicates)
      bboxSamples.forEach(sample => {
        if (sample._id && !sampleMap.has(sample._id)) {
          sampleMap.set(sample._id, sample);
        }
      });
      
      return Array.from(sampleMap.values());
    }
    
    // If only one source has samples, return that
    if (volcanoSamples.length > 0) return volcanoSamples;
    if (bboxSamples.length > 0) return bboxSamples;
    
    return [];
  }, [volcanoSamples, bboxSamples]);
  
  const samplesLoading = loadingVolcanoSamples || loadingBboxSamples;
  const samplesError = null; // We'll handle errors separately for each fetch

  // Convert boundaries response to array
  const tectonicBoundaries = boundaries?.features || [];

  // Fetch samples for selected volcano
  useEffect(() => {
    const fetchVolcanoSamples = async () => {
      if (volcanoFilters.volcano_name && volcanoes && volcanoes.length > 0) {
        const selectedVolcano = volcanoes.find(v => v.volcano_name === volcanoFilters.volcano_name);
        
        if (selectedVolcano) {
          // Zoom to volcano
          if (selectedVolcano.geometry?.coordinates) {
            const [longitude, latitude] = selectedVolcano.geometry.coordinates;
            setViewport({
              longitude,
              latitude,
              zoom: 8, // Close zoom to see volcano and samples
            });
          }
          
          // Fetch samples for this volcano
          if (selectedVolcano.volcano_number) {
            setLoadingVolcanoSamples(true);
            setHasAppliedFilters(true);
            setVolcanoSamplesError(null); // Clear previous errors
            
            try {
              // Combine volcano_number with sampleFilters (database, rock_type, tectonic_setting, SiO2)
              const response = await fetchSamples({
                volcano_number: selectedVolcano.volcano_number,
                ...sampleFilters, // Include all sample filters (database, rock_type, tectonic_setting, min_sio2, max_sio2)
              });
              setVolcanoSamples(response.data);
              setVolcanoSamplesError(null);
            } catch (error: any) {
              console.error('Error fetching volcano samples:', error);
              const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch volcano samples';
              setVolcanoSamplesError(errorMessage);
              setVolcanoSamples([]);
            } finally {
              setLoadingVolcanoSamples(false);
            }
          }
        }
      } else {
        // Clear volcano samples if no volcano selected
        setVolcanoSamples([]);
        setVolcanoSamplesError(null);
      }
    };
    
    fetchVolcanoSamples();
  }, [volcanoFilters.volcano_name, volcanoes, sampleFilters]);

  // Fetch samples within bbox
  useEffect(() => {
    const fetchBboxSamples = async () => {
      if (currentBbox) {
        setLoadingBboxSamples(true);
        setHasAppliedFilters(true);
        setBboxSamplesError(null); // Clear previous errors
        
        try {
          const bboxString = formatBboxForAPI(currentBbox);
          // Combine bbox with sampleFilters (database, rock_type, tectonic_setting, SiO2)
          const response = await fetchSamples({
            bbox: bboxString,
            ...sampleFilters, // Include all sample filters (database, rock_type, tectonic_setting, min_sio2, max_sio2)
          });
          setBboxSamples(response.data);
          setBboxSamplesError(null);
        } catch (error: any) {
          console.error('Error fetching bbox samples:', error);
          const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch samples in bounding box';
          setBboxSamplesError(errorMessage);
          setBboxSamples([]);
        } finally {
          setLoadingBboxSamples(false);
        }
      } else {
        // Clear bbox samples if no bbox selected
        setBboxSamples([]);
        setBboxSamplesError(null);
      }
    };
    
    fetchBboxSamples();
  }, [currentBbox, sampleFilters]);
  
  // Detect when user applies filters from FilterPanel (excluding just limit changes)
  // Also detect when filters are CLEARED (empty object) to prevent unnecessary fetches
  useEffect(() => {
    const hasNonLimitFilters = Object.keys(sampleFilters).some(
      key => key !== 'limit' && key !== 'offset' && key !== 'bbox' && key !== 'volcano_number'
    );
    
    if (hasNonLimitFilters && !hasAppliedFilters) {
      // User applied filters - allow fetching
      setHasAppliedFilters(true);
    } else if (!hasNonLimitFilters && hasAppliedFilters && !currentBbox && !volcanoFilters.volcano_name) {
      // Filters were cleared AND no bbox/volcano - prevent fetching
      setHasAppliedFilters(false);
    }
  }, [sampleFilters, hasAppliedFilters, currentBbox, volcanoFilters.volcano_name]);

  // Loading state
  const isLoading = samplesLoading || volcanoesLoading || tectonicLoading;
  
  // Combine all errors for display
  const allErrors = [volcanoesError, tectonicError, volcanoSamplesError, bboxSamplesError]
    .filter(Boolean)
    .join(' | ');
  const error = allErrors || null;

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
        setCurrentBbox(newBbox); // This will trigger bbox sample fetch via useEffect
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
    setCurrentBbox(bbox); // This will trigger bbox sample fetch via useEffect
  };

  const handleClearBbox = () => {
    setCurrentBbox(null); // This will clear bbox samples via useEffect
    setIsDrawingBbox(false);
    setDrawingStart(null);
    setDrawingCurrent(null);
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

      {/* No Samples Loaded Message */}
      {!hasAppliedFilters && !samplesLoading && samples.length === 0 && showNoSamplesMessage && (
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
          onClick={(e) => {
            // Close if clicking the backdrop (outside the white box)
            if (e.target === e.currentTarget) {
              setShowNoSamplesMessage(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md relative">
            {/* Close button */}
            <button
              onClick={() => setShowNoSamplesMessage(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
              title="Dismiss message"
              aria-label="Close message"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="text-center space-y-4">
              <div className="text-volcano-600 text-5xl mb-4">🗺️</div>
              <h3 className="text-xl font-bold text-gray-800">No Samples Loaded</h3>
              <p className="text-gray-600">
                To display rock samples on the map, use one of these options:
              </p>
              <ul className="text-left text-gray-700 space-y-2 ml-6">
                <li className="flex items-start">
                  <span className="text-volcano-600 mr-2">•</span>
                  <span><strong>Draw a bounding box</strong> using the spatial search tool on the left</span>
                </li>
                <li className="flex items-start">
                  <span className="text-volcano-600 mr-2">•</span>
                  <span><strong>Apply filters</strong> using the filter button (top-left)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-volcano-600 mr-2">•</span>
                  <span><strong>Select a preset region</strong> from the spatial search widget</span>
                </li>
              </ul>
              <div className="pt-4">
                <button
                  onClick={() => setFilterPanelOpen(true)}
                  className="px-6 py-3 bg-volcano-600 text-white rounded-lg hover:bg-volcano-700 transition-colors font-medium"
                >
                  Open Filters
                </button>
              </div>
            </div>
          </div>
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
