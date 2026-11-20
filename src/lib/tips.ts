import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  afterError,
  afterPurchase,
  tipsFrom,
  unsettledStill,
  type Tip,
  type TipPhase,
  type TipSetup,
} from '../core/tips';
import { REVENUECAT, TIP_PRODUCTS } from './constants';
import { legalVisible } from './legal';

/*
 * Support Schwung: tips through Apple In-App Purchase, processed with RevenueCat (react-native-purchases).
 *
 *   - Offline-first: RevenueCat is started only when the Support screen opens, or at launch while a tip is
 *     unfinished. Once started, the SDK reaches RevenueCat's servers (it refreshes when the app comes to the
 *     foreground). Nobody who never opens Support ever sends RevenueCat anything.
 *   - Anonymous: no app user ID, no attributes, no device identifiers for attribution, no diagnostics.
 *   - RevenueCat validates each purchase with Apple on its servers and finishes the transaction itself; the app
 *     thanks only for a transaction RevenueCat's customer record then contains (core/tips.ts afterPurchase).
 *   - Interrupted, pending (Ask to Buy) or not-yet-confirmed tips: a small marker under a `schwung-` key records
 *     only that a tip is unfinished and since when, so the next launches start RevenueCat and let it finish the
 *     transaction (no second charge, nothing unlocked). It's cleared once the tip is settled, after 7 days, and by
 *     Delete my data; it's never exported or backed up by the app.
 */

type Purchases = typeof import('react-native-purchases').default;

const UNSETTLED_KEY = 'schwung-tip-unsettled';

/** The setup the app expects, from release.config.json. */
export const TIP_SETUP: TipSetup = {
  offering: REVENUECAT.offering,
  packages: REVENUECAT.packages,
  products: TIP_PRODUCTS,
};

/** A public RevenueCat SDK key for Apple (`appl_…`); secret keys (`sk_…`) never belong in the app. */
export const isPublicAppleKey = (key: string) => /^appl_[A-Za-z0-9]+$/.test(key);

let sdk: Purchases | null | undefined;
/** react-native-purchases on iOS only (the web build and Android have no tips). */
function purchases(): Purchases | null {
  if (sdk === undefined) {
    try {
      sdk =
        Platform.OS === 'ios'
          ? // eslint-disable-next-line @typescript-eslint/no-require-imports
            (require('react-native-purchases') as { default: Purchases }).default
          : null;
    } catch {
      sdk = null;
    }
  }
  return sdk;
}

/** Whether this build offers tips at all: iOS, real product IDs in an App Store build. */
export const tipsOffered = () => Platform.OS === 'ios' && legalVisible.tips();

let configured = false;
/** Starts RevenueCat once (anonymously); false when tips can't be used (no SDK, no public key, not offered). */
function ready(): Purchases | null {
  const s = purchases();
  if (!s || !tipsOffered() || !isPublicAppleKey(REVENUECAT.appleApiKey)) return null;
  if (!configured) {
    try {
      s.configure({
        apiKey: REVENUECAT.appleApiKey,
        appUserID: null, // anonymous: RevenueCat makes a random ID; no account, no login
        diagnosticsEnabled: false,
        automaticDeviceIdentifierCollectionEnabled: false,
        shouldShowInAppMessagesAutomatically: false,
      });
      configured = true;
    } catch {
      return null;
    }
  }
  return s;
}

async function markUnsettled(unsettled: boolean) {
  try {
    if (unsettled) await AsyncStorage.setItem(UNSETTLED_KEY, String(Date.now()));
    else await AsyncStorage.removeItem(UNSETTLED_KEY);
  } catch {
    // Only a hint for the next launch; the transaction itself is safe with StoreKit either way.
  }
}

/**
 * At launch: only if a tip is unfinished (pending approval, interrupted, not yet confirmed), start RevenueCat so it
 * finishes the transaction with Apple. Otherwise nothing happens and nothing is sent anywhere.
 */
export async function startTips(now = Date.now()): Promise<boolean> {
  let since: number | null = null;
  try {
    const raw = await AsyncStorage.getItem(UNSETTLED_KEY);
    since = raw ? Number(raw) : null;
  } catch {
    return false;
  }
  if (since === null) return false;
  if (!Number.isFinite(since) || !unsettledStill(since, now)) {
    await markUnsettled(false);
    return false;
  }
  return !!ready();
}

/** The three tips with their App Store prices, or null if they can't be offered right now. */
export async function loadTips(): Promise<Tip[] | null> {
  const s = ready();
  if (!s) return null;
  try {
    const offerings = await s.getOfferings();
    return tipsFrom(TIP_SETUP, offerings.all[TIP_SETUP.offering]);
  } catch {
    return null;
  }
}

let busy = false;
/**
 * Opens Apple's purchase sheet for a tip and resolves with what to show. One purchase at a time: a second call while
 * one is open is ignored (null).
 */
export async function buyTip(tip: Tip): Promise<TipPhase | null> {
  const s = ready();
  if (!s) return 'unavailable';
  if (busy) return null;
  busy = true;
  try {
    const offerings = await s.getOfferings();
    const pkg = offerings.all[TIP_SETUP.offering]?.availablePackages.find((p) => p.identifier === tip.packageId);
    if (!pkg || pkg.product.identifier !== tip.productId) return 'unavailable';
    await markUnsettled(true); // before Apple's sheet: if the app is closed mid-purchase, the next launch finishes it
    try {
      const result = await s.purchasePackage(pkg);
      const phase = afterPurchase(tip.productId, result);
      await markUnsettled(phase !== 'thanks');
      return phase;
    } catch (e) {
      const { phase, unsettled } = afterError((e as { code?: string } | null)?.code);
      await markUnsettled(unsettled);
      return phase;
    }
  } catch {
    return 'unavailable';
  } finally {
    busy = false;
  }
}

/** Tests only: forget the SDK and its state. */
export function resetTipsForTests() {
  sdk = undefined;
  configured = false;
  busy = false;
}
