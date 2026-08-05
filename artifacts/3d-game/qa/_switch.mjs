// SCRATCH — what a child pays to CHANGE WORLD. The picker writes
// localStorage.voidWorld and does `location.href = location.pathname`
// (prototype3d.ts:2774): a full page reload, a full island rebuild, and the
// 33-mesh preload gate again. Measured from the tap to a ticking match clock.
// Also runs a fixed JS benchmark IN THE PAGE so the number can be rescaled to
// a device: this box is a shared 2.1GHz Xeon under heavy load.
import { chromium } from 'playwright';
const PORT = process.argv[2] || 4188;
const FROM = process.argv[3] || 'maple';
const TO = process.argv[4] || 'gameday';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--enable-precise-memory-info'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
const bench = async () => p.evaluate(() => { const t = performance.now(); let s = 0;
  for (let i = 0; i < 3e7; i++) s += Math.sqrt(i % 1000); return { ms: +(performance.now() - t).toFixed(0), s: s | 0 }; });

await p.goto(`http://127.0.0.1:${PORT}/?w=${FROM}`, { waitUntil: 'commit' });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
console.log('booted', FROM, ' in-page CPU bench (3e7 sqrt loop):', (await bench()).ms, 'ms  [same loop on this box in node: ~274ms]');

await p.evaluate(() => document.getElementById('btnPlay').click());
await p.waitForTimeout(500);
const t0 = Date.now();
await p.evaluate((to) => {
  const c = document.querySelector(`#worldRow .wCard[data-world="${to}"]`);
  if (!c) throw new Error('no card for ' + to);
  c.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}, TO);
await p.waitForFunction(() => typeof window.__matchState === 'function' && window.__matchState().t > 0.4, null, { timeout: 500000 });
console.log(`TAP "${TO}" → ticking match clock: ${Date.now() - t0} ms wall (software renderer — the render half is inflated)`);
const bt = await p.evaluate(() => window.__bt);
if (bt) { let prev = 0; for (const [n, t] of bt) { console.log(`  ${String(Math.round(t)).padStart(7)}ms  +${String(Math.round(t-prev)).padStart(6)}ms  ${n}`); prev = t; } }
console.log('post-switch CPU bench:', (await bench()).ms, 'ms');
await b.close();
