import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { flags } from '../constants/flags';

const canHaptic = () => flags.enableHaptics && Platform.OS !== 'web';

export const haptics = {
  success: async () => {
    if (!canHaptic()) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
  },
  warning: async () => {
    if (!canHaptic()) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
  },
  error: async () => {
    if (!canHaptic()) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
  },
  light: async () => {
    if (!canHaptic()) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  },
  medium: async () => {
    if (!canHaptic()) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  },
  heavy: async () => {
    if (!canHaptic()) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
  },
  selection: async () => {
    if (!canHaptic()) return;
    try {
      await Haptics.selectionAsync();
    } catch {}
  },
};
