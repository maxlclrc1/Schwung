import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PURCHASES_ERROR_CODE } from '@revenuecat/purchases-typescript-internal';
import {
  afterError,
  afterPurchase,
  canTip,
  moreTipsFrom,
  RC_ERROR,
  tipsFrom,
  type Tip,
  type TipSetup,
} from '../../core/tips';

/*
 * The tip jar with RevenueCat's SDK faked: what the offering holds, what a purchase returns or throws. Checks that a
 * thank-you needs a transaction RevenueCat recorded, that every other answer ends calmly, that RevenueCat is never
 * started for people who don't open Support, and that a tip changes no saved progress.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Pkg = { identifier: string; product: { identifier: string; priceString: string; productType?: string } };
const mockRC = {
  configure: jest.fn(),
  offerings: { all: {} as Record<string, { availablePackages: Pkg[] }> },
  purchase: (async () => ({})) as (p: Pkg) => Promise<unknown>,
  purchasePackage: jest.fn(),
  getOfferings: jest.fn(),
};
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: (o: unknown) => mockRC.configure(o),
    getOfferings: async () => {
      mockRC.getOfferings();
      return mockRC.offerings;
    },
    purchasePackage: (p: Pkg) => {
      mockRC.purchasePackage(p);
      return mockRC.purchase(p);
    },
  },
}));

const mockRelease = {
  key: 'appl_TestPublicKey123',
  products: { small: 'app.tip.small', medium: 'app.tip.medium', large: 'app.tip.large' },
};
jest.mock('../legal', () => ({ legalVisible: { tips: () => true } }));
jest.mock('../constants', () => ({
  get TIP_PRODUCTS() {
    return mockRelease.products;
  },
  get MORE_TIP_PRODUCTS() {
    return ['app.tip.extra1', 'app.tip.extra2', 'app.tip.extra3', 'app.tip.extra4'];
  },
  get REVENUECAT() {
    return {
      appleApiKey: mockRelease.key,
      offering: 'tips',
      packages: { small: 'tip_small', medium: 'tip_medium', large: 'tip_large' },
      morePackages: ['tip_extra1', 'tip_extra2', 'tip_extra3', 'tip_extra4'],
    };
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AsyncStorage = require('@react-native-async-storage/async-storage') as {
  getItem(k: string): Promise<string | null>;
  setItem(k: string, v: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tips = require('../tips') as typeof import('../tips');

const pkg = (size: string, product: string, price: string, productType = 'CONSUMABLE'): Pkg => ({
  identifier: `tip_${size}`,
  product: { identifier: product, priceString: price, productType },
});
const OFFERING = () => ({
  availablePackages: [
    pkg('large', 'app.tip.large', '₺499,99'),
    pkg('small', 'app.tip.small', '₺49,99'),
    pkg('medium', 'app.tip.medium', '₺149,99'),
  ],
});
let txn = 0;
/** What RevenueCat returns for a purchase it validated and recorded. */
const recorded = (p: Pkg) => {
  const id = `t${++txn}`;
  return {
    productIdentifier: p.product.identifier,
    transaction: { transactionIdentifier: id, productIdentifier: p.product.identifier },
    customerInfo: {
      nonSubscriptionTransactions: [{ transactionIdentifier: id, productIdentifier: p.product.identifier }],
    },
  };
};
const fails = (code: string) => async () => {
  throw Object.assign(new Error(code), { code });
};
const UNSETTLED = 'schwung-tip-unsettled';
const loaded = async () => (await tips.loadTips()) as Tip[];

beforeEach(async () => {
  tips.resetTipsForTests();
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockRelease.key = 'appl_TestPublicKey123';
  mockRC.offerings = { all: { tips: OFFERING() } };
  mockRC.purchase = async (p) => recorded(p);
});

describe('tips: RevenueCat setup', () => {
  it('uses RevenueCat’s own error codes', () => {
    expect(RC_ERROR).toEqual({
      PURCHASE_CANCELLED: PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR,
      STORE_PROBLEM: PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR,
      PURCHASE_NOT_ALLOWED: PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR,
      PURCHASE_INVALID: PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR,
      PRODUCT_NOT_AVAILABLE_FOR_PURCHASE: PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR,
      PRODUCT_ALREADY_PURCHASED: PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR,
      INVALID_RECEIPT: PURCHASES_ERROR_CODE.INVALID_RECEIPT_ERROR,
      INVALID_CREDENTIALS: PURCHASES_ERROR_CODE.INVALID_CREDENTIALS_ERROR,
      OPERATION_ALREADY_IN_PROGRESS: PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR,
      PAYMENT_PENDING: PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR,
      CONFIGURATION: PURCHASES_ERROR_CODE.CONFIGURATION_ERROR,
      PRODUCT_REQUEST_TIMED_OUT: PURCHASES_ERROR_CODE.PRODUCT_REQUEST_TIMED_OUT_ERROR,
      SIGNATURE_VERIFICATION: PURCHASES_ERROR_CODE.SIGNATURE_VERIFICATION_ERROR,
    });
  });

  it('never starts RevenueCat at launch unless a tip is unfinished (offline-first)', async () => {
    expect(await tips.startTips()).toBe(false);
    expect(mockRC.configure).not.toHaveBeenCalled();
    expect(mockRC.getOfferings).not.toHaveBeenCalled();
  });

  it('starts anonymously, without device identifiers, diagnostics or store messages, when Support opens', async () => {
    await tips.loadTips();
    await tips.loadTips();
    expect(mockRC.configure).toHaveBeenCalledTimes(1);
    expect(mockRC.configure).toHaveBeenCalledWith({
      apiKey: 'appl_TestPublicKey123',
      appUserID: null,
      diagnosticsEnabled: false,
      automaticDeviceIdentifierCollectionEnabled: false,
      shouldShowInAppMessagesAutomatically: false,
    });
  });

  it('stays unavailable, and never starts, without a public Apple key (and never with a secret key)', async () => {
    for (const key of ['', 'sk_SecretKeyMustNeverShip', 'goog_AndroidKey', 'appl_']) {
      tips.resetTipsForTests();
      mockRelease.key = key;
      expect(await tips.loadTips()).toBeNull();
      expect(await tips.buyTip({ size: 'small', packageId: 'tip_small', productId: 'app.tip.small', price: '' })).toBe(
        'unavailable',
      );
    }
    expect(mockRC.configure).not.toHaveBeenCalled();
    expect(tips.isPublicAppleKey('appl_abcDEF123')).toBe(true);
    expect(tips.isPublicAppleKey('sk_abcDEF123')).toBe(false);
  });
});

describe('tips: the offering', () => {
  const setup: TipSetup = {
    offering: 'tips',
    packages: { small: 'tip_small', medium: 'tip_medium', large: 'tip_large' },
    products: { small: 'app.tip.small', medium: 'app.tip.medium', large: 'app.tip.large' },
    more: [],
  };

  it('offers the three tips in order with the App Store’s localized prices', async () => {
    expect((await loaded()).map((x) => [x.size, x.price])).toEqual([
      ['small', '₺49,99'],
      ['medium', '₺149,99'],
      ['large', '₺499,99'],
    ]);
  });

  it('offers none if the offering is missing, incomplete, sells the wrong product or a non-consumable', () => {
    expect(tipsFrom(setup, null)).toBeNull();
    const without = OFFERING();
    without.availablePackages.pop();
    expect(tipsFrom(setup, without)).toBeNull();
    const wrong = OFFERING();
    wrong.availablePackages[0].product.identifier = 'app.premium';
    expect(tipsFrom(setup, wrong)).toBeNull();
    for (const type of ['NON_CONSUMABLE', 'AUTO_RENEWABLE_SUBSCRIPTION', 'NON_RENEWABLE_SUBSCRIPTION']) {
      const once = OFFERING();
      once.availablePackages[1].product.productType = type;
      expect(tipsFrom(setup, once)).toBeNull();
    }
    const noPrice = OFFERING();
    noPrice.availablePackages[2].product.priceString = '';
    expect(tipsFrom(setup, noPrice)).toBeNull();
    // StoreKit sometimes can't say the type: still a tip.
    const unknown = OFFERING();
    unknown.availablePackages.forEach((p) => (p.product.productType = 'UNKNOWN'));
    expect(tipsFrom(setup, unknown)).not.toBeNull();
  });

  it('is unavailable (never broken) when RevenueCat can’t be reached', async () => {
    mockRC.offerings = undefined as never; // getOfferings resolves to nothing usable
    expect(await tips.loadTips()).toBeNull();
  });
});

describe('tips: Choose another amount', () => {
  /** The offering with the four extra amounts too (App Store tiers; the order in the offering doesn't matter). */
  const WITH_MORE = () => ({
    availablePackages: [
      ...OFFERING().availablePackages,
      pkg('extra4', 'app.tip.extra4', '₺1.999,99'),
      pkg('extra1', 'app.tip.extra1', '₺39,99'),
      pkg('extra3', 'app.tip.extra3', '₺999,99'),
      pkg('extra2', 'app.tip.extra2', '₺599,99'),
    ],
  });
  const setup: TipSetup = {
    offering: 'tips',
    packages: { small: 'tip_small', medium: 'tip_medium', large: 'tip_large' },
    products: { small: 'app.tip.small', medium: 'app.tip.medium', large: 'app.tip.large' },
    more: [1, 2, 3, 4].map((n) => ({ package: `tip_extra${n}`, product: `app.tip.extra${n}` })),
  };

  it('offers the extra amounts after the three, in the configured order, with the App Store’s prices', async () => {
    mockRC.offerings = { all: { tips: WITH_MORE() } };
    expect((await loaded()).map((x) => [x.size, x.productId, x.price])).toEqual([
      ['small', 'app.tip.small', '₺49,99'],
      ['medium', 'app.tip.medium', '₺149,99'],
      ['large', 'app.tip.large', '₺499,99'],
      ['more', 'app.tip.extra1', '₺39,99'],
      ['more', 'app.tip.extra2', '₺599,99'],
      ['more', 'app.tip.extra3', '₺999,99'],
      ['more', 'app.tip.extra4', '₺1.999,99'],
    ]);
  });

  it('hides "Choose another amount" when no extra amount is set up, and never shows extras without the three', async () => {
    expect((await loaded()).filter((x) => x.size === 'more')).toEqual([]);
    const incomplete = WITH_MORE();
    incomplete.availablePackages.splice(0, 1); // a suggested tip is missing
    mockRC.offerings = { all: { tips: incomplete } };
    expect(await tips.loadTips()).toBeNull();
  });

  it('leaves out an extra amount that sells the wrong product, isn’t a consumable, has no price or reuses another tip', () => {
    const o = WITH_MORE();
    const by = (id: string) => o.availablePackages.find((p) => p.identifier === id)!;
    by('tip_extra1').product.identifier = 'app.premium';
    by('tip_extra2').product.productType = 'NON_CONSUMABLE';
    by('tip_extra3').product.priceString = '';
    expect(moreTipsFrom(setup, o).map((x) => x.productId)).toEqual(['app.tip.extra4']);
    for (const type of ['AUTO_RENEWABLE_SUBSCRIPTION', 'NON_RENEWABLE_SUBSCRIPTION']) {
      by('tip_extra4').product.productType = type;
      expect(moreTipsFrom(setup, o)).toEqual([]);
    }
    // An extra amount that reuses a suggested tip's package or product is never offered; a package or product is
    // offered at most once (npm run release:check refuses such a config anyway).
    const reused: TipSetup = {
      ...setup,
      more: [
        { package: 'tip_small', product: 'app.tip.small' },
        { package: 'tip_extra1', product: 'app.tip.medium' },
        { package: 'tip_extra1', product: 'app.tip.extra1' },
        { package: 'tip_extra2', product: 'app.tip.extra2' },
        { package: 'tip_extra2', product: 'app.tip.extra2' },
      ],
    };
    expect(moreTipsFrom(reused, WITH_MORE()).map((x) => x.productId)).toEqual(['app.tip.extra1', 'app.tip.extra2']);
    expect(moreTipsFrom(setup, null)).toEqual([]);
  });

  it('an extra amount uses the same purchase flow: thanks only for a recorded transaction, calm errors otherwise', async () => {
    mockRC.offerings = { all: { tips: WITH_MORE() } };
    const extra = (await loaded()).find((x) => x.productId === 'app.tip.extra3')!;
    expect(await tips.buyTip(extra)).toBe('thanks');
    expect(mockRC.purchasePackage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        identifier: 'tip_extra3',
        product: expect.objectContaining({ identifier: 'app.tip.extra3' }),
      }),
    );
    expect(await AsyncStorage.getItem(UNSETTLED)).toBeNull();
    mockRC.purchase = async (p) => ({ ...recorded(p), productIdentifier: 'app.tip.small' });
    expect(await tips.buyTip(extra)).toBe('delayed');
    expect(await AsyncStorage.getItem(UNSETTLED)).not.toBeNull();
    mockRC.purchase = fails(PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR);
    expect(await tips.buyTip(extra)).toBe('ready');
    // If the offering changed under it (the package now sells something else), nothing is bought.
    const swapped = WITH_MORE();
    swapped.availablePackages.find((p) => p.identifier === 'tip_extra3')!.product.identifier = 'app.other';
    mockRC.offerings = { all: { tips: swapped } };
    const calls = mockRC.purchasePackage.mock.calls.length;
    expect(await tips.buyTip(extra)).toBe('unavailable');
    expect(mockRC.purchasePackage.mock.calls.length).toBe(calls);
  });
});

describe('tips: a purchase', () => {
  it('thanks for a purchase RevenueCat validated and recorded; the same tip can be given again', async () => {
    const [small] = await loaded();
    expect(await tips.buyTip(small)).toBe('thanks');
    expect(await tips.buyTip(small)).toBe('thanks');
    expect(mockRC.purchasePackage).toHaveBeenCalledTimes(2);
    expect(await AsyncStorage.getItem(UNSETTLED)).toBeNull();
  });

  it('never thanks when the answer doesn’t prove it: no transaction, another product, or not in RevenueCat’s record', async () => {
    const [small] = await loaded();
    const cases = [
      async () => ({}),
      async (p: Pkg) => ({ ...recorded(p), productIdentifier: 'app.tip.large' }),
      async (p: Pkg) => ({ ...recorded(p), transaction: null }),
      async (p: Pkg) => ({ ...recorded(p), customerInfo: { nonSubscriptionTransactions: [] } }),
    ];
    for (const c of cases) {
      mockRC.purchase = c;
      expect(await tips.buyTip(small)).toBe('delayed');
      expect(await AsyncStorage.getItem(UNSETTLED)).not.toBeNull(); // checked again at the next launch
    }
  });

  it('cancelling, waiting for approval, restricted purchases, invalid purchases and errors each end calmly', async () => {
    const [, medium] = await loaded();
    const after = async (code: string) => {
      mockRC.purchase = fails(code);
      return [await tips.buyTip(medium), (await AsyncStorage.getItem(UNSETTLED)) !== null];
    };
    expect(await after(PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR)).toEqual(['ready', false]);
    expect(await after(PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR)).toEqual(['pending', true]);
    expect(await after(PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR)).toEqual(['restricted', false]);
    expect(await after(PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR)).toEqual(['failed', false]);
    expect(await after(PURCHASES_ERROR_CODE.INVALID_RECEIPT_ERROR)).toEqual(['unconfirmed', false]);
    // Errors that can come after Apple charged: never "failed", and checked again at the next launch.
    for (const code of [
      PURCHASES_ERROR_CODE.NETWORK_ERROR,
      PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR,
      PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR,
      PURCHASES_ERROR_CODE.UNEXPECTED_BACKEND_RESPONSE_ERROR,
      PURCHASES_ERROR_CODE.UNKNOWN_ERROR,
      'something-new',
    ])
      expect(await after(code)).toEqual(['delayed', true]);
  });

  it('opens one purchase at a time (a second tap starts nothing)', async () => {
    const [small] = await loaded();
    let finish: () => void = () => {};
    mockRC.purchase = (p) => new Promise((r) => (finish = () => r(recorded(p))));
    const first = tips.buyTip(small);
    await new Promise((r) => setTimeout(r, 0));
    expect(await tips.buyTip(small)).toBeNull();
    finish();
    expect(await first).toBe('thanks');
    expect(mockRC.purchasePackage).toHaveBeenCalledTimes(1);
    expect(canTip('buying')).toBe(false);
  });

  it('marks a tip unfinished before Apple’s sheet opens, so closing the app mid-purchase is finished next launch', async () => {
    const [small] = await loaded();
    let seen: string | null = null;
    mockRC.purchase = async (p) => {
      seen = await AsyncStorage.getItem(UNSETTLED);
      return recorded(p);
    };
    await tips.buyTip(small);
    expect(seen).not.toBeNull();
  });
});

describe('tips: unfinished tips at launch', () => {
  it('starts RevenueCat at launch for 7 days after an unfinished tip, so it finishes the transaction', async () => {
    const now = Date.parse('2026-11-20T10:00:00Z');
    await AsyncStorage.setItem(UNSETTLED, String(now - 2 * 864e5));
    expect(await tips.startTips(now)).toBe(true);
    expect(mockRC.configure).toHaveBeenCalledTimes(1);
  });

  it('forgets the marker after 7 days, or if it isn’t a time', async () => {
    const now = Date.parse('2026-11-20T10:00:00Z');
    for (const v of [String(now - 8 * 864e5), 'garbage', String(now + 864e5)]) {
      tips.resetTipsForTests();
      await AsyncStorage.setItem(UNSETTLED, v);
      expect(await tips.startTips(now)).toBe(false);
      expect(await AsyncStorage.getItem(UNSETTLED)).toBeNull();
    }
    expect(mockRC.configure).not.toHaveBeenCalled();
  });
});

describe('tips: nothing else changes', () => {
  it('a tip, given or failed, leaves habits, XP and every save byte-for-byte as they were', async () => {
    const saves: Record<string, string> = {
      'schwung-reset-pilot': JSON.stringify({ state: { program: { habits: ['mind_read'], xp: 120 } }, version: 1 }),
      'schwung-journeys': JSON.stringify({ state: { journeys: [] }, version: 2 }),
      'schwung-preferences': JSON.stringify({ state: { reminders: { enabled: true } }, version: 1 }),
    };
    for (const [k, v] of Object.entries(saves)) await AsyncStorage.setItem(k, v);
    const [small, medium] = await loaded();
    await tips.buyTip(small);
    mockRC.purchase = fails(PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR);
    await tips.buyTip(medium);
    mockRC.purchase = fails(PURCHASES_ERROR_CODE.NETWORK_ERROR);
    await tips.buyTip(medium);
    for (const [k, v] of Object.entries(saves)) expect(await AsyncStorage.getItem(k)).toBe(v);
    // Only the unfinished-tip marker may be added (here, after the network error); nothing else is written.
    expect((await AsyncStorage.getAllKeys()).sort()).toEqual([...Object.keys(saves), UNSETTLED].sort());
  });

  it('the pure rules: only a recorded transaction is a thank-you', () => {
    expect(afterPurchase('a', null)).toBe('delayed');
    expect(afterError(undefined)).toEqual({ phase: 'delayed', unsettled: true });
  });
});
