// qa/opening.mjs — THE OPENING, MEASURED.
//
// Round 7, stream A. This probe exists to fail. It is written against
// docs/crews/round-7/streamA.opening-brief.md §5 and it must go red on the
// untouched tree for A1, A5, A6, A8, A9 and A21 before the opening is rebuilt,
// because a probe that has never failed has never been tested.
//
// What it does that a screenshot cannot: it samples the game's own state every
// animation frame from the first gameplay frame to the settle, so the descent's
// easing can be FITTED rather than asserted, and it runs the same world twice —
// tapping early and tapping late — so "the arrival costs the impatient player
// nothing" is a measurement and not a promise.
//
//   node qa/opening.mjs [world] [port] [tapMs]
//
// Ground scale is read from the camera's height above the void, not from
// camDist: on a perspective camera the on-screen size of the ground goes as
// 1/height, and height is what the descent is easing. camDist is recorded too
// because the steering's speed cap reads it (see __matchState's comment).
//
// TIME IS GAME TIME, NOT WALL CLOCK. The first run of this probe reported a
// 10,893 ms descent for an intro the code sets to 2.2 s, and a 37 s idle for a
// 2.5 s wait. Both were the instrument, not the game: under swiftshader the
// renderer manages a few frames a second, and the loop clamps dt per frame, so
// the world advances roughly ten times slower than the wall. Every duration
// below is therefore measured on the match clock (MATCH_LEN - clock), which
// advances in the same clamped dt the game itself uses. Wall time is still
// recorded per row, and is used for one thing only: how long the probe waited
// before touching, which is a property of the probe and not of the game.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const PORT = Number(process.argv[3] || 4177);
const TAP_MS = Number(process.argv[4] || 2500);
const OUT = 'qa-out/opening';

// The bars from the brief. Every one of these is a number this probe reads.
// `null` means "measured and reported, no bar yet" — those are the ones the
// builder needs to see move, not to satisfy.
const BARS = {
  A1: { what: 'clock ticks elapsed before the first touch', want: 0, unit: 's', cmp: (v) => v <= 0.001 },
  A3: { what: 'idle available before touch, in game time', want: '>= 0.5', unit: 's', cmp: (v) => v >= 0.5 },
  A4: { what: 'touch-down to first void movement', want: '<= 133', unit: 'ms', cmp: (v) => v <= 133 },
  A5: { what: 'descent duration', want: '1100-1300', unit: 'ms', cmp: (v) => v >= 1100 && v <= 1300 },
  A6: { what: 'descent easing on camera HEIGHT (best fit)', want: 'ease-in-out', unit: '', cmp: (v) => /in-out|smooth/.test(String(v)) },
  A6b:{ what: 'height progress at t=0.5', want: '0.40-0.60', unit: '', cmp: (v) => v >= 0.4 && v <= 0.6 },
  A7: { what: 'ground scale over the descent', want: '4.0-5.5', unit: 'x', cmp: (v) => v >= 4.0 && v <= 5.5 },
  A8: { what: 'descent frames with controls dead', want: 0, unit: 'frames', cmp: (v) => v === 0 },
  A9: { what: 'first +1 floater, as a fraction of the descent', want: '0.30-0.60', unit: '', cmp: (v) => v >= 0.3 && v <= 0.6 },
  A21:{ what: 'descent length difference, early tap vs late tap', want: '<= 100', unit: 'ms', cmp: (v) => v <= 100 },
};

// Curve families fitted to the height-progress series. Same set that was fitted
// to Hole.io's recording, so the two answers are comparable.
const EASINGS = {
  'linear': (x) => x,
  'ease-in-quad': (x) => x * x,
  'ease-out-quad': (x) => 1 - (1 - x) * (1 - x),
  'ease-in-out-quad': (x) => (x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x)),
  'smoothstep': (x) => x * x * (3 - 2 * x),
  'smootherstep': (x) => x * x * x * (x * (x * 6 - 15) + 10),
  'sine-in-out': (x) => 0.5 - 0.5 * Math.cos(Math.PI * x),
};

function fitEasing(series) {          // series: [{x, y}] both normalised 0..1
  let best = null;
  for (const [name, f] of Object.entries(EASINGS)) {
    let s = 0;
    for (const p of series) { const d = f(p.x) - p.y; s += d * d; }
    const rms = Math.sqrt(s / series.length);
    if (!best || rms < best.rms) best = { name, rms };
  }
  return best;
}

// The sampler runs inside the page: one record per animation frame. Reading the
// camera directly rather than trusting a reported number is deliberate — a
// wrong camera maths must not be able to pass itself.
const SAMPLER = () => {
  const w = window;
  w.__op = { rows: [], floaters: [], t0: performance.now(), touchAt: null };
  const seen = new WeakSet();
  const tick = () => {
    try {
      const ms = w.__matchState ? w.__matchState() : null;
      const vs = w.__voidState ? w.__voidState() : null;
      const cam = w.__cam;
      if (ms && vs && cam) {
        w.__op.rows.push({
          t: performance.now() - w.__op.t0,          // wall ms, for the probe's own bookkeeping
          g: ms.clock,                               // the match clock: the game's own time axis
          clock: ms.clock, mt: ms.t, camDist: ms.camDist, r: ms.r, score: ms.score,
          cy: cam.position.y, cx: cam.position.x, cz: cam.position.z,
          vx: vs.x, vz: vs.z, vr: vs.r,
        });
      }
      // Floaters are DOM (.vf in bubbles.ts). Record the first sighting of each.
      for (const el of document.querySelectorAll('.vf')) {
        if (!seen.has(el)) { seen.add(el); w.__op.floaters.push({ t: performance.now() - w.__op.t0, text: el.textContent || '' }); }
      }
    } catch { /* a frame we could not read is a frame we do not report */ }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

async function runOnce(browser, tapMs, shots) {
  const p = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  p.setDefaultTimeout(400000);
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { /* private mode: the defaults are fine */ } });
  await p.addInitScript(SAMPLER);
  // Bare URL, not ?w=<world>. With the world in the query string the game boots
  // straight into it and runs its intro camera while the probe is still clicking
  // through the menu, so the first sampled frame already has the camera at rest:
  // the first game-time run of this probe found a 328 ms "descent" of x1.21 for
  // an intro that travels from camDist 300 to 38. The world is chosen from the
  // picker instead, so sampling starts before the intro does.
  await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
  await p.waitForFunction(() => !!window.__matchState, null, { timeout: 400000 });
  // Reset the sampler to the first gameplay frame, not to page load, and assert
  // the camera really is still high — if it is not, the intro was missed and
  // every descent number below would be measuring the tail of something.
  await p.evaluate(() => { window.__op.rows = []; window.__op.floaters = []; window.__op.t0 = performance.now(); });
  await p.waitForTimeout(60);
  // Sampling must begin before the camera reaches its intro peak. Checking
  // rows[0] is the wrong test — the camera is still at its menu position there.
  // The honest test is done in analyse(): if the peak is the very first sampled
  // frame, the climb was missed and the descent may be a tail.

  if (shots) { mkdirSync(OUT, { recursive: true }); await p.screenshot({ path: `${OUT}/${WORLD}-01-first.png` }); }
  await p.waitForTimeout(tapMs);
  if (shots) await p.screenshot({ path: `${OUT}/${WORLD}-02-pretouch.png` });

  // The touch. Held and dragged, because a tap that does not move the stick
  // measures nothing about how long it takes the void to answer.
  const box = { x: 215, y: 700 };
  await p.evaluate(() => { window.__op.touchAt = performance.now() - window.__op.t0; });
  await p.mouse.move(box.x, box.y);
  await p.mouse.down();
  for (let i = 1; i <= 30; i++) { await p.mouse.move(box.x, box.y - i * 4); await p.waitForTimeout(16); }
  await p.waitForTimeout(2600);
  if (shots) await p.screenshot({ path: `${OUT}/${WORLD}-03-settle.png` });
  await p.mouse.up();

  const data = await p.evaluate(() => window.__op);
  await p.close();
  return data;
}

function analyse(d) {
  const rows = d.rows, touchAt = d.touchAt ?? 0;
  // Game time, in ms, measured down from whatever the clock read on the first
  // sampled frame. On the untouched tree the clock is already running there, so
  // this axis starts at zero and moves; once stream A lands it will not move at
  // all until the touch, which is bar A1.
  const g0 = rows[0]?.g ?? 0;
  const gm = (r) => (g0 - r.g) * 1000;
  const pre = rows.filter((r) => r.t < touchAt);
  const clock0 = pre.length ? pre[0].clock : null;
  const clockPre = pre.length ? clock0 - pre[pre.length - 1].clock : null;   // seconds burned before the touch
  const idleG = pre.length ? (clock0 - pre[pre.length - 1].clock) || (pre[pre.length - 1].t - pre[0].t) / 1000 : 0;

  // The descent, found from the camera height series rather than from a flag:
  // the first frame where height starts falling to the frame where it stops.
  // The camera does not begin high: it sits at its menu position, JUMPS to the
  // intro's start height when the match begins, and only then descends. A
  // detector that assumed a fall from row 0 reported a 421 ms descent of x1.20
  // for a move from camDist 300 to 38 — it had measured the settle and called it
  // the descent. So find the peak first, and measure from there.
  const h = rows.map((r) => ({ t: r.t, y: r.cy - 0, d: r.camDist }));
  let iPeak = 0;
  for (let i = 1; i < h.length; i++) if (h[i].y > h[iPeak].y) iPeak = i;
  let iMin = iPeak;
  for (let i = iPeak; i < h.length; i++) if (h[i].y < h[iMin].y) iMin = i;
  const yStart = h[iPeak]?.y ?? 0;
  const yEnd = h[iMin]?.y ?? 0;
  const span = yStart - yEnd;
  let iA = iPeak, iB = iMin;
  if (Math.abs(span) > 0.5) {
    while (iA < iMin && (yStart - h[iA].y) < 0.005 * span) iA++;
    while (iB > iA && (yStart - h[iB].y) > 0.995 * span) iB--;
  }
  const descentMs = gm(rows[iB]) - gm(rows[iA]);
  const seg = h.slice(iA, iB + 1);
  const segG = rows.slice(iA, iB + 1).map(gm);
  const series = seg.map((p, i) => ({ x: (segG[i] - segG[0]) / (descentMs || 1), y: (yStart - p.y) / (span || 1) }));
  const fit = series.length > 5 ? fitEasing(series) : { name: 'n/a', rms: NaN };
  const mid = series.reduce((a, b) => (Math.abs(b.x - 0.5) < Math.abs(a.x - 0.5) ? b : a), series[0] || { x: 0, y: 0 });
  // Ground scale: on-screen size goes as 1/height, so the scale gained over the
  // descent is the ratio of the heights, measured above the void's own plane.
  const groundScale = (yStart - 0) / (yEnd || 1);

  // Controls: the void's own position is the only honest witness. Count descent
  // frames in which the void did not move at all while a touch was held.
  let dead = 0;
  for (let i = iA + 1; i <= iB; i++) {
    const a = rows[i - 1], b = rows[i];
    if (b.t < touchAt) continue;
    if (Math.hypot(b.vx - a.vx, b.vz - a.vz) < 1e-4) dead++;
  }
  let firstMove = null;
  const touchRow = rows.find((r) => r.t >= touchAt);
  const touchG = touchRow ? gm(touchRow) : 0;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].t < touchAt) continue;
    if (Math.hypot(rows[i].vx - rows[i - 1].vx, rows[i].vz - rows[i - 1].vz) > 1e-3) { firstMove = gm(rows[i]) - touchG; break; }
  }
  // Floaters carry wall timestamps (they are DOM sightings), so convert by
  // finding the sampled frame nearest in wall time and reading its game clock.
  const f0w = d.floaters[0]?.t ?? null;
  const f0 = f0w == null ? null : gm(rows.reduce((a, b) => (Math.abs(b.t - f0w) < Math.abs(a.t - f0w) ? b : a), rows[0]));
  const floaterFrac = f0 == null ? null : (f0 - gm(rows[iA])) / (descentMs || 1);

  const missedClimb = iPeak === 0;
  return { rows: rows.length, touchAt, clockPre, clock0, idleG, descentMs, descentFrom: gm(rows[iA]), fit, mid: mid.y, missedClimb, iPeak, peakDist: rows[iPeak]?.camDist ?? 0,
    groundScale, dead, firstMove, floater: f0, floaterFrac, yStart, yEnd };
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const late = analyse(await runOnce(b, TAP_MS, true));
const early = analyse(await runOnce(b, 200, false));
await b.close();

const got = {
  A1: late.clockPre ?? 0, A3: late.idleG ?? 0, A4: late.firstMove ?? 1e9,
  A5: late.descentMs, A6: late.fit.name, A6b: late.mid, A7: late.groundScale,
  A8: late.dead, A9: late.floaterFrac ?? -1,
  A21: Math.abs(late.descentMs - early.descentMs),
};
let fails = 0;
const lines = [];
for (const [k, bar] of Object.entries(BARS)) {
  const v = got[k];
  const ok = v == null ? false : bar.cmp(v);
  if (!ok) fails++;
  const shown = typeof v === 'number' ? (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(3)) : String(v);
  lines.push(`${ok ? 'PASS' : 'FAIL'}  ${k.padEnd(4)} ${bar.what.padEnd(52)} got ${String(shown).padStart(12)} ${bar.unit.padEnd(6)} want ${bar.want}`);
}
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/${WORLD}-series.json`, JSON.stringify({ late, early, got }, null, 1));
console.log(`\nOPENING — ${WORLD} @ ${PORT}, tap at ${TAP_MS} ms (and a second run tapping at 200 ms)\n`);
console.log(lines.join('\n'));
if (late.missedClimb) console.log(`\n  WARNING: the camera's peak was the first sampled frame — the climb was missed and the descent below may be a tail, not the move.`);
console.log(`\n  descent (game time) ${late.descentFrom.toFixed(0)}..${(late.descentFrom + late.descentMs).toFixed(0)} ms; camera height ${late.yStart.toFixed(1)} -> ${late.yEnd.toFixed(1)}`);
console.log(`  NOTE: durations are GAME time (the match clock), not wall clock — under swiftshader the wall runs ~10x slower.`);
console.log(`  camera peaked at sample ${late.iPeak} (camDist ${late.peakDist.toFixed(0)})`);
console.log(`  easing fit ${late.fit.name} (rms ${late.fit.rms.toFixed(3)}); early-tap descent ${early.descentMs.toFixed(0)} ms`);
console.log(`  clock at the first gameplay frame ${late.clock0?.toFixed(2)} s; first floater ${late.floater == null ? 'none' : late.floater.toFixed(0) + ' ms'}`);
console.log(`\n${fails} of ${Object.keys(BARS).length} bars failing\n`);
process.exit(fails ? 1 : 0);
