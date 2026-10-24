/*
 * Development feature flags. Every flag is off by default and can never be on in a release build.
 */

/**
 * Habit Science V2 preview for new programs: on in a development build when the Developer switch is on,
 * or when the bundler is started with EXPO_PUBLIC_SCHWUNG_V2_PREVIEW=1. It only decides which onboarding
 * a *new* program uses; a running program always keeps its own version.
 */
export const V2_PREVIEW_FROM_ENV = process.env.EXPO_PUBLIC_SCHWUNG_V2_PREVIEW === '1';

export function v2PreviewEnabled(devSwitch: boolean): boolean {
  return __DEV__ && (devSwitch || V2_PREVIEW_FROM_ENV);
}
