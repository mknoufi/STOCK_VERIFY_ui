import { useEffect, useRef } from "react";
import { AppState, Alert } from "react-native";
import { useAuthStore } from "../store/authStore";
import { useRouter } from "expo-router";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIMEOUT = 28 * 60 * 1000; // 28 minutes (2 min warning)

export const useAutoLogout = (enabled: boolean = true) => {
  const { logout, user } = useAuthStore();
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = () => {
    if (!enabled || !user) return;

    lastActivityRef.current = Date.now();

    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Set warning timer (2 minutes before logout)
    warningTimeoutRef.current = setTimeout(() => {
      Alert.alert(
        "Session Expiring",
        "Your session will expire in 2 minutes due to inactivity. Tap OK to continue.",
        [
          {
            text: "OK",
            onPress: () => resetTimer(),
          },
        ],
        { cancelable: false },
      );
    }, WARNING_TIMEOUT);

    // Set auto logout timer
    timeoutRef.current = setTimeout(() => {
      Alert.alert(
        "Session Expired",
        "You have been logged out due to inactivity.",
        [
          {
            text: "OK",
            onPress: () => {
              logout();
              router.replace("/");
            },
          },
        ],
        { cancelable: false },
      );
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    if (!enabled || !user) return;

    // Start timer
    resetTimer();

    // Track app state changes
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        // Check if timeout exceeded while app was in background
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed > INACTIVITY_TIMEOUT) {
          logout();
          router.replace("/");
        } else {
          resetTimer();
        }
      }
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      subscription.remove();
    };
  }, [enabled, user]);

  return { resetTimer };
};
