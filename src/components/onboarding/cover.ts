import { makeMutable } from 'react-native-reanimated';

/**
 * The finale's hand-off (Handoff.tsx), on the UI thread: 1 while the finale covers the app, easing to 0 as the
 * app shows through. The finale fades by it, and the Habits page rises the last few points with it.
 */
export const cover = makeMutable(0);
