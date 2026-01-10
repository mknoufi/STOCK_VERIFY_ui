import NetInfo from "@react-native-community/netinfo";
import { getBackendURL } from "../utils/backendUrl";
import { useNetworkStore } from "../store/networkStore";

const HEALTH_PATH = "/api/health";

const timeoutFetch = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const latencyMs = Date.now() - start;

    // Treat any HTTP response < 500 as "reachable" (even 404/401 means server responded)
    const reachable = res.status >= 200 && res.status < 500;
    let healthStatus: string | null = null;

    if (res.ok) {
      try {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const json = (await res.json()) as { status?: string };
          if (typeof json?.status === "string") {
            healthStatus = json.status;
          }
        }
      } catch {
        // Ignore JSON parse errors; reachability still counts
      }
    }

    return { reachable, latencyMs, healthStatus };
  } finally {
    clearTimeout(timeout);
  }
};

const updateFromNetInfoState = (state: any) => {
  const network = useNetworkStore.getState();

  const isConnected = state?.isConnected;
  const isInternetReachable = state?.isInternetReachable;
  const type = state?.type;

  network.setIsOnline(Boolean(isConnected));
  network.setIsInternetReachable(
    typeof isInternetReachable === "boolean" ? isInternetReachable : null,
  );
  network.setConnectionType(typeof type === "string" ? type : "unknown");
};

const updateBackendReachability = async () => {
  const network = useNetworkStore.getState();

  // If definitely offline, mark RED and skip ping.
  if (!network.isOnline || network.isInternetReachable === false) {
    network.setBackendReachability("RED");
    network.setBackendHealthStatus(null);
    network.setLastBackendPing(new Date().toISOString(), null);
    return;
  }

  const baseUrl = getBackendURL();
  const url = `${baseUrl}${HEALTH_PATH}`;

  try {
    const { reachable, latencyMs, healthStatus } = await timeoutFetch(url, 1200);
    const pingAt = new Date().toISOString();

    network.setLastBackendPing(pingAt, latencyMs);
    network.setBackendHealthStatus(healthStatus);

    if (!reachable) {
      network.setBackendReachability("YELLOW");
      return;
    }

    // If the backend reports non-healthy status, treat as degraded.
    if (healthStatus && healthStatus !== "healthy") {
      network.setBackendReachability("YELLOW");
      return;
    }

    // Otherwise good.
    network.setBackendReachability("GREEN");
  } catch {
    // Network is up, but backend ping failed.
    network.setBackendReachability("YELLOW");
    network.setBackendHealthStatus(null);
    network.setLastBackendPing(new Date().toISOString(), null);
  }
};

export const initializeNetworkListener = (): (() => void) => {
  // Seed initial state ASAP
  NetInfo.fetch()
    .then(updateFromNetInfoState)
    .catch(() => {
      // Ignore - some platforms may not support fetch early
    });

  const unsubscribe = NetInfo.addEventListener((state) => {
    updateFromNetInfoState(state);
  });

  // Periodic backend reachability ping
  updateBackendReachability().catch(() => {});
  const interval = setInterval(() => {
    updateBackendReachability().catch(() => {});
  }, 5000);

  return () => {
    unsubscribe();
    clearInterval(interval);
  };
};

export { useNetworkStore };
