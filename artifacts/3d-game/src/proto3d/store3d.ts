// VOIDLING 3D — the App Store bridge.
//
// The shop has shown seven legendary skins behind "COMING SOON" since it was
// built. No purchase code shipped with the 3D game at all, so a child who
// tapped a $9.99 card got a joke and the game got nothing. This is the real
// StoreKit path, via cordova-plugin-purchase inside the Capacitor shell.
//
// Two deliberate decisions:
//
//  1. THE WEB BUILD DOES NOT GRANT. The 2D bridge fell back to a sandbox mock
//     that simply handed the skin over after 600ms on any non-native platform.
//     That is fine for a prototype and wrong for a live URL: voidling is
//     playable on the open web, so the mock would have given away every paid
//     skin to anyone who found the page. On web the button says where to buy
//     it and nothing changes hands. `?iapmock=1` re-enables the mock for
//     testing, and only then.
//
//  2. NOTHING IS TRUSTED TO LOCAL STORAGE ALONE. Ownership is whatever
//     StoreKit says it is on this device; the local set is a cache that
//     RESTORE PURCHASES rebuilds. That is also the App Review requirement —
//     a non-consumable product must be restorable without paying twice.
import { track } from './telemetry';

/** skin id → App Store product id. Non-consumable, one per legendary skin. */
export const IAP_PRODUCTS: Record<string, string> = {
  univoid: 'com.voidling.skin.univoid',
  rexling: 'com.voidling.skin.rexling',
  kingvoid: 'com.voidling.skin.kingvoid',
  drako: 'com.voidling.skin.drako',
  shadowninja: 'com.voidling.skin.shadowninja',
};

type Offer = { order(): Promise<unknown> };
type Product = { getOffer?(): Offer | undefined; pricing?: { price?: string }; owned?: boolean };
type StoreApi = {
  register(p: Array<{ id: string; type: string; platform: string }>): void;
  initialize(platforms: string[]): Promise<unknown>;
  when(): { approved(cb: (tx: Tx) => void): unknown; productUpdated(cb: () => void): unknown };
  get(id: string, platform?: string): Product | undefined;
  restorePurchases(): Promise<unknown>;
};
type Tx = { products: Array<{ id: string }>; finish(): void };

const isNative = (): boolean =>
  !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.();

/** Testing escape hatch: only ?iapmock=1 lets the web build grant a skin. */
const mockAllowed = (): boolean =>
  new URLSearchParams(location.search).get('iapmock') === '1';

let store: StoreApi | null = null;
let ready = false;
let onOwnedChange: ((skinIds: string[]) => void) | null = null;
let onPricesChange: (() => void) | null = null;

function skinIdFor(productId: string): string | null {
  for (const [skin, pid] of Object.entries(IAP_PRODUCTS)) if (pid === productId) return skin;
  return null;
}

/** True once StoreKit is live and can actually take money. */
export function iapReady(): boolean { return ready; }

/** True when this build has any way to complete a purchase at all. */
export function iapAvailable(): boolean { return isNative() || mockAllowed(); }

/**
 * Bring StoreKit up. Safe to call once at boot on any platform — it no-ops on
 * the web unless the mock is explicitly requested.
 */
export function initIAP(onOwned: (skinIds: string[]) => void, onPrices?: () => void): void {
  onOwnedChange = onOwned;
  onPricesChange = onPrices ?? null;
  if (!isNative() || store) return;
  void (async () => {
    try {
      // the plugin attaches window.CdvPurchase after Cordova's deviceready
      const w = window as unknown as {
        CdvPurchase?: { store: StoreApi; ProductType: Record<string, string>; Platform: Record<string, string> };
      };
      for (let i = 0; i < 60 && !w.CdvPurchase; i++) await new Promise((r) => setTimeout(r, 100));
      const cdv = w.CdvPurchase;
      if (!cdv) { track('iap_init_failed', { why: 'plugin_missing' }); return; }
      store = cdv.store;
      store.register(Object.values(IAP_PRODUCTS).map((id) => ({
        id, type: cdv.ProductType.NON_CONSUMABLE, platform: cdv.Platform.APPLE_APPSTORE,
      })));
      store.when().approved((tx: Tx) => {
        const skins: string[] = [];
        for (const pr of tx.products) {
          const skin = skinIdFor(pr.id);
          if (skin) skins.push(skin);
        }
        // ALWAYS finish. An unfinished transaction is replayed on every launch
        // and is a hard App Review failure.
        tx.finish();
        if (skins.length) onOwnedChange?.(skins);
        track('purchase_complete', { skins, sandbox: false });
      });
      // prices arrive asynchronously — repaint the shop when they land, so a
      // child in France sees "4,99 €" rather than the hard-coded dollars
      store.when().productUpdated(() => onPricesChange?.());
      await store.initialize([cdv.Platform.APPLE_APPSTORE]);
      ready = true;
      track('iap_ready', { products: Object.keys(IAP_PRODUCTS).length });
    } catch (e) {
      store = null;
      track('iap_init_failed', { why: String(e).slice(0, 120) });
    }
  })();
}

/** The store's own localized price string, or null to fall back to USD. */
export function iapPrice(skinId: string): string | null {
  const pid = IAP_PRODUCTS[skinId];
  if (!store || !pid) return null;
  try { return store.get(pid)?.pricing?.price ?? null; } catch { return null; }
}

export type BuyResult = 'started' | 'granted' | 'unavailable' | 'not_ready' | 'failed';

// How long to wait for StoreKit before giving up on a tap. Initialisation
// takes a few seconds from a cold launch and longer on a poor connection.
const READY_WAIT_MS = 8000;
/** Resolve once StoreKit has finished initialising, or on timeout. */
async function waitReady(): Promise<boolean> {
  if (ready) return true;
  const until = Date.now() + READY_WAIT_MS;
  while (!ready && Date.now() < until) await new Promise((r) => setTimeout(r, 150));
  return ready;
}

/**
 * Begin a purchase.
 *  • 'started'     — StoreKit has the sheet; ownership arrives via the callback
 *  • 'granted'     — mock build only, skin handed over immediately
 *  • 'unavailable' — this platform cannot buy (the web); tell the player where
 *  • 'not_ready'   — native, but StoreKit has not finished initialising
 *  • 'failed'      — the order was refused or threw
 *
 * 'not_ready' exists because the old code folded it into 'unavailable', and the
 * shop rendered that as "COMING TO THE APP STORE!" — on a shipping build, in
 * the App Store, during the first several seconds of every launch and any time
 * the network is poor. That is exactly when a reviewer taps it.
 */
export async function purchase(skinId: string, usd: number): Promise<BuyResult> {
  track('purchase_intent', { skin: skinId, usd, native: isNative(), ready });
  const pid = IAP_PRODUCTS[skinId];
  // a native build with a store still warming up: wait for it rather than
  // telling a paying customer the product does not exist
  if (store && pid && !ready) {
    if (!(await waitReady())) { track('purchase_not_ready', { skin: skinId }); return 'not_ready'; }
  }
  if (store && pid && ready) {
    try {
      const offer = store.get(pid)?.getOffer?.();
      if (!offer) { track('purchase_failed', { skin: skinId, why: 'no_offer' }); return 'failed'; }
      await offer.order();
      return 'started';
    } catch (e) {
      track('purchase_failed', { skin: skinId, why: String(e).slice(0, 120) });
      return 'failed';
    }
  }
  if (mockAllowed()) {
    await new Promise((r) => setTimeout(r, 500));
    onOwnedChange?.([skinId]);
    track('purchase_complete', { skins: [skinId], sandbox: true });
    return 'granted';
  }
  return 'unavailable';
}

/**
 * App Review requirement: a user-triggered restore that costs nothing.
 *
 * This lied in BOTH directions. `if (!store || !ready) return false` reported
 * "NOTHING TO RESTORE" without ever contacting StoreKit — which is what a tap
 * in the first seconds after launch did. And the success branch returned true
 * whether or not a single transaction came back, so a fresh install with no
 * purchases was told "RESTORED ✓". "We were unable to restore our purchase" is
 * one of the most common in-app-purchase rejections there is.
 *
 * It now waits for the store, and answers on whether ownership actually
 * changed, not on whether the call threw.
 */
export type RestoreResult = 'restored' | 'nothing' | 'not_ready' | 'failed';
export async function restorePurchases(): Promise<RestoreResult> {
  track('restore_tap', { native: isNative(), ready });
  if (!store) return 'not_ready';
  if (!ready && !(await waitReady())) return 'not_ready';
  let gained = 0;
  const prev = onOwnedChange;
  onOwnedChange = (ids) => { gained += ids.length; prev?.(ids); };
  try {
    await store!.restorePurchases();
    // StoreKit delivers restored transactions through the approved handler,
    // which lands asynchronously — give it a moment before answering.
    await new Promise((r) => setTimeout(r, 1200));
    return gained > 0 ? 'restored' : 'nothing';
  } catch {
    return 'failed';   // user cancelled, or no network
  } finally {
    onOwnedChange = prev;
  }
}
