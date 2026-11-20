import { describe, expect, it } from '@jest/globals';
import appJson from '../../../app.json';
import resolve from '../../../app.config';
import eas from '../../../eas.json';
import release from '../../../release.config.json';
import { MINIMUM_EFFORT_LAUNCHED } from '../flags';

// Node built-ins under Jest (the app itself has no Node types).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as {
  readFileSync(file: string, encoding: 'utf8'): string;
  readdirSync(dir: string, o: { withFileTypes: true }): { name: string; isDirectory(): boolean }[];
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as { join(...parts: string[]): string; relative(from: string, to: string): string };

/*
 * The shipped configuration stays local-first: no remote push, no arbitrary network loads, no photo reading, no
 * tracking, no secrets in the build profiles, and In-App Purchase as the only addition (the voluntary tips). The
 * App Store identity lives only in release.config.json. A change here should be a deliberate one.
 */
const app = resolve({ config: appJson.expo } as never) as typeof appJson.expo & {
  name: string;
  ios: typeof appJson.expo.ios & { bundleIdentifier: string };
  android: typeof appJson.expo.android & { package: string };
};
const name = (p: unknown) => (Array.isArray(p) ? p[0] : p) as string;
const plugin = (n: string) => app.plugins.find((p) => name(p) === n) as [string, Record<string, unknown>] | undefined;

describe('app configuration', () => {
  it('takes its name, bundle ID and package from release.config.json, and nowhere else', () => {
    expect(app.name).toBe(release.appName);
    expect(app.ios.bundleIdentifier).toBe(release.bundleIdentifier);
    expect(app.android.package).toBe(release.androidPackage);
    const raw = appJson.expo as Record<string, unknown>;
    expect(raw.name).toBeUndefined();
    expect((raw.ios as Record<string, unknown>).bundleIdentifier).toBeUndefined();
    expect((raw.android as Record<string, unknown>).package).toBeUndefined();
    expect(plugin('expo-media-library')?.[1].savePhotosPermission).toContain(release.appName);
  });

  it('gives the internal-testing build its own identifiers, so it never touches a public install’s saves', () => {
    const before = process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL;
    try {
      process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL = 'internal';
      const internal = resolve({ config: appJson.expo } as never);
      expect(internal.ios?.bundleIdentifier).toBe(`${release.bundleIdentifier}.internal`);
      expect(internal.android?.package).toBe(`${release.androidPackage}.internal`);
      expect(internal.name).toBe(release.appName);
      process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL = 'production';
      expect(resolve({ config: appJson.expo } as never).ios?.bundleIdentifier).toBe(release.bundleIdentifier);
    } finally {
      process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL = before;
    }
  });

  it('has exactly the plugins it needs; In-App Purchase is the only commerce, with no alternative billing', () => {
    expect(app.plugins.map(name)).toEqual([
      'expo-router',
      'expo-sharing',
      'expo-font',
      'expo-localization',
      'expo-splash-screen',
      'expo-status-bar',
      'expo-notifications',
      'expo-media-library',
      'expo-iap',
    ]);
    expect(app.plugins.find((p) => name(p) === 'expo-iap')).toBe('expo-iap'); // no options: no alternative billing
  });

  it('asks iOS for nothing beyond adding the story image to Photos, and never for remote push', () => {
    const usage = Object.keys(app.ios.infoPlist).filter((k) => k.endsWith('UsageDescription'));
    expect(usage).toEqual([]);
    expect(plugin('expo-media-library')?.[1]).toMatchObject({
      photosPermission: false,
      isAccessMediaLocationEnabled: false,
    });
    expect(plugin('expo-notifications')?.[1]).toMatchObject({ enableRemoteNotifications: false });
    expect(app.ios.infoPlist.ITSAppUsesNonExemptEncryption).toBe(false);
    expect(JSON.stringify(app)).not.toMatch(/aps-environment|UIBackgroundModes|NSUserTrackingUsageDescription/);
  });

  it('allows no plain-HTTP loads (only the local network a development build uses)', () => {
    expect(app.ios.infoPlist.NSAppTransportSecurity).toEqual({
      NSAllowsArbitraryLoads: false,
      NSAllowsLocalNetworking: true,
    });
  });

  it('declares no tracking and no collected data', () => {
    const m = app.ios.privacyManifests;
    expect(m.NSPrivacyTracking).toBe(false);
    expect(m.NSPrivacyTrackingDomains).toEqual([]);
    expect(m.NSPrivacyCollectedDataTypes).toEqual([]);
  });

  it('build profiles carry only the channel, never a secret', () => {
    for (const profile of Object.values(eas.build))
      expect(Object.keys(profile.env)).toEqual(['EXPO_PUBLIC_SCHWUNG_CHANNEL']);
  });

  it('keeps Minimum Effort off for the App Store', () => {
    expect(MINIMUM_EFFORT_LAUNCHED).toBe(false);
  });

  it('release.config.json holds exactly the publisher’s values', () => {
    expect(Object.keys(release).sort()).toEqual(
      [
        'androidPackage',
        'appName',
        'bundleIdentifier',
        'privacyPolicyUrl',
        'supportEmail',
        'supportUrl',
        'tipProducts',
      ].sort(),
    );
    expect(Object.keys(release.tipProducts)).toEqual(['small', 'medium', 'large']);
    expect(new Set(Object.values(release.tipProducts)).size).toBe(3);
  });

  it('the app’s code names the identity only through lib/constants (so a rename is one file)', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) {
          if (!['__tests__', 'locales'].includes(f.name)) walk(p);
        } else if (/\.tsx?$/.test(f.name)) {
          const code = fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''); // comments may mention them
          if (/example\.com|com\.example|example\.github\.io/.test(code)) offenders.push(p);
        }
      }
    };
    walk(path.join(process.cwd(), 'src'));
    expect(offenders).toEqual([]);
  });
});
