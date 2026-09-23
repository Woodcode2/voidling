// DOES FULL STICK LOOK LIKE FULL STICK? — the live hero-motion probe.
//
//   node qa/heromotion.mjs [port] [world]
//
// Studio round 4, Job 8 (HERO). The rig's motion read — roll-bob, travel squash,
// the directional stretch in the body shader — is one number, moveAmt, which
// chased min(1, speed / 40). Full stick at spawn size is steerCap() of the
// settled camera, about a third of 40, so a child holding the stick flat out in
// the first minute of every match got a hero animating at a third of "moving".
// The spec's figure for spawn size is 0.36; qa/motionlaw.mjs, which evaluates
// the same law out of the source, reads 0.359 at r 0.9 and 0.304 at the tail of
// the descent on the build before the change.
//
// This is the live half. It holds a real key down in a real match, at the two
// sizes the spec names, and reads faceState().move — moveAmt itself, off the rig
// — on every animation frame. What the maths probe cannot see and this one can:
// the steering blend, the camera's ease, the shore, hit-stop, and whether the
// frame loop really hands the rig the vRef the law divides by.
//
// ── HOW IT HOLDS THE STICK ─────────────────────────────────────────────────
// The keyboard branch of the input block normalises to a unit vector, so one
// arrow key held down IS full stick (jm = 1), with none of a synthetic
// pointer's deadzone and ramp in the way. Which arrow: the one whose world
// direction, from the play camera's own heading, has the longest run of ground
// the game's own containment rule (__solidAt, at the current radius) calls
// solid — so the void is not driven into the sea and graded on the wall.
//
// ── THE CLOCK ──────────────────────────────────────────────────────────────
// Everything waits on the GAME's clock (__matchState().tClock), never on wall
// time: under swiftshader the match runs ~14x slower than the wall, and dt is
// clamped to 0.05 per frame. Each hold lasts HOLD game-seconds; moveAmt closes
// on its target at rate 6/s, so 0.32 s of rig time reaches 0.85 from rest once
// the target is 1. The rest is margin for hit-stop: the rig runs on dtw, which
// a big bite at r 8 holds to 6% for 55-105 ms at a time.
// Each size starts from the hand-authored spawn (__warpVoid to __spawn), so both
// runs start from the same known point rather than wherever the last one ended;
// the heading is then chosen for ground at THAT size, and the run says so if
// the best heading it found is short.
// Before each size the camera is put where it is going (__settleCam), because
// the law is defined against the SETTLED distance and a probe that measures
// mid-ease is measuring the ease.
//
// ── THE BAR ────────────────────────────────────────────────────────────────
// The spec's: at full stick the peak of faceState().move reaches 0.85 at r 0.9
// and at r 8. A build whose faceState() does not report `move` FAILS: it
// predates Job 8, and a probe that cannot read the thing has not measured it.
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const SIZES = [0.9, 8];
const MIN_MOVE = 0.85;
const HOLD = 1.2;          // game-seconds of full stick per size
const REST = 0.3;          // game-seconds standing still first, so the peak is this hold's
const KEYS = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'];

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.on('pageerror', (e) => console.log('PAGEERR ' + String(e).slice(0, 140)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  // comma-joined, NOT JSON (GOVERNOR.md, the voidUnlocked retraction)
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await enterMatch(p, WORLD);
// past the descent: the controls are live and the camera is on the void
await p.waitForFunction(() => { const m = window.__matchState?.(); return !!m && m.t > 0.5 && m.introT <= 0; },
  null, { timeout: 900000 });

const hook = await p.evaluate(() => typeof window.__faceState().move);
if (hook !== 'number') {
  await b.close();
  console.log('\nFAIL — faceState() does not report `move`, so the rig\'s motion cannot be read. '
    + 'This build predates Job 8 (qa/motionlaw.mjs reads the old law at 0.359 for spawn size)\n');
  process.exit(1);
}

const waitGame = (dt) => p.evaluate((d) => new Promise((res) => {
  const t0 = window.__matchState().tClock;
  const tick = () => (window.__matchState().tClock >= t0 + d ? res() : requestAnimationFrame(tick));
  requestAnimationFrame(tick);
}), dt);

const results = [];
for (const R of SIZES) {
  await p.evaluate((r) => {
    const sp = window.__spawn();
    window.__setVoidR(r); window.__warpVoid(sp.x, sp.z); window.__settleCam(3);
  }, R);
  await waitGame(REST);
  // which arrow has the most ground in front of it, at this size
  const pick = await p.evaluate(({ keys, r }) => {
    const THREE = window.__THREE, d = new THREE.Vector3();
    window.__cam.getWorldDirection(d); d.y = 0; d.normalize();
    // the input block's own basis: tv = right·inX − fwd·inY, fwd along the view
    const dir = { ArrowRight: [-d.z, d.x], ArrowLeft: [d.z, -d.x], ArrowUp: [d.x, d.z], ArrowDown: [-d.x, -d.z] };
    const v = window.__voidState(), reach = Math.max(8, window.__matchState().steer * 1.3);
    let best = null;
    for (const k of keys) {
      let clear = 0;
      for (let s = 1; s <= 24; s++) {
        const u = (s / 24) * reach;
        if (!window.__solidAt(v.x + dir[k][0] * u, v.z + dir[k][1] * u, r)) break;
        clear = u;
      }
      if (!best || clear > best.clear) best = { key: k, clear, reach };
    }
    return best;
  }, { keys: KEYS, r: R });
  if (pick.clear < pick.reach * 0.5) console.log(`  note: r ${R} — the best heading (${pick.key}) has ${pick.clear.toFixed(0)} of `
    + `${pick.reach.toFixed(0)} u of ground; the run may meet the shore, and the peak is read before it does`);
  await p.keyboard.down(pick.key);
  const run = await p.evaluate((hold) => new Promise((res) => {
    const m0 = window.__matchState(), v0 = window.__voidState();
    const t0 = m0.tClock;
    let peak = 0, frames = 0, last = 0;
    const tick = () => {
      const f = window.__faceState(), m = window.__matchState();
      frames++; last = f.move; if (f.move > peak) peak = f.move;
      if (m.tClock >= t0 + hold) {
        const v = window.__voidState();
        res({ peak, last, frames, span: m.tClock - t0, dist: Math.hypot(v.x - v0.x, v.z - v0.z),
          steer: m.steer, aim: window.__camAim().aim, r: v.r });
      } else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), HOLD);
  await p.keyboard.up(pick.key);
  results.push({ R, key: pick.key, clear: pick.clear, reach: pick.reach, ...run });
}
await b.close();

console.log('');
console.log(`  ${WORLD}: full stick for ${HOLD} game-s at each size, camera settled first`);
for (const x of results) {
  console.log(`  r ${x.R.toFixed(1).padStart(4)}  ${x.key.padEnd(10)} (clear ${x.clear.toFixed(0)}/${x.reach.toFixed(0)} u)  `
    + `peak move ${x.peak.toFixed(3)}  end ${x.last.toFixed(3)}  over ${x.frames} frames / ${x.span.toFixed(2)} s  `
    + `avg ${(x.dist / Math.max(1e-6, x.span)).toFixed(1)} u/s  steer ${x.steer.toFixed(1)}  aim ${x.aim.toFixed(1)}`);
}
console.log('');
const bad = results.filter((x) => !(x.peak >= MIN_MOVE));
if (bad.length) {
  for (const x of bad) console.log(`  · r ${x.R}: full stick peaks at motion ${x.peak.toFixed(3)} (bar ${MIN_MOVE})`);
  console.log(`\nFAIL — full stick does not read as moving at ${bad.map((x) => `r ${x.R}`).join(' and ')}\n`);
  process.exit(1);
}
console.log(`PASS — full stick reads motion >= ${MIN_MOVE} at ${results.map((x) => `r ${x.R} (${x.peak.toFixed(2)})`).join(' and ')} on ${WORLD}\n`);
