// STORE AUDIT probe 5 (scratch): CAN A REVIEWER GET OUT OF THE FIRST MATCH?
// First launch hides the menu outright (prototype3d.ts:2682 menuEl.style
// .display='none') and drops straight into a 3-minute match. App Review has to
// reach the shop to test the five non-consumables and RESTORE PURCHASES;
// "we were unable to locate the in-app purchases" is a stock rejection.
// This walks the exact path a reviewer would: pause → LEAVE → look for SHOP.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
p.on('pageerror', (e) => console.log('  PAGE ERROR', String(e).slice(0, 140)));
// NOTHING seeded — a virgin device.
await p.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2, null, { timeout: 400000 });

const state = async (tag) => {
  const s = await p.evaluate(() => ({
    menuDisplay: getComputedStyle(document.getElementById('menu')).display,
    bodyMenu: document.body.classList.contains('menu'),
    shown: [...document.querySelectorAll('.show')].map((e) => e.id).filter(Boolean),
    t: +(window.__matchState?.().t ?? -1).toFixed(1),
    clickable: [...document.querySelectorAll('button')]
      .filter((e) => getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && e.getBoundingClientRect().width > 8)
      .map((e) => `${e.id || '.' + e.className}:${(e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 22)}`),
  }));
  console.log(tag, JSON.stringify(s, null, 1));
  return s;
};
console.log('--- mid first match ---'); await state('in-match');

// the ⌂ button
const homeId = await p.evaluate(() => {
  const q = document.getElementById('btnQuit');
  const r = q?.getBoundingClientRect();
  return q ? { vis: q.offsetParent !== null, rect: r && [r.x|0, r.y|0, r.width|0, r.height|0], disp: getComputedStyle(q).display } : null;
});
console.log('btnQuit:', JSON.stringify(homeId));
await p.evaluate(() => document.getElementById('btnQuit')?.click());
await p.waitForTimeout(1200);
console.log('--- after tapping ⌂ ---'); await state('paused');
await p.screenshot({ path: 'qa-out/store/pause.png' });

// LEAVE
const left = await p.evaluate(() => {
  const c = document.getElementById('pauseQuit');
  if (!c) return false; c.click(); return true;
});
console.log('found LEAVE:', left);
await p.waitForTimeout(4000);
console.log('--- after LEAVE ---'); const after = await state('left');
await p.screenshot({ path: 'qa-out/store/after-leave.png' });
console.log('\nSHOP reachable after leaving first match:',
  after.clickable.some((c) => /shop/i.test(c)) ? 'YES' : 'NO  <<< reviewer is stuck');
console.log('voidPlayed:', await p.evaluate(() => localStorage.getItem('voidPlayed')));
await b.close();
