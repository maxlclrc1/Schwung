import { requireOptionalNativeModule } from 'expo';

/**
 * Development-only native check of iOS haptics (modules/schwung-haptics-diagnostic/ios). Null where the module
 * isn't compiled in: Expo Go, the web, Android, or a development build made before it was added.
 */
export type HapticsDiagnostic = {
  nativeHeavy(): Promise<{ reachedUIKit: boolean; mainThread: boolean }>;
  coreHapticsHeavy(): Promise<{ played: boolean; error?: string }>;
  environment(): Promise<Record<string, string | boolean>>;
};

export const hapticsDiagnostic = requireOptionalNativeModule<HapticsDiagnostic>('SchwungHapticsDiagnostic');
