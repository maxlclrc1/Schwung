import { describe, expect, it } from '@jest/globals';
import { isPlaceholder } from '../legal';

describe('legal placeholders', () => {
  it('recognises the placeholder contact, policy URL, bundle ID and product IDs', () => {
    expect(isPlaceholder('hello@example.com')).toBe(true);
    expect(isPlaceholder('https://example.github.io/schwung/privacy')).toBe(true);
    expect(isPlaceholder('com.example.schwung')).toBe(true);
    expect(isPlaceholder('com.example.schwung.tip.small')).toBe(true);
  });

  it('accepts real-looking values', () => {
    expect(isPlaceholder('privacy@schwung-app.com')).toBe(false);
    expect(isPlaceholder('https://someone.github.io/schwung/privacy')).toBe(false);
  });
});
