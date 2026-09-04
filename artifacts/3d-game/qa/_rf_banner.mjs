// REFUTATION PROBE — hero-card dwell.
// Instruments the ACTUAL paint: paintBanner() does `bannerEl.innerHTML = html`,
// so an own-property innerHTML setter on #banner catches every paint including
// two in the SAME synchronous frame (a MutationObserver coalesces those and
// would miss them entirely).
//
// Dwell is measured in MATCH SECONDS. On real hardware matchClock ticks at
// clockSpeed 1 off real dt, so 1 match-second == 1 wall-second and the 2.4s CSS
// animation is directly comparable. Wall time is ALSO logged so the software
// renderer's slowdown is visible rather than assumed.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const RUNS = Number(process.argv[3] || 1);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const OUT = {};

for (const wid of WORLDS) {
 for (let run = 0; run < RUNS; run++) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  const BASE = process.env.RF_BASE || 'http://127.0.0.1:4177';
  await p.goto(`${BASE}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; });

  await p.evaluate(() => {
    const be = document.getElementById('banner');
    const ev = document.getElementById('evolve');
    const D = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    window.__bp = [];
    const T = () => window.__matchState?.().t ?? -1;
    Object.defineProperty(be, 'innerHTML', {
      configurable: true,
      get() { return D.get.call(this); },
      set(v) {
        window.__bp.push({ t: +T().toFixed(3), w: +(performance.now() / 1000).toFixed(3),
          txt: String(v).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 64) });
        D.set.call(this, v);
      },
    });
    // the EVOLVE card is the other channel — log when it (re)starts
    window.__ep = [];
    new MutationObserver(() => {
      if (ev.classList.contains('show'))
        window.__ep.push({ t: +T().toFixed(3), w: +(performance.now() / 1000).toFixed(3),
          txt: (ev.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) });
    }).observe(ev, { attributes: true, attributeFilter: ['class'] });

    // drive: greedy nearest edible (same baseline the rhythm probe uses)
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => {
      const vs = window.__voidState(); let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
      }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 1800000 });
  const data = await p.evaluate(() => ({ bp: window.__bp, ep: window.__ep }));
  await p.close();
  OUT[`${wid}#${run}`] = data;

  const bp = data.bp.filter(x => x.t >= 0);
  console.log(`\n${'='.repeat(96)}\n${wid.toUpperCase()} run ${run}   ${bp.length} banner paints, ${data.ep.length} evolve cards`);
  console.log(`${'='.repeat(96)}`);
  console.log('  matchT   wallT   dwell(match)  dwell(wall)  card');
  let short = 0, zero = 0;
  for (let i = 0; i < bp.length; i++) {
    const dM = i + 1 < bp.length ? bp[i + 1].t - bp[i].t : 99;
    const dW = i + 1 < bp.length ? bp[i + 1].w - bp[i].w : 99;
    if (dM < 2.4) short++;
    if (dM < 0.05) zero++;
    const flag = dM < 0.05 ? ' <<ZERO' : dM < 1.4 ? ' <<CUT' : dM < 2.4 ? ' <short' : '';
    console.log(`  ${bp[i].t.toFixed(2).padStart(7)} ${bp[i].w.toFixed(2).padStart(7)}  ${(dM > 90 ? '  -' : dM.toFixed(2)).padStart(11)}  ${(dW > 90 ? '  -' : dW.toFixed(2)).padStart(11)}  ${bp[i].txt}${flag}`);
  }
  const wallSpan = bp.length ? bp.at(-1).w - bp[0].w : 1;
  const matchSpan = bp.length ? bp.at(-1).t - bp[0].t : 1;
  console.log(`\n  under 2.4s: ${short}/${bp.length}   same-frame(<0.05s): ${zero}`);
  console.log(`  sim rate: ${(matchSpan / (wallSpan || 1)).toFixed(3)} match-s per wall-s (1.000 = real device)`);
  console.log(`  EVOLVE cards: ${data.ep.map(e => e.t.toFixed(1) + ' ' + e.txt).join(' | ')}`);
 }
}
fs.writeFileSync(process.env.RF_OUT || '/tmp/rf_banner.json', JSON.stringify(OUT));
await b.close();
