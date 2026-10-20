import * as Haptics from 'expo-haptics';

// Haptics are a nicety; never let a failure surface to the user.
const safe = (p: Promise<void>) => void p.catch(() => {});

export const haptic = {
  tap: () => safe(Haptics.selectionAsync()),
  check: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  uncheck: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  heavy: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
