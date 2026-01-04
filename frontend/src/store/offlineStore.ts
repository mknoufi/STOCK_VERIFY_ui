import { create } from "zustand";

export interface SyncItem {
  id: string;
  operation: string;
  payload: any;
  timestamp: number;
}

interface OfflineState {
  isOffline: boolean;
  syncQueue: SyncItem[];
  syncStatus: "synced" | "syncing" | "error";
  setOffline: (status: boolean) => void;
  setSyncStatus: (status: "synced" | "syncing" | "error") => void;
  addToQueue: (item: SyncItem) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOffline: false,
  syncQueue: [],
  syncStatus: "synced",
  setOffline: (status) => set({ isOffline: status }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  addToQueue: (item) =>
    set((state) => ({ syncQueue: [...state.syncQueue, item] })),
  removeFromQueue: (id) =>
    set((state) => ({ syncQueue: state.syncQueue.filter((i) => i.id !== id) })),
  clearQueue: () => set({ syncQueue: [] }),
}));
