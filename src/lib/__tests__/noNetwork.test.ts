import { describe, expect, it } from '@jest/globals';
import pkg from '../../../package.json';

// Node built-ins under Jest (the app itself has no Node types).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as {
  readFileSync(file: string, encoding: 'utf8'): string;
  readdirSync(dir: string, o: { withFileTypes: true }): { name: string; isDirectory(): boolean }[];
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as { join(...parts: string[]): string; relative(from: string, to: string): string };

/*
 * Offline-first, checked in the source: the app's code opens no connection of its own and carries no analytics,
 * crash-reporting or ad SDK. The only way anything leaves the phone is what the person chooses: a file they share,
 * an email they write, or a tip through Apple and RevenueCat (react-native-purchases, used only in lib/tips.ts,
 * and started only when Support opens or a tip is unfinished).
 */
const SRC = path.join(process.cwd(), 'src');
const files: string[] = [];
const walk = (dir: string) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name !== '__tests__') walk(p);
    } else if (/\.tsx?$/.test(f.name)) files.push(p);
  }
};
walk(SRC);
const code = (p: string) => fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
const rel = (p: string) => path.relative(SRC, p);

describe('no network code in the app', () => {
  it('opens no connection: no fetch, XMLHttpRequest, WebSocket, EventSource or beacon', () => {
    const hits = files.filter((p) =>
      /\bfetch\s*\(|XMLHttpRequest|new WebSocket|EventSource|sendBeacon|axios/.test(code(p)),
    );
    expect(hits.map(rel)).toEqual([]);
  });

  it('carries no analytics, crash-reporting, attribution or ad SDK', () => {
    const banned =
      /firebase|sentry|bugsnag|crashlytics|amplitude|mixpanel|segment|posthog|datadog|appsflyer|adjust|branch|onesignal|admob|google-mobile-ads|facebook|expo-tracking-transparency|expo-insights|expo-updates/i;
    expect(Object.keys(pkg.dependencies).filter((d) => banned.test(d))).toEqual([]);
    const imports = files.flatMap((p) =>
      [...code(p).matchAll(/from '([^']+)'|require\('([^']+)'\)/g)].map((m) => m[1] ?? m[2]),
    );
    expect(imports.filter((i) => banned.test(i))).toEqual([]);
  });

  it('uses the In-App Purchase SDK in one place only (the tips), and opens only mail and the policy page', () => {
    expect(files.filter((p) => /'react-native-purchases'/.test(code(p))).map(rel)).toEqual(['lib/tips.ts']);
    expect(files.filter((p) => /https?:\/\//.test(code(p))).map(rel)).toEqual([]);
  });

  it('every dependency is a deliberate one', () => {
    expect(Object.keys(pkg.dependencies).sort()).toEqual(
      [
        '@expo/vector-icons',
        '@react-native-async-storage/async-storage',
        'expo',
        'expo-constants',
        'expo-file-system',
        'expo-font',
        'expo-haptics',
        'expo-image',
        'expo-linear-gradient',
        'expo-linking',
        'expo-localization',
        'expo-media-library',
        'expo-notifications',
        'expo-router',
        'expo-sharing',
        'expo-splash-screen',
        'expo-status-bar',
        'expo-system-ui',
        'react',
        'react-native',
        'react-native-gesture-handler',
        'react-native-purchases',
        'react-native-reanimated',
        'react-native-safe-area-context',
        'react-native-screens',
        'react-native-svg',
        'react-native-view-shot',
        'react-native-worklets',
        'zustand',
      ].sort(),
    );
    expect(pkg.dependencies['react-native-purchases']).toMatch(/^\d+\.\d+\.\d+$/); // pinned exactly
  });

  it('RevenueCat is never started at launch except for an unfinished tip, and never with an account or identifiers', () => {
    const tips = code(path.join(SRC, 'lib/tips.ts'));
    expect(tips).toMatch(/appUserID: null/);
    expect(tips).toMatch(/automaticDeviceIdentifierCollectionEnabled: false/);
    expect(tips).toMatch(/diagnosticsEnabled: false/);
    expect(tips).not.toMatch(
      /\.logIn\(|setAttributes|setEmail|setDisplayName|setPhoneNumber|collectDeviceIdentifiers|setAd|setAppsflyer/,
    );
    const layout = code(path.join(SRC, 'app/_layout.tsx'));
    expect(layout).toMatch(/startTips\(\)/); // which only starts RevenueCat for an unfinished tip (tips.test.ts)
  });
});
