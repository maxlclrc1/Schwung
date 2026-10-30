import { I18nManager, Platform } from 'react-native';
import { LANGUAGES, type LanguageCode } from './languages';

/*
 * Layout direction for right-to-left languages (Arabic, Urdu). Words change at once; the layout's direction is
 * native and fixed for a launch (React Native reads it when the app starts), so after switching between a
 * right-to-left and a left-to-right language the mirrored layout arrives with the next launch. Settings → Language
 * offers a restart for that (docs/LOCALIZATION.md → Right-to-left).
 *
 * In a right-to-left launch rows, spacing, text alignment, icons that point and the tab pager mirror. Drawn
 * geometry (the painted world, the trail, charts, dials, a habit card's swipe) keeps its left-to-right frame:
 * those views sit inside `physical`, where `left` stays left whatever the launch's direction.
 */

/** This launch's layout direction. */
export const IS_RTL = I18nManager.isRTL;
/** +1 left-to-right, -1 right-to-left: the sign of "forward" along the x axis. */
export const DIR = IS_RTL ? -1 : 1;
/** For drawn geometry that must not mirror. */
export const physical = { direction: 'ltr' } as const;
/** For content inside a `physical` view that should follow the launch's direction again. */
export const logical = { direction: IS_RTL ? 'rtl' : 'ltr' } as const;
/** For icons that point (chevrons, arrows): mirrored in a right-to-left launch. */
export const flipX = IS_RTL ? { transform: [{ scaleX: -1 }] } : null;

export const isRTLLanguage = (lang: LanguageCode) => LANGUAGES.find((l) => l.code === lang)?.rtl ?? false;

/**
 * Ask for `lang`'s direction from the next launch on (native keeps it). True when this launch shows the other
 * direction, so a restart is needed to finish the switch. The web keeps one direction.
 */
export function applyDirection(lang: LanguageCode): boolean {
  if (Platform.OS === 'web') return false;
  const rtl = isRTLLanguage(lang);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  return rtl !== IS_RTL;
}
