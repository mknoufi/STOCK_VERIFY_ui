import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "../store/authStore";
import { secureStorage } from "../services/storage/secureStorage";
import { resolveBackendUrl, getBackendURL } from "../services/backendUrl";

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export const useWebSocket = (sessionId?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const isConnectingRef = useRef(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const { isAuthenticated } = useAuthStore();

  const connect = useCallback(async () => {
    if (!isAuthenticated) return;
    if (isConnectingRef.current) return;

    isConnectingRef.current = true;

    try {
      // Close any existing socket before reconnecting
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {
          // ignore
        }
        socketRef.current = null;
      }

      // Tokens are stored in SecureStore (with web fallback)
      const token = await secureStorage.getItem("auth_token");
      if (!token) return;

      // Prefer the resolved backend URL (handles LAN IP changes)
      const baseUrl = await resolveBackendUrl().catch(() => getBackendURL());
      const normalizedBase = baseUrl.replace(/\/$/, "");

      // Convert http:// -> ws:// and https:// -> wss://
      const wsBase = normalizedBase.replace(/^http/i, "ws");
      const wsUrl = `${wsBase}/ws/updates`;
      const urlWithParams = `${wsUrl}${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`;

      console.log("[WebSocket] Connecting to:", wsUrl);

      // Prefer subprotocol auth (avoids leaking tokens in URLs/logs)
      const socket = new WebSocket(urlWithParams, ["jwt", token]);

      socket.onopen = () => {
        console.log("[WebSocket] Connected");
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error("[WebSocket] Error parsing message:", error);
        }
      };

      socket.onclose = (event) => {
        console.log("[WebSocket] Disconnected:", event.reason);
        setIsConnected(false);

        // Reconnect logic
        if (isAuthenticated) {
          console.log("[WebSocket] Attempting to reconnect in 5s...");
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
      };

      socket.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
      };

      socketRef.current = socket;
    } finally {
      isConnectingRef.current = false;
    }
  }, [isAuthenticated, sessionId]);

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const sendMessage = (message: WebSocketMessage) => {
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify(message));
    }
  };

  return { isConnected, lastMessage, sendMessage };
};
