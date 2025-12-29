import { authService } from "./auth";

type MessageHandler = (data: any) => void;

interface WebSocketMessage {
  type: string;
  payload: any;
}

/**
 * WebSocket service for real-time communication with the backend.
 * Supports authentication, automatic reconnection, and message subscriptions.
 */
class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectInterval: number = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private url: string = "";
  private token: string | null = null;
  private isIntentionalDisconnect = false;

  /**
   * Connect to the WebSocket server with authentication.
   * @param baseUrl - Base URL (e.g., "ws://192.168.1.100:8001")
   * @param endpoint - Endpoint path (e.g., "/api/ws/supervisor")
   */
  async connect(baseUrl: string, endpoint: string = "/api/ws/supervisor") {
    // Get auth token
    this.token = await authService.getAccessToken();
    if (!this.token) {
      console.error("[WebSocket] No auth token available");
      return;
    }

    // Build WebSocket URL with token as query param
    this.url = `${baseUrl}${endpoint}?token=${this.token}`;
    this.isIntentionalDisconnect = false;

    this._connect();
  }

  private _connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn("[WebSocket] Already connected");
      return;
    }

    console.log("[WebSocket] Connecting to:", this.url.replace(/token=[^&]+/, "token=***"));

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("[WebSocket] Connected");
      // Clear any pending reconnect timers
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        const { type, payload } = message;
        this.notify(type, payload);
      } catch (error) {
        console.error("[WebSocket] Error parsing message:", error);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`[WebSocket] Disconnected (code: ${event.code}, reason: ${event.reason || "none"})`);
      this.ws = null;

      // Only attempt reconnection if not intentionally disconnected
      if (!this.isIntentionalDisconnect) {
        console.log(`[WebSocket] Will reconnect in ${this.reconnectInterval / 1000}s...`);
        this.reconnectTimer = setTimeout(() => {
          this._connect();
        }, this.reconnectInterval);
      }
    };

    this.ws.onerror = (error) => {
      console.error("[WebSocket] Error:", error);
    };
  }

  /**
   * Subscribe to a specific message type.
   * @param type - Message type to subscribe to
   * @param handler - Callback function to handle messages
   */
  subscribe(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)?.push(handler);
    console.log(`[WebSocket] Subscribed to "${type}"`);
  }

  /**
   * Unsubscribe from a specific message type.
   * @param type - Message type to unsubscribe from
   * @param handler - Handler function to remove
   */
  unsubscribe(type: string, handler: MessageHandler) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      this.handlers.set(
        type,
        handlers.filter((h) => h !== handler),
      );
      console.log(`[WebSocket] Unsubscribed from "${type}"`);
    }
  }

  /**
   * Notify all subscribers of a message type.
   * @param type - Message type
   * @param payload - Message payload
   */
  private notify(type: string, payload: any) {
    const handlers = this.handlers.get(type);
    if (handlers && handlers.length > 0) {
      console.log(`[WebSocket] Notifying ${handlers.length} handler(s) for "${type}"`);
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[WebSocket] Handler error for "${type}":`, error);
        }
      });
    } else {
      console.warn(`[WebSocket] No handlers for message type "${type}"`);
    }
  }

  /**
   * Send a message to the server.
   * @param type - Message type
   * @param payload - Message payload
   */
  send(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { type, payload };
      this.ws.send(JSON.stringify(message));
      console.log(`[WebSocket] Sent "${type}" message`);
    } else {
      console.warn("[WebSocket] Cannot send - not connected");
    }
  }

  /**
   * Disconnect from the WebSocket server.
   * Stops automatic reconnection attempts.
   */
  disconnect() {
    console.log("[WebSocket] Disconnecting...");
    this.isIntentionalDisconnect = true;

    // Clear reconnect timer if exists
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Close WebSocket connection
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    // Clear all subscriptions
    this.handlers.clear();
    console.log("[WebSocket] Disconnected and cleaned up");
  }

  /**
   * Check if the WebSocket is currently connected.
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get the current connection state.
   */
  getState(): "CONNECTING" | "OPEN" | "CLOSING" | "CLOSED" | "NONE" {
    if (!this.ws) return "NONE";

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "CONNECTING";
      case WebSocket.OPEN:
        return "OPEN";
      case WebSocket.CLOSING:
        return "CLOSING";
      case WebSocket.CLOSED:
        return "CLOSED";
      default:
        return "NONE";
    }
  }
}

// Export a singleton instance
export const webSocketService = new WebSocketService();

/**
 * Example usage:
 *
 * // Connect to supervisor WebSocket
 * await webSocketService.connect("ws://192.168.1.100:8001", "/api/ws/supervisor");
 *
 * // Subscribe to session updates
 * webSocketService.subscribe("session_update", (data) => {
 *   console.log("Session updated:", data);
 * });
 *
 * // Disconnect when done
 * webSocketService.disconnect();
 */
