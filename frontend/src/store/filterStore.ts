/**
 * Filter Store - Zustand state management for filters
 *
 * Provides centralized filter state management with:
 * - Persistent filter state across screens
 * - Filter presets/saved filters
 * - History of applied filters
 *
 * @example
 * ```tsx
 * const { filters, setFilter, resetFilters } = useFilterStore();
 *
 * // Apply a filter
 * setFilter('status', ['active', 'pending']);
 *
 * // Get current filter value
 * const statusFilter = filters.status;
 * ```
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Date range filter type */
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/** Sort configuration */
export interface SortConfig {
  field: string;
  order: "asc" | "desc";
}

/** Complete filter state */
export interface FilterState {
  // Common filters
  status: string[];
  type: string[];
  dateRange: DateRange;
  searchQuery: string;
  sort: SortConfig;

  // Entity-specific filters
  sessionFilters: {
    location?: string;
    assignedTo?: string;
    createdBy?: string;
  };

  itemFilters: {
    category?: string;
    hasVariance?: boolean;
    variantType?: string;
  };

  userFilters: {
    role?: string;
    isActive?: boolean;
  };

  // Saved filter presets
  presets: FilterPreset[];

  // Active preset (if any)
  activePresetId: string | null;
}

/** Saved filter preset */
export interface FilterPreset {
  id: string;
  name: string;
  filters: Partial<FilterState>;
  createdAt: string;
  isDefault?: boolean;
}

/** Filter store actions */
export interface FilterActions {
  // Single filter setters
  setStatus: (values: string[]) => void;
  setType: (values: string[]) => void;
  setDateRange: (range: DateRange) => void;
  setSearchQuery: (query: string) => void;
  setSort: (config: SortConfig) => void;

  // Generic filter setter
  setFilter: <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => void;

  // Session-specific filters
  setSessionFilter: <K extends keyof FilterState["sessionFilters"]>(
    key: K,
    value: FilterState["sessionFilters"][K],
  ) => void;

  // Item-specific filters
  setItemFilter: <K extends keyof FilterState["itemFilters"]>(
    key: K,
    value: FilterState["itemFilters"][K],
  ) => void;

  // User-specific filters
  setUserFilter: <K extends keyof FilterState["userFilters"]>(
    key: K,
    value: FilterState["userFilters"][K],
  ) => void;

  // Bulk operations
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  resetSessionFilters: () => void;
  resetItemFilters: () => void;
  resetUserFilters: () => void;

  // Preset management
  savePreset: (name: string) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  setDefaultPreset: (presetId: string) => void;

  // Computed
  getActiveFilterCount: () => number;
  hasActiveFilters: () => boolean;
}

/** Default filter state */
const DEFAULT_FILTER_STATE: FilterState = {
  status: [],
  type: [],
  dateRange: { start: null, end: null },
  searchQuery: "",
  sort: { field: "createdAt", order: "desc" },
  sessionFilters: {},
  itemFilters: {},
  userFilters: {},
  presets: [],
  activePresetId: null,
};

/**
 * Filter store with persistence
 */
export const useFilterStore = create<FilterState & FilterActions>()(
  persist(
    (set, get) => ({
      ...DEFAULT_FILTER_STATE,

      // Single filter setters
      setStatus: (values) => set({ status: values, activePresetId: null }),
      setType: (values) => set({ type: values, activePresetId: null }),
      setDateRange: (range) => set({ dateRange: range, activePresetId: null }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSort: (config) => set({ sort: config }),

      // Generic filter setter
      setFilter: (key, value) =>
        set({ [key]: value, activePresetId: null } as Partial<FilterState>),

      // Session filters
      setSessionFilter: (key, value) =>
        set((state) => ({
          sessionFilters: { ...state.sessionFilters, [key]: value },
          activePresetId: null,
        })),

      // Item filters
      setItemFilter: (key, value) =>
        set((state) => ({
          itemFilters: { ...state.itemFilters, [key]: value },
          activePresetId: null,
        })),

      // User filters
      setUserFilter: (key, value) =>
        set((state) => ({
          userFilters: { ...state.userFilters, [key]: value },
          activePresetId: null,
        })),

      // Bulk operations
      setFilters: (filters) => set({ ...filters, activePresetId: null }),

      resetFilters: () =>
        set({
          status: [],
          type: [],
          dateRange: { start: null, end: null },
          searchQuery: "",
          sort: { field: "createdAt", order: "desc" },
          sessionFilters: {},
          itemFilters: {},
          userFilters: {},
          activePresetId: null,
        }),

      resetSessionFilters: () =>
        set({ sessionFilters: {}, activePresetId: null }),

      resetItemFilters: () => set({ itemFilters: {}, activePresetId: null }),

      resetUserFilters: () => set({ userFilters: {}, activePresetId: null }),

      // Preset management
      savePreset: (name) => {
        const state = get();
        const newPreset: FilterPreset = {
          id: `preset_${Date.now()}`,
          name,
          filters: {
            status: state.status,
            type: state.type,
            dateRange: state.dateRange,
            sessionFilters: state.sessionFilters,
            itemFilters: state.itemFilters,
            userFilters: state.userFilters,
          },
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          presets: [...state.presets, newPreset],
          activePresetId: newPreset.id,
        }));
      },

      loadPreset: (presetId) => {
        const state = get();
        const preset = state.presets.find((p) => p.id === presetId);
        if (preset) {
          set({
            ...preset.filters,
            activePresetId: presetId,
          });
        }
      },

      deletePreset: (presetId) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== presetId),
          activePresetId:
            state.activePresetId === presetId ? null : state.activePresetId,
        })),

      setDefaultPreset: (presetId) =>
        set((state) => ({
          presets: state.presets.map((p) => ({
            ...p,
            isDefault: p.id === presetId,
          })),
        })),

      // Computed values
      getActiveFilterCount: () => {
        const state = get();
        let count = 0;

        if (state.status.length > 0) count += state.status.length;
        if (state.type.length > 0) count += state.type.length;
        if (state.dateRange.start || state.dateRange.end) count += 1;
        if (state.searchQuery) count += 1;

        // Count entity-specific filters
        Object.values(state.sessionFilters).forEach((v) => {
          if (v !== undefined && v !== "") count += 1;
        });
        Object.values(state.itemFilters).forEach((v) => {
          if (v !== undefined && v !== "") count += 1;
        });
        Object.values(state.userFilters).forEach((v) => {
          if (v !== undefined && v !== "") count += 1;
        });

        return count;
      },

      hasActiveFilters: () => get().getActiveFilterCount() > 0,
    }),
    {
      name: "filter-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        presets: state.presets,
        // Don't persist active filters, only presets
      }),
    },
  ),
);

/**
 * Hook to get only filter values (without actions)
 */
export const useFilters = () =>
  useFilterStore((state) => ({
    status: state.status,
    type: state.type,
    dateRange: state.dateRange,
    searchQuery: state.searchQuery,
    sort: state.sort,
    sessionFilters: state.sessionFilters,
    itemFilters: state.itemFilters,
    userFilters: state.userFilters,
  }));

/**
 * Hook to get active filter count
 */
export const useActiveFilterCount = () =>
  useFilterStore((state) => state.getActiveFilterCount());

export default useFilterStore;
