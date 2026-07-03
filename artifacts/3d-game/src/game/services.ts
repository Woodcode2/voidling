import { meta } from './meta';

export const track = (event: string, props: any = {}) => {
  console.log(`[Analytics] ${event}`, props);
  // Stub for actual tracking
  const queue = JSON.parse(localStorage.getItem('voidling_events') || '[]');
  queue.push({ event, props, time: Date.now() });
  if (queue.length > 50) queue.shift();
  localStorage.setItem('voidling_events', JSON.stringify(queue));
};

export const AdService = {
  async showRewarded(placement: string): Promise<boolean> {
    track('ad_offer', { placement });
    return new Promise((resolve) => {
      // Mock ad overlay
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.backgroundColor = 'rgba(0,0,0,0.9)';
      overlay.style.color = 'white';
      overlay.style.display = 'flex';
      overlay.style.flexDirection = 'column';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '9999';
      overlay.innerHTML = `
        <h2 style="font-family: Fredoka, sans-serif; font-size: 24px;">Ad Playing...</h2>
        <p style="font-family: Nunito, sans-serif; margin-top: 10px;" id="ad-timer">3</p>
      `;
      document.body.appendChild(overlay);

      let timer = 3;
      const interval = setInterval(() => {
        timer--;
        const el = document.getElementById('ad-timer');
        if (el) el.innerText = timer.toString();
        if (timer <= 0) {
          clearInterval(interval);
          document.body.removeChild(overlay);
          track('ad_complete', { placement });
          resolve(true);
        }
      }, 1000);
    });
  },

  showInterstitial() {
    if (meta.data.removeAds) return;
    // Mock interstitial cap
    // ...
  }
};

export const IAPService = {
  buy(sku: string) {
    track('iap_click', { sku });
    return new Promise((resolve) => {
      // Mock purchase
      setTimeout(() => {
        if (sku === 'remove_ads') {
          meta.data.removeAds = true;
          meta.save();
        } else if (sku === 'starter_pack') {
          meta.addCoins(2000);
          meta.unlockSkin('premium');
        }
        resolve(true);
      }, 500);
    });
  }
};
