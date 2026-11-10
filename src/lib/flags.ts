/*
 * The build channel, chosen when a build is made with EXPO_PUBLIC_SCHWUNG_CHANNEL (see eas.json and README). Every
 * channel is the same app, the Life Reset; the channel only decides the developer tools and, in Expo Go, which save
 * is used.
 *
 * - development: `npx expo start` without a channel. The Life Reset's developer clock (time travel) is available.
 * - internal: builds for testers. No developer tools.
 * - production: the App Store release. No developer tools. The default for every release build.
 */
export type Channel = 'development' | 'internal' | 'production';

/** Developer tools need both the development channel and a development build, so a release build never has them. */
export function resolveChannel(raw: string | undefined, dev: boolean): Channel {
  if (raw === 'internal' || raw === 'production') return raw;
  return dev ? 'development' : 'production';
}

const CHANNEL = resolveChannel(process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL, __DEV__);

export function channel(): Channel {
  return CHANNEL;
}

/** Developer tools: the Life Reset's clock (time travel). */
export function devTools(): boolean {
  return __DEV__ && channel() === 'development';
}

/**
 * Minimum Effort (docs/MINIMUM_EFFORT_SPEC.md): whether "Did the minimum" is offered. Off for normal users (the
 * production channel) until its safety wording is reviewed and the full integration is verified on device; on for
 * development and internal (tester) builds. Turning it on for everyone is this one line. A minimum already saved
 * (from a tester build, or a restored backup) is shown and counted whatever this says; only recording is gated.
 */
export const MINIMUM_EFFORT_LAUNCHED = false;
export function minimumEffort(ch: Channel = channel()): boolean {
  return MINIMUM_EFFORT_LAUNCHED || ch !== 'production';
}
