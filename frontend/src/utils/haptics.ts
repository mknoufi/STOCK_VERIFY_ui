/**
 * Haptic Feedback Utility
 * Centralizes haptic feedback to avoid code duplication and ensure consistent behavior
 */
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// Check if haptics are supported (native platforms only)
const isHapticsSupported = Platform.OS !== "web";

/**
 * Trigger success haptic feedback
 */
export const hapticSuccess = () => {
  if (isHapticsSupported) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

/**
 * Trigger warning haptic feedback
 */
export const hapticWarning = () => {
  if (isHapticsSupported) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
};

/**
 * Trigger error haptic feedback
 */
export const hapticError = () => {
  if (isHapticsSupported) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

/**
 * Trigger light impact haptic feedback (for selections)
 */
export const hapticSelection = () => {
  if (isHapticsSupported) {
    Haptics.selectionAsync();
  }
};

/**
 * Trigger light impact haptic feedback
 */
export const hapticLight = () => {
  if (isHapticsSupported) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

/**
 * Trigger medium impact haptic feedback
 */
export const hapticMedium = () => {
  if (isHapticsSupported) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

/**
 * Trigger heavy impact haptic feedback
 */
export const hapticHeavy = () => {
  if (isHapticsSupported) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
};

export default {
  success: hapticSuccess,
  warning: hapticWarning,
  error: hapticError,
  selection: hapticSelection,
  light: hapticLight,
  medium: hapticMedium,
  heavy: hapticHeavy,
};

/**
 * Semantic haptic patterns for common app actions
 * Use these for consistent UX across the app
 */
export const appHaptics = {
  // Navigation
  navigate: hapticLight,
  goBack: hapticLight,
  openModal: hapticMedium,
  closeModal: hapticLight,

  // Buttons
  buttonPress: hapticMedium,
  primaryAction: hapticMedium,
  secondaryAction: hapticLight,
  dangerAction: hapticWarning,

  // Forms
  inputFocus: hapticSelection,
  formSubmit: hapticMedium,
  formSuccess: hapticSuccess,
  formError: hapticError,
  validationError: hapticWarning,

  // Lists & Selection
  itemSelect: hapticSelection,
  tabSwitch: hapticSelection,
  toggleSwitch: hapticLight,
  checkboxToggle: hapticLight,

  // Scanning
  scanStart: hapticMedium,
  scanSuccess: hapticSuccess,
  scanError: hapticError,
  barcodeDetected: hapticMedium,

  // Sessions
  sessionCreate: hapticSuccess,
  sessionClose: hapticMedium,
  sessionResume: hapticLight,

  // Sync
  syncStart: hapticLight,
  syncComplete: hapticSuccess,
  syncError: hapticError,

  // Misc
  refresh: hapticLight,
  longPress: hapticHeavy,
  swipe: hapticLight,
  delete: hapticWarning,
};
