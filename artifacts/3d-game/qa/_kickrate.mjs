// THE SHAKE CENSUS — how often does the camera kit actually fire?
// Owner: "The screen is shaking a ton. Lantern level shakes." The kit is
// gated at bite>0.55 with the comment "a landmark event, never a hoover
// spree" — but bite is a RATIO, so a small void in a dense market crosses it
// constantly. Drives ab.mjs's child driver for N game-seconds and reads
// _dbg.__kickN (window.__kickN via the debug proxy).
//   node qa/_kickrate.mjs [world] [seconds] [port]
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'lantern';
const SECS = Number(process.argv[3] || 60);
const PORT = process.argv[4] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.clear();
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1200);
await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => { window.__renderer.render = () => { }; });
// ab.mjs's child driver, verbatim in spirit: toward nearby food, wobbly aim
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  let heldT = -1, held = null, stall = 0;
  const tick = () => {
    const ms = window.__matchState?.();
    if (!ms) { requestAnimationFrame(tick); return; }
    const vs = window.__voidState();
    if (ms.t - heldT > 2.4) {
      heldT = ms.t;
      const cand = [];
      let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz;
        if (e.radius <= vs.r * 0.92) { if (d < bd) { bd = d; best = { dx, dz }; } }
        if (d < 90000) cand.push({ dx, dz });
      }
      held = best;
      stall = Math.random() < 0.34 ? 1 : 0;
      if (cand.length && Math.random() < 0.30) held = cand[(Math.random() * cand.length) | 0];
    }
    if (held && !stall) {
      let a = Math.atan2(held.dz, held.dx) + (Math.random() - 0.5) * 2.1;
      dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 1, clientX: cx + Math.cos(a) * 110, clientY: cy + Math.sin(a) * 110, bubbles: true }));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await p.waitForFunction((ss) => (window.__matchState?.().t ?? 0) > ss, SECS, { timeout: 900000 });
const r = await p.evaluate(() => ({
  t: window.__matchState().t, kicks: window.__kickN ?? 0, r: window.__voidState().r }));
console.log(`  ${WORLD.padEnd(8)} ${r.kicks} kit firings in ${r.t.toFixed(0)}s  =  ${(r.kicks / (r.t / 60)).toFixed(1)}/min   (ended at r=${r.r.toFixed(1)})`);
await b.close();
