import type { ConfigContext, ExpoConfig } from 'expo/config';

/*
 * app.json holds the configuration; this only separates the internal-testing build (EXPO_PUBLIC_SCHWUNG_CHANNEL
 * = internal, see eas.json and src/lib/flags.ts). It gets its own app identifier, so it installs next to the
 * public app and never shares, reads or overwrites a public install's saved progress. The name stays Schwung.
 * Every other build, including production, uses app.json unchanged.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  if (process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL !== 'internal') return base;
  return {
    ...base,
    ios: { ...base.ios, bundleIdentifier: `${base.ios?.bundleIdentifier}.internal` },
    android: { ...base.android, package: `${base.android?.package}.internal` },
  };
};
