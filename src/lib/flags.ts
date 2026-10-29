/*
 * The build channel: one setting that decides what a build offers, chosen when it's built with
 * EXPO_PUBLIC_SCHWUNG_CHANNEL (see eas.json and README).
 *
 * - development: `npx expo start` without a channel. New programs use the personalised plan (V2); Settings has
 *   the Developer tools (time travel, test sessions, Exercise Preview).
 * - internal: builds for testers. New programs use V2; no developer tools anywhere.
 * - production: the public release. New programs use V1, exactly as before. The default for every release build.
 *
 * A running program always keeps its own version, whatever the channel: nothing ever converts one.
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

/**
 * The release decision for the public app: false keeps production on V1, exactly as it is. Flipping it is a
 * deliberate release step, not a switch on its own: see SCHWUNG_LIFE_RESET_PROGRAM.md ("Releasing the Life Reset to
 * production") for the other places that must change with it.
 */
export const LIFE_RESET_IN_PRODUCTION = false;

/**
 * Whether new programs are Life Reset programs: the default experience in development and internal builds. A
 * running V1/V2 program is never converted; it stays the one shown until its owner chooses to switch.
 */
export function lifeResetForNewPrograms(ch: Channel = channel()): boolean {
  return ch !== 'production' || LIFE_RESET_IN_PRODUCTION;
}

/** Whether a new V1/V2 program starts with the personalised V2 onboarding (V1 otherwise). */
export function v2ForNewPrograms(): boolean {
  return channel() !== 'production';
}

/** Developer tools: time travel, synthetic test habits, the Exercise Preview. */
export function devTools(): boolean {
  return __DEV__ && channel() === 'development';
}

/**
 * Where the program is saved. Release builds always use the one key, so an update never loses progress. In
 * Expo Go, where every channel runs inside the same app, the internal channel keeps its own save: trying it
 * never touches the progress saved by the development channel, and vice versa.
 */
export function storageKey(ch: Channel = channel(), dev: boolean = __DEV__): string {
  return dev && ch === 'internal' ? 'schwung-state-internal' : 'schwung-state';
}

/**
 * The three-tab layout (Habits, Journey, Field Notes). Development and internal-testing builds only: the public
 * release keeps its single Today screen with the journey as a sheet, exactly as before.
 */
export function tabs(ch: Channel = channel()): boolean {
  return ch !== 'production';
}
