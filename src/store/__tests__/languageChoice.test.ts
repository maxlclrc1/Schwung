import { describe, expect, it, jest } from '@jest/globals';
import { usePreferences, type Preferences } from '../preferences';

// The library's own in-memory mock; require() is the documented way to load it in a mock factory.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/* The first-launch language step: shown until a language is chosen on purpose, never again after. */
describe('first-launch language choice', () => {
  const merge = (saved: Partial<Preferences> | undefined) =>
    usePreferences.persist.getOptions().merge!(saved, usePreferences.getState()) as Preferences;

  it('is pending for a new install and for older saves that only followed the phone', () => {
    expect(merge(undefined).languageChosen).toBe(false);
    expect(merge({ language: 'system' }).languageChosen).toBe(false);
  });

  it('counts a language picked earlier (Settings) as chosen', () => {
    expect(merge({ language: 'de' }).languageChosen).toBe(true);
    expect(merge({ language: 'system', languageChosen: true }).languageChosen).toBe(true);
  });

  it('is done once a language is picked or the shown one confirmed, and keeps the choice', () => {
    usePreferences.setState({ language: 'system', languageChosen: false });
    usePreferences.getState().confirmLanguage();
    expect(usePreferences.getState()).toMatchObject({ language: 'system', languageChosen: true });
    usePreferences.setState({ languageChosen: false });
    usePreferences.getState().setLanguage('ja');
    expect(usePreferences.getState()).toMatchObject({ language: 'ja', languageChosen: true });
  });
});
