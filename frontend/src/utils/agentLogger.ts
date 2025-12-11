import Constants from "expo-constants";
import { Platform } from "react-native";

const SESSION_ID = "debug-session";
const ENDPOINT_PATH = "/ingest/13e55b07-be61-4baf-aef1-11a4d2bfa0cd";

const getIngestUrl = (): string => {
  const defaultHost = "127.0.0.1";
  let host = defaultHost;

  if (Platform.OS === "web" && typeof window !== "undefined") {
    host = window.location.hostname || defaultHost;
  } else if ((Constants.expoConfig as any)?.hostUri) {
    host = (Constants.expoConfig as any).hostUri.split(":")[0];
  } else if ((Constants as any).manifest2?.extra?.expoClient?.hostUri) {
    host = (Constants as any).manifest2.extra.expoClient.hostUri.split(":")[0];
  } else if (Constants.debuggerHost) {
    host = Constants.debuggerHost.split(":")[0];
  } else if (Platform.OS === "android") {
    // Match backend URL behavior: from Android emulator, route to dev machine
    host = "10.0.2.2";

  return `http://${host}:7242${ENDPOINT_PATH}`;
};

type AgentLogPayload = {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
};

export const sendAgentLog = async (payload: AgentLogPayload) => {
  const url = getIngestUrl();
  const logData = {
    sessionId: SESSION_ID,
    timestamp: Date.now(),
    ...payload,
  };
  
  // Console fallback for debugging
  if (__DEV__) {
    console.log(`[AGENT_LOG] ${payload.message}`, {
      url,
      location: payload.location,
      hypothesisId: payload.hypothesisId,
      data: payload.data,
    });
  }
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logData),
    });
    if (!response.ok && __DEV__) {
      console.warn(`[AGENT_LOG] HTTP ${response.status} for ${url}`);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn(`[AGENT_LOG] Failed to send log to ${url}:`, error);
    }
    // Swallow errors to avoid impacting user flow
  }
};
