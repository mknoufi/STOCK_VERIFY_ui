import { useCallback } from "react";
import * as Haptics from "expo-haptics";

export const useHapticFeedback = () => {
  const triggerHaptic = useCallback(
    (
      type:
        | "impactLight"
        | "impactMedium"
        | "impactHeavy"
        | "notificationSuccess"
        | "notificationWarning"
        | "notificationError",
    ) => {
      switch (type) {
        case "impactLight":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "impactMedium":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "impactHeavy":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case "notificationSuccess":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "notificationWarning":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case "notificationError":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    },
    [],
  );

  return { triggerHaptic };
};
