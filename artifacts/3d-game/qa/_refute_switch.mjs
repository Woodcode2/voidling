// REFUTE-SWITCH — is a world switch really "the entire cold start again"?
// Measures, in ONE browser (the honest comparison: a child's switch happens in
// a warm browser, never a cold one):
//   A) true cold boot  : nav → __voidState → tap PLAY → tap the SAME world card
//                        (launchWorld, no reload) → ticking clock
//   B) the world switch: tap a DIFFERENT card → reload → ticking clock
// Plus a resource-timing breakdown after the reload so we can say whether the
// 33 pack GLBs were re-DOWNLOADED or served from cache, and a navigation-timing
// split so bundle-parse is separated from island build.
import { chromium } from 'playwright';
const PORT = process.argv[2] || 4191;
const FROM = process.argv[3] || 'maple';
const TO   = process.argv[4] || 'gameday';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--enable-precise-memory-info'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));

const nav = () => p.evaluate(() => {
  const n = performance.getEntriesByType('navigation')[0];
  return { type: n.type, domInteractive: Math.round(n.domInteractive),
    dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) };
});
const glbs = () => p.evaluate(() => {
  const rs = performance.getEntriesByType('resource').filter(r => /\.glb(\?|$)/i.test(r.name));
  const cached = rs.filter(r => r.transferSize === 0 && r.decodedBodySize > 0).length;
  const bytes = rs.reduce((s, r) => s + r.transferSize, 0);
  return { n: rs.length, cached, transferred: bytes,
    decoded: rs.reduce((s, r) => s + r.decodedBodySize, 0),
    slowest: Math.round(Math.max(0, ...rs.map(r => r.duration))) };
});
// what the child is looking at: is the load cover up, and what does the bar say
const cover = () => p.evaluate(() => {
  const s = document.getElementById('loadScr');
  return { up: !!s && s.classList.contains('show') && getComputedStyle(s).opacity > 0.02,
    pct: (document.getElementById('lPct')||{}).textContent || '' };
});

// ── A: cold boot ────────────────────────────────────────────────────────────
const a0 = Date.now();
await p.goto(`http://127.0.0.1:${PORT}/?w=${FROM}`, { waitUntil: 'commit' });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 900000 });
const aIsland = Date.now() - a0;
console.log('COLD  nav→__voidState (island built):', aIsland, 'ms   navtiming', JSON.stringify(await nav()));
await p.evaluate(() => document.getElementById('btnPlay').click());
await p.waitForTimeout(400);
await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)
  .dispatchEvent(new MouseEvent('click', { bubbles: true })), FROM);
await p.waitForFunction(() => typeof window.__matchState === 'function' && window.__matchState().t > 0.4,
  null, { timeout: 900000 });
const aTotal = Date.now() - a0;
console.log('COLD  nav→ticking match clock       :', aTotal, 'ms');
console.log('COLD  glb resources                 :', JSON.stringify(await glbs()));

// WARM boot of the same world — this is the state a child is actually in when
// they reach the picker a second time, and it is the fair baseline for the
// reload path (same browser, HTTP cache warm, V8 code cache warm).
const w0 = Date.now();
await p.goto(`http://127.0.0.1:${PORT}/?w=${FROM}`, { waitUntil: 'commit' });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 900000 });
console.log('\nWARM  nav→__voidState (island built):', Date.now() - w0, 'ms   navtiming', JSON.stringify(await nav()));

// ── B: the world switch ─────────────────────────────────────────────────────
await p.evaluate(() => document.getElementById('btnPlay').click());
await p.waitForTimeout(400);
const b0 = Date.now();
await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)
  .dispatchEvent(new MouseEvent('click', { bubbles: true })), TO);
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 900000 });
const bIsland = Date.now() - b0;
console.log('\nSWITCH tap→__voidState (island built):', bIsland, 'ms   navtiming', JSON.stringify(await nav()));
console.log('SWITCH cover state right now        :', JSON.stringify(await cover()));
await p.waitForFunction(() => typeof window.__matchState === 'function' && window.__matchState().t > 0.4,
  null, { timeout: 900000 });
const bTotal = Date.now() - b0;
console.log('SWITCH tap→ticking match clock      :', bTotal, 'ms');
console.log('SWITCH glb resources                :', JSON.stringify(await glbs()));
console.log(`\nRATIO switch/cold  island ${(bIsland/aIsland).toFixed(2)}x   to-clock ${(bTotal/aTotal).toFixed(2)}x`);
await b.close();
