// ── IS THERE ANYTHING ON THE OBJECT? ────────────────────────────────────────
//
// docs/DIORAMA-BRIEF.md §17.2, the sixth gate. Skylark passes every other test —
// the hero reads at 239 px, nothing occludes him, no bubble — and its frame is an
// empty green field. Powder got worse in the same way when the hero stepped 16
// units forward and covered the lodge: the occlusion number improved and the
// picture lost its subject. A pass rate made of the other bars would call both of
// those finished.
//
// So: how much of this picture is WORLD, and how much is bare ground?
//
// Two renders of one frame, inside a single synchronous evaluate so the drift
// cannot move between them:
//   A  the frame as it is
//   B  the frame with every edible hidden — ground, sky and hero only
// The fraction of pixels where they differ is the props' share of the picture.
//
// MEASURED OVER THE VISIBLE BAND ONLY. The ladder panel, PLAY and the shelf cover
// the bottom of the screen; counting scenery behind them would reward a world for
// content nobody can see. The band is the top 55% of the canvas, which is where
// the panel's top edge sits (~CSS y 536 of 932 on the shot decode).
//
// ── THREE AXES WERE MEASURED. AREA IS THE ONE THAT MATCHES THE EYE. ────────
//
// All six worlds, diorama camera:
//
//   world     area%   count   spread%
//   gameday    56.1     271       69
//   pirate     51.0     425       88
//   lantern    41.3     382       67
//   maple      39.4     251       98
//   skylark    29.7     620       60
//   powder     14.5     292       67
//
// ── THAT TABLE WAS TAKEN ON A MOVING CAMERA. RETIRED. ──────────────────────
//
// Every row above was shot at an unknown azimuth: the menu drifts +/-7 degrees
// on menuT, which is GAME time, and this probe waited WALL clock. Maple measured
// 37.3 one morning and 31.9 that afternoon on one build — a 5.4-point swing that
// crosses the floor in both directions, so the floor was never being tested.
// __menuFreeze now pins the pendulum and the probe blocks until stageCam.az
// equals the authored a0, which proves a frame has applied it. Two runs, camera
// frozen, all six worlds, dio=1:
//
//   world      area%        SEEN%       count   spread%
//   gameday   54.8  54.7   55.0  54.9     267       69
//   pirate    49.0  49.2   37.2  37.6     427       90
//   lantern   39.0  39.8   28.8  29.0     393       67
//   skylark   39.4  38.8   28.5  28.1     259       98
//   maple     35.7  36.1   28.0  28.0     255       98
//   powder     9.1   9.4    7.8   8.1     305       71
//
// Worst disagreement between the two runs: 0.8 points, against 5.4 before. The
// residue is the GLB landmarks and the crowd, which also move on game time.
//
// WHAT CHANGED IN THE VERDICT. Maple passes now, consistently, at 35.7-36.1 —
// under the drifting camera it straddled the floor. Skylark passes because
// DIO_AIM moved it to the launch field. POWDER IS THE ONLY FAILURE, and it is
// not close: 9.1-9.4 raw, 7.8-8.1 seen, against the next worst at 28.
//
// SEEN% IS THE TRUER NUMBER AND THE FLOOR IS STILL ON area%. Deliberate, for one
// reason: the 35 floor was calibrated against worlds RANKED BY EYE from
// photographs, and those photographs were of the raw frame. Moving the bar to a
// column nothing was ever ranked against would be swapping a calibrated number
// for an uncalibrated one. The two columns rank the six worlds identically, so
// nothing is being missed today. To move it: re-photograph the six through the
// scrim, rank by eye again, and put the floor at the break in SEEN% — which on
// these numbers looks like 20, isolating powder at 8 from maple at 28.
//
// Ranked by eye from the photographs: gameday and lantern are the best frames,
// maple and pirate are good, POWDER lost its subject when the hero stepped in
// front of the lodge, and SKYLARK is an empty field.
//
//   AREA separates them exactly. Powder and skylark are the bottom two and there
//   is a clean break at 29.7 -> 39.4. The floor goes here, at 35%.
//   COUNT is actively misleading: skylark has the MOST props in frame of any
//   world, 620, because a distant crowd is packed onto its horizon while the
//   middle of the picture is bare.
//   SPREAD is close but cannot tell lantern from powder — both 67, and one is the
//   best frame in the game while the other is the worst.
//
// A CORRECTION TO WHAT THIS FILE SAID BEFORE. Its previous header claimed the
// area measure "passed skylark" and was therefore insufficient. That was wrong,
// and it came from reading a partial table: skylark's 29.7 is SECOND LOWEST of
// the six, and I called it mid-pack while only its own row and today's column
// were in front of me. Measure 1 was sufficient from the start. The count and
// spread axes stay because they are cheap and because the count number is worth
// keeping visible — "620 props and still empty" is the clearest statement of what
// is wrong with skylark that this probe can make.
//
//   node qa/_dioful.mjs [port] [world]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv[3] ? [process.argv[3]] : ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];
const BAND = 0.55;   // top fraction of the canvas the UI does not cover

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [];
let azBad = 0;
try {
for (const w of WORLDS) for (const dio of [1, 0]) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror ${w}] ` + e.message.split('\n')[0]));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&manual=1&dio=${dio}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
  await p.waitForTimeout(20000);   // the GLB landmarks, before anything is counted
  // PIN THE PENDULUM. The drift is on game time and this wait is on wall clock,
  // so without this the azimuth differs every run — worth more than 5 points of
  // fullness on maple, which is more than the scrim correction below.
  await p.evaluate(() => window.__menuFreeze(0));
  // WAIT FOR THE CAMERA, NOT FOR menuT. __menuFreeze writes menuT synchronously,
  // so a wait on `menuT === 0` passes before any frame has run and the shot is
  // taken on the STALE pre-freeze azimuth. That is exactly what happened on the
  // first attempt: skylark's authored azimuth is 210 and it measured 212.43 and
  // 212.35, which is 1.5s of drift still applied. With menuT pinned at 0 the
  // drift term is 7*sin(0), so stageCam.az must equal the authored a0 exactly.
  await p.waitForFunction(() => {
    const m = window.__menuState();
    return m.azimuth !== null && Math.abs(m.azimuth - m.a0) < 0.01;
  }, null, { timeout: 180000 });

  const r = await p.evaluate((band) => {
    const scene = window.__scene, cam = window.__cam;
    const R = window.__renderer, gl = R.getContext();
    const RR = R.render.bind(R);
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    const grab = () => { const u = new Uint8Array(W * H * 4);
      RR(scene, cam); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, u); return u; };
    RR(scene, cam);
    const A = grab();
    // hide every prop, keep the ground, the sky and the hero
    const eds = window.__edibles, was = [];
    for (const e of eds) { was.push(e.mesh.visible); e.mesh.visible = false; }
    const B = grab();
    for (let i = 0; i < eds.length; i++) eds[i].mesh.visible = was[i];
    RR(scene, cam);

    // THE SCRIM. body.diorama #menu (index.html:1223-1226) is a 180deg gradient
    // laid over the canvas at z-index 10, inset 0. It is OPAQUE at the top of the
    // screen and fully clear only between 44% and 54% of the height. Every probe
    // in this directory grabs gl.readPixels off the bare context, so none of them
    // has ever seen it. Counting a prop at 5% of screen height the same as one at
    // 48% credits a world for pixels the child cannot see through violet.
    // Stops, as (fraction from top, alpha), read straight off the rule:
    const STOPS = [[0, 1], [0.15, 0.92], [0.30, 0.38], [0.44, 0], [0.54, 0], [0.68, 0.55], [0.82, 0.93], [1, 1]];
    const seeAt = (f) => {            // transmittance: how much of this row reaches the eye
      for (let k = 1; k < STOPS.length; k++) {
        if (f <= STOPS[k][0]) {
          const [f0, a0] = STOPS[k - 1], [f1, a1] = STOPS[k];
          const t = f1 === f0 ? 0 : (f - f0) / (f1 - f0);
          return 1 - (a0 + (a1 - a0) * t);
        }
      }
      return 0;
    };

    // readPixels is bottom-up, so the TOP band of the screen is the HIGH rows
    const y0 = Math.floor(H * (1 - band));
    let n = 0, diff = 0, wAll = 0, wDiff = 0;
    const D = 10;
    for (let y = y0; y < H; y++) {
      const see = seeAt(1 - (y + 0.5) / H);       // same row for the whole scanline
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4; n++; wAll += see;
        if (Math.abs(A[i] - B[i]) > D || Math.abs(A[i + 1] - B[i + 1]) > D || Math.abs(A[i + 2] - B[i + 2]) > D) { diff++; wDiff += see; }
      }
    }
    // HOW MANY DISTINCT PROPS ARE IN THE BAND. Projected centres, so a prop is
    // counted once whatever its size — which is the whole point of having this
    // beside the area figure.
    const T = window.__THREE, v = new T.Vector3();
    const GX = 8, GY = 6, cell = new Set();
    let inBand = 0;
    for (const e of eds) {
      if (e.eaten || !e.mesh.visible) continue;
      v.setFromMatrixPosition(e.mesh.matrixWorld).project(cam);
      if (v.z > 1) continue;                       // behind the lens
      const sx = (v.x + 1) * 0.5, sy = (1 - v.y) * 0.5;
      if (sx < 0 || sx > 1 || sy < 0 || sy > band) continue;
      inBand++;
      cell.add(Math.min(GX - 1, Math.floor(sx * GX)) + ',' + Math.min(GY - 1, Math.floor((sy / band) * GY)));
    }
    const _ms = window.__menuState();
    return { az: _ms.azimuth, azErr: +Math.abs(_ms.azimuth - _ms.a0).toFixed(3), propsPct: n ? +(100 * diff / n).toFixed(1) : 0,
      seenPct: wAll ? +(100 * wDiff / wAll).toFixed(1) : 0, inBand,
      spreadPct: +(100 * cell.size / (GX * GY)).toFixed(0), band: n, edibles: eds.length };
  }, BAND);
  rows.push({ w, dio, ...r });
  if (r.azErr > 0.01) { console.log(`  !! ${w} dio=${dio} measured at az ${r.az}, authored ${r.az - r.azErr} — THE FREEZE DID NOT HOLD`); azBad++; }
  console.log(`  ${w.padEnd(8)} dio=${dio}  az ${String(r.az).padStart(6)}  area ${String(r.propsPct).padStart(5)}%  SEEN ${String(r.seenPct).padStart(5)}%  count ${String(r.inBand).padStart(4)}  spread ${String(r.spreadPct).padStart(3)}% of 48 cells`);
  await p.close();
}
} finally { await b.close(); }

console.log('\nworld         area%       SEEN%        count       spread% (cells of 48 with a prop)');
console.log('            dio  today    dio  today    dio  today      dio   today');
for (const w of WORLDS) {
  const a = rows.find((r) => r.w === w && r.dio === 1), c = rows.find((r) => r.w === w && r.dio === 0);
  if (!a || !c) continue;
  console.log(`${w.padEnd(9)} ${String(a.propsPct).padStart(5)} ${String(c.propsPct).padStart(6)} ${String(a.seenPct).padStart(6)} ${String(c.seenPct).padStart(6)} ${String(a.inBand).padStart(6)} ${String(c.inBand).padStart(6)} ${String(a.spreadPct).padStart(8)} ${String(c.spreadPct).padStart(7)}`);
}
// A SHOT TAKEN ON A DRIFTING CAMERA IS NOT A MEASUREMENT. If the freeze did not
// hold, the numbers above are from an unknown azimuth and comparing them to a
// floor, or to each other, means nothing. Refuse to grade rather than grade wrong.
if (azBad) {
  console.log(`\nFAIL — ${azBad} shot(s) were taken on a camera that was still drifting; the numbers above are not comparable`);
  process.exit(1);
}
// THE FLOOR, on area, at the break the six numbers showed: 35%.
const FLOOR = 35;
const d = rows.filter((r) => r.dio === 1);
let bad = 0;
if (d.length) {
  for (const r of d) if (r.propsPct < FLOOR) { bad++;
    console.log(`\n  ${r.w}: ${r.propsPct}% of the visible band is world, against a floor of ${FLOOR}%` +
      (r.inBand > 400 ? ` — and ${r.inBand} props are in frame, so this is not a shortage of things. They are not where the picture needs them.` : '')); }
  console.log(bad
    ? `\nFAIL — ${bad} world(s) frame too little of themselves to be worth looking at`
    : `\nPASS — every world fills at least ${FLOOR}% of the visible band with itself`);
}
process.exit(bad ? 1 : 0);
