import React, { useState, useCallback, useEffect } from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';
import type { SampleFilters, VolcanoFilters } from '../../types';
import { fetchSampleTectonicSettings, fetchVolcanoTectonicSettings, fetchRockTypes, fetchCountries, fetchRegions, fetchVolcanoNames } from '../../api/metadata';

interface FilterPanelProps {
  /** Current sample filters */
  sampleFilters: SampleFilters;
  /** Current volcano filters */
  volcanoFilters: VolcanoFilters;
  /** Callback when sample filters change */
  onSampleFiltersChange: (filters: SampleFilters) => void;
  /** Callback when volcano filters change */
  onVolcanoFiltersChange: (filters: VolcanoFilters) => void;
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
}

/**
 * FilterPanel Component
 * 
 * Provides comprehensive filtering controls for samples and volcanoes:
 * - Database selection (GEOROC, PetDB, GVP)
 * - Rock type filtering
 * - Tectonic setting filtering
 * - Country selection
 * - Volcano search
 * - Chemical composition ranges (SiO2)
 * 
 * Features:
 * - Debounced filter application
 * - Clear all filters
 * - Collapsible sections
 * - Responsive sidebar design
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  sampleFilters,
  volcanoFilters,
  onSampleFiltersChange,
  onVolcanoFiltersChange,
  isOpen,
  onClose,
}) => {
  // Local state for filter inputs (before applying)
  const [localSampleFilters, setLocalSampleFilters] = useState<SampleFilters>(sampleFilters);
  const [localVolcanoFilters, setLocalVolcanoFilters] = useState<VolcanoFilters>(volcanoFilters);

  // Metadata options
  const [sampleTectonicSettings, setSampleTectonicSettings] = useState<string[]>([]);
  const [volcanoTectonicSettings, setVolcanoTectonicSettings] = useState<string[]>([]);
  const [rockTypes, setRockTypes] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [volcanoNames, setVolcanoNames] = useState<string[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // Autocomplete state
  const [countryInput, setCountryInput] = useState(volcanoFilters.country || '');
  const [regionInput, setRegionInput] = useState(volcanoFilters.region || '');
  const [volcanoInput, setVolcanoInput] = useState(volcanoFilters.volcano_name || '');
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const [showRegionSuggestions, setShowRegionSuggestions] = useState(false);
  const [showVolcanoSuggestions, setShowVolcanoSuggestions] = useState(false);

  /**
   * Fetch metadata on mount
   */
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [sampleSettings, volcanoSettings, types, countriesList, regionsList, volcanoes] = await Promise.all([
          fetchSampleTectonicSettings(),
          fetchVolcanoTectonicSettings(),
          fetchRockTypes(),
          fetchCountries(),
          fetchRegions(),
          fetchVolcanoNames(),
        ]);
        setSampleTectonicSettings(sampleSettings);
        setVolcanoTectonicSettings(volcanoSettings);
        setRockTypes(types);
        setCountries(countriesList);
        setRegions(regionsList);
        setVolcanoNames(volcanoes);
      } catch (error) {
        console.error('Failed to load metadata:', error);
      } finally {
        setLoadingMetadata(false);
      }
    };

    if (isOpen) {
      loadMetadata();
    }
  }, [isOpen]);

  /**
   * Apply all filters
   */
  const handleApplyFilters = useCallback(() => {
    // Convert arrays to comma-separated strings for API
    const processedSampleFilters = { ...localSampleFilters };
    
    // Convert tectonic_setting array to comma-separated string
    if (Array.isArray(processedSampleFilters.tectonic_setting)) {
      processedSampleFilters.tectonic_setting = processedSampleFilters.tectonic_setting.join(',');
    }
    
    // Convert rock_type array to comma-separated string
    if (Array.isArray(processedSampleFilters.rock_type)) {
      processedSampleFilters.rock_type = processedSampleFilters.rock_type.join(',');
    }
    
    onSampleFiltersChange(processedSampleFilters);
    onVolcanoFiltersChange(localVolcanoFilters);
  }, [localSampleFilters, localVolcanoFilters, onSampleFiltersChange, onVolcanoFiltersChange]);

  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    const emptySampleFilters: SampleFilters = {};
    const emptyVolcanoFilters: VolcanoFilters = {};
    setLocalSampleFilters(emptySampleFilters);
    setLocalVolcanoFilters(emptyVolcanoFilters);
    setCountryInput('');
    setRegionInput('');
    setVolcanoInput('');
    onSampleFiltersChange(emptySampleFilters);
    onVolcanoFiltersChange(emptyVolcanoFilters);
  }, [onSampleFiltersChange, onVolcanoFiltersChange]);

  /**
   * Update local sample filter
   */
  const updateSampleFilter = useCallback((key: keyof SampleFilters, value: unknown) => {
    setLocalSampleFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  }, []);

  /**
   * Update local volcano filter
   */
  const updateVolcanoFilter = useCallback((key: keyof VolcanoFilters, value: unknown) => {
    setLocalVolcanoFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  }, []);

  /**
   * Toggle rock type in multi-select
   */
  const toggleRockType = useCallback((rockType: string) => {
    setLocalSampleFilters(prev => {
      const current = Array.isArray(prev.rock_type) 
        ? prev.rock_type 
        : prev.rock_type 
          ? [prev.rock_type] 
          : [];
      
      const updated = current.includes(rockType)
        ? current.filter(rt => rt !== rockType)
        : [...current, rockType];
      
      return {
        ...prev,
        rock_type: updated.length > 0 ? updated : undefined,
      };
    });
  }, []);

  /**
   * Toggle tectonic setting in multi-select for samples
   */
  const toggleSampleTectonicSetting = useCallback((setting: string) => {
    setLocalSampleFilters(prev => {
      const current = Array.isArray(prev.tectonic_setting) 
        ? prev.tectonic_setting 
        : prev.tectonic_setting 
          ? [prev.tectonic_setting] 
          : [];
      
      const updated = current.includes(setting)
        ? current.filter(s => s !== setting)
        : [...current, setting];
      
      return {
        ...prev,
        tectonic_setting: updated.length > 0 ? updated : undefined,
      };
    });
  }, []);

  /**
   * Toggle tectonic setting in multi-select for volcanoes
   */
  const toggleVolcanoTectonicSetting = useCallback((setting: string) => {
    setLocalVolcanoFilters(prev => {
      const current = Array.isArray(prev.tectonic_setting) 
        ? prev.tectonic_setting 
        : prev.tectonic_setting 
          ? [prev.tectonic_setting] 
          : [];
      
      const updated = current.includes(setting)
        ? current.filter(s => s !== setting)
        : [...current, setting];
      
      return {
        ...prev,
        tectonic_setting: updated.length > 0 ? updated : undefined,
      };
    });
  }, []);

  /**
   * Get filtered country suggestions
   */
  const filteredCountries = countryInput
    ? countries.filter(c => c.toLowerCase().includes(countryInput.toLowerCase()))
    : countries;

  /**
   * Get filtered region suggestions
   */
  const filteredRegions = regionInput
    ? regions.filter(r => r.toLowerCase().includes(regionInput.toLowerCase()))
    : regions;

  /**
   * Get filtered volcano name suggestions
   */
  const filteredVolcanoNames = volcanoInput
    ? volcanoNames.filter(v => v.toLowerCase().includes(volcanoInput.toLowerCase()))
    : volcanoNames;

  if (!isOpen) return null;

  const selectedRockTypes = Array.isArray(localSampleFilters.rock_type)
    ? localSampleFilters.rock_type
    : localSampleFilters.rock_type
      ? [localSampleFilters.rock_type]
      : [];

  const selectedSampleTectonicSettings = Array.isArray(localSampleFilters.tectonic_setting)
    ? localSampleFilters.tectonic_setting
    : localSampleFilters.tectonic_setting
      ? [localSampleFilters.tectonic_setting]
      : [];

  const selectedVolcanoTectonicSettings = Array.isArray(localVolcanoFilters.tectonic_setting)
    ? localVolcanoFilters.tectonic_setting
    : localVolcanoFilters.tectonic_setting
      ? [localVolcanoFilters.tectonic_setting]
      : [];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        aria-label="Close filter panel"
      />

      {/* Filter Panel */}
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-volcano-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="Close filters"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="p-4 space-y-6">
          
          {/* Sample Filters Section */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Sample Filters
            </h3>

            {/* Database Selection */}
            <div className="mb-4">
              <label htmlFor="database-select" className="block text-sm font-medium text-gray-700 mb-2">
                Database
              </label>
              <select
                id="database-select"
                value={localSampleFilters.database || ''}
                onChange={(e) => updateSampleFilter('database', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-volcano-500 focus:border-volcano-500"
              >
                <option value="">All Databases</option>
                <option value="GEOROC">GEOROC</option>
                <option value="PetDB">PetDB</option>
                <option value="GVP">Global Volcanism Program</option>
              </select>
            </div>

            {/* Rock Type - Multi-select */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rock Type (Multi-select)
              </label>
              {loadingMetadata ? (
                <div className="text-sm text-gray-500 py-2">Loading...</div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {rockTypes.map((type) => (
                    <label key={type} className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRockTypes.includes(type)}
                        onChange={() => toggleRockType(type)}
                        className="w-4 h-4 text-volcano-600 border-gray-300 rounded focus:ring-volcano-500"
                      />
                      <span className="text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedRockTypes.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  Selected: {selectedRockTypes.length}
                </div>
              )}
            </div>

            {/* Tectonic Setting - Multi-select */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tectonic Setting (Multi-select)
              </label>
              {loadingMetadata ? (
                <div className="text-sm text-gray-500 py-2">Loading...</div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {sampleTectonicSettings.map((setting) => (
                    <label key={setting} className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSampleTectonicSettings.includes(setting)}
                        onChange={() => toggleSampleTectonicSetting(setting)}
                        className="w-4 h-4 text-volcano-600 border-gray-300 rounded focus:ring-volcano-500"
                      />
                      <span className="text-sm text-gray-700">{setting}</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedSampleTectonicSettings.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  Selected: {selectedSampleTectonicSettings.length}
                </div>
              )}
            </div>

            {/* SiO2 Range */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SiO₂ Content (%)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    value={localSampleFilters.min_sio2 || ''}
                    onChange={(e) => updateSampleFilter('min_sio2', e.target.value ? Number.parseFloat(e.target.value) : undefined)}
                    placeholder="Min"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-volcano-500 focus:border-volcano-500"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={localSampleFilters.max_sio2 || ''}
                    onChange={(e) => updateSampleFilter('max_sio2', e.target.value ? Number.parseFloat(e.target.value) : undefined)}
                    placeholder="Max"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-volcano-500 focus:border-volcano-500"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Volcano Filters Section */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Volcano Filters
            </h3>

            {/* Volcano Name - Autocomplete */}
            <div className="mb-4 relative">
              <label htmlFor="volcano-input" className="block text-sm font-medium text-gray-700 mb-2">
                Volcano Name
              </label>
              <input
                id="volcano-input"
                type="text"
                value={volcanoInput}
                onChange={(e) => {
                  setVolcanoInput(e.target.value);
                  updateVolcanoFilter('volcano_name', e.target.value);
                  setShowVolcanoSuggestions(true);
                }}
                onFocus={() => setShowVolcanoSuggestions(true)}
                onBlur={() => setTimeout(() => setShowVolcanoSuggestions(false), 200)}
                placeholder="Type to search volcano..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-volcano-500 focus:border-volcano-500"
              />
              {showVolcanoSuggestions && filteredVolcanoNames.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredVolcanoNames.slice(0, 10).map((volcano) => (
                    <button
                      key={volcano}
                      type="button"
                      onClick={() => {
                        setVolcanoInput(volcano);
                        updateVolcanoFilter('volcano_name', volcano);
                        setShowVolcanoSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-volcano-50 text-sm text-gray-700"
                    >
                      {volcano}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Country - Autocomplete */}
            <div className="mb-4 relative">
              <label htmlFor="country-input" className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <input
                id="country-input"
                type="text"
                value={countryInput}
                onChange={(e) => {
                  setCountryInput(e.target.value);
                  updateVolcanoFilter('country', e.target.value);
                  setShowCountrySuggestions(true);
                }}
                onFocus={() => setShowCountrySuggestions(true)}
                onBlur={() => setTimeout(() => setShowCountrySuggestions(false), 200)}
                placeholder="Type to search countries..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-volcano-500 focus:border-volcano-500"
              />
              {showCountrySuggestions && filteredCountries.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCountries.slice(0, 10).map((country) => (
                    <button
                      key={country}
                      type="button"
                      onClick={() => {
                        setCountryInput(country);
                        updateVolcanoFilter('country', country);
                        setShowCountrySuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-volcano-50 text-sm text-gray-700"
                    >
                      {country}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Region - Autocomplete */}
            <div className="mb-4 relative">
              <label htmlFor="region-input" className="block text-sm font-medium text-gray-700 mb-2">
                Region
              </label>
              <input
                id="region-input"
                type="text"
                value={regionInput}
                onChange={(e) => {
                  setRegionInput(e.target.value);
                  updateVolcanoFilter('region', e.target.value);
                  setShowRegionSuggestions(true);
                }}
                onFocus={() => setShowRegionSuggestions(true)}
                onBlur={() => setTimeout(() => setShowRegionSuggestions(false), 200)}
                placeholder="Type to search regions..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-volcano-500 focus:border-volcano-500"
              />
              {showRegionSuggestions && filteredRegions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredRegions.slice(0, 10).map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => {
                        setRegionInput(region);
                        updateVolcanoFilter('region', region);
                        setShowRegionSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-volcano-50 text-sm text-gray-700"
                    >
                      {region}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tectonic Setting */}
            <div className="mb-4">
              <label htmlFor="volcano-tectonic-select" className="block text-sm font-medium text-gray-700 mb-2">
                Tectonic Setting
              </label>
              {loadingMetadata ? (
                <div className="text-sm text-gray-500 py-2">Loading...</div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {volcanoTectonicSettings.map((setting) => (
                    <label key={setting} className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedVolcanoTectonicSettings.includes(setting)}
                        onChange={() => toggleVolcanoTectonicSetting(setting)}
                        className="w-4 h-4 text-volcano-600 border-gray-300 rounded focus:ring-volcano-500"
                      />
                      <span className="text-sm text-gray-700">{setting}</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedVolcanoTectonicSettings.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  Selected: {selectedVolcanoTectonicSettings.length}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-2">
          <button
            onClick={handleClearFilters}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 text-gray-700 font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Clear All
          </button>
          <button
            onClick={handleApplyFilters}
            className="flex-1 px-4 py-2 bg-volcano-600 text-white rounded-lg hover:bg-volcano-700 font-medium"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
};

export default FilterPanel;
