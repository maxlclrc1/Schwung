import { CONTACT_EMAIL, PRIVACY_URL } from './constants';
import { channel } from './flags';
import { LEGAL_READY } from '../core/legal';

/** A placeholder address or URL (example.com, example.github.io…), never shown to people using the App Store app. */
export function isPlaceholder(value: string): boolean {
  return /(^|[@./])example\./i.test(value);
}

/** Unfinished legal content shows in development and internal builds only. */
function visible(ready: boolean): boolean {
  return ready || channel() !== 'production';
}

/** What Settings may show in this build. */
export const legalVisible = {
  terms: () => visible(LEGAL_READY.terms),
  privacyPolicy: () => visible(!isPlaceholder(PRIVACY_URL)),
  contact: () => visible(!isPlaceholder(CONTACT_EMAIL)),
};
