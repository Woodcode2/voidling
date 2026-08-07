// WHEN DOES EACH RECORDED SOUND ACTUALLY ARRIVE?
//
// audio3d.ts:137 `sample()` returns FALSE on its first call for a name — it
// kicks off the fetch and lets the synth fallback play. So the first time a
// moment happens in a session it makes a different sound from every later
// time. This logs the request timestamp for every /assets/audio file against
// the match clock, so "the first X in a session plays the placeholder" is a
// measurement and not a reading of the code.
import { chromium } from 'playwright';
const PORT = process.argv[3] || '4231';
const WORLD = process.argv[2] || 'maple';
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
    '--autoplay-policy=no-user-gesture-required'],
});
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
const reqs = [];
p.on('request', r => {
  const u = r.url();
  if (u.includes('/assets/audio/')) reqs.push({ url: u.split('/').pop(), w: Date.now() });
});
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '0');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { /* private */ }
});
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => { window.__pinQuality(0); window.__renderer.render = () => {}; });
await p.evaluate(() => {
  const W = window;
  W.__log = [];
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => {
    const vs = W.__voidState(); let best = null, bd = 1e9;
    for (const e of W.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
      cv.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + (best.dx / m) * 70, clientY: cy + (best.dz / m) * 70, bubbles: true })); }
    setTimeout(tick, 100);
  };
  tick();
  // stamp wall time against match time twice a second so the request log can
  // be resolved onto the match clock
  setInterval(() => W.__log.push({ w: Date.now(), t: +W.__matchState().t.toFixed(2) }), 500);
  // ── HIT-STOP, measured ────────────────────────────────────────────────────
  // hitStop() multiplies the world timestep by 0.06 for 55-105 ms. Nothing
  // else in the build collapses match time against wall time mid-match, so a
  // frame whose match-seconds-per-wall-second drops below 0.35 IS a hit-stop.
  W.__stall = []; W.__rates = [];
  let tPrev = null, wPrev = null;
  const rl = () => {
    const t = W.__matchState().t, w = performance.now();
    if (tPrev !== null && w > wPrev) {
      const rate = (t - tPrev) / ((w - wPrev) / 1000);
      W.__rates.push(+rate.toFixed(3));
      if (rate < 0.35 && rate > -1) W.__stall.push({ t: +t.toFixed(2), rate: +rate.toFixed(3), dw: +(w - wPrev).toFixed(1) });
    }
    tPrev = t; wPrev = w;
    requestAnimationFrame(rl);
  };
  requestAnimationFrame(rl);
  // ── EVERY MEAL, with its radius ───────────────────────────────────────────
  // so the 6-second per-kind cooldown on audio.voice() (audio3d.ts:3251) can
  // be replayed offline: capture() plays voice('yum') for every bite over
  // radius 2 AND for every sticker, out of the same 6 s budget.
  W.__meals = [];
  const seenE = new WeakSet();
  setInterval(() => {
    const t = W.__matchState().t;
    for (const e of W.__edibles) {
      if (!e.eaten || seenE.has(e)) continue;
      seenE.add(e);
      if (e.mesh?.userData?.byPlayer) W.__meals.push({ t: +t.toFixed(2), r: +e.radius.toFixed(2),
        st: e.mesh.userData.sticker || '' });
    }
  }, 100);
});
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 182
  || document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000 });
await p.waitForTimeout(4000);
const log = await p.evaluate(() => window.__log);
const at = (w) => {
  let best = null;
  for (const l of log) if (!best || Math.abs(l.w - w) < Math.abs(best.w - w)) best = l;
  return best ? best.t : null;
};
console.log('AUDIO SAMPLE FETCHES, resolved onto the match clock');
for (const r of reqs) console.log(`  t=${String(at(r.w)).padStart(7)}  ${r.url}`);
console.log('\n(each of these fetches is the moment the SYNTH FALLBACK played instead)');

const extra = await p.evaluate(() => ({ stall: window.__stall, meals: window.__meals,
  rates: window.__rates.length, ms: window.__matchState() }));
console.log('\nHIT-STOP');
console.log('  frames sampled', extra.rates, '| frames below 0.35x match rate:', extra.stall.length);
{
  const g = []; let cur = null;
  for (const s of extra.stall) { if (!cur || s.t - cur.t1 > 0.5) { cur = { t0: s.t, t1: s.t, n: 1, min: s.rate }; g.push(cur); }
    else { cur.t1 = s.t; cur.n++; cur.min = Math.min(cur.min, s.rate); } }
  console.log('  distinct hit-stops:', g.length, '=> one every', (extra.ms.t / Math.max(1, g.length)).toFixed(1), 'match-seconds');
  for (const x of g.slice(0, 40)) console.log(`    t=${x.t0} frames=${x.n} minRate=${x.min}`);
}
console.log('\nMEALS (player only):', extra.meals.length);
{
  const big = extra.meals.filter(m => m.r > 2);
  console.log('  bites over radius 2 (each plays audio.voice("yum")):', big.length);
  // replay the 6 s per-kind cooldown offline
  let lastYum = -99, played = 0, dropped = 0;
  const drops = [];
  for (const m of extra.meals) {
    if (m.r > 2 || m.st) {
      if (m.t - lastYum >= 6) { lastYum = m.t; played++; }
      else { dropped++; if (m.st) drops.push(m); }
    }
  }
  console.log(`  "yum" calls: played ${played}, SUPPRESSED by the 6 s cooldown ${dropped}`
    + ` (${Math.round(100 * dropped / Math.max(1, played + dropped))}%)`);
  const st = extra.meals.filter(m => m.st);
  console.log('  sticker finds this match:', st.length, JSON.stringify(st));
  console.log('  sticker finds whose "yum" was suppressed:', drops.length);
  // how much of the match is the yum channel busy?
  let busy = 0, prev = -99;
  for (const m of extra.meals) if (m.r > 2 || m.st) { if (m.t - prev >= 6) { busy += 6; prev = m.t; } }
  console.log(`  fraction of the match with "yum" on cooldown: ${(100 * Math.min(busy, extra.ms.t) / extra.ms.t).toFixed(1)}%`);
}
await b.close();
