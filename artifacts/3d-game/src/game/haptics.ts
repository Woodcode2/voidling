// iOS haptics (Capacitor). No-ops on web: the plugin only loads when running
// inside a native Capacitor shell, so the web bundle pays zero cost.
type Impact = (style: 'Light' | 'Medium' | 'Heavy') => void;

let impact: Impact | null = null;
let lastEat = 0;

void (async () => {
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    impact = (style) => { void Haptics.impact({ style: ImpactStyle[style] }).catch(() => {}); };
  } catch { /* not a native shell */ }
})();

export const haptics = {
  /** Eat pop — throttled to 90ms so WORLD ENDER feeding sprees buzz, not saw. */
  eat() {
    const n = performance.now();
    if (n - lastEat > 90) { lastEat = n; impact?.('Light'); }
  },
  evolve() { impact?.('Medium'); },
  power() { impact?.('Medium'); },
  knockout() { impact?.('Heavy'); },
  /** Power-meter ready — a light DOUBLE tick, distinct from the single fire buzz. */
  ready() {
    if (navigator.vibrate) navigator.vibrate([0, 25, 40, 25]);
    impact?.('Light');
    setTimeout(() => impact?.('Light'), 45);
  },
};
