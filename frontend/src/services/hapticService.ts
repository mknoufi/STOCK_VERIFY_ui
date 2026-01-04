/**
 * Haptic Feedback Service
 * Provides haptic feedback for scanner and other UI interactions
 */
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { SCANNER_CONFIG } from "../config/scannerConfig";

/**
 * Haptic feedback intensity levels
 */
export type HapticIntensity = "light" | "medium" | "heavy";

/**
 * Haptic feedback patterns
 */
export type HapticPattern =
  | "success"
  | "error"
  | "warning"
  | "selection"
  | "impact";

/**
 * Haptic Service for providing tactile feedback
 */
export class HapticService {
  private enabled: boolean = SCANNER_CONFIG.haptics.enabled;
  private isSupported: boolean =
    Platform.OS === "ios" || Platform.OS === "android";

  /**
   * Enable haptic feedback
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable haptic feedback
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Check if haptics are enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.isSupported;
  }

  /**
   * Trigger selection feedback (light tap)
   */
  async selection(): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      await Haptics.selectionAsync();
    } catch (error) {
      __DEV__ && console.warn("Haptic selection failed:", error);
    }
  }

  /**
   * Trigger impact feedback with intensity
   */
  async impact(intensity: HapticIntensity = "medium"): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const style = this.getImpactStyle(intensity);
      await Haptics.impactAsync(style);
    } catch (error) {
      __DEV__ && console.warn("Haptic impact failed:", error);
    }
  }

  /**
   * Trigger notification feedback
   */
  async notification(type: "success" | "warning" | "error"): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const notificationType = this.getNotificationType(type);
      await Haptics.notificationAsync(notificationType);
    } catch (error) {
      __DEV__ && console.warn("Haptic notification failed:", error);
    }
  }

  /**
   * Success feedback - for successful scan
   */
  async success(): Promise<void> {
    await this.notification("success");
  }

  /**
   * Error feedback - for failed scan
   */
  async error(): Promise<void> {
    await this.notification("error");
  }

  /**
   * Warning feedback - for warnings
   */
  async warning(): Promise<void> {
    await this.notification("warning");
  }

  /**
   * Scan success feedback - optimized for barcode scanning
   */
  async scanSuccess(): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const intensity = SCANNER_CONFIG.haptics.successIntensity;
      const style = this.getImpactStyle(intensity);

      // Double tap for success confirmation
      await Haptics.impactAsync(style);
      setTimeout(async () => {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }, 100);
    } catch (error) {
      __DEV__ && console.warn("Scan success haptic failed:", error);
    }
  }

  /**
   * Scan error feedback - optimized for barcode scanning
   */
  async scanError(): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const intensity = SCANNER_CONFIG.haptics.errorIntensity;
      const style = this.getImpactStyle(intensity);

      // Single impact for error
      await Haptics.impactAsync(style);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      __DEV__ && console.warn("Scan error haptic failed:", error);
    }
  }

  /**
   * Custom pattern feedback
   */
  async pattern(pattern: HapticPattern): Promise<void> {
    if (!this.isEnabled()) return;

    switch (pattern) {
      case "success":
        await this.success();
        break;
      case "error":
        await this.error();
        break;
      case "warning":
        await this.warning();
        break;
      case "selection":
        await this.selection();
        break;
      case "impact":
        await this.impact("medium");
        break;
    }
  }

  /**
   * Vibrate pattern (for Android compatibility)
   */
  async vibrate(_pattern: number[] = [0, 100]): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      // On iOS, use impact. On Android, use notification.
      if (Platform.OS === "ios") {
        await this.impact("medium");
      } else {
        await this.notification("success");
      }
    } catch (error) {
      __DEV__ && console.warn("Vibrate failed:", error);
    }
  }

  /**
   * Get impact style from intensity
   */
  private getImpactStyle(
    intensity: HapticIntensity,
  ): Haptics.ImpactFeedbackStyle {
    switch (intensity) {
      case "light":
        return Haptics.ImpactFeedbackStyle.Light;
      case "heavy":
        return Haptics.ImpactFeedbackStyle.Heavy;
      case "medium":
      default:
        return Haptics.ImpactFeedbackStyle.Medium;
    }
  }

  /**
   * Get notification type
   */
  private getNotificationType(
    type: "success" | "warning" | "error",
  ): Haptics.NotificationFeedbackType {
    switch (type) {
      case "success":
        return Haptics.NotificationFeedbackType.Success;
      case "warning":
        return Haptics.NotificationFeedbackType.Warning;
      case "error":
        return Haptics.NotificationFeedbackType.Error;
    }
  }
}

// Singleton instance
export const hapticService = new HapticService();

// Convenience exports
export const {
  selection,
  impact,
  notification,
  success,
  error,
  warning,
  scanSuccess,
  scanError,
  scanHaptics,
} = {
  selection: () => hapticService.selection(),
  impact: (intensity?: HapticIntensity) => hapticService.impact(intensity),
  notification: (type: "success" | "warning" | "error") =>
    hapticService.notification(type),
  success: () => hapticService.success(),
  error: () => hapticService.error(),
  warning: () => hapticService.warning(),
  scanSuccess: () => hapticService.scanSuccess(),
  scanError: () => hapticService.scanError(),
  scanHaptics: () => hapticService.scanSuccess(),
};

export default hapticService;
