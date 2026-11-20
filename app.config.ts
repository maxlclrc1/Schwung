import type { ConfigContext, ExpoConfig } from 'expo/config';
import release from './release.config.json';

/*
 * app.json holds the configuration. The App Store identity comes from release.config.json, the one place to change
 * it (the app may be renamed): the name, bundle ID, Android package and the Photos prompt that names the app.
 * `npm run release:check` refuses a production build while any value there is a placeholder.
 *
 * The internal-testing build (EXPO_PUBLIC_SCHWUNG_CHANNEL = internal, see eas.json and src/lib/flags.ts) gets its
 * own app identifier, so it installs next to the public app and never shares, reads or overwrites a public
 * install's saved progress. Its name stays the app's name. Every other build, including production, uses the
 * identifiers as they are.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  const suffix = process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL === 'internal' ? '.internal' : '';
  return {
    ...base,
    name: release.appName,
    slug: base.slug ?? 'schwung',
    ios: { ...base.ios, bundleIdentifier: `${release.bundleIdentifier}${suffix}` },
    android: { ...base.android, package: `${release.androidPackage}${suffix}` },
    plugins: (base.plugins ?? []).map((p) =>
      Array.isArray(p) && p[0] === 'expo-media-library'
        ? [
            p[0],
            {
              ...p[1],
              savePhotosPermission: `${release.appName} saves your 66-day story to your photos only when you ask it to.`,
            },
          ]
        : p,
    ),
  };
};
