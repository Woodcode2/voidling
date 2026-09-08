// qa/food.mjs — HOW MUCH OF THE SCREEN IS FOOD.
//
//   node qa/food.mjs [port] [world ...]
//
// Nothing in qa/ asked this, and it is the question three separate findings
// kept arriving at from different directions:
//
//   the owner, on placement — "sometimes in certain levels the items may be
//     misplaced... item placement isn't dialled in";
//   stream D's D2 bar (playfield above chroma 0.35) failing on every world
//     after the ground stopped being counted as an actor — maple 10.7%,
//     powder 3.3%, against a reference frame at 25.9%;
//   and the frames themselves. POWDER PASS at spawn is one snowman, a handful
//     of rocks and an acre of blank snow.
//
// D2 measured this by accident and in the wrong units. A prop is not "food"
// because it is saturated; it is food because you can EAT it. So this hides
// every edible and renders the same frame twice: the pixels that change are
// exactly the food, whatever colour it happens to be, and a beige crate counts
// the same as a red one.
//
// It also asks the two questions a player actually feels, which no pixel count
// can answer:
//   HOW FAR to the nearest thing I can eat right now?
//   HOW FAR to the fifth? — because one crate in an empty field is not density,
//   it is a lonely crate, and the walk between mouthfuls is the pacing.
//
// "Can eat right now" means radius <= the void's, which is why this is measured
// AT SPAWN, at his smallest, where the game is hardest to fill and where a new
// player forms their opinion of whether the world is worth being in.
//
// TWO NOTES ON METHOD, both learned the hard way in this repo:
//   DPR 1. Six 14.4 MB buffers at DPR 3 killed the browser twice.
//   SEEDED. qa/_worldshots.mjs went unseeded for a round and its frames moved
//   two points between runs on one build, purely from where the crowd stood.
// And the HUD does not appear here at all: it is DOM, and this reads the GL
// buffer, so there are no bands to exclude and no chance of counting a
// scoreboard as a snack.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { assertFreshDist } from './_freshdist.mjs';

const PORT = Number(process.argv[2] || 4177);
const ARGW = process.argv.slice(3).filter((a) => !a.startsWith('--'));
const WORLDS = ARGW.length ? ARGW : ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];
const SEED = Number(process.env.SEED || 7);
const OUT = 'qa-out/food';
mkdirSync(OUT, { recursive: true });
assertFreshDist('qa/food.mjs');

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [];
for (const world of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(400000);
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript((seed) => {
    let a = (seed >>> 0) + 0x6D2B79F5;
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, SEED);
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark'); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${world}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState && !!window.__edibles, null, { timeout: 400000 });
  // ── AND THE MATCH HAS TO BE STARTED THROUGH THE MENU ──────────────────────
  // A bare `?w=<world>` boot loads the world and then WAITS: __matchState().t
  // never leaves zero, so the first version of the wait below sat there for the
  // full fifteen-minute timeout. Every probe in this directory that needs a
  // live match goes in the same way — click PLAY, click the card — because
  // that is the path the game is built around. qa/occlusion.mjs:111 and
  // qa/_worldshots.mjs both do exactly this.
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${world}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  // ── WAIT FOR THE PLAY CAMERA, NOT FOR A CLOCK ─────────────────────────────
  // The first version waited 2.5 wall-seconds and shot whatever was there. The
  // opening DESCENT is still running at that point: the camera is high and
  // wide, the void renders about half the size he plays at, and the frame
  // contains a different amount of world than the one the game is actually
  // about. Two of the six worlds were measured mid-dive.
  // t > 5 game-seconds is the same condition qa/_worldshots.mjs settled on for
  // exactly this reason, and its comment says why: at swiftshader speeds wall
  // time and game time are not the same thing, so the only reliable signal is
  // the match clock. Nothing drives — this is still the untouched spawn.
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 900000 });
  await p.waitForTimeout(400);

  const r = await p.evaluate(() => {
    const T = window.__THREE, scene = window.__scene, cam = window.__cam;
    const R = window.__renderer, gl = R.getContext();
    const RR = R.render.bind(R);
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const grab = () => { const u = new Uint8Array(w * h * 4);
      RR(scene, cam); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, u); return u; };

    const vs = window.__voidState();
    const eds = window.__edibles.filter((e) => e.mesh && e.mesh.visible);

    // ── the two renders ───────────────────────────────────────────────────
    // A is the frame. B is the same frame with every edible switched off, so
    // A != B is food, by construction — no colour test, and a prop hidden
    // behind a building correctly counts as zero because it reaches no pixel.
    const A = grab();
    const was = eds.map((e) => e.mesh.visible);
    for (const e of eds) e.mesh.visible = false;
    const B = grab();
    eds.forEach((e, i) => { e.mesh.visible = was[i]; });
    RR(scene, cam);

    const DIFF = 10;
    let food = 0;
    const tint = new Uint8Array(w * h * 4);
    for (let i = 0, px = 0; i < A.length; i += 4, px++) {
      const changed = Math.abs(A[i] - B[i]) > DIFF || Math.abs(A[i + 1] - B[i + 1]) > DIFF
        || Math.abs(A[i + 2] - B[i + 2]) > DIFF;
      if (changed) food++;
      // the diagnostic picture: the frame, with everything edible pulled
      // toward magenta, so a human can see what the number is counting
      tint[i] = changed ? Math.min(255, A[i] * 0.45 + 255 * 0.55) : A[i];
      tint[i + 1] = changed ? A[i + 1] * 0.45 : A[i + 1];
      tint[i + 2] = changed ? Math.min(255, A[i + 2] * 0.45 + 220 * 0.55) : A[i + 2];
      tint[i + 3] = 255;
    }

    // ── and the walk between mouthfuls ────────────────────────────────────
    const here = new T.Vector3(vs.x, 0, vs.z);
    const eatable = [];
    let inView = 0, eatableInView = 0;
    const fr = new T.Frustum().setFromProjectionMatrix(
      new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const c = new T.Vector3();
    for (const e of eds) {
      e.mesh.getWorldPosition(c);
      const seen = fr.containsPoint(c);
      if (seen) inView++;
      const canEat = (e.radius || 0) <= vs.r;
      if (canEat) {
        eatable.push(Math.hypot(c.x - here.x, c.z - here.z));
        if (seen) eatableInView++;
      }
    }
    eatable.sort((x, y) => x - y);
    const png = () => {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d'), im = ctx.createImageData(w, h);
      for (let y = 0; y < h; y++) {                       // readPixels is bottom-up
        const s = (h - 1 - y) * w * 4, d = y * w * 4;
        for (let k = 0; k < w * 4; k++) im.data[d + k] = tint[s + k];
      }
      ctx.putImageData(im, 0, 0); return cv.toDataURL('image/png');
    };
    const ms = window.__matchState ? window.__matchState() : { t: -1 };
    return { w, h, coverage: 100 * food / (w * h), t: ms.t,
      edibles: eds.length, inView, eatableInView, eatableTotal: eatable.length,
      voidR: vs.r,
      nearest: eatable.length ? eatable[0] : null,
      fifth: eatable.length >= 5 ? eatable[4] : null,
      twentieth: eatable.length >= 20 ? eatable[19] : null,
      png: png() };
  });
  writeFileSync(`${OUT}/${world}-food.png`, Buffer.from(r.png.split(',')[1], 'base64'));
  delete r.png;
  rows.push({ world, ...r });
  await p.close();
}
await b.close();

console.log(`\nFOOD ON SCREEN — spawn frame, seed ${SEED}, ${rows[0] ? rows[0].w + 'x' + rows[0].h : ''}\n`);
console.log('world        screen is food   edibles   in view   eatable in view      nearest   5th    20th    t');
for (const r of rows)
  console.log(`${r.world.padEnd(11)} ${r.coverage.toFixed(1).padStart(9)}%   ${String(r.edibles).padStart(7)}`
    + `   ${String(r.inView).padStart(7)}   ${String(r.eatableInView).padStart(15)}`
    + `   ${(r.nearest == null ? '  —' : r.nearest.toFixed(1)).padStart(10)}`
    + `   ${(r.fifth == null ? ' —' : r.fifth.toFixed(1)).padStart(5)}`
    + `   ${(r.twentieth == null ? ' —' : r.twentieth.toFixed(1)).padStart(5)}`
    + `   ${r.t.toFixed(1).padStart(5)}`);
console.log(`\n  distances are world units from the void at spawn (radius ${rows[0] ? rows[0].voidR.toFixed(2) : '?'});`);
console.log(`  the pictures, with everything edible tinted magenta: ${OUT}/*-food.png`);
// ── THE BARS, AND WHERE EACH NUMBER COMES FROM ──────────────────────────────
// Both are drawn from evidence rather than from the reference game, because the
// reference is a set of screenshots: their frames can be measured for colour,
// and cannot be measured for how far their hero would have to walk.
//
// F1  THE FRAME HAS SOMETHING IN IT — 20% of it is food.
//     Measured on the six: 30.5, 31.9, 42.8, 23.6, 11.5, 24.8. Five of them
//     sit between 23.6 and 42.8, and the sixth is POWDER PASS, which is also
//     the one frame a human looks at and calls empty — a spawn ring of
//     snow-rocks and then blank snow to the horizon. The bar goes in the gap
//     our own evidence leaves: under all five, over the one that reads wrong.
//
// F2  AND THE NEXT MOUTHFULS ARE NOT A HIKE — the 20th within 1.5 seconds.
//     Expressed in TIME, not distance, because time is what a player feels and
//     because distance alone hides the pace: the void moves at SPAWN_SPEED
//     units per second at spawn, so the same 20 metres is a different game in
//     a fast world and a slow one. SPAWN_SPEED is read out of the source here
//     rather than copied, so retuning the pace retunes the bar with it.
//     Measured: maple 0.73 s, powder 1.07, skylark 1.26 — then lantern 1.83,
//     gameday 2.11 and pirate 3.00. The first three are the worlds that read
//     as full. Three seconds of travel to your twentieth bite is the emptiness
//     the whole probe was written to name.
//
//     NEAREST AND 5TH ARE NOT BARS. They are ~4 units in every world because
//     the spawn sits in a cleared circle with a ring of props at its edge —
//     a shared mechanism, doing its job, identical everywhere. Grading it would
//     be grading a constant.
const SPEED = (() => {
  const m = /const SPAWN_SPEED = ([\d.]+)/.exec(readFileSync('src/prototype3d.ts', 'utf8'));
  if (!m) { console.error('\n  SPAWN_SPEED is no longer where this probe reads it (src/prototype3d.ts).'
    + '\n  F2 is a time bar and cannot be graded without it. Nothing was measured.\n'); process.exit(2); }
  return Number(m[1]);
})();
const BARS = [
  { id: 'F1', what: 'of the frame is something you can eat', want: '>= 20%',
    get: (r) => r.coverage, fmt: (v) => v.toFixed(1) + '%', ok: (v) => v >= 20 },
  { id: 'F2', what: 'travel to the 20th mouthful, at spawn speed', want: '<= 1.5 s',
    get: (r) => (r.twentieth == null ? Infinity : r.twentieth / SPEED),
    fmt: (v) => (v === Infinity ? 'never' : v.toFixed(2) + ' s'), ok: (v) => v <= 1.5 },
];
console.log(`\n  at spawn he moves ${SPEED} units/second (src/prototype3d.ts)\n`);
let fail = 0;
for (const r of rows) for (const b of BARS) {
  const v = b.get(r), good = b.ok(v);
  if (!good) fail++;
  console.log(`${good ? 'PASS' : 'FAIL'}  ${r.world.padEnd(9)} ${b.id}  ${b.what.padEnd(44)}`
    + ` got ${b.fmt(v).padStart(7)}   want ${b.want}`);
}
console.log(`\n${rows.length * BARS.length - fail}/${rows.length * BARS.length}`);
process.exit(fail ? 1 : 0);
