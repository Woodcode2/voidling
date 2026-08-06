// SCRATCH — WHAT ART IS ACTUALLY MISSING FROM THE SHIPPING BUILD.
//
// The shop advertises five $2.99 character skins and five coin skins with
// texture wraps. Every one of those images is referenced by an absolute
// same-origin path (/assets/hf/…). Inside the Capacitor shell there is no CDN
// and no origin but the bundle, so anything not in dist/ is a 404 on a real
// phone. This probe opens the shop, waits for the grid, and reports every
// request the page made that did not come back 200 — plus, for each skin card,
// whether its art layer actually painted.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('./qa-out/missart/', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
const bad = [];
p.on('response', async (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url().replace('http://127.0.0.1:4177', '')}`); });
p.on('requestfailed', (r) => bad.push(`FAIL ${r.url().replace('http://127.0.0.1:4177', '')}`));
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.clear();
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidCoins', '3000');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto('http://127.0.0.1:4177/?iapmock=1', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => { try { window.__renderer.render = () => {}; } catch {} });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnShop');
await p.waitForTimeout(4000);

// Every card's art layer: does its background-image resolve to real pixels?
const cards = await p.evaluate(async () => {
  const out = [];
  for (const c of document.querySelectorAll('#shopGrid .sCard, #shopGrid .card, #shopGrid > div')) {
    const lay = c.querySelector('.artLay');
    const name = (c.querySelector('.nm, .name') || c).textContent.replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!lay) { out.push({ name, art: 'NO ART LAYER' }); continue; }
    const url = getComputedStyle(lay).backgroundImage.replace(/^url\(["']?|["']?\)$/g, '');
    const ok = await new Promise((res) => { const i = new Image();
      i.onload = () => res(i.naturalWidth > 2); i.onerror = () => res(false); i.src = url;
      setTimeout(() => res('timeout'), 5000); });
    out.push({ name, url: url.split('/').pop(), painted: ok });
  }
  return out;
});

console.log('\n══ SHOP CARDS ══');
for (const c of cards) console.log(`  ${c.painted === true ? 'OK   ' : 'BROKEN'} ${String(c.name).padEnd(34)} ${c.url ?? c.art}`);
console.log(`\n  ${cards.filter(c => c.painted !== true).length} of ${cards.length} cards have no art.`);

console.log('\n══ NON-200 REQUESTS DURING BOOT + SHOP ══');
const uniq = [...new Set(bad)];
for (const u of uniq) console.log('  ' + u);
console.log(`  ${uniq.length} distinct failures.`);
await p.screenshot({ path: './qa-out/missart/shop.png', fullPage: false });
await b.close();
