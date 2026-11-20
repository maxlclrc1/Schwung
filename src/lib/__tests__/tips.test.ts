import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { canTip, phaseForError, phaseForOutcome, tipsFrom, TIP_SIZES } from '../../core/tips';

/*
 * The tip jar against expo-iap's real purchase flow and on-device confirmation (purchase-flow-core,
 * purchase-flow-confirmers), with only StoreKit faked: what it lists as unfinished (verified) transactions, what it
 * delivers, and what a purchase request throws. StoreKit itself never delivers or lists a transaction whose
 * signature fails (OpenIAP checkVerified); here that is a delivery StoreKit doesn't list.
 */

type FakePurchase = {
  id: string;
  productId: string;
  purchaseState: string;
  store: string;
  environmentIOS?: string;
  revocationDateIOS?: number | null;
};

const mockStore = {
  pending: [] as FakePurchase[],
  finished: [] as { id: string; isConsumable: boolean }[],
  deliver: null as null | ((p: FakePurchase) => void),
  products: [] as { id: string; displayPrice: string }[],
  request: (async () => null) as (sku: string) => Promise<unknown>,
  connect: (async () => true) as () => Promise<boolean>,
};

jest.mock('expo-iap', () => {
  const core = jest.requireActual('expo-iap/build/purchase-flow-core') as {
    createPurchaseFlow: (o: Record<string, unknown>) => unknown;
  };
  const conf = jest.requireActual('expo-iap/build/purchase-flow-confirmers') as {
    createDeviceConfirmationIOS: (get: () => Promise<unknown[]>, o: Record<string, unknown>) => unknown;
  };
  return {
    initConnection: () => mockStore.connect(),
    fetchProducts: async () => mockStore.products,
    requestPurchase: async ({ request }: { request: { apple: { sku: string } } }) =>
      mockStore.request(request.apple.sku),
    confirmOnDeviceIOS: (o: Record<string, unknown>) =>
      conf.createDeviceConfirmationIOS(async () => mockStore.pending, {
        ...o,
        getTransactionHistoryIOS: async () => [],
      }),
    createPurchaseFlow: (o: Record<string, unknown>) =>
      core.createPurchaseFlow({
        ...o,
        finishTransaction: async ({ purchase, isConsumable }: { purchase: FakePurchase; isConsumable: boolean }) => {
          mockStore.finished.push({ id: purchase.id, isConsumable });
          mockStore.pending = mockStore.pending.filter((p) => p.id !== purchase.id);
        },
        getAvailablePurchases: async () => [],
        getPendingTransactionsIOS: async () => mockStore.pending,
        listenForPurchases: (cb: (p: FakePurchase) => void) => {
          mockStore.deliver = cb;
          return { remove: () => (mockStore.deliver = null) };
        },
        wasRequested: () => true,
      }),
  };
});

// An App Store build with real product IDs.
jest.mock('../legal', () => ({ legalVisible: { tips: () => true } }));
jest.mock('../constants', () => ({
  TIP_PRODUCTS: { small: 'app.tip.small', medium: 'app.tip.medium', large: 'app.tip.large' },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tips = require('../tips') as typeof import('../tips');

const purchase = (id: string, productId = 'app.tip.small'): FakePurchase => ({
  id,
  productId,
  purchaseState: 'purchased',
  store: 'apple',
  environmentIOS: 'Sandbox',
});
const settle = () => new Promise((r) => setTimeout(r, 0));
const outcomes = () => {
  const seen: { productId: string; phase: string }[] = [];
  tips.onTipOutcome((o) => seen.push(o));
  return seen;
};

beforeEach(() => {
  tips.resetTipsForTests();
  Object.assign(mockStore, {
    pending: [],
    finished: [],
    deliver: null,
    products: [
      { id: 'app.tip.large', displayPrice: '₺499,99' },
      { id: 'app.tip.small', displayPrice: '₺49,99' },
      { id: 'app.tip.medium', displayPrice: '₺149,99' },
    ],
    request: async () => null,
    connect: async () => true,
  });
});

describe('tips: products', () => {
  it('shows the three tips in order with the App Store’s own localized prices', async () => {
    const t = await tips.loadTips();
    expect(t?.map((x) => [x.size, x.price])).toEqual([
      ['small', '₺49,99'],
      ['medium', '₺149,99'],
      ['large', '₺499,99'],
    ]);
  });

  it('offers none unless all three loaded with a price', () => {
    const ids = { small: 'a', medium: 'b', large: 'c' };
    expect(
      tipsFrom(ids, [
        { id: 'a', displayPrice: '$1' },
        { id: 'b', displayPrice: '$2' },
      ]),
    ).toBeNull();
    expect(tipsFrom(ids, [{ id: 'a', displayPrice: '$1' }, { id: 'b', displayPrice: '$2' }, { id: 'c' }])).toBeNull();
    expect(TIP_SIZES).toEqual(['small', 'medium', 'large']);
  });

  it('is unavailable (never broken) when the App Store can’t be reached, and can try again later', async () => {
    mockStore.connect = async () => {
      throw new Error('offline');
    };
    expect(await tips.loadTips()).toBeNull();
    mockStore.connect = async () => true;
    expect(await tips.loadTips()).not.toBeNull();
  });
});

describe('tips: a purchase', () => {
  it('thanks only for a verified, unfinished transaction, then finishes it as a consumable (so it can be repeated)', async () => {
    const seen = outcomes();
    await tips.startTips();
    mockStore.request = async (sku) => {
      const p = purchase('t1', sku);
      mockStore.pending.push(p); // StoreKit verified it and lists it as unfinished
      mockStore.deliver!(p);
      return p;
    };
    expect(await tips.buyTip('app.tip.small')).toBeNull();
    await settle();
    expect(seen).toEqual([{ productId: 'app.tip.small', phase: 'thanks' }]);
    expect(mockStore.finished).toEqual([{ id: 't1', isConsumable: true }]);

    // The same tip again: a new transaction, a new thank-you.
    mockStore.request = async (sku) => {
      const p = purchase('t2', sku);
      mockStore.pending.push(p);
      mockStore.deliver!(p);
      return p;
    };
    await tips.buyTip('app.tip.small');
    await settle();
    expect(seen.map((o) => o.phase)).toEqual(['thanks', 'thanks']);
    expect(mockStore.finished.map((f) => f.id)).toEqual(['t1', 't2']);
  });

  it('never thanks for or finishes a delivery StoreKit didn’t verify', async () => {
    const seen = outcomes();
    await tips.startTips();
    mockStore.deliver!(purchase('forged')); // not among StoreKit's verified, unfinished transactions
    await settle();
    expect(seen.map((o) => o.phase)).not.toContain('thanks');
    expect(seen.map((o) => o.phase)).toEqual(['delayed']);
    expect(mockStore.finished).toEqual([]);
  });

  it('a purchase whose verification fails ends as unconfirmed, with no thank-you', async () => {
    const seen = outcomes();
    await tips.startTips();
    mockStore.request = async () => {
      throw Object.assign(new Error('Transaction verification failed'), { code: 'transaction-validation-failed' });
    };
    expect(await tips.buyTip('app.tip.medium')).toBe('unconfirmed');
    await settle();
    expect(seen).toEqual([]);
    expect(mockStore.finished).toEqual([]);
  });

  it('a revoked transaction is finished (so Apple stops redelivering it) but never thanked for', async () => {
    const seen = outcomes();
    await tips.startTips();
    const p = { ...purchase('r1'), revocationDateIOS: Date.now() };
    mockStore.pending.push(p);
    mockStore.deliver!(p);
    await settle();
    expect(seen.map((o) => o.phase)).toEqual(['unconfirmed']);
    expect(mockStore.finished.map((f) => f.id)).toEqual(['r1']);
  });

  it('cancelling, waiting for approval, restricted purchases and errors each end calmly', async () => {
    await tips.startTips();
    const fails = async (code: string) => {
      mockStore.request = async () => {
        throw Object.assign(new Error(code), { code });
      };
      return tips.buyTip('app.tip.large');
    };
    expect(await fails('user-cancelled')).toBe('ready');
    expect(await fails('deferred-payment')).toBe('pending');
    expect(await fails('iap-not-available')).toBe('restricted');
    expect(await fails('network-error')).toBe('failed');
    expect(await fails('something-new')).toBe('failed');
    expect(mockStore.finished).toEqual([]);
  });

  it('an approval that comes later (Ask to Buy) or an interrupted purchase is confirmed and finished on its own', async () => {
    const seen = outcomes();
    await tips.startTips();
    const later = purchase('ask1', 'app.tip.medium');
    mockStore.pending.push(later);
    mockStore.deliver!(later); // StoreKit's Transaction.updates after approval
    await settle();
    expect(mockStore.finished.map((f) => f.id)).toEqual(['ask1']);
    expect(seen).toEqual([{ productId: 'app.tip.medium', phase: 'thanks' }]); // the screen shows it only if it asked
  });

  it('finishes purchases left unfinished by an earlier session at launch', async () => {
    mockStore.pending.push(purchase('old1'), purchase('old2', 'app.tip.large'));
    await tips.startTips();
    await settle();
    await settle();
    expect(mockStore.finished.map((f) => f.id).sort()).toEqual(['old1', 'old2']);
  });
});

describe('tips: the screen’s rules', () => {
  it('allows one purchase at a time', () => {
    expect(canTip('buying')).toBe(false);
    expect(canTip('loading')).toBe(false);
    expect(canTip('unavailable')).toBe(false);
    expect(canTip('restricted')).toBe(false);
    for (const p of ['ready', 'thanks', 'pending', 'failed', 'delayed', 'unconfirmed'] as const)
      expect(canTip(p)).toBe(true);
  });

  it('only `entitled` is a thank-you', () => {
    for (const s of ['store_pending', 'verification_delayed', 'verified', 'linked', 'failed', 'invalid'])
      expect(phaseForOutcome({ status: s })).not.toBe('thanks');
    expect(phaseForOutcome({ status: 'entitled', alreadyGranted: false })).toBe('thanks');
    expect(phaseForError('transaction-validation-failed')).toBe('unconfirmed');
    expect(phaseForError(undefined)).toBe('failed');
  });
});
