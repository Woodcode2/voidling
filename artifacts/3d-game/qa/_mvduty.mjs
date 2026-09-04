// TEAM MOTION — the bite envelope, measured. Ledger #3b + the hit-stop pose.
//
//   node qa/_mvduty.mjs [port] [world] [gameSeconds]
//
// Samples once per rAF the hero's ACTUAL gape — the `maw` group's uniform
// scale, i.e. `mo` at void3d.ts:1973-1974, found by its unique child signature
// (mawDark's scale is exactly (1, 1.15, 1), void3d.ts:1054) — together with
// __faceState() and __juiceState().stop.
//
// WHY GAME TIME AND NOT WALL TIME. The sandbox renders ~1 fps through
// swiftshader, but dt is clamped at 0.05 and EVERY term in the envelope
// (mouthT -= dt, mouthAge += dt) and in the cadence that retriggers it runs on
// that same dt. The wall clock is 20x slow; the game clock is not. One sample
// per rAF is ~20 samples per game second, which resolves a 0.27 s envelope.
//
// PART A: the natural duty cycle, driven by the game's OWN nearest-edible
// autopilot (prototype3d.ts:8430-8447) — the densest honest feeding case.
// PART B: one forced size-class-up bite through capture(), sampled through the
// hit-stop window, so the freeze pose can be read rather than argued about.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const UNTIL = Number(process.argv[4] || 40);

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
});
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.on('pageerror', (e) => console.log('PAGEERR ' + String(e).slice(0, 160)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1500);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });

// THE DRIVER, copied verbatim from qa/faceparity.mjs:118-140 so the numbers
// are comparable with the ledger's. The game's OWN autopilot is attract-mode
// only (prototype3d.ts:8428 — "a real match never self-drives"), so a probe
// that does not steer measures a parked void, which is the trap this file's
// first run fell into.
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => {
    const vs = window.__voidState();
    let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) {
      const m = Math.hypot(best.dx, best.dz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true }));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await p.evaluate(() => {
  let maw = null;
  window.__scene.traverse((o) => {
    if (o.isMesh && Math.abs(o.scale.x - 1) < 1e-6 && Math.abs(o.scale.y - 1.15) < 1e-6
        && o.parent && o.parent.isGroup) maw = o.parent;
  });
  window.__maw = maw;
  window.__rec = { s: [], found: !!maw };
  const tick = () => {
    const st = window.__faceState(); const ms = window.__matchState(); const js = window.__juiceState();
    // WALL time as well as world time: hit-stop compresses world time by 94%,
    // so a freeze that lasts 85 ms of a child's life is 6 ms of game clock.
    window.__rec.s.push([ms.t, maw ? maw.scale.x : -1, st.biting ? 1 : 0, st.smile ? 1 : 0,
      js.stop, st.mood, performance.now() / 1000, ms.ate.you]);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await p.waitForFunction((u) => (window.__matchState?.().t ?? 0) > u, UNTIL, { timeout: 1800000 });

const partA = await p.evaluate(() => {
  const rows = window.__rec.s.slice(5);
  let openT = 0, biteT = 0, smileT = 0, total = 0, freezeT = 0;
  const gaps = []; let gapStart = null;
  const peaks = []; const frozen = [];
  for (let i = 1; i < rows.length; i++) {
    // weight by SIM time (dt, ~0.05/frame), not by the sandbox's wall clock:
    // a swiftshader frame's wall cost varies 10x with what is on screen, which
    // would weight busy frames 10x in a share that is about a child's seconds.
    const dt = rows[i][0] - rows[i - 1][0];
    if (dt <= 0 || dt > 0.4) continue;
    total += dt;
    const mo = rows[i][1];
    if (mo >= 0.25) openT += dt;
    if (rows[i][2]) biteT += dt;
    if (rows[i][3]) smileT += dt;
    if (rows[i][4] > 0) freezeT += dt;
    if (mo > 0.25) { if (gapStart !== null) { gaps.push(rows[i][0] - gapStart); gapStart = null; } }
    else if (gapStart === null) gapStart = rows[i][0];
    peaks.push(mo);
    if (rows[i][4] > 0) frozen.push(mo);
  }
  peaks.sort((a, c) => a - c);
  gaps.sort((a, c) => a - c);
  return {
    found: window.__rec.found, samples: rows.length, simSec: +total.toFixed(1), wallSec: +(rows[rows.length-1][6]-rows[0][6]).toFixed(0), ate: rows[rows.length-1][7] - rows[0][7],
    gapeOverCliffShare: +(openT / total).toFixed(3),
    biteTimerShare: +(biteT / total).toFixed(3),
    grinVisibleShare: +(smileT / total).toFixed(3),
    freezeShare: +(freezeT / total).toFixed(4),
    mawP50: +peaks[Math.floor(peaks.length / 2)].toFixed(3),
    mawP95: +peaks[Math.floor(peaks.length * 0.95)].toFixed(3),
    mawMax: +peaks[peaks.length - 1].toFixed(3),
    closedRuns: gaps.length,
    closedMed: gaps.length ? +gaps[Math.floor(gaps.length / 2)].toFixed(2) : null,
    openMed: (() => { const o = []; let st = null;
      for (let i = 1; i < rows.length; i++) { const on = rows[i][1] > 0.25;
        if (on && st === null) st = rows[i][0];
        if (!on && st !== null) { o.push(rows[i][0] - st); st = null; } }
      o.sort((a, c) => a - c); return o.length ? +o[Math.floor(o.length / 2)].toFixed(2) : null; })(),
    // THE FREEZE POSE: every sample taken while stopT > 0 — what the hero's
    // mouth is doing during the 85 ms the game holds the world still.
    freezeSamples: frozen.length,
    freezeMawMed: frozen.length ? +frozen.sort((a, c) => a - c)[Math.floor(frozen.length / 2)].toFixed(3) : null,
    freezeMawMax: frozen.length ? +frozen[frozen.length - 1].toFixed(3) : null,
  };
});
console.log('A ' + WORLD + ' ' + JSON.stringify(partA));

// ── PART B: one forced size-class-up bite, sampled through the freeze ──────
const partB = await p.evaluate(async () => {
  window.__setVoidR(4);
  await new Promise((r) => setTimeout(r, 900));
  const maw = window.__maw;
  const t0 = window.__matchState().t;
  const log = [];
  let done = false;
  const tick = () => {
    const ms = window.__matchState(); const js = window.__juiceState();
    log.push([+(ms.t - t0).toFixed(4), +maw.scale.x.toFixed(4), +js.stop.toFixed(4)]);
    if (ms.t - t0 < 1.4) requestAnimationFrame(tick); else done = true;
  };
  const ate = window.__eatNearest(0.6);
  requestAnimationFrame(tick);
  while (!done) await new Promise((r) => setTimeout(r, 60));
  return { ate, log };
});
console.log('B ate=' + JSON.stringify(partB.ate));
console.log('B  t(game)  maw   stopT');
for (const r of partB.log) console.log(`   ${String(r[0]).padStart(7)} ${String(r[1]).padStart(6)} ${String(r[2]).padStart(6)}`);
await b.close();
