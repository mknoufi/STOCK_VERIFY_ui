import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { syncQueue } from "./syncQueue";

const BACKGROUND_SYNC_TASK = "BACKGROUND_SYNC_TASK";

/**
 * Define the background task.
 */
if (Platform.OS !== "web" && TaskManager?.defineTask) {
  TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try {
      console.log("Background sync task started");
      const result = await syncQueue.performFullSync();
      console.log("Background sync task completed:", result);

      return result.pushed > 0 || result.pulled > 0
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (error) {
      console.error("Background sync task failed:", error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

/**
 * Register the background sync task.
 */
export const registerBackgroundSync = async () => {
  if (Platform.OS === "web" || !TaskManager?.isTaskRegisteredAsync) {
    console.log("Background sync is not supported on web");
    return;
  }

  // Expo Go does not support Background Fetch / TaskManager execution.
  // Avoid surfacing this as a fatal runtime error on physical devices.
  if (Constants.appOwnership === "expo") {
    console.log("Background sync registration skipped in Expo Go");
    return;
  }

  try {
    // On some iOS configurations (especially on physical devices), background fetch may not be enabled
    // even if the module is installed. Avoid surfacing this as a fatal runtime error.
    try {
      const fetchStatus = await BackgroundFetch.getStatusAsync();
      if (fetchStatus !== BackgroundFetch.BackgroundFetchStatus.Available) {
        console.log("Background fetch not available; skipping background sync registration", {
          status: fetchStatus,
        });
        return;
      }
    } catch {
      // If status can't be determined, fall through and attempt registration.
    }

    const isRegistered =
      await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      console.log("Background sync task already registered");
      return;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log("Background sync task registered");
  } catch (error) {
    console.error("Failed to register background sync task:", error);
  }
};

/**
 * Unregister the background sync task.
 */
export const unregisterBackgroundSync = async () => {
  if (Platform.OS === "web" || !BackgroundFetch?.unregisterTaskAsync) return;

  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log("Background sync task unregistered");
  } catch (error) {
    console.error("Failed to unregister background sync task:", error);
  }
};
