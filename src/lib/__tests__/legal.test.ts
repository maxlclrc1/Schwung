import { describe, expect, it } from '@jest/globals';
import { isPlaceholder } from '../legal';
import { CONTACT_EMAIL, PRIVACY_URL } from '../constants';

describe('legal placeholders', () => {
  it('recognises the placeholder contact and policy URL', () => {
    expect(isPlaceholder(CONTACT_EMAIL)).toBe(true);
    expect(isPlaceholder(PRIVACY_URL)).toBe(true);
    expect(isPlaceholder('hello@example.com')).toBe(true);
  });

  it('accepts real-looking values', () => {
    expect(isPlaceholder('privacy@schwung-app.com')).toBe(false);
    expect(isPlaceholder('https://someone.github.io/schwung/privacy')).toBe(false);
  });
});
