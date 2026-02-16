import * as React from "react";

import { useNetworkStore } from "../store/networkStore";
import { initializeNetworkListener } from "../services/networkService";

interface UseNetworkStatusOptions {
  enabled?: boolean;
}

export const useNetworkStatus = (options: UseNetworkStatusOptions = {}) => {
  const enabled = options.enabled ?? true;

  const isOnline = useNetworkStore((s) => s.isOnline);
  const isInternetReachable = useNetworkStore((s) => s.isInternetReachable);
  const connectionType = useNetworkStore((s) => s.connectionType);
  const backendReachability = useNetworkStore((s) => s.backendReachability);
  const backendHealthStatus = useNetworkStore((s) => s.backendHealthStatus);
  const lastBackendPingAt = useNetworkStore((s) => s.lastBackendPingAt);
  const backendLatencyMs = useNetworkStore((s) => s.backendLatencyMs);

  React.useEffect(() => {
    if (!enabled) return;
    return initializeNetworkListener();
  }, [enabled]);

  const offline = !isOnline || isInternetReachable === false;

  return {
    isOnline,
    isInternetReachable,
    connectionType,
    backendReachability,
    backendHealthStatus,
    lastBackendPingAt,
    backendLatencyMs,
    offline,
  };
};
