import { describe, expect, it } from '@jest/globals';
import app from '../../../app.json';
import eas from '../../../eas.json';

/*
 * The shipped configuration stays local-only: no remote push, no arbitrary network loads, no photo reading,
 * no tracking, and no secrets in the build profiles. A change here should be a deliberate one.
 */
const plugin = (name: string) =>
  app.expo.plugins.find((p) => (Array.isArray(p) ? p[0] : p) === name) as [string, Record<string, unknown>] | undefined;

describe('app configuration', () => {
  it('asks iOS for nothing beyond adding the story image to Photos', () => {
    const usage = Object.keys(app.expo.ios.infoPlist).filter((k) => k.endsWith('UsageDescription'));
    expect(usage).toEqual([]);
    expect(plugin('expo-media-library')?.[1]).toMatchObject({
      photosPermission: false,
      isAccessMediaLocationEnabled: false,
    });
    expect(plugin('expo-notifications')?.[1]).toMatchObject({ enableRemoteNotifications: false });
    expect(app.expo.ios.infoPlist.ITSAppUsesNonExemptEncryption).toBe(false);
  });

  it('allows no plain-HTTP loads (only the local network a development build uses)', () => {
    expect(app.expo.ios.infoPlist.NSAppTransportSecurity).toEqual({
      NSAllowsArbitraryLoads: false,
      NSAllowsLocalNetworking: true,
    });
  });

  it('declares no tracking and no collected data', () => {
    const m = app.expo.ios.privacyManifests;
    expect(m.NSPrivacyTracking).toBe(false);
    expect(m.NSPrivacyTrackingDomains).toEqual([]);
    expect(m.NSPrivacyCollectedDataTypes).toEqual([]);
  });

  it('build profiles carry only the channel, never a secret', () => {
    for (const profile of Object.values(eas.build))
      expect(Object.keys(profile.env)).toEqual(['EXPO_PUBLIC_SCHWUNG_CHANNEL']);
  });
});
