import { create } from "zustand";

interface NetworkState {
  isOnline: boolean;
  connectionType: string;
  isInternetReachable: boolean | null;
  setIsOnline: (isOnline: boolean) => void;
  setConnectionType: (type: string) => void;
  setIsInternetReachable: (reachable: boolean | null) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  connectionType: "unknown",
  isInternetReachable: null,
  setIsOnline: (isOnline: boolean) => set({ isOnline }),
  setConnectionType: (type: string) => set({ connectionType: type }),
  setIsInternetReachable: (reachable: boolean | null) =>
    set({ isInternetReachable: reachable }),
}));
