import { create } from "zustand";

export type BackendReachability = "GREEN" | "YELLOW" | "RED" | "UNKNOWN";

interface NetworkState {
  isOnline: boolean;
  connectionType: string;
  isInternetReachable: boolean | null;
  backendReachability: BackendReachability;
  backendHealthStatus: string | null;
  lastBackendPingAt: string | null;
  backendLatencyMs: number | null;
  setIsOnline: (isOnline: boolean) => void;
  setConnectionType: (type: string) => void;
  setIsInternetReachable: (reachable: boolean | null) => void;
  setBackendReachability: (status: BackendReachability) => void;
  setBackendHealthStatus: (status: string | null) => void;
  setLastBackendPing: (timestamp: string | null, latencyMs?: number | null) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  connectionType: "unknown",
  isInternetReachable: null,
  backendReachability: "UNKNOWN",
  backendHealthStatus: null,
  lastBackendPingAt: null,
  backendLatencyMs: null,
  setIsOnline: (isOnline: boolean) => set({ isOnline }),
  setConnectionType: (type: string) => set({ connectionType: type }),
  setIsInternetReachable: (reachable: boolean | null) =>
    set({ isInternetReachable: reachable }),
  setBackendReachability: (status: BackendReachability) =>
    set({ backendReachability: status }),
  setBackendHealthStatus: (status: string | null) =>
    set({ backendHealthStatus: status }),
  setLastBackendPing: (timestamp: string | null, latencyMs?: number | null) =>
    set({
      lastBackendPingAt: timestamp,
      backendLatencyMs: latencyMs === undefined ? null : latencyMs,
    }),
}));
