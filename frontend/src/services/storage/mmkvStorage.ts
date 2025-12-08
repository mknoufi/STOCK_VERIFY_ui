import { flags } from "../../constants/flags";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

let mmkvInstance: any | null = null;

async function getMMKV() {
  // MMKV is a native module and doesn't work on web or Expo Go
  // NitroModules (required by MMKV) are not supported in Expo Go
  const isExpoGo = Constants.executionEnvironment === "storeClient";
  if (!flags.enableMMKV || Platform.OS === "web" || isExpoGo) return null;
  try {
    if (!mmkvInstance) {
      const mod = await import("react-native-mmkv");
      const { MMKV } = mod;
      mmkvInstance = new MMKV();
    }
    return mmkvInstance;
  } catch {
    __DEV__ &&
      console.warn("[MMKV] module not available, falling back to AsyncStorage");
    return null;
  }
}

export const mmkvStorage = {
  async getItem(key: string): Promise<string | null> {
    const mmkv = await getMMKV();
    if (mmkv) {
      const v = mmkv.getString(key);
      return v == null ? null : v;
    }
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    const mmkv = await getMMKV();
    if (mmkv) {
      mmkv.set(key, value);
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    const mmkv = await getMMKV();
    if (mmkv) {
      mmkv.delete(key);
      return;
    }
    return AsyncStorage.removeItem(key);
  },
};
