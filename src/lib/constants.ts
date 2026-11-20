import release from '../../release.config.json';

/*
 * The publisher's details, from release.config.json (the one place to change them; the app may be renamed).
 * Placeholders (example.com, com.example…) are never shown in App Store builds (lib/legal.ts), and
 * `npm run release:check` refuses a production build while any remain.
 */
export const APP_NAME = release.appName;
export const CONTACT_EMAIL = release.supportEmail;
export const PRIVACY_URL = release.privacyPolicyUrl;
export const SUPPORT_URL = release.supportUrl;
/** The three voluntary tips (consumable In-App Purchases), smallest first. */
export const TIP_PRODUCTS = release.tipProducts;
