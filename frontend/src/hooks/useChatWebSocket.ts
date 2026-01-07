import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../services/httpClient";
import { storage } from "../services/storage/asyncStorageService";
import { useAuthStore } from "../store/authStore";

type ChatEvent =
  | {
      type: "connected";
      conversation_id: string;
      user: { username?: string; role?: string };
    }
  | {
      type: "assistant_start";
      conversation_id: string;
      message_id: string;
    }
  | {
      type: "text_delta";
      conversation_id: string;
      message_id: string;
      content: string;
    }
  | {
      type: "assistant_end";
      conversation_id: string;
      message_id: string;
    }
  | { type: "error"; error: string; detail?: string };

export const useChatWebSocket = (initialConversationId?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  );
  const [lastEvent, setLastEvent] = useState<ChatEvent | null>(null);
  const [assistantText, setAssistantText] = useState<string>("");

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isAuthenticated } = useAuthStore();

  const connect = useCallback(async () => {
    if (!isAuthenticated) return;

    const token = await storage.get<string>("auth_token");
    if (!token) return;

    const wsBase = API_BASE_URL.replace(/^http/, "ws");
    const wsUrl = wsBase + "/api/chat/ws";

    const params = new URLSearchParams({ token });
    if (conversationId) params.set("conversation_id", conversationId);

    const socket = new WebSocket(`${wsUrl}?${params.toString()}`);

    socket.onopen = () => {
      setIsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as ChatEvent;
        setLastEvent(parsed);

        if (parsed.type === "connected") {
          setConversationId(parsed.conversation_id);
        }

        if (parsed.type === "assistant_start") {
          setAssistantText("");
        }

        if (parsed.type === "text_delta") {
          setAssistantText((prev) => prev + parsed.content);
        }
      } catch {
        // ignore non-JSON
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      if (isAuthenticated) {
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      }
    };

    socketRef.current = socket;
  }, [conversationId, isAuthenticated]);

  useEffect(() => {
    connect();

    return () => {
      socketRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const sendUserMessage = (content: string) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.send(JSON.stringify({ type: "user_message", content }));
  };

  return {
    isConnected,
    conversationId,
    lastEvent,
    assistantText,
    sendUserMessage,
  };
};
