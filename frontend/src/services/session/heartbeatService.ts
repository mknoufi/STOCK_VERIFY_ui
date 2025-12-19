/**
 * Heartbeat Service - Maintain session and rack locks
 * Automatically sends heartbeats every 20-30 seconds
 */

import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
} from "react-native";
import api from "../httpClient";

interface HeartbeatResponse {
  success: boolean;
  session_id: string;
  rack_lock_renewed: boolean;
  user_presence_updated: boolean;
  lock_ttl_remaining: number;
  message: string;
}

interface HeartbeatConfig {
  intervalMs: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: HeartbeatConfig = {
  intervalMs: 25000, // 25 seconds (lock TTL is 60s)
  enabled: true,
};

export class HeartbeatService {
  private config: HeartbeatConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;
  private isActive = false;
  private appState: AppStateStatus = "active";
  private missedHeartbeats = 0;
  private maxMissedHeartbeats = 2;
  private appStateSubscription: NativeEventSubscription | null = null;

  constructor(config?: Partial<HeartbeatConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupAppStateListener();
  }

  /**
   * Listen to app state changes
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      "change",
      this.handleAppStateChange,
    );
  }

  /**
   * Handle app state changes (background/foreground)
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    const wasBackground = this.appState === "background";
    const isActive = nextAppState === "active";

    this.appState = nextAppState;

    if (wasBackground && isActive && this.isActive) {
      // App came to foreground, send immediate heartbeat
      __DEV__ && console.log("📱 App foregrounded, sending heartbeat...");
      this.sendHeartbeat();
    }
  };

  /**
   * Start heartbeat for a session
   */
  start(sessionId: string): void {
    if (this.isActive && this.sessionId === sessionId) {
      __DEV__ && console.log("💓 Heartbeat already running for this session");
      return;
    }

    this.stop(); // Stop any existing heartbeat

    this.sessionId = sessionId;
    this.isActive = true;
    this.missedHeartbeats = 0;

    // Send immediate heartbeat
    this.sendHeartbeat();

    // Start interval
    this.intervalId = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.intervalMs) as unknown as NodeJS.Timeout;

    __DEV__ &&
      console.log(
        `💓 Heartbeat started for session ${sessionId} (interval: ${this.config.intervalMs}ms)`,
      );
  }

  /**
   * Stop heartbeat
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isActive = false;
    this.sessionId = null;
    this.missedHeartbeats = 0;

    __DEV__ && console.log("💓 Heartbeat stopped");
  }

  /**
   * Send heartbeat to server
   */
  private async sendHeartbeat(): Promise<void> {
    if (!this.sessionId || !this.config.enabled) {
      return;
    }

    // Don't send heartbeat when app is in background
    if (this.appState !== "active") {
      __DEV__ && console.log("💓 Skipping heartbeat (app in background)");
      return;
    }

    try {
      const response = await api.post<HeartbeatResponse>(
        `/api/sessions/${this.sessionId}/heartbeat`,
      );

      if (response.data.success) {
        // Always reset counter on successful heartbeat
        this.missedHeartbeats = 0;

        __DEV__ &&
          console.log(
            `💓 Heartbeat sent: rack_renewed=${response.data.rack_lock_renewed}, ` +
              `ttl=${response.data.lock_ttl_remaining}s`,
          );

        // Warn if lock TTL is getting low
        if (response.data.lock_ttl_remaining < 20) {
          console.warn(
            `⚠️ Lock TTL is low: ${response.data.lock_ttl_remaining}s remaining`,
          );
        }
      } else {
        // Response received but not successful - still reset to avoid false positives
        this.missedHeartbeats = 0;
      }
    } catch (error: any) {
      this.missedHeartbeats++;

      console.error(
        `❌ Heartbeat failed (${this.missedHeartbeats}/${this.maxMissedHeartbeats}):`,
        error.message,
      );

      // Stop heartbeat if too many failures
      if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
        console.error("❌ Too many missed heartbeats, stopping service");
        this.stop();

        // Notify user (could emit event here)
        // EventEmitter.emit('heartbeat:failed', { sessionId: this.sessionId });
      }
    }
  }

  /**
   * Check if heartbeat is active
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get missed heartbeat count
   */
  getMissedHeartbeats(): number {
    return this.missedHeartbeats;
  }

  /**
   * Update interval (takes effect on next start)
   */
  setInterval(intervalMs: number): void {
    this.config.intervalMs = intervalMs;

    // Restart if currently running
    if (this.isActive && this.sessionId) {
      const sessionId = this.sessionId;
      this.stop();
      this.start(sessionId);
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

// Global instance
export const heartbeatService = new HeartbeatService();
