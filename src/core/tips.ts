/*
 * Support Schwung: three voluntary tips, each a consumable In-App Purchase. A tip unlocks nothing, changes nothing
 * in the program and is never stored (so there is nothing to restore, back up or export). This file is the screen's
 * logic without StoreKit, so it can be tested: which products to show, and what each store answer means.
 *
 * The rule that matters: a thank-you is shown only for a purchase the App Store verified on this phone and the
 * purchase flow confirmed (`entitled`). Anything else (unverified, revoked, still pending, an error) never is.
 */

export type TipSize = 'small' | 'medium' | 'large';
export const TIP_SIZES: TipSize[] = ['small', 'medium', 'large'];

/** A tip as the screen shows it: its price comes from the App Store, in the person's currency and language. */
export type Tip = { size: TipSize; productId: string; price: string };

/** What the store returned for a product (the fields Schwung reads). */
export type StoreProduct = { id: string; displayPrice?: string | null };

/**
 * The three tips in order, or null unless every one loaded with a price: a partial set would look broken, so the
 * screen says tips aren't available instead.
 */
export function tipsFrom(ids: Record<TipSize, string>, products: StoreProduct[]): Tip[] | null {
  const tips = TIP_SIZES.map((size) => {
    const p = products.find((x) => x.id === ids[size]);
    return p?.displayPrice ? { size, productId: p.id, price: p.displayPrice } : null;
  });
  return tips.every(Boolean) ? (tips as Tip[]) : null;
}

/**
 * What the screen shows:
 *   loading      products are being read;
 *   ready        the three tips can be chosen;
 *   unavailable  the App Store couldn't provide them (offline, not set up, or not this platform);
 *   restricted   purchases are turned off on this phone (Screen Time, a managed device);
 *   buying       Apple's purchase sheet is open for a tip;
 *   pending      waiting for approval (Ask to Buy) or for the bank: it finishes on its own if approved;
 *   thanks       a verified, confirmed tip;
 *   delayed      paid but not confirmed yet: confirmed on its own later, never asked for again;
 *   unconfirmed  the App Store didn't verify it, so it isn't treated as a tip;
 *   failed       it didn't go through (an error before or during the purchase).
 */
export type TipPhase =
  | 'loading'
  | 'ready'
  | 'unavailable'
  | 'restricted'
  | 'buying'
  | 'pending'
  | 'thanks'
  | 'delayed'
  | 'unconfirmed'
  | 'failed';

/** Phases in which a tip can be chosen (one purchase at a time). */
export const canTip = (phase: TipPhase) => !['loading', 'unavailable', 'restricted', 'buying'].includes(phase);

/** An error thrown by a purchase request (expo-iap's `ErrorCode` values). */
export function phaseForError(code: string | undefined): TipPhase {
  switch (code) {
    case 'user-cancelled':
      return 'ready'; // they changed their mind: nothing to say
    case 'deferred-payment':
    case 'pending':
      return 'pending';
    case 'iap-not-available': // StoreKit's canMakePayments is false
      return 'restricted';
    case 'transaction-validation-failed':
    case 'purchase-verification-failed':
      return 'unconfirmed';
    default:
      return 'failed';
  }
}

/** The purchase flow's verdict on a delivered purchase (expo-iap's `PurchaseFlowStatus`, the field Schwung reads). */
export type FlowStatus = { status: string; alreadyGranted?: boolean };

/**
 * A verdict for a purchase made on this screen. Only `entitled` (StoreKit verified it and listed it as unfinished,
 * and the flow finished it) is a tip; a settled rejection is `unconfirmed`; anything that may still change is
 * `delayed` or `pending` and is confirmed on its own later, without asking to pay again.
 */
export function phaseForOutcome(s: FlowStatus): TipPhase {
  switch (s.status) {
    case 'entitled':
      return 'thanks';
    case 'store_pending':
      return 'pending';
    case 'invalid':
    case 'test_account_restricted':
    case 'ownership_conflict':
      return 'unconfirmed';
    default:
      return 'delayed'; // verification_delayed, verified, linked, failed: the purchase stays unfinished for recovery
  }
}

/** The note under the tips for each phase (a key in settings.tips), or none. */
export function noteFor(phase: TipPhase): string | null {
  switch (phase) {
    case 'loading':
      return 'loading';
    case 'unavailable':
      return 'unavailable';
    case 'restricted':
      return 'restricted';
    case 'pending':
      return 'pending';
    case 'thanks':
      return 'thanks';
    case 'delayed':
      return 'delayed';
    case 'unconfirmed':
      return 'unconfirmed';
    case 'failed':
      return 'failed';
    default:
      return null;
  }
}
