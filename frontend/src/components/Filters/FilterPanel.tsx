import React, { useState, useCallback, useEffect } from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';
import type { SampleFilters, VolcanoFilters } from '../../types';
import { fetchSampleTectonicSettings, fetchVolcanoTectonicSettings, fetchRockTypes, fetchCountries, fetchRegions } from '../../api/metadata';
import { fetchVolcanoes } from '../../api/volcanoes';
import {
  createVolcanoAutocompleteOptions,
  filterVolcanoAutocompleteOptions,
  type VolcanoAutocompleteOption,
} from '../../utils/volcanoAutocomplete';
import { Combobox } from '../Common/Combobox';

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
  const [volcanoOptions, setVolcanoOptions] = useState<VolcanoAutocompleteOption[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // Autocomplete state
  const [countryInput, setCountryInput] = useState(volcanoFilters.country || '');
  const [regionInput, setRegionInput] = useState(volcanoFilters.region || '');
  const [volcanoInput, setVolcanoInput] = useState(volcanoFilters.volcano_name || '');

  /**
   * Fetch metadata on mount
   */
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [sampleSettings, volcanoSettings, types, countriesList, regionsList, volcanoesResponse] = await Promise.all([
          fetchSampleTectonicSettings(),
          fetchVolcanoTectonicSettings(),
          fetchRockTypes(),
          fetchCountries(),
          fetchRegions(),
          fetchVolcanoes(),
        ]);
        setSampleTectonicSettings(sampleSettings);
        setVolcanoTectonicSettings(volcanoSettings);
        setRockTypes(types);
        setCountries(countriesList);
        setRegions(regionsList);
        const options = createVolcanoAutocompleteOptions(volcanoesResponse.data);
        setVolcanoOptions(options);
        if (localVolcanoFilters.volcano_number !== undefined) {
          const selectedOption = options.find(
            (option) => option.volcano_number === localVolcanoFilters.volcano_number,
          );
          if (selectedOption) {
            setVolcanoInput(selectedOption.label);
          }
        }
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
    
    // Process volcano filters - convert arrays to comma-separated strings
    const processedVolcanoFilters = { ...localVolcanoFilters };
    
    // Convert tectonic_setting array to comma-separated string
    if (Array.isArray(processedVolcanoFilters.tectonic_setting)) {
      processedVolcanoFilters.tectonic_setting = processedVolcanoFilters.tectonic_setting.join(',');
    }
    
    onSampleFiltersChange(processedSampleFilters);
    onVolcanoFiltersChange(processedVolcanoFilters);
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
    ? filterVolcanoAutocompleteOptions(volcanoOptions, volcanoInput)
    : volcanoOptions;

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
      <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 overflow-y-auto">
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
                className="field"
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
              ) : rockTypes.length === 0 ? (
                <div className="text-sm text-red-500 py-2">
                  No rock types available. Check console for errors.
                </div>
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
                    className="field"
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
                    className="field"
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
              <Combobox
                id="volcano-input"
                value={volcanoInput}
                onValueChange={(value) => {
                  setVolcanoInput(value);
                  setLocalVolcanoFilters(prev => ({
                    ...prev,
                    volcano_name: value || undefined,
                    volcano_number: undefined,
                  }));
                }}
                options={filteredVolcanoNames.slice(0, 10)}
                getOptionKey={(volcano) => volcano.volcano_number}
                getOptionLabel={(volcano) => volcano.label}
                onSelect={(volcano) => {
                  setVolcanoInput(volcano.label);
                  setLocalVolcanoFilters(prev => ({
                    ...prev,
                    volcano_name: volcano.volcano_name,
                    volcano_number: volcano.volcano_number,
                  }));
                }}
                placeholder="Type to search volcano..."
                inputClassName="field"
                optionClassName="w-full text-left px-3 py-2 text-sm text-gray-700 cursor-pointer"
              />
            </div>

            {/* Country - Autocomplete */}
            <div className="mb-4 relative">
              <label htmlFor="country-input" className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <Combobox
                id="country-input"
                value={countryInput}
                onValueChange={(value) => {
                  setCountryInput(value);
                  updateVolcanoFilter('country', value);
                }}
                options={filteredCountries.slice(0, 10)}
                getOptionKey={(country) => country}
                getOptionLabel={(country) => country}
                onSelect={(country) => {
                  setCountryInput(country);
                  updateVolcanoFilter('country', country);
                }}
                placeholder="Type to search countries..."
                inputClassName="field"
                optionClassName="w-full text-left px-3 py-2 text-sm text-gray-700 cursor-pointer"
              />
            </div>

            {/* Region - Autocomplete */}
            <div className="mb-4 relative">
              <label htmlFor="region-input" className="block text-sm font-medium text-gray-700 mb-2">
                Region
              </label>
              <Combobox
                id="region-input"
                value={regionInput}
                onValueChange={(value) => {
                  setRegionInput(value);
                  updateVolcanoFilter('region', value);
                }}
                options={filteredRegions.slice(0, 10)}
                getOptionKey={(region) => region}
                getOptionLabel={(region) => region}
                onSelect={(region) => {
                  setRegionInput(region);
                  updateVolcanoFilter('region', region);
                }}
                placeholder="Type to search regions..."
                inputClassName="field"
                optionClassName="w-full text-left px-3 py-2 text-sm text-gray-700 cursor-pointer"
              />
            </div>

            {/* Tectonic Setting */}
            <div className="mb-4">
              {/* A list of checkboxes, not one field: named as a group rather than with <label for> */}
              <p id="volcano-tectonic-label" className="block text-sm font-medium text-gray-700 mb-2">
                Tectonic Setting
              </p>
              {loadingMetadata ? (
                <div className="text-sm text-gray-500 py-2">Loading...</div>
              ) : (
                <div
                  role="group"
                  aria-labelledby="volcano-tectonic-label"
                  className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2"
                >
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
