// DOES THE BITE WIND UP WHERE A CHILD CAN SEE IT? — the anticipation probe.
//
//   node qa/mouthwind.mjs                 the envelope, read out of void3d.ts, and the
//                                         real rig stepped frame by frame (node only)
//   node qa/mouthwind.mjs [port] [world]  …and a real bite on the live rig, off
//                                         faceState().uniformK, frame by frame
//
// Studio round 4, Job 8 (HERO). AAA-BRIEF absence #2 was "no anticipation, no
// settle", and chomp() answered it with a jaw envelope in three phases: about
// 45 ms of wind-up in which the jaw barely parts, a spring open with an
// overshoot, then the settle. The settle is real. The wind-up is not visible:
// during it the gape is `mouthMax · (mouthAge / 0.045) · 0.12` — at most 0.12 of
// a full jaw even on the biggest bite — and the gape is not drawn at all below
// MOUTH_HIDES_AT, 0.25. So for the whole wind-up the maw is hidden and the grin
// stays up, and the first frame anything changes is the frame the jaw springs.
// The anticipation exists in the numbers and nowhere on the screen.
//
// The spec's fix puts it on the one surface that is always drawn — the body.
// For the first 60 ms of a bite from a closed mouth, uniformK dips by
// 0.04·g·sin(π·mouthAge/0.06): the void gathers in, graded by the meal.
// uniformK is the same pure size term the evolution pop uses
// (qa/evolvepop.mjs), so the dip cannot shear the hat or the face; they ride it.
//
// ── PART 1, THE ENVELOPE — read out of void3d.ts; none is a copy ───────────
//   1. VISIBLE. During the wind-up, either the jaw is drawn (its envelope
//      reaches MOUTH_HIDES_AT) or the body moves by more than his own idle
//      breathing (`breathe`'s amplitude). A change smaller than the breath is
//      lost inside a motion the body is already making all the time. Graded at
//      a full bite (g = 1): the snack's wind-up is allowed to be small.
//   2. A GATHER, not a swell. Anticipation contracts before the action.
//   3. A TAIL THAT ENDS. As functions of one age, the dip is back to exactly 0
//      one 60 Hz frame after the jaw's draw threshold. This says nothing about
//      WHICH FRAME each is drawn on — part 2 does.
//   4. GRADED. A snack (g at chomp's own floor) winds up less than a full bite:
//      chomp() grades the jaw, the hold and the wobble by the meal, and a
//      hydrant winding up like a hotel would be the one thing in it that does
//      not.
//   5. FED. The grade the wind-up reads must be written by chomp(), on the
//      same branch that restarts mouthAge — a closed mouth. A hoover spree
//      must not re-anticipate mid-chew.
//
// ── PART 2, THE RIG, STEPPED — the real update(), in node ──────────────────
// Part 1 evaluates the dip and the jaw on the same age, so it cannot see the
// order they are computed in, and that order is the whole claim: the gather
// must come BEFORE the jaw. On the Job 8 commit the dip read mouthAge before
// the mouth block advanced it, so it ran one frame behind the jaw, and at 30
// Hz and at the 0.05 dt clamp the only dipped frame was the jaw's own first
// frame — part 1 passed that build. So part 2 bundles src/proto3d/void3d.ts
// with the esbuild vite already ships (no copy of any expression, no renderer:
// the canvas and the DOM are inert stubs), builds a real rig, calls chomp(),
// and steps update() at 60, 30 and 20 Hz (20 Hz is the frame loop's 0.05 dt
// clamp), reading faceState() after every frame exactly as a probe reads the
// live game. `smile === false` is the jaw's drawn frame (mouth.visible is
// `mo < MOUTH_HIDES_AT`, the same test that draws the maw). At each rate:
//   A. at least one frame BEFORE the jaw's first drawn frame is dipped by more
//      than the breath, on a full bite;
//   B. uniformK is exactly 1 on the jaw's first drawn frame;
//   C. uniformK never exceeds 1 (a gather, not a swell).
// And, at 60 Hz:
//   D. A PIN LETS GO. __pinGape(0) landing inside the wind-up (two frames in)
//      leaves uniformK at exactly 1 on every frame after it. mouthAge only
//      advances while mouthT > 0, so on the Job 8 commit that pin froze the
//      gather at 0.9606 until the next bite from a closed mouth (flat over
//      five seconds of 60 Hz frames) — on the exact frames qa/moodsheet.mjs,
//      qa/moodrule.mjs and qa/gapesheet.mjs photograph.
//   E. A SPREE GATHERS ONCE. A second full chomp() 0.1 s into the first (the
//      jaw wide open) does not dip the body again.
//   F. GRADED ON THE RIG. A snack (chomp's own floor) gathers less than a full
//      bite.
//
// ── PART 3, THE LIVE RIG (given a port) ────────────────────────────────────
// Forces one real bite through the game's own capture() path (__eatNearest) at
// a frozen radius, fired from inside an animation frame whose update left the
// mouth closed, samples faceState() on every animation frame until the jaw
// has spent 0.1 s of its hold, and requires a frame below the pre-bite
// uniformK that comes BEFORE the first frame the jaw is drawn (smile false).
// It prints whether the bite armed hit-stop: hit-stop runs the rig at 6% of
// dt for a few frames, which slows the wind-up down and would spread even a
// one-frame-late gather over frames ahead of the jaw — so only a run with
// stop 0 is a test of the frame order at the clamp. dt is clamped to 0.05, so
// under swiftshader the 60 ms wind-up is one or two frames; that is why it
// samples every frame and never sleeps. An evolution in the window would dip
// uniformK on its own (the pop's anticipation), so a bite that also evolved is
// inconclusive, which is a FAIL, never a pass.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const die = (e) => { console.log(`\nFAIL — mouthwind aborted before a verdict: ${String((e && e.message) || e).split('\n')[0]}`); process.exit(1); };
process.on('uncaughtException', die);
process.on('unhandledRejection', die);

const PORT = process.argv[2] || null;
const WORLD = process.argv[3] || 'maple';
const SRC = readFileSync('src/proto3d/void3d.ts', 'utf8');
const fail = (msg) => { console.log(`FAIL — ${msg}`); process.exit(1); };
const need = (re, what) => {
  const m = SRC.match(re);
  if (!m) fail(`could not find ${what} in void3d.ts. The call site moved; re-point this probe `
    + 'rather than letting it pass on nothing');
  return m;
};

// ── PART 1: the jaw ────────────────────────────────────────────────────────
const HIDES = Number(need(/const MOUTH_HIDES_AT = ([\d.]+);/, 'MOUTH_HIDES_AT')[1]);
const wind = need(/if \(mouthAge < ([\d.]+)\) openEnv = \(mouthAge \/ ([\d.]+)\) \* ([\d.]+);/, "the jaw's wind-up");
const WIND = Number(wind[1]), WIND_PEAK = Number(wind[3]);
const spring = need(/const t2 = mouthAge - ([\d.]+);\s*openEnv = (.+?);/, "the jaw's spring");
const springF = new Function('t2', 'Math', `return (${spring[2]});`);
const openEnv = (a) => (a < WIND ? (a / Number(wind[2])) * WIND_PEAK : springF(a - Number(spring[1]), Math));
const gM = need(/const g = Math\.min\(1, Math\.max\(([\d.]+), k\)\);/, "chomp()'s grade");
const G_MIN = Number(gM[1]);
const wideF = new Function('g', `return (${need(/const wide = (.+?);/, "chomp()'s jaw width")[1]});`);
// ── PART 1: the body ───────────────────────────────────────────────────────
const BREATH = Number(need(/const breathe = Math\.sin\(s\.t \* [\d.]+ \* slow\) \* ([\d.]+);/, 'the idle breath')[1]);
// the term, and the condition it sits under if it has one (evaluated with the
// bite live, mouthT > 0: this part is the envelope of a bite in progress)
const bodyM = SRC.match(/(?:if \(([^()\n]*\bmouthAge < [\d.]+)\) )?uniformK -= ([^;\n]*mouthAge[^;\n]*);/);
let dipF = null, gName = null;
if (bodyM) {
  const free = [...new Set((bodyM[2].match(/(?<![.\w])[A-Za-z_]\w*/g) || [])
    .filter((n) => !['Math', 'mouthAge'].includes(n)))];
  if (free.length !== 1) fail(`the body's wind-up reads ${free.length ? free.join(', ') : 'nothing'} besides mouthAge — `
    + 'this probe expects exactly one grade and will not guess at more');
  gName = free[0];
  dipF = new Function('mouthAge', gName, 'mouthT', 'Math',
    `return (${bodyM[1] ? `(${bodyM[1]}) ? (${bodyM[2]}) : 0` : bodyM[2]});`);
  // bar 5: chomp() writes that grade from g, and on the closed-mouth branch
  const chompBody = need(/chomp\(k = [\d.]+, hold = 0\) \{([\s\S]*?)\n {4}\},/, 'chomp()')[1];
  if (!new RegExp(`if \\(cur < [\\d.]+\\) \\{[^}]*mouthAge = 0;[^}]*\\b${gName} = g;[^}]*\\}`).test(chompBody)) {
    fail(`the body's wind-up reads \`${gName}\`, and chomp() does not write it from g on the closed-mouth `
      + 'branch — the wind-up would play with a stale grade, or mid-chew');
  }
}
const dip = (a, g) => (dipF ? dipF(a, g, 1, Math) : 0);

// ── PART 1: sweep ──────────────────────────────────────────────────────────
const STEP = 1 / 2400;
const sweep = (g) => {
  let peak = 0, at = 0, maxGrow = 0, jawAt = null, jawPeakInWind = 0;
  for (let a = 0; a <= 0.3; a += STEP) {
    const d = dip(a, g);
    if (d > peak) { peak = d; at = a; }
    if (-d > maxGrow) maxGrow = -d;
    const mo = wideF(g) * openEnv(a);
    if (a < WIND) jawPeakInWind = Math.max(jawPeakInWind, mo);
    if (jawAt === null && mo >= HIDES) jawAt = a;
  }
  let residual = 0;
  for (let a = (jawAt ?? 0.3) + 1 / 60; a <= 0.3; a += STEP) residual = Math.max(residual, Math.abs(dip(a, g)));
  return { peak, at, maxGrow, jawAt, jawPeakInWind, residual };
};
const full = sweep(1), snack = sweep(G_MIN);

console.log('');
console.log('  PART 1, the envelope (both curves as functions of one age)');
console.log(`  jaw during the wind-up (first ${(WIND * 1000).toFixed(0)} ms): peaks at ${full.jawPeakInWind.toFixed(3)} of a full gape; `
  + `drawn from ${HIDES} — ${full.jawPeakInWind >= HIDES ? 'VISIBLE' : 'never drawn'}`);
console.log(`  jaw first drawn at mouthAge ${full.jawAt === null ? 'never' : `${(full.jawAt * 1000).toFixed(1)} ms`} (full bite)`);
console.log(`  body wind-up term: ${bodyM ? bodyM[0].trim() : 'none — uniformK has no term that reads mouthAge'}`);
console.log(`  body dip, full bite (g 1):     ${(full.peak * 100).toFixed(2)}% at ${(full.at * 1000).toFixed(1)} ms`
  + `   residual a 60 Hz frame after the jaw's threshold ${(full.residual * 100).toFixed(3)}%`);
console.log(`  body dip, snack (g ${G_MIN}):     ${(snack.peak * 100).toFixed(2)}% at ${(snack.at * 1000).toFixed(1)} ms`);
console.log(`  idle breath amplitude:         ${(BREATH * 100).toFixed(2)}%`);
console.log('');

const fails = [];
const seen = full.jawPeakInWind >= HIDES || full.peak > BREATH;
if (!seen) fails.push(`nothing a child can see moves during the wind-up: the jaw peaks at ${full.jawPeakInWind.toFixed(3)} `
  + `against a draw threshold of ${HIDES}, and the body ${full.peak > 0 ? `dips ${(full.peak * 100).toFixed(2)}%, inside his own `
  + `${(BREATH * 100).toFixed(1)}% breath` : 'does not move at all'}`);
if (full.maxGrow > 1e-9) fails.push(`the wind-up SWELLS the body by ${(full.maxGrow * 100).toFixed(2)}% — anticipation gathers in`);
if (bodyM && full.residual > 1e-9) fails.push(`the body is still ${(full.residual * 100).toFixed(3)}% off its size a frame after `
  + 'the jaw\'s threshold — the dip\'s tail runs into the gape');
if (bodyM && !(snack.peak < full.peak)) fails.push(`a snack winds up ${(snack.peak * 100).toFixed(2)}% against a full bite's `
  + `${(full.peak * 100).toFixed(2)}% — the wind-up is not graded by the meal`);

// ── PART 2: the rig, stepped ───────────────────────────────────────────────
// Only worth running once the envelope has a wind-up to order: with no body
// term there is nothing for the frame order to get wrong, and part 1 has
// already failed the build.
const RATES = [60, 30, 20];
let rigRows = null;
if (bodyM) {
  let esbuild;
  try {
    const req = createRequire(import.meta.url);
    esbuild = createRequire(req.resolve('vite'))('esbuild');
  } catch (e) {
    fail(`could not load the esbuild vite depends on (${String(e.message).split('\n')[0]}) — without it the rig `
      + 'cannot be stepped, and part 1 alone cannot see the frame order');
  }
  const built = await esbuild.build({
    stdin: { contents: "export * as THREE from 'three'; export { createVoid } from './src/proto3d/void3d';",
      resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, format: 'esm', platform: 'browser', write: false, logLevel: 'silent',
  });
  // Inert stubs: the rig paints its textures on 2D canvases and loads a few
  // images at build time, none of which a size term reads. Every call is
  // swallowed; getImageData hands back a zeroed buffer of the asked size.
  const noop = () => {};
  const ctx2d = new Proxy({}, {
    get: (o, k) => (k in o ? o[k]
      : k === 'measureText' ? () => ({ width: 1 })
      : k === 'getImageData' || k === 'createImageData' ? (...a) => ({ data: new Uint8ClampedArray(Math.max(1, (a[2] | 0) * (a[3] | 0)) * 4) })
      : typeof k === 'string' && k.startsWith('create') ? () => ({ addColorStop: noop })
      : noop),
    set: (o, k, v) => { o[k] = v; return true; },
  });
  const el = () => ({ width: 0, height: 0, style: {}, getContext: () => ctx2d,
    addEventListener: noop, removeEventListener: noop, setAttribute: noop });
  globalThis.document = { createElement: el, createElementNS: () => el() };
  globalThis.window = { innerHeight: 932, innerWidth: 430, devicePixelRatio: 1 };
  const warn = console.warn; console.warn = noop;   // three's "map is undefined" on the stubbed textures
  let THREE, createVoid;
  try {
    ({ THREE, createVoid } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`));
  } finally { console.warn = warn; }

  const rig = () => {
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(32, 430 / 932, 0.1, 2000);
    cam.position.set(18, 26, 18); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
    const w2 = console.warn; console.warn = noop;
    const v = createVoid(scene, cam);
    console.warn = w2;
    const s = { t: 0, x: 0, z: 0, vx: 0, vz: 0, lookX: 0, lookY: 0 };
    const step = (dt) => { s.t += dt; v.update(dt, s); return v.faceState(); };
    for (let i = 0; i < 120; i++) step(1 / 60);            // settle: the growth spring, the mood lerp
    const f0 = v.faceState();
    if (typeof f0.uniformK !== 'number') fail('faceState() does not report uniformK, so the rig cannot be read back');
    if (!f0.smile) fail('the idle rig already draws the jaw (smile false) — there is no closed mouth to bite from');
    return { v, step };
  };

  rigRows = [];
  console.log('  PART 2, the rig stepped (real update(), node): uniformK after each frame from chomp(1), * = jaw drawn');
  for (const hz of RATES) {
    const dt = 1 / hz;
    const { v, step } = rig();
    v.chomp(1);
    const rows = [];
    for (let i = 0; i < Math.ceil(0.3 / dt); i++) { const f = step(dt); rows.push({ uk: f.uniformK, jaw: !f.smile }); }
    const jawIdx = rows.findIndex((r) => r.jaw);
    const before = jawIdx < 0 ? rows : rows.slice(0, jawIdx);
    const deepest = before.reduce((m, r) => Math.max(m, 1 - r.uk), 0);
    const onJaw = jawIdx < 0 ? null : rows[jawIdx].uk;
    const maxUk = Math.max(...rows.map((r) => r.uk));
    rigRows.push({ hz, rows, jawIdx, deepest, onJaw });
    console.log(`    ${String(hz).padStart(2)} Hz  ${rows.slice(0, Math.max(3, jawIdx + 2)).map((r) => `${r.uk.toFixed(4)}${r.jaw ? '*' : ' '}`).join(' ')}`);
    if (jawIdx < 0) fails.push(`rig ${hz} Hz: the jaw was never drawn in 0.3 s after chomp(1) — there is nothing to order the gather against`);
    else {
      if (!(deepest > BREATH)) fails.push(`rig ${hz} Hz: no frame before the jaw's first drawn frame (frame ${jawIdx + 1}) dips past `
        + `the ${(BREATH * 100).toFixed(1)}% breath (deepest ${(deepest * 100).toFixed(2)}%) — the gather does not come before the bite`);
      if (Math.abs(onJaw - 1) > 1e-9) fails.push(`rig ${hz} Hz: uniformK is ${onJaw.toFixed(4)} on the frame the jaw is first drawn — `
        + 'the gather lands on the gape instead of before it');
    }
    if (maxUk > 1 + 1e-9) fails.push(`rig ${hz} Hz: uniformK reaches ${maxUk.toFixed(4)} — the wind-up swells`);
  }
  {
    // D. a pin inside the wind-up lets go
    const dt = 1 / 60, { v, step } = rig();
    v.chomp(1); step(dt); step(dt);
    v.pinGape(0);
    let worst = 0, last = 1;
    for (let i = 1; i <= 60; i++) { last = step(dt).uniformK; worst = Math.max(worst, Math.abs(1 - last)); }
    console.log(`    pin    __pinGape(0) two 60 Hz frames into a full bite: worst |1 - uniformK| over the next second `
      + `${worst.toFixed(4)}, uniformK ${last.toFixed(4)} on its last frame`);
    if (worst > 1e-9) fails.push(`rig: __pinGape(0) inside the wind-up leaves the body off its size — uniformK ${last.toFixed(4)} `
      + 'a second after the pin; the gather is frozen on the frames the mood sheets photograph');
  }
  {
    // E. a spree gathers once
    const dt = 1 / 60, { v, step } = rig();
    v.chomp(1);
    for (let i = 0; i < 6; i++) step(dt);
    v.chomp(1);
    let worst = 0;
    for (let i = 0; i < 12; i++) worst = Math.max(worst, Math.abs(1 - step(dt).uniformK));
    console.log(`    spree  a second chomp(1) 0.1 s into the first: worst |1 - uniformK| after it ${worst.toFixed(4)}`);
    if (worst > 1e-9) fails.push(`rig: a second bite 0.1 s into the first dips the body again (${(worst * 100).toFixed(2)}%) — `
      + 'a hoover spree would re-anticipate on every mouthful');
  }
  {
    // F. graded on the rig
    const dt = 1 / 60, { v, step } = rig();
    v.chomp(G_MIN);
    let deepest = 0;
    for (let i = 0; i < 12; i++) deepest = Math.max(deepest, 1 - step(dt).uniformK);
    const fullDeep = rigRows[0].deepest;
    console.log(`    grade  snack chomp(${G_MIN}) gathers ${(deepest * 100).toFixed(2)}% against a full bite's ${(fullDeep * 100).toFixed(2)}% (60 Hz)`);
    if (!(deepest < fullDeep)) fails.push(`rig: a snack gathers ${(deepest * 100).toFixed(2)}%, not less than a full bite's `
      + `${(fullDeep * 100).toFixed(2)}%`);
  }
  console.log('');
}

// ── PART 3: the live rig ───────────────────────────────────────────────────
let liveNote = '';
if (PORT && !fails.length) {
  const { chromium } = await import('playwright');
  const { enterMatch } = await import('./_enter.mjs');
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  p.on('pageerror', (e) => console.log('PAGEERR ' + String(e).slice(0, 140)));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  } catch { /* private mode */ } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await enterMatch(p, WORLD);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.5, null, { timeout: 900000 });
  // A frozen radius: a bite at spawn size can evolve him, and the evolution's
  // own anticipation would dip uniformK for reasons that are not this one.
  // (__setVoidR writes curStage itself, so setting the size runs no ceremony.)
  await p.evaluate(() => window.__setVoidR(3));
  const t0 = await p.evaluate(() => window.__matchState().tClock);
  await p.waitForFunction((t) => window.__matchState().tClock > t + 0.3 && !window.__faceState().biting, t0, { timeout: 900000 });
  const live = await p.evaluate(() => new Promise((res) => {
    if (typeof window.__faceState().uniformK !== 'number') { res({ noHook: true }); return; }
    // The bite is fired from inside an animation frame, after the game's own
    // callback for it (the game registered its callback for this frame before
    // this one was), on a frame whose update left the mouth CLOSED: at r 3
    // on the spawn a natural bite can reopen the jaw between any two frames,
    // and a bite into an open mouth has no wind-up by design.
    let waited = 0;
    const arm = () => {
      const f0 = window.__faceState();
      if (f0.biting) {
        if (++waited > 120) { res({ busy: true }); return; }
        requestAnimationFrame(arm); return;
      }
      const ev0 = window.__stages().ceremonies;
      const ate = window.__eatNearest(0.3);
      if (!ate) { res({ noFood: true }); return; }
      // did this bite arm hit-stop? (it runs the rig on 6% of dt while it lasts)
      const stop = window.__juiceState().stop;
      const rows = [];
      let hold0 = null;
      const tick = () => {
        const f = window.__faceState();
        rows.push({ uk: f.uniformK, hold: f.hold, biting: f.biting, jaw: !f.smile });
        if (hold0 === null && f.biting) hold0 = f.hold;
        const spent = hold0 !== null && hold0 - f.hold >= 0.1;
        if (spent || rows.length >= 40) res({ base: f0.uniformK, baseJaw: !f0.smile, ate, stop, rows, evolved: window.__stages().ceremonies !== ev0 });
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(arm);
  }));
  await b.close();
  if (live.noHook) fail('faceState() does not report uniformK, so the body cannot be read back. This build predates Job 8');
  if (live.busy) fail('the jaw never closed in 120 frames at r 3 on the spawn, so there was no closed mouth to bite from. '
    + 'Inconclusive; a FAIL until a run is clean');
  if (live.noFood) fail('no edible between 0.3 and 1.0 of the void\'s radius anywhere in the world — nothing to bite');
  if (live.evolved) fail('the forced bite also evolved him, and the evolution pop dips uniformK on its own. Inconclusive; '
    + 'this is a FAIL until a run is clean, never a pass');
  if (live.baseJaw) fail('the jaw was already drawn before the bite (smile false), so there is no first drawn frame to order '
    + 'the gather against. Inconclusive; a FAIL until a run is clean');
  const jawIdx = live.rows.findIndex((r) => r.jaw);
  const pre = jawIdx < 0 ? [] : live.rows.slice(0, jawIdx);
  const minPre = pre.length ? Math.min(...pre.map((r) => r.uk)) : null;
  const minUk = Math.min(...live.rows.map((r) => r.uk));
  console.log(`  PART 3, LIVE ${WORLD}: bite r ${live.ate.r.toFixed(2)} on R ${live.ate.R.toFixed(2)}, hit-stop ${live.stop > 0 ? `ARMED (${live.stop.toFixed(3)} s)` : 'off'}, `
    + `uniformK ${live.base.toFixed(4)} before, min ${minUk.toFixed(4)} over ${live.rows.length} frame(s), `
    + `jaw first drawn on frame ${jawIdx < 0 ? 'never' : jawIdx + 1}:`);
  console.log(`    ${live.rows.map((r) => `${r.uk.toFixed(3)}${r.jaw ? '*' : ''}`).join(' ')}`);
  console.log('');
  if (jawIdx < 0) fails.push(`live: the jaw was never drawn in the ${live.rows.length} frames sampled — the gather cannot be `
    + 'ordered against it');
  else if (!(minPre !== null && minPre < live.base - 1e-4)) fails.push(`live: no frame before the jaw's first drawn frame `
    + `(frame ${jawIdx + 1}) dipped below ${live.base.toFixed(4)} — the gather does not come before the bite on the rig`);
  liveNote = `; the live rig gathered before the jaw on a real bite (${WORLD}, hit-stop ${live.stop > 0 ? 'armed' : 'off'})`;
}

if (fails.length) {
  for (const x of fails) console.log(`  · ${x}`);
  console.log(`\nFAIL — the bite has no anticipation a child can see before the jaw (${fails.length} finding(s))`);
  process.exit(1);
}
const rigSay = (rigRows || []).map((r) => `${r.hz} Hz ${(r.deepest * 100).toFixed(2)}% then 1 on frame ${r.jawIdx + 1}`).join(', ');
console.log(`PASS — a full bite gathers ${(full.peak * 100).toFixed(2)}% (breath ${(BREATH * 100).toFixed(1)}%), `
  + `a snack ${(snack.peak * 100).toFixed(2)}%; stepped on the rig the gather comes before the jaw and the body is whole on `
  + `the jaw's first drawn frame (${rigSay}); a mid-wind-up pin and a spree leave it whole`
  + (PORT ? liveNote : ' (node only; pass a port for the live rig)'));
