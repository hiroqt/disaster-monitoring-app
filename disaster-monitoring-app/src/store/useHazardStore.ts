import { create } from 'zustand';
import { HazardRecord, HazardType } from '../types';

interface HazardState {
  hazards: HazardRecord[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isOffline: boolean;
  selectedHazard: HazardRecord | null;
  filterType: HazardType | 'all';
  setHazards: (hazards: HazardRecord[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (date: Date) => void;
  setOffline: (offline: boolean) => void;
  setSelectedHazard: (hazard: HazardRecord | null) => void;
  setFilterType: (type: HazardType | 'all') => void;
  addHazard: (hazard: HazardRecord) => void;
}

export const useHazardStore = create<HazardState>((set) => ({
  hazards: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
  isOffline: false,
  selectedHazard: null,
  filterType: 'all',
  setHazards: (hazards) => set({ hazards }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setLastUpdated: (lastUpdated) => set({ lastUpdated }),
  setOffline: (isOffline) => set({ isOffline }),
  setSelectedHazard: (selectedHazard) => set({ selectedHazard }),
  setFilterType: (filterType) => set({ filterType }),
  addHazard: (hazard) => set((state) => ({ hazards: [hazard, ...state.hazards] })),
}));
