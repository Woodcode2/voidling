// STORE AUDIT probe (scratch). Three things a reviewer will do in the first
// minute, measured rather than assumed:
//   1. cold boot with NO seeded storage — what a reviewer's device does — and
//      log EVERY outbound request for 20s of match clock. This is the privacy
//      nutrition label's evidence.
//   2. shoot the menu at the exact App Store size so it can be diffed against
//      store/01-menu.png (which is the retired 2D game).
//   3. walk to the shop, tap a paid skin, and photograph what a reviewer sees
//      on the web build (the shell they will NOT see, but the gate is shared).
import fs from 'node:fs';
import { chromium } from 'playwright';

const OUT = 'qa-out/store';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
});
// 430x932 @3 == 1290x2796, the 6.9" App Store slot
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

const reqs = [];
p.on('request', (r) => reqs.push({ url: r.url(), method: r.method() }));
const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
const console404 = [];
p.on('response', (r) => { if (r.status() >= 400) console404.push(`${r.status()} ${r.url()}`); });

// NO addInitScript seeding: a cold, first-ever launch, which is the state a
// reviewer's device is in.
await p.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForTimeout(8000);

const origin = new URL('http://127.0.0.1:4177/').origin;
const offsite = reqs.filter((r) => !r.url.startsWith(origin) && !r.url.startsWith('data:') && !r.url.startsWith('blob:'));
console.log('=== COLD BOOT, NO CONSENT ===');
console.log('total requests:', reqs.length, '| OFF-ORIGIN:', offsite.length);
for (const r of offsite.slice(0, 20)) console.log('  OFFSITE', r.method, r.url.slice(0, 140));
console.log('non-2xx/3xx responses:', console404.length);
for (const s of console404.slice(0, 25)) console.log('  ', s.slice(0, 140));
console.log('page errors:', errs.length); for (const e of errs.slice(0, 5)) console.log('  ', e);

// what the first screen actually is
const first = await p.evaluate(() => {
  const shown = [...document.querySelectorAll('.show')].map((e) => e.id).filter(Boolean);
  const btns = [...document.querySelectorAll('#menu button, #menu .btn, #menu [id^=btn]')]
    .filter((e) => e.offsetParent !== null)
    .map((e) => (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40));
  return { shown, btns, title: document.title };
});
console.log('\n=== FIRST SCREEN ===');
console.log('modals shown:', JSON.stringify(first.shown));
console.log('visible menu buttons:', JSON.stringify(first.btns, null, 0));

await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
}));
await p.waitForTimeout(2500);
await p.screenshot({ path: `${OUT}/menu-1290x2796.png` });
console.log('\nwrote', `${OUT}/menu-1290x2796.png`);

// ── the shop, as a reviewer reaches it ──────────────────────────────────────
await p.evaluate(() => document.getElementById('btnShop')?.click());
await p.waitForTimeout(2000);
await p.screenshot({ path: `${OUT}/shop.png` });
const shopInfo = await p.evaluate(() => {
  const cards = [...document.querySelectorAll('#shopGrid .skCard')];
  const legend = cards.filter((c) => c.classList.contains('legend'));
  return {
    cards: cards.length,
    legends: legend.length,
    legendLabels: legend.map((c) => (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70)),
    restore: document.getElementById('btnRestore')?.textContent?.trim(),
  };
});
console.log('\n=== SHOP ===');
console.log(JSON.stringify(shopInfo, null, 2));

// tap the first legendary card → preview → BUY
await p.evaluate(() => document.querySelector('#shopGrid .skCard.legend')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
await p.waitForTimeout(1400);
await p.screenshot({ path: `${OUT}/skin-preview.png` });
const prev = await p.evaluate(() => ({
  act: document.getElementById('spAct')?.textContent?.trim(),
  vis: document.getElementById('skinPrev')?.classList.contains('show'),
}));
console.log('preview action button:', JSON.stringify(prev));

await p.evaluate(() => document.getElementById('spAct')?.click());
await p.waitForTimeout(1200);
const gate = await p.evaluate(() => ({
  shown: document.getElementById('gate')?.classList.contains('show'),
  sum: document.getElementById('gateSum')?.textContent,
  inputType: document.getElementById('gateIn')?.getAttribute('type'),
  inputMode: document.getElementById('gateIn')?.getAttribute('inputmode'),
  body: (document.getElementById('gate')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240),
}));
console.log('\n=== PARENTAL GATE (buy path) ===');
console.log(JSON.stringify(gate, null, 2));
await p.screenshot({ path: `${OUT}/gate.png` });

// ── settings panel: the privacy row + stats row ─────────────────────────────
await p.evaluate(() => {
  document.getElementById('gateNo')?.click();
  document.getElementById('skinPrev')?.classList.remove('show');
  document.getElementById('shop')?.classList.remove('show');
});
await p.waitForTimeout(600);
await p.evaluate(() => document.getElementById('btnSettings')?.click());
await p.waitForTimeout(1200);
const set = await p.evaluate(() => ({
  rows: [...document.querySelectorAll('#settings .row, #settings [id^=set]')]
    .map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
}));
console.log('\n=== SETTINGS ROWS ===');
console.log(JSON.stringify(set.rows, null, 2));
await p.screenshot({ path: `${OUT}/settings.png` });

console.log('\ndone');
await b.close();
