// Does the CROWD still talk after the first banner card?
//
// FAILS BEFORE the bubbles.ts fix (round 5, refute-cards, 2026-09-02):
// bubbles.say() gated crowd speech on #banner's `show` class, and the bnr
// animation never removes that class — it ends at opacity 0 with `forwards`
// and only a re-paint or the match reset clears it. So from the first card to
// the whistle no crowd bubble showed: measured 0 after the first paint in
// three matches on two worlds (t=4.6, 16.6, 7.6), against 2-8 before it.
// PASSES AFTER: the gate reads the banner's computed opacity, so a card that
// has faded no longer silences the town.
//
//   node qa/bannergag.mjs [port] [world]
// Rendering is stubbed once the match starts (DOM only from there), so the
// match clock runs near wall speed; the greedy bot from qa/_rf_banner.mjs
// drives so the town has something to react to.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177', WORLD = process.argv[3] || 'maple';
const WINDOW = 45;   // match-seconds observed after the first card paints
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidFirstNom', '1'); localStorage.setItem('voidMute', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

await p.evaluate(() => {
  const T = () => window.__matchState?.().t ?? -1;
  const S = window.__S = { firstPaint: null, paints: 0, crowd: [], rival: 0 };
  // every banner paint goes through innerHTML (the trick qa/_rf_banner.mjs uses)
  const be = document.getElementById('banner');
  const D = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(be, 'innerHTML', { configurable: true,
    get() { return D.get.call(this); },
    set(v) { S.paints++; if (S.firstPaint === null) S.firstPaint = T(); D.set.call(this, v); } });
  new MutationObserver((muts) => { for (const m of muts) {
    const el = m.target; if (!el.classList) continue;
    if (el.classList.contains('vb') && el.classList.contains('show')) {
      if (/rival/.test(el.className)) { S.rival++; continue; }   // the family's own lines are not the crowd
      const txt = el.textContent.trim(); const last = S.crowd.at(-1);
      if (txt && !(last && last.txt === txt && Math.abs(last.t - T()) < 0.2)) S.crowd.push({ t: +T().toFixed(2), txt: txt.slice(0, 50) });
    }
  } }).observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
  // greedy nearest-edible bot, verbatim from qa/_rf_banner.mjs
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const bot = () => {
    const vs = window.__voidState(); let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
    requestAnimationFrame(bot);
  };
  requestAnimationFrame(bot);
  window.__renderer.render = () => {};   // DOM only from here: the clock runs at wall speed
});
await p.waitForFunction((W) => { const S = window.__S; const t = window.__matchState?.().t ?? 0;
  return S.firstPaint !== null && t > S.firstPaint + W; }, WINDOW, { timeout: 900000 });
const S = await p.evaluate(() => window.__S);
await b.close();
const after = S.crowd.filter((x) => x.t > S.firstPaint + 0.5), before = S.crowd.length - after.length;
console.log(`\n══ ${WORLD.toUpperCase()} ══  first banner paint at t=${S.firstPaint.toFixed(2)}, ${S.paints} paints in the next ${WINDOW}s`);
console.log(`  crowd bubbles before the first card: ${before}   after it: ${after.length}   (rival lines, not counted: ${S.rival})`);
for (const x of after.slice(0, 4)) console.log(`    t=${x.t}  "${x.txt}"`);
if (S.paints < 2) { console.log('BANNERGAG: FAIL — the banner painted fewer than twice; the gag was never exercised (wrong reason)'); process.exit(1); }
console.log(after.length > 0
  ? `BANNERGAG: PASS — the town keeps talking after the cards start (${after.length} crowd bubbles in ${WINDOW}s)`
  : `BANNERGAG: FAIL — not one crowd bubble after the first card: #banner's show class gags bubbles.say() for the rest of the match`);
process.exit(after.length > 0 ? 0 : 1);
