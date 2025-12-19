/**
 * MicroInteractions Service - Aurora Design v2.0
 *
 * Unified haptic feedback and micro-interaction patterns
 * Features:
 * - Consistent haptic patterns
 * - Platform-aware feedback
 * - Interaction presets
 */

import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export type HapticPattern =
  | "tap"
  | "success"
  | "warning"
  | "error"
  | "selection"
  | "toggle"
  | "drag"
  | "drop"
  | "refresh"
  | "notification";

export type HapticIntensity = "light" | "medium" | "heavy";

/**
 * Trigger haptic feedback based on pattern
 */
export const triggerHaptic = async (pattern: HapticPattern): Promise<void> => {
  if (Platform.OS === "web") return;

  try {
    switch (pattern) {
      case "tap":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;

      case "success":
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        break;

      case "warning":
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        );
        break;

      case "error":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;

      case "selection":
        await Haptics.selectionAsync();
        break;

      case "toggle":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;

      case "drag":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;

      case "drop":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;

      case "refresh":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;

      case "notification":
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        break;

      default:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch (error) {
    // Silently fail - haptics are non-critical
    console.debug("Haptic feedback failed:", error);
  }
};

/**
 * Trigger simple impact feedback
 */
export const triggerImpact = async (
  intensity: HapticIntensity = "medium",
): Promise<void> => {
  if (Platform.OS === "web") return;

  const style = {
    light: Haptics.ImpactFeedbackStyle.Light,
    medium: Haptics.ImpactFeedbackStyle.Medium,
    heavy: Haptics.ImpactFeedbackStyle.Heavy,
  }[intensity];

  try {
    await Haptics.impactAsync(style);
  } catch (error) {
    console.debug("Impact feedback failed:", error);
  }
};

/**
 * Trigger selection feedback (for pickers, sliders)
 */
export const triggerSelection = async (): Promise<void> => {
  if (Platform.OS === "web") return;

  try {
    await Haptics.selectionAsync();
  } catch (error) {
    console.debug("Selection feedback failed:", error);
  }
};

/**
 * Trigger notification feedback
 */
export const triggerNotification = async (
  type: "success" | "warning" | "error" = "success",
): Promise<void> => {
  if (Platform.OS === "web") return;

  const feedbackType = {
    success: Haptics.NotificationFeedbackType.Success,
    warning: Haptics.NotificationFeedbackType.Warning,
    error: Haptics.NotificationFeedbackType.Error,
  }[type];

  try {
    await Haptics.notificationAsync(feedbackType);
  } catch (error) {
    console.debug("Notification feedback failed:", error);
  }
};

/**
 * Complex haptic patterns
 */
export const triggerPattern = async (pattern: number[]): Promise<void> => {
  if (Platform.OS === "web") return;

  for (let i = 0; i < pattern.length; i++) {
    const patternValue = pattern[i];
    if (patternValue !== undefined && patternValue > 0) {
      await new Promise((resolve) => setTimeout(resolve, patternValue));
    }
    if (i < pattern.length - 1) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }
};

/**
 * Micro-interaction presets
 */
export const MicroInteractions = {
  // Button interactions
  buttonPress: () => triggerImpact("light"),
  buttonPressHeavy: () => triggerImpact("heavy"),

  // Form interactions
  inputFocus: () => triggerSelection(),
  inputError: () => triggerHaptic("error"),
  formSubmit: () => triggerHaptic("success"),

  // List interactions
  itemSelect: () => triggerSelection(),
  itemDelete: () => triggerHaptic("warning"),
  itemDrag: () => triggerImpact("light"),
  itemDrop: () => triggerImpact("heavy"),

  // Navigation interactions
  tabChange: () => triggerSelection(),
  screenTransition: () => triggerImpact("light"),
  modalOpen: () => triggerImpact("medium"),
  modalClose: () => triggerImpact("light"),

  // Refresh interactions
  pullToRefresh: () => triggerImpact("medium"),
  refreshComplete: () => triggerHaptic("success"),

  // Scan interactions
  scanStart: () => triggerImpact("heavy"),
  scanSuccess: () => triggerHaptic("success"),
  scanError: () => triggerHaptic("error"),

  // Toggle interactions
  toggleOn: () => triggerImpact("medium"),
  toggleOff: () => triggerImpact("light"),

  // Session interactions
  sessionStart: () => triggerHaptic("success"),
  sessionEnd: () => triggerHaptic("notification"),
};

export default MicroInteractions;
