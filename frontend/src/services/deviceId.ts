import * as Crypto from "expo-crypto";
import { secureStorage } from "./storage/secureStorage";
import { createLogger } from "./logging";

const log = createLogger("deviceId");
const DEVICE_ID_KEY = "device_id";

/**
 * Retrieves the persistent Device ID for this installation.
 * Generates a new UUID if one does not exist.
 */
export const getDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await secureStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      deviceId = Crypto.randomUUID();
      await secureStorage.setItem(DEVICE_ID_KEY, deviceId);
      log.info("Generated new Device ID", { deviceId });
    }

    return deviceId;
  } catch (error) {
    log.error("Failed to retrieve/generate Device ID", { error });
    // Fallback to a temporary ID if storage fails, to allow the app to function
    return Crypto.randomUUID();
  }
};
