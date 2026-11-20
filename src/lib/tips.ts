import { Platform } from 'react-native';
import { phaseForError, phaseForOutcome, tipsFrom, type Tip, type TipPhase } from '../core/tips';
import { TIP_PRODUCTS } from './constants';
import { legalVisible } from './legal';

/*
 * Support Schwung through Apple In-App Purchase (expo-iap, StoreKit 2). No server and no account: each tip is
 * confirmed on this phone with StoreKit's own verification, using expo-iap's purchase flow:
 *
 *   - StoreKit checks every transaction's signature; one that fails is never delivered as a purchase
 *     (OpenIAP's checkVerified), so it can never be thanked for.
 *   - confirmOnDeviceIOS then requires StoreKit to list the transaction as unfinished, and not revoked, before the
 *     flow calls it `entitled` and finishes it as a consumable. Only then does the screen say thank you.
 *   - The flow listens from launch (startTips), so a purchase completed while the screen wasn't open (Ask to Buy
 *     approved later, an interrupted purchase, the app closed mid-purchase) is confirmed and finished quietly, and
 *     Apple stops delivering it again. Unfinished ones are recovered at every launch.
 *
 * Nothing about tips is saved: no record, no count, nothing in backups or exports, and nothing is unlocked.
 */

type Iap = typeof import('expo-iap');

let iap: Iap | null | undefined;
/** expo-iap on iOS only (the web build and Android have no tips). */
function store(): Iap | null {
  if (iap === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      iap = Platform.OS === 'ios' ? (require('expo-iap') as Iap) : null;
    } catch {
      iap = null;
    }
  }
  return iap;
}

/** A verdict for a delivered purchase, by product. The screen shows it only for the tip it asked for. */
export type TipOutcome = { productId: string; phase: TipPhase };
const listeners = new Set<(o: TipOutcome) => void>();

export function onTipOutcome(listener: (o: TipOutcome) => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Whether this build offers tips at all (iOS, and real product IDs in an App Store build). */
export const tipsOffered = () => Platform.OS === 'ios' && legalVisible.tips();

let started: Promise<boolean> | null = null;

/**
 * Connects to the App Store and starts the purchase flow, once; called at launch so interrupted and approved
 * purchases are finished even if the screen is never opened. Resolves false if tips can't be used now (it can be
 * called again later, e.g. when the screen opens after being offline).
 */
export function startTips(): Promise<boolean> {
  if (started) return started;
  const s = store();
  if (!s || !tipsOffered()) return Promise.resolve(false);
  const run = (async () => {
    await s.initConnection();
    const flow = s.createPurchaseFlow({
      // A tip credits nothing, so there is nothing to grant; StoreKit's verification is the whole check.
      confirmWithBackend: s.confirmOnDeviceIOS({ grant: async () => {} }),
      isConsumable: () => true,
    });
    flow.subscribe(({ purchase, status }) => {
      const o = { productId: purchase.productId, phase: phaseForOutcome(status) };
      for (const l of listeners) l(o);
    });
    void flow.recoverPurchases().catch(() => {});
    return true;
  })().catch(() => {
    started = null;
    return false;
  });
  started = run;
  return run;
}

/** The three tips with their App Store prices, or null if they can't be offered right now. */
export async function loadTips(): Promise<Tip[] | null> {
  const s = store();
  if (!s || !(await startTips())) return null;
  try {
    const products = await s.fetchProducts({ skus: Object.values(TIP_PRODUCTS), type: 'in-app' });
    return tipsFrom(TIP_PRODUCTS, (products ?? []) as { id: string; displayPrice?: string }[]);
  } catch {
    return null;
  }
}

/**
 * Opens Apple's purchase sheet for a tip. Resolves null once the request is with the App Store (the verdict then
 * arrives through onTipOutcome), or the phase for an answer that ends it here (cancelled, pending, restricted,
 * failed verification, an error).
 */
export async function buyTip(productId: string): Promise<TipPhase | null> {
  const s = store();
  if (!s) return 'unavailable';
  try {
    await s.requestPurchase({ request: { apple: { sku: productId } }, type: 'in-app' });
    return null;
  } catch (e) {
    return phaseForError((e as { code?: string } | null)?.code);
  }
}

/** Tests only: forget the connection and listeners. */
export function resetTipsForTests() {
  started = null;
  iap = undefined;
  listeners.clear();
}
