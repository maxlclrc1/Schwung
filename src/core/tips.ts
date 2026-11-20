/*
 * Support Schwung: three voluntary tips, each a consumable In-App Purchase sold by Apple and processed with
 * RevenueCat (react-native-purchases). A tip unlocks nothing and changes nothing in the program. This file is the
 * screen's logic without the SDK, so it can be tested: which packages to offer, and what each answer means.
 *
 * The rule that matters: a thank-you is shown only when the purchase call succeeded for the tip that was asked for
 * AND RevenueCat's customer record (validated with Apple on RevenueCat's servers) contains that very transaction.
 * Anything else (cancelled, pending, an error, an answer that doesn't match) never is.
 */

export type TipSize = 'small' | 'medium' | 'large';
export const TIP_SIZES: TipSize[] = ['small', 'medium', 'large'];

/** A tip as the screen shows it; its price is the App Store's, in the person's currency and language. */
export type Tip = { size: TipSize; packageId: string; productId: string; price: string };

/** The RevenueCat setup the app expects (release.config.json). */
export type TipSetup = {
  /** RevenueCat's offering that holds the tips. */
  offering: string;
  /** Each tip's package identifier in that offering. */
  packages: Record<TipSize, string>;
  /** Each tip's App Store product ID, which the package must sell. */
  products: Record<TipSize, string>;
};

/** The parts of a RevenueCat offering the app reads. */
export type OfferingLike = {
  availablePackages: {
    identifier: string;
    product: { identifier: string; priceString?: string | null; productType?: string | null };
  }[];
};

/** Product types a repeatable tip may never be (a misconfigured product would be bought once, or renew). */
const NOT_A_TIP = ['NON_CONSUMABLE', 'NON_RENEWABLE_SUBSCRIPTION', 'AUTO_RENEWABLE_SUBSCRIPTION'];

/**
 * The three tips in order, or null unless every one is in the offering, sells the expected product, is a consumable
 * (or of a type StoreKit doesn't report) and has a price. A partial or misconfigured set is never offered.
 */
export function tipsFrom(setup: TipSetup, offering: OfferingLike | null | undefined): Tip[] | null {
  if (!offering) return null;
  const tips = TIP_SIZES.map((size) => {
    const p = offering.availablePackages.find((x) => x.identifier === setup.packages[size]);
    if (!p || p.product.identifier !== setup.products[size] || !p.product.priceString) return null;
    if (p.product.productType && NOT_A_TIP.includes(p.product.productType)) return null;
    return { size, packageId: p.identifier, productId: p.product.identifier, price: p.product.priceString };
  });
  return tips.every(Boolean) ? (tips as Tip[]) : null;
}

/**
 * What the screen shows:
 *   loading      the tips are being read;
 *   ready        the three tips can be chosen;
 *   unavailable  they can't be offered (offline, or RevenueCat / App Store Connect not set up, or not iOS);
 *   restricted   purchases are turned off on this phone (Screen Time, a managed device);
 *   buying       Apple's purchase sheet is open;
 *   pending      waiting for approval (Ask to Buy) or the bank: it finishes on its own if approved;
 *   thanks       a confirmed tip;
 *   delayed      it couldn't be completed or confirmed just now; if Apple charged, it's confirmed on its own later;
 *   unconfirmed  the purchase was found invalid, so it isn't treated as a tip;
 *   failed       it didn't go through, and nothing was charged.
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

/**
 * RevenueCat's PURCHASES_ERROR_CODE values (strings of numbers), by name, for the ones the tips treat specially.
 * Copied here so this file stays free of the native SDK; src/lib/__tests__/tips.test.ts checks them against it.
 */
export const RC_ERROR = {
  PURCHASE_CANCELLED: '1',
  STORE_PROBLEM: '2',
  PURCHASE_NOT_ALLOWED: '3',
  PURCHASE_INVALID: '4',
  PRODUCT_NOT_AVAILABLE_FOR_PURCHASE: '5',
  PRODUCT_ALREADY_PURCHASED: '6',
  INVALID_RECEIPT: '8',
  INVALID_CREDENTIALS: '11',
  OPERATION_ALREADY_IN_PROGRESS: '15',
  PAYMENT_PENDING: '20',
  CONFIGURATION: '23',
  PRODUCT_REQUEST_TIMED_OUT: '32',
  SIGNATURE_VERIFICATION: '37',
} as const;

/**
 * A purchase that ended in an error: what to show, and whether the tip may still be unfinished (so the app checks
 * again at the next launch). Only errors that come before any charge say "failed"; any error that may come after
 * Apple charged (the store, the network, RevenueCat's servers, anything unknown) says "delayed", never "failed".
 */
export function afterError(code: string | undefined): { phase: TipPhase; unsettled: boolean } {
  switch (code) {
    case RC_ERROR.PURCHASE_CANCELLED:
      return { phase: 'ready', unsettled: false }; // they changed their mind: nothing to say
    case RC_ERROR.PAYMENT_PENDING:
      return { phase: 'pending', unsettled: true };
    case RC_ERROR.PURCHASE_NOT_ALLOWED:
      return { phase: 'restricted', unsettled: false };
    case RC_ERROR.PURCHASE_INVALID:
    case RC_ERROR.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE:
    case RC_ERROR.PRODUCT_ALREADY_PURCHASED:
    case RC_ERROR.INVALID_CREDENTIALS:
    case RC_ERROR.CONFIGURATION:
    case RC_ERROR.PRODUCT_REQUEST_TIMED_OUT:
      return { phase: 'failed', unsettled: false }; // refused before Apple's sheet could charge
    case RC_ERROR.INVALID_RECEIPT:
    case RC_ERROR.SIGNATURE_VERIFICATION:
      return { phase: 'unconfirmed', unsettled: false };
    default:
      return { phase: 'delayed', unsettled: true };
  }
}

/** The parts of a successful purchase result the app reads (react-native-purchases' MakePurchaseResult). */
export type PurchaseResultLike = {
  productIdentifier?: string | null;
  transaction?: { transactionIdentifier?: string | null; productIdentifier?: string | null } | null;
  customerInfo?: {
    nonSubscriptionTransactions?: { transactionIdentifier: string; productIdentifier: string }[];
  } | null;
};

/**
 * A purchase call that succeeded: a thank-you only if it is the tip that was asked for and RevenueCat's validated
 * record holds that transaction. Otherwise it's left to be confirmed later ("delayed"), never celebrated.
 */
export function afterPurchase(productId: string, r: PurchaseResultLike | null | undefined): TipPhase {
  const id = r?.transaction?.transactionIdentifier;
  if (!r || !id || r.productIdentifier !== productId || r.transaction?.productIdentifier !== productId)
    return 'delayed';
  const recorded = (r.customerInfo?.nonSubscriptionTransactions ?? []).some(
    (t) => t.transactionIdentifier === id && t.productIdentifier === productId,
  );
  return recorded ? 'thanks' : 'delayed';
}

/** How long an unfinished tip makes the app start RevenueCat at launch (an Ask to Buy, an interrupted purchase). */
export const UNSETTLED_DAYS = 7;
export const unsettledStill = (since: number, now: number) => now - since >= 0 && now - since < UNSETTLED_DAYS * 864e5;

/** The note under the tips for each phase (a key in settings.tips.note), or none. */
export function noteFor(phase: TipPhase): string | null {
  return phase === 'ready' || phase === 'buying' ? null : phase;
}
