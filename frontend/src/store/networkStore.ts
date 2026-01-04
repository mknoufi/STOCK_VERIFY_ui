import { create } from "zustand";

interface NetworkState {
  isOnline: boolean;
  connectionType: string;
  isInternetReachable: boolean | null;
  isRestrictedMode: boolean; // True if connected but blocked by LAN policy
  setIsOnline: (isOnline: boolean) => void;
  setConnectionType: (type: string) => void;
  setIsInternetReachable: (reachable: boolean | null) => void;
  setRestrictedMode: (restricted: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  connectionType: "unknown",
  isInternetReachable: null,
  isRestrictedMode: false,
  setIsOnline: (isOnline: boolean) => set({ isOnline }),
  setConnectionType: (type: string) => set({ connectionType: type }),
  setIsInternetReachable: (reachable: boolean | null) =>
    set({ isInternetReachable: reachable }),
  setRestrictedMode: (restricted: boolean) =>
    set({ isRestrictedMode: restricted }),
}));
