import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ScanSessionState {
  // Session Context
  currentFloor: string | null;
  currentRack: string | null; // Manual input for rack/shelf identifier
  isSectionActive: boolean;
  activeSessionId: string | null;
  sessionType: "STANDARD" | "BLIND" | "STRICT";

  // Actions
  setFloor: (floor: string) => void;
  setRack: (rack: string) => void;
  setActiveSession: (id: string, type: "STANDARD" | "BLIND" | "STRICT") => void;
  clearActiveSession: () => void;
  startSection: () => void;
  closeSection: () => void;
  resumeSession: () => void; // Explicit resume if needed, though persist handles hydration
  resetSession: () => void;
}

export const useScanSessionStore = create<ScanSessionState>()(
  persist(
    (set, get) => ({
      currentFloor: null,
      currentRack: null,
      isSectionActive: false,

      activeSessionId: null,
      sessionType: "STANDARD",

      setFloor: (floor) => set({ currentFloor: floor }),
      setRack: (rack) => set({ currentRack: rack }),
      setActiveSession: (id, type) => set({ activeSessionId: id, sessionType: type }),
      clearActiveSession: () => set({ activeSessionId: null, sessionType: "STANDARD" }),

      startSection: () => {
        const { currentFloor, currentRack } = get();
        if (currentFloor && currentRack) {
          set({ isSectionActive: true });
        }
      },

      closeSection: () => {
        set({
          isSectionActive: false,
          currentFloor: null,
          currentRack: null,
        });
      },

      resumeSession: () => {
        // Hydration is handled by persist, but this could be used for explicit UI logic
        const { currentFloor, currentRack, isSectionActive } = get();
        if (isSectionActive && (!currentFloor || !currentRack)) {
          // Fallback/Safety: if data is missing but active, reset
          set({ isSectionActive: false });
        }
      },

      resetSession: () => {
        set({
          currentFloor: null,
          currentRack: null,
          isSectionActive: false,
        });
      },
    }),
    {
      name: "scan-session-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
