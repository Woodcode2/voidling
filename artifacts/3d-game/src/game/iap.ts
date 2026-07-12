// Real IAP bridge (Machine round) — StoreKit via cordova-plugin-purchase on
// iOS, sandbox mock on web so the whole flow stays testable in a browser.
//
// Product ids follow com.voidling.skin.<id> (non-consumable). Finish setup in
// App Store Connect per APPSTORE.md ("In-App Purchases" section).
import { track } from './services';

export const IAP_PRODUCTS: Record<string, string> = {
  galaxy: 'com.voidling.skin.galaxy',
  lava:   'com.voidling.skin.lava',
  ghost:  'com.voidling.skin.ghost',
  midas:  'com.voidling.skin.midas',
  disco:  'com.voidling.skin.disco',
  dragon: 'com.voidling.skin.dragon',
};

type StoreApi = {
  register(p: Array<{ id: string; type: string; platform: string }>): void;
  initialize(platforms: string[]): Promise<unknown>;
  when(): {
    approved(cb: (tx: { products: Array<{ id: string }>; finish(): void }) => void): StoreApi['when'] extends () => infer R ? R : never;
    productUpdated(cb: () => void): unknown;
  };
  get(id: string, platform?: string): { getOffer?(): { order(): Promise<unknown> } | undefined; pricing?: { price?: string } } | undefined;
  restorePurchases(): Promise<unknown>;
};

let store: StoreApi | null = null;
let initPromise: Promise<void> | null = null;
const owned = new Set<string>();
let onOwnedChange: ((skinIds: string[]) => void) | null = null;

const isNative = (): boolean =>
  !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

function skinIdFor(productId: string): string | null {
  for (const [skin, pid] of Object.entries(IAP_PRODUCTS)) if (pid === productId) return skin;
  return null;
}

/** Initialize StoreKit (native only). Safe to call repeatedly. */
export function initIAP(onChange: (ownedSkinIds: string[]) => void): void {
  onOwnedChange = onChange;
  if (!isNative() || initPromise) return;
  initPromise = (async () => {
    try {
      // cordova-plugin-purchase exposes window.CdvPurchase after deviceready
      const w = window as unknown as { CdvPurchase?: { store: StoreApi; ProductType: Record<string, string>; Platform: Record<string, string> } };
      // wait up to 5s for the plugin to attach
      for (let i = 0; i < 50 && !w.CdvPurchase; i++) await new Promise((r) => setTimeout(r, 100));
      const cdv = w.CdvPurchase;
      if (!cdv) { console.warn('[iap] plugin missing — mock mode'); return; }
      store = cdv.store;
      store.register(Object.values(IAP_PRODUCTS).map((id) => ({
        id, type: cdv.ProductType.NON_CONSUMABLE, platform: cdv.Platform.APPLE_APPSTORE,
      })));
      (store.when() as unknown as { approved(cb: (tx: { products: Array<{ id: string }>; finish(): void }) => void): void }).approved((tx) => {
        for (const p of tx.products) {
          const skin = skinIdFor(p.id);
          if (skin) owned.add(skin);
        }
        tx.finish(); // ALWAYS finish transactions (App Store requirement)
        onOwnedChange?.([...owned]);
        track('purchase_complete', { products: tx.products.map((p) => p.id) });
      });
      await store.initialize([cdv.Platform.APPLE_APPSTORE]);
      console.log('[iap] StoreKit initialized');
    } catch (e) {
      console.warn('[iap] init failed — mock mode', e);
      store = null;
    }
  })();
}

/** Localized price for a skin's product, or null (falls back to config USD). */
export function iapPrice(skinId: string): string | null {
  const pid = IAP_PRODUCTS[skinId];
  if (!store || !pid) return null;
  try { return store.get(pid)?.pricing?.price ?? null; } catch { return null; }
}

/** Launch a purchase. Resolves true on success (mock resolves after 600ms on web). */
export async function purchase(skinId: string): Promise<boolean> {
  track('purchase_intent', { skin: skinId, native: isNative() });
  const pid = IAP_PRODUCTS[skinId];
  if (store && pid) {
    try {
      const offer = store.get(pid)?.getOffer?.();
      if (!offer) return false;
      await offer.order();
      // resolution happens via the approved() handler; report initiated
      return true;
    } catch (e) {
      track('purchase_failed', { skin: skinId, err: String(e).slice(0, 120) });
      return false;
    }
  }
  // Web sandbox: simulate the flow so the shop remains fully testable
  await new Promise((r) => setTimeout(r, 600));
  owned.add(skinId);
  onOwnedChange?.([...owned]);
  track('purchase_complete', { products: [pid ?? skinId], sandbox: true });
  return true;
}

/** App Store requirement: user-triggered restore of prior purchases. */
export async function restorePurchases(): Promise<void> {
  track('restore_tap', {});
  if (store) { try { await store.restorePurchases(); } catch { /* user cancelled */ } }
}
