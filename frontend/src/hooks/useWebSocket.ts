import { useEffect, useRef, useState, useCallback } from "react";
import { API_BASE_URL } from "../services/httpClient";
import { useAuthStore } from "../store/authStore";
import { storage } from "../services/storage/asyncStorageService";

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export const useWebSocket = (sessionId?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const { isAuthenticated } = useAuthStore();

  const connect = useCallback(async () => {
    if (!isAuthenticated) return;

    // Get token from storage (assuming it's stored there)
    const token = await storage.get<string>("auth_token");
    if (!token) return;

    // Convert http:// to ws:// or https:// to wss://
    const wsUrl = API_BASE_URL.replace(/^http/, "ws") + "/ws/updates";
    const urlWithParams = `${wsUrl}?token=${token}${sessionId ? `&session_id=${sessionId}` : ""}`;

    console.log("[WebSocket] Connecting to:", wsUrl);

    const socket = new WebSocket(urlWithParams);

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
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      }
    };

    socket.onerror = (error) => {
      console.error("[WebSocket] Error:", error);
    };

    socketRef.current = socket;
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
