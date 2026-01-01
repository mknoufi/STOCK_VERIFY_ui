/**
 * WiFi Connection Monitoring Service
 * Tracks WiFi status and notifies on disconnection
 */

import { useState, useEffect } from "react";
import NetInfo, {
  useNetInfo,
  NetInfoChangeHandler,
} from "@react-native-community/netinfo";
import * as Notifications from "expo-notifications";
import { errorReporter } from "@/services/errorRecovery";

export interface WiFiStatus {
  isConnected: boolean;
  isWiFi: boolean;
  strength?: number;
  ssid?: string;
  lastChecked: Date;
}

/**
 * WiFi Connection Service
 */
export class WiFiConnectionService {
  private static instance: WiFiConnectionService;
  private lastStatus: WiFiStatus | null = null;
  private listeners: ((status: WiFiStatus) => void)[] = [];
  private initialized = false;

  private constructor() {}

  static getInstance(): WiFiConnectionService {
    if (!this.instance) {
      this.instance = new WiFiConnectionService();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Request notification permissions if needed
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.warn("Notification permissions not granted for WiFi service");
      }

      this.initialized = true;
      console.log("WiFi Connection Service initialized");
    } catch (error) {
      errorReporter.report(
        error instanceof Error ? error : new Error(String(error)),
        "WiFiConnectionService.initialize",
      );
    }
  }

  async checkStatus(): Promise<WiFiStatus> {
    try {
      const state = await NetInfo.fetch();
      const status: WiFiStatus = {
        isConnected: state.isConnected ?? false,
        isWiFi: state.type === "wifi",
        lastChecked: new Date(),
        ssid: (state.details as any)?.ssid,
        strength: (state.details as any)?.strength,
      };

      // Check for connection change
      if (
        this.lastStatus &&
        this.lastStatus.isConnected !== status.isConnected
      ) {
        if (!status.isConnected) {
          this.notifyDisconnection(this.lastStatus);
        } else {
          this.notifyReconnection(status);
        }
      }

      this.lastStatus = status;
      this.notifyListeners(status);

      return status;
    } catch (error) {
      errorReporter.report(
        error instanceof Error ? error : new Error(String(error)),
        "WiFiConnectionService.checkStatus",
      );
      return {
        isConnected: false,
        isWiFi: false,
        lastChecked: new Date(),
      };
    }
  }

  subscribe(handler: NetInfoChangeHandler): () => void {
    try {
      return NetInfo.addEventListener(handler);
    } catch (error) {
      errorReporter.report(
        error instanceof Error ? error : new Error(String(error)),
        "WiFiConnectionService.subscribe",
      );
      return () => {};
    }
  }

  addListener(callback: (status: WiFiStatus) => void): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(status: WiFiStatus): void {
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        errorReporter.report(
          error instanceof Error ? error : new Error(String(error)),
          "WiFiConnectionService.notifyListeners",
        );
      }
    });
  }

  private async notifyDisconnection(lastStatus: WiFiStatus): Promise<void> {
    try {
      const message =
        lastStatus.isWiFi && lastStatus.ssid
          ? `Lost connection to WiFi: ${lastStatus.ssid}`
          : "Lost internet connection";

      // Send notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ WiFi Disconnected",
          body: message,
          badge: 1,
          sound: "default",
          priority: "high",
        },
        trigger: null,
      });

      console.warn(`WiFi disconnected: ${message}`);
    } catch (error) {
      errorReporter.report(
        error instanceof Error ? error : new Error(String(error)),
        "WiFiConnectionService.notifyDisconnection",
      );
    }
  }

  private async notifyReconnection(status: WiFiStatus): Promise<void> {
    try {
      const message = status.isWiFi
        ? `Reconnected to WiFi: ${status.ssid || "Unknown"}`
        : "Internet connection restored";

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "✅ Connected",
          body: message,
          badge: 0,
          sound: "default",
        },
        trigger: null,
      });

      console.log(`WiFi reconnected: ${message}`);
    } catch (error) {
      errorReporter.report(
        error instanceof Error ? error : new Error(String(error)),
        "WiFiConnectionService.notifyReconnection",
      );
    }
  }
}

/**
 * Hook to monitor WiFi connection status
 */
export const useWiFiStatus = () => {
  const [wifiStatus, setWifiStatus] = useState<WiFiStatus | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const netInfo = useNetInfo();

  useEffect(() => {
    const service = WiFiConnectionService.getInstance();
    service.initialize();

    // Check initial status
    service.checkStatus().then(setWifiStatus);

    // Add listener for manual checks
    const unsubscribe = service.addListener((status) => {
      setWifiStatus(status);
      setIsOnline(status.isConnected);
    });

    // Subscribe to NetInfo changes
    const unsubscribeNetInfo = service.subscribe((_state) => {
      service.checkStatus();
    });

    return () => {
      unsubscribe();
      unsubscribeNetInfo();
    };
  }, []);

  // Update from netInfo hook
  useEffect(() => {
    if (netInfo.isConnected !== undefined && netInfo.isConnected !== null) {
      setIsOnline(netInfo.isConnected);
    }
  }, [netInfo]);

  return {
    isOnline,
    isWiFi: wifiStatus?.isWiFi ?? false,
    ssid: wifiStatus?.ssid,
    strength: wifiStatus?.strength,
    lastChecked: wifiStatus?.lastChecked,
  };
};

/**
 * Hook to show WiFi status UI
 */
export const useWiFiStatusIndicator = () => {
  const { isOnline, isWiFi, ssid } = useWiFiStatus();
  const [showIndicator, setShowIndicator] = useState(!isOnline);

  useEffect(() => {
    setShowIndicator(!isOnline);
    if (!isOnline) {
      const timer = setTimeout(() => {
        // Keep showing for 5 seconds after regaining connection
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOnline]);

  return {
    showIndicator,
    isOnline,
    isWiFi,
    ssid,
    message: !isOnline
      ? "No internet connection"
      : isWiFi
        ? `Connected to: ${ssid || "WiFi"}`
        : "Using cellular data",
  };
};
