// REFUTATION probe 2 — does the proposed fix pay what it claims?
// Same match, same seed-ish conditions, gate ON vs gate OFF, measured at the
// loop. Also watches for the two things a naive position gate can break:
// the movers array's first entry is a DUMMY Object3D at the world origin that
// carries pingClock/calmT, and Maple's train mover exposes `get mesh()` which
// returns null for six seconds after the train is eaten.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const WORLD = process.argv[2] || 'lantern';
const GATE = process.argv[3] === 'on' ? true : (process.argv[3] === 'raw' ? 'raw' : false);
const N = +(process.argv[4] || 4);
const UNTIL = +(process.argv[5] || 60);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(([g, n]) => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {}
  window.__GATE = (g === 'raw' ? 'raw' : g); window.__GATEN = n; }, [GATE, N]);
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 600000 });
await p.evaluate(() => {
  window.__renderer.render = () => {};
  window.__MV.length = 0; window.__FR = [];
  const raw = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raw((ts) => {
    const t0 = performance.now(); cb(ts); window.__FR.push(performance.now() - t0); });
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => { const vs = window.__voidState(); let best = null, bd = 1e9;
    for (const e of window.__edibles) { if (e.eaten || !e.mesh?.visible || e.mesh.userData.eaten || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z; const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = { dx, dz }; } }
    if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
    raw(tick); };
  raw(tick);
});
await p.waitForFunction((u) => window.__matchState().t > u, UNTIL, { timeout: 1800000 });
const R = await p.evaluate(() => ({ mv: window.__MV.slice(), fr: window.__FR.slice(),
  d: window.__MVD ? window.__MVD() : null, r: window.__voidState().r, score: window.__matchState().score }));
const q = (a, f) => { const s = [...a].sort((u, v) => u - v); return s[Math.min(s.length - 1, Math.floor(s.length * f))]; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`${WORLD.toUpperCase()}  gate=${GATE ? 'ON N=' + N : 'OFF'}  frames ${R.mv.length}  r=${R.r.toFixed(1)}`);
console.log(`  MOVER LOOP ms mean ${mean(R.mv).toFixed(3)} p50 ${q(R.mv, .5).toFixed(3)} p95 ${q(R.mv, .95).toFixed(3)}`);
console.log(`  FRAME JS   ms mean ${mean(R.fr).toFixed(3)} p50 ${q(R.fr, .5).toFixed(3)} p95 ${q(R.fr, .95).toFixed(3)}`);
console.log(`  peds alive ${R.d?.pedsAlive} near ${R.d?.pedNear140} far ${R.d?.pedFar140}   score ${R.score}`);
console.log(`  page errors: ${errs.length ? errs.slice(0, 3).join(' | ') : 'none'}`);
await b.close();
