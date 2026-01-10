/**
 * Notification Service - User notifications and alerts
 * Handles in-app notifications, badges, and alerts
 */

import { Platform } from "react-native";
import Notifications, { NotificationTriggerInput } from "expo-notifications";
import { errorReporter } from "./errorRecovery";

export interface NotificationOptions {
  title: string;
  body: string;
  data?: any;
  sound?: boolean;
  priority?: "default" | "high" | "max";
  badge?: number;
}

/**
 * Notification Service
 */
export class NotificationService {
  private static initialized = false;

  /**
   * Initialize notifications
   */
  static async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Request permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        __DEV__ && console.warn("Notification permissions not granted");
        return;
      }

      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      this.initialized = true;
    } catch (error) {
      errorReporter.report(error, "NotificationService.initialize");
    }
  }

  /**
   * Show local notification
   */
  static async showNotification(options: NotificationOptions) {
    try {
      await this.initialize();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: options.title,
          body: options.body,
          data: options.data,
          sound: options.sound !== false,
          badge: options.badge,
          priority: options.priority || "default",
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      errorReporter.report(error, "NotificationService.showNotification");
    }
  }

  /**
   * Schedule notification
   */
  static async scheduleNotification(
    options: NotificationOptions,
    trigger: Date | { seconds: number },
  ) {
    try {
      await this.initialize();

      const triggerValue = (
        trigger instanceof Date
          ? { type: "date", date: trigger }
          : { type: "timeInterval", seconds: trigger.seconds }
      ) as NotificationTriggerInput;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: options.title,
          body: options.body,
          data: options.data,
          sound: options.sound !== false,
        },
        trigger: triggerValue,
      });
    } catch (error) {
      errorReporter.report(error, "NotificationService.scheduleNotification");
    }
  }

  /**
   * Cancel notification
   */
  static async cancelNotification(notificationId: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      errorReporter.report(error, "NotificationService.cancelNotification");
    }
  }

  /**
   * Cancel all notifications
   */
  static async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      errorReporter.report(error, "NotificationService.cancelAllNotifications");
    }
  }

  /**
   * Set badge count
   */
  static async setBadgeCount(count: number) {
    try {
      if (Platform.OS === "ios") {
        await Notifications.setBadgeCountAsync(count);
      }
    } catch (error) {
      errorReporter.report(error, "NotificationService.setBadgeCount");
    }
  }

  /**
   * Clear badge
   */
  static async clearBadge() {
    await this.setBadgeCount(0);
  }
}

/**
 * Quick notifications
 */
export const notify = {
  success: (message: string) => {
    NotificationService.showNotification({
      title: "Success",
      body: message,
      priority: "default",
    });
  },

  error: (message: string) => {
    NotificationService.showNotification({
      title: "Error",
      body: message,
      priority: "high",
    });
  },

  info: (message: string) => {
    NotificationService.showNotification({
      title: "Info",
      body: message,
      priority: "default",
    });
  },

  warning: (message: string) => {
    NotificationService.showNotification({
      title: "Warning",
      body: message,
      priority: "default",
    });
  },

  syncComplete: (success: number, failed: number) => {
    NotificationService.showNotification({
      title: "Sync Complete",
      body: `Synced ${success} items${failed > 0 ? `, ${failed} failed` : ""}`,
      priority: "default",
    });
  },

  // Inventory-specific notifications
  expiryAlert: (count: number, days: number = 30) => {
    NotificationService.showNotification({
      title: "⚠️ Expiry Alert",
      body: `${count} items expiring within ${days} days`,
      priority: "high",
      data: { type: "expiry_alert", count, days },
    });
  },

  lowStockAlert: (count: number, threshold: number = 10) => {
    NotificationService.showNotification({
      title: "📦 Low Stock Alert",
      body: `${count} items below ${threshold} units`,
      priority: "high",
      data: { type: "low_stock_alert", count, threshold },
    });
  },

  criticalExpiry: (itemName: string, daysLeft: number) => {
    NotificationService.showNotification({
      title: "🚨 Critical Expiry",
      body: `${itemName} expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}!`,
      priority: "max",
      data: { type: "critical_expiry", itemName, daysLeft },
    });
  },

  syncStarted: () => {
    NotificationService.showNotification({
      title: "🔄 Sync Started",
      body: "ERP inventory sync in progress...",
      priority: "default",
    });
  },

  syncFailed: (error?: string) => {
    NotificationService.showNotification({
      title: "❌ Sync Failed",
      body: error || "ERP sync encountered an error",
      priority: "high",
    });
  },
};
