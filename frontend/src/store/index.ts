import { create } from 'zustand';
import type { Sample, Volcano, SampleFilters, VolcanoFilters } from '../types';

// Samples store
interface SamplesState {
  samples: Sample[];
  selectedSample: Sample | null;
  filters: SampleFilters;
  loading: boolean;
  error: string | null;
  setSamples: (samples: Sample[]) => void;
  setSelectedSample: (sample: Sample | null) => void;
  setFilters: (filters: Partial<SampleFilters>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearFilters: () => void;
}

export const useSamplesStore = create<SamplesState>((set) => ({
  samples: [],
  selectedSample: null,
  filters: {},
  loading: false,
  error: null,
  setSamples: (samples) => set({ samples }),
  setSelectedSample: (sample) => set({ selectedSample: sample }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearFilters: () => set({ filters: {} }),
}));

// Volcanoes store
interface VolcanoesState {
  volcanoes: Volcano[];
  selectedVolcano: Volcano | null;
  filters: VolcanoFilters;
  loading: boolean;
  error: string | null;
  setVolcanoes: (volcanoes: Volcano[]) => void;
  setSelectedVolcano: (volcano: Volcano | null) => void;
  setFilters: (filters: Partial<VolcanoFilters>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearFilters: () => void;
}

export const useVolcanoesStore = create<VolcanoesState>((set) => ({
  volcanoes: [],
  selectedVolcano: null,
  filters: {},
  loading: false,
  error: null,
  setVolcanoes: (volcanoes) => set({ volcanoes }),
  setSelectedVolcano: (volcano) => set({ selectedVolcano: volcano }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearFilters: () => set({ filters: {} }),
}));

// Map viewport store
interface ViewportState {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
  setViewport: (viewport: Partial<ViewportState>) => void;
  resetViewport: () => void;
}

const DEFAULT_VIEWPORT = {
  longitude: 0,
  latitude: 20,
  zoom: 2,
  bearing: 0,
  pitch: 0,
};

export const useViewportStore = create<ViewportState>((set) => ({
  ...DEFAULT_VIEWPORT,
  setViewport: (viewport) => set((state) => ({ ...state, ...viewport })),
  resetViewport: () => set(DEFAULT_VIEWPORT),
}));

// UI store for layer toggles and preferences
interface UIState {
  showVolcanoes: boolean;
  showSamples: boolean;
  showTectonicPlates: boolean;
  showTectonicBoundaries: boolean;
  sidebarOpen: boolean;
  toggleVolcanoes: () => void;
  toggleSamples: () => void;
  toggleTectonicPlates: () => void;
  toggleTectonicBoundaries: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  showVolcanoes: true,
  showSamples: true,
  showTectonicPlates: false,
  showTectonicBoundaries: false,
  sidebarOpen: true,
  toggleVolcanoes: () => set((state) => ({ showVolcanoes: !state.showVolcanoes })),
  toggleSamples: () => set((state) => ({ showSamples: !state.showSamples })),
  toggleTectonicPlates: () => set((state) => ({ showTectonicPlates: !state.showTectonicPlates })),
  toggleTectonicBoundaries: () =>
    set((state) => ({ showTectonicBoundaries: !state.showTectonicBoundaries })),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

// Selection store for sample selection tools
export type SelectionMode = 'none' | 'lasso' | 'box';

interface SelectionState {
  selectedSamples: Sample[];
  selectionMode: SelectionMode;
  setSelectedSamples: (samples: Sample[]) => void;
  addSelectedSamples: (samples: Sample[]) => void;
  clearSelection: () => void;
  setSelectionMode: (mode: SelectionMode) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedSamples: [],
  selectionMode: 'none',
  setSelectedSamples: (samples) => set({ selectedSamples: samples }),
  addSelectedSamples: (samples) =>
    set((state) => {
      // Filter out samples that are already in selection
      const existingIds = new Set(state.selectedSamples.map(s => s._id));
      const newSamples = samples.filter(sample => !existingIds.has(sample._id));
      
      return {
        selectedSamples: [...state.selectedSamples, ...newSamples],
      };
    }),
  clearSelection: () => set({ selectedSamples: [], selectionMode: 'none' }),
  setSelectionMode: (mode) => set({ selectionMode: mode }),
}));
