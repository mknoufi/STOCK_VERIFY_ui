/**
 * Session Manager Service
 *
 * Comprehensive session management including:
 * - Authentication session heartbeat
 * - Session expiration handling
 * - Token refresh coordination
 * - App state awareness (foreground/background)
 */

import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
} from "react-native";
import api from "./httpClient";
import { eventEmitter } from "../utils/eventEmitter";

// Session Events
export const SESSION_EVENTS = {
  SESSION_EXPIRED: "session:expired",
  SESSION_REFRESHED: "session:refreshed",
  SESSION_ERROR: "session:error",
  HEARTBEAT_SUCCESS: "heartbeat:success",
  HEARTBEAT_FAILED: "heartbeat:failed",
} as const;

interface HeartbeatResponse {
  status: string;
  message: string;
  data: {
    status: string;
    user_id: string;
    username: string;
    timestamp: string;
    session_valid: boolean;
  };
}

interface SessionManagerConfig {
  /** Heartbeat interval in milliseconds (default: 60000 = 1 minute) */
  heartbeatIntervalMs: number;
  /** Whether heartbeat is enabled (default: true) */
  heartbeatEnabled: boolean;
  /** Max consecutive heartbeat failures before triggering session error (default: 3) */
  maxHeartbeatFailures: number;
  /** Whether to auto-refresh tokens on 401 (default: true) */
  autoRefresh: boolean;
  /** Token refresh buffer time in ms (refresh token early) (default: 60000 = 1 minute) */
  refreshBufferMs: number;
}

const DEFAULT_CONFIG: SessionManagerConfig = {
  heartbeatIntervalMs: 60000, // 1 minute
  heartbeatEnabled: true,
  maxHeartbeatFailures: 3,
  autoRefresh: true,
  refreshBufferMs: 60000, // 1 minute before expiry
};

class SessionManager {
  private config: SessionManagerConfig;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private appState: AppStateStatus = "active";
  private appStateSubscription: NativeEventSubscription | null = null;
  private consecutiveFailures = 0;
  private lastHeartbeat: Date | null = null;
  private sessionStartTime: Date | null = null;
  private userId: string | null = null;
  private username: string | null = null;

  constructor(config?: Partial<SessionManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupAppStateListener();
  }

  /**
   * Initialize session manager with user info
   */
  async initialize(userId?: string, username?: string): Promise<void> {
    this.userId = userId || null;
    this.username = username || null;
    this.sessionStartTime = new Date();
    this.consecutiveFailures = 0;

    if (this.config.heartbeatEnabled) {
      await this.startHeartbeat();
    }

    __DEV__ &&
      console.log("📱 SessionManager initialized", { userId, username });
  }

  /**
   * Start heartbeat polling
   */
  private async startHeartbeat(): Promise<void> {
    if (this.isActive) {
      __DEV__ && console.log("💓 Heartbeat already running");
      return;
    }

    this.isActive = true;

    // Send immediate heartbeat
    await this.sendHeartbeat();

    // Start interval
    this.heartbeatInterval = setInterval(() => {
      if (this.appState === "active") {
        this.sendHeartbeat();
      }
    }, this.config.heartbeatIntervalMs) as unknown as NodeJS.Timeout;

    __DEV__ &&
      console.log(
        `💓 Auth heartbeat started (interval: ${this.config.heartbeatIntervalMs}ms)`,
      );
  }

  /**
   * Stop heartbeat polling
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.isActive = false;
    __DEV__ && console.log("💓 Auth heartbeat stopped");
  }

  /**
   * Send authentication heartbeat to server
   */
  private async sendHeartbeat(): Promise<boolean> {
    if (!this.config.heartbeatEnabled) {
      return true;
    }

    try {
      const response = await api.get<HeartbeatResponse>("/api/auth/heartbeat");

      if (response.data?.data?.session_valid) {
        this.consecutiveFailures = 0;
        this.lastHeartbeat = new Date();

        // Update session info if provided
        if (response.data.data.user_id) {
          this.userId = response.data.data.user_id;
        }
        if (response.data.data.username) {
          this.username = response.data.data.username;
        }

        eventEmitter.emit(SESSION_EVENTS.HEARTBEAT_SUCCESS, {
          timestamp: this.lastHeartbeat,
          username: this.username,
        });

        __DEV__ &&
          console.log("💓 Auth heartbeat success", {
            username: this.username,
            serverTime: response.data.data.timestamp,
          });

        return true;
      } else {
        // Session invalid according to server
        this.handleSessionInvalid("Server reported session as invalid");
        return false;
      }
    } catch (error: any) {
      this.consecutiveFailures++;

      const errorMessage = error?.response?.data?.detail || error.message;
      const statusCode = error?.response?.status;

      __DEV__ &&
        console.error(
          `❌ Auth heartbeat failed (${this.consecutiveFailures}/${this.config.maxHeartbeatFailures}):`,
          errorMessage,
        );

      // 401 means token expired or invalid
      if (statusCode === 401) {
        this.handleSessionExpired();
        return false;
      }

      // Check if we've exceeded max failures
      if (this.consecutiveFailures >= this.config.maxHeartbeatFailures) {
        this.handleSessionError("Too many consecutive heartbeat failures");
        return false;
      }

      eventEmitter.emit(SESSION_EVENTS.HEARTBEAT_FAILED, {
        error: errorMessage,
        consecutiveFailures: this.consecutiveFailures,
      });

      return false;
    }
  }

  /**
   * Handle session expiration (401 from server)
   */
  private handleSessionExpired(): void {
    __DEV__ && console.log("🔒 Session expired");
    this.stopHeartbeat();

    eventEmitter.emit(SESSION_EVENTS.SESSION_EXPIRED, {
      reason: "Token expired or invalid",
      userId: this.userId,
      username: this.username,
    });
  }

  /**
   * Handle session marked as invalid by server
   */
  private handleSessionInvalid(reason: string): void {
    __DEV__ && console.log("🔒 Session invalid:", reason);
    this.stopHeartbeat();

    eventEmitter.emit(SESSION_EVENTS.SESSION_EXPIRED, {
      reason,
      userId: this.userId,
      username: this.username,
    });
  }

  /**
   * Handle session error (network issues, etc.)
   */
  private handleSessionError(reason: string): void {
    __DEV__ && console.log("⚠️ Session error:", reason);
    this.stopHeartbeat();

    eventEmitter.emit(SESSION_EVENTS.SESSION_ERROR, {
      reason,
      userId: this.userId,
      username: this.username,
    });
  }

  /**
   * Listen to app state changes (foreground/background)
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      "change",
      this.handleAppStateChange,
    );
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    const wasBackground =
      this.appState === "background" || this.appState === "inactive";
    const isNowActive = nextAppState === "active";

    this.appState = nextAppState;

    // App came to foreground - send immediate heartbeat
    if (wasBackground && isNowActive && this.isActive) {
      __DEV__ && console.log("📱 App foregrounded, verifying session...");
      this.sendHeartbeat();
    }
  };

  /**
   * Force an immediate session check
   */
  async checkSession(): Promise<boolean> {
    return await this.sendHeartbeat();
  }

  /**
   * Get session status
   */
  getStatus(): {
    isActive: boolean;
    userId: string | null;
    username: string | null;
    lastHeartbeat: Date | null;
    sessionStartTime: Date | null;
    consecutiveFailures: number;
  } {
    return {
      isActive: this.isActive,
      userId: this.userId,
      username: this.username,
      lastHeartbeat: this.lastHeartbeat,
      sessionStartTime: this.sessionStartTime,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  /**
   * Subscribe to session events
   */
  on(
    event: (typeof SESSION_EVENTS)[keyof typeof SESSION_EVENTS],
    callback: (data: any) => void,
  ): () => void {
    eventEmitter.on(event, callback);
    return () => eventEmitter.off(event, callback);
  }

  /**
   * End session (on logout)
   */
  endSession(): void {
    this.stopHeartbeat();
    this.userId = null;
    this.username = null;
    this.sessionStartTime = null;
    this.lastHeartbeat = null;
    this.consecutiveFailures = 0;

    __DEV__ && console.log("📱 Session ended");
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SessionManagerConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart heartbeat if interval changed and currently running
    if (this.isActive && config.heartbeatIntervalMs !== undefined) {
      this.stopHeartbeat();
      this.startHeartbeat();
    }
  }

  /**
   * Cleanup on app unmount
   */
  destroy(): void {
    this.stopHeartbeat();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

// Singleton instance
export const sessionManager = new SessionManager();

export default sessionManager;
