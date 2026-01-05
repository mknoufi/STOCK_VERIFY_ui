/**
 * useHaptics Hook
 * React hook for haptic feedback with settings integration
 */

import { useCallback, useMemo } from "react";
import haptics, { appHaptics } from "../utils/haptics";
import { useSettingsStore } from "../store/settingsStore";

interface UseHapticsOptions {
  /** Override the global haptics setting */
  forceEnabled?: boolean;
}

/**
 * Hook that provides haptic feedback functions
 * Respects user's haptic settings preference
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { trigger, app } = useHaptics();
 *
 *   return (
 *     <Button onPress={() => {
 *       trigger.medium();
 *       // or use semantic action:
 *       app.buttonPress();
 *     }}>
 *       Press Me
 *     </Button>
 *   );
 * }
 * ```
 */
export function useHaptics(options: UseHapticsOptions = {}) {
  const { forceEnabled } = options;

  // Get haptics enabled setting from store
  // Default to true if setting doesn't exist
  const hapticsEnabled = useSettingsStore(
    (state) => state.settings.hapticFeedback ?? true,
  );

  const isEnabled = forceEnabled ?? hapticsEnabled;

  // Wrap each haptic function to check if enabled
  const createWrappedHaptic = useCallback(
    (hapticFn: () => void) => {
      return () => {
        if (isEnabled) {
          hapticFn();
        }
      };
    },
    [isEnabled],
  );

  // Memoized wrapped haptics
  const trigger = useMemo(
    () => ({
      light: createWrappedHaptic(haptics.light),
      medium: createWrappedHaptic(haptics.medium),
      heavy: createWrappedHaptic(haptics.heavy),
      selection: createWrappedHaptic(haptics.selection),
      success: createWrappedHaptic(haptics.success),
      warning: createWrappedHaptic(haptics.warning),
      error: createWrappedHaptic(haptics.error),
      rigid: createWrappedHaptic(haptics.rigid),
      soft: createWrappedHaptic(haptics.soft),
    }),
    [createWrappedHaptic],
  );

  // Memoized wrapped app-specific haptics
  const app = useMemo(
    () => ({
      // Navigation
      navigate: createWrappedHaptic(appHaptics.navigate),
      goBack: createWrappedHaptic(appHaptics.goBack),
      openModal: createWrappedHaptic(appHaptics.openModal),
      closeModal: createWrappedHaptic(appHaptics.closeModal),

      // Buttons
      buttonPress: createWrappedHaptic(appHaptics.buttonPress),
      primaryAction: createWrappedHaptic(appHaptics.primaryAction),
      secondaryAction: createWrappedHaptic(appHaptics.secondaryAction),
      dangerAction: createWrappedHaptic(appHaptics.dangerAction),

      // Forms
      inputFocus: createWrappedHaptic(appHaptics.inputFocus),
      formSubmit: createWrappedHaptic(appHaptics.formSubmit),
      formSuccess: createWrappedHaptic(appHaptics.formSuccess),
      formError: createWrappedHaptic(appHaptics.formError),
      validationError: createWrappedHaptic(appHaptics.validationError),

      // Lists & Selection
      itemSelect: createWrappedHaptic(appHaptics.itemSelect),
      tabSwitch: createWrappedHaptic(appHaptics.tabSwitch),
      toggleSwitch: createWrappedHaptic(appHaptics.toggleSwitch),
      checkboxToggle: createWrappedHaptic(appHaptics.checkboxToggle),

      // Scanning
      scanStart: createWrappedHaptic(appHaptics.scanStart),
      scanSuccess: createWrappedHaptic(appHaptics.scanSuccess),
      scanError: createWrappedHaptic(appHaptics.scanError),
      barcodeDetected: createWrappedHaptic(appHaptics.barcodeDetected),

      // Sessions
      sessionCreate: createWrappedHaptic(appHaptics.sessionCreate),
      sessionClose: createWrappedHaptic(appHaptics.sessionClose),
      sessionResume: createWrappedHaptic(appHaptics.sessionResume),

      // Sync
      syncStart: createWrappedHaptic(appHaptics.syncStart),
      syncComplete: createWrappedHaptic(appHaptics.syncComplete),
      syncError: createWrappedHaptic(appHaptics.syncError),

      // Misc
      refresh: createWrappedHaptic(appHaptics.refresh),
      longPress: createWrappedHaptic(appHaptics.longPress),
      swipe: createWrappedHaptic(appHaptics.swipe),
      delete: createWrappedHaptic(appHaptics.delete),
    }),
    [createWrappedHaptic],
  );

  return {
    /** Raw haptic triggers */
    trigger,
    /** Semantic app-specific haptics */
    app,
    /** Whether haptics are currently enabled */
    isEnabled,
  };
}

export default useHaptics;
