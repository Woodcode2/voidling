// WHAT DOES HIS FACE LOOK LIKE IN EACH MOOD? — the mood sheet.
//
//   node qa/moodsheet.mjs [port] [world] [tag]        writes qa/out/mood/<tag>/ (tag defaults to the world)
//   MOOD_FRAME=0.5 node qa/moodsheet.mjs 4177 maple fk05
//                   the frame's half-width in projected radii (default 1.1). Below
//                   1 the frame cannot hold him, so every frame must FAIL — the
//                   run that proves the self-check below can see a cut face.
//
// Pins each mood in turn on a live match, holds the jaw shut so the face is the
// mood's and not his lunch's, and crops a square around him. It does not judge
// the faces. It is the picture the judgement gets made from, and the one thing
// it does judge is whether the picture HAS the face in it.
//
// This file began as a copy of qa/gapesheet.mjs and kept that file's header and
// usage line until now — a reader was told it was the gape sheet.
//
// ── WHY THE CROP IS TAKEN AT EVERY SHUTTER, FROM THE LIVE CAMERA ──────────────
// `node qa/moodsheet.mjs 4177 job8` (studio round 4, Job 8) wrote four 410x410
// frames. cruise showed the whole face. hurt, scared and frenzy were cropped
// deep inside it — a pink blob and a stripe — and the frenzy frame carried a
// "28 NOMS" pill. The file's last line printed PASS unconditionally once the
// frames were written; it had no way to say anything else.
//
// 410 device px is 2.2 projected radii of 93 css px: the box was measured ONCE,
// before the first mood, and reused for all four. Nothing held him at that size.
// __setVoidR sets frozenR, and frozenR only switches off the growth law's two
// clamps (prototype3d.ts:13503-13504); every meal still calls
// setRadius(growRadius(...)) (:8826). So a void parked at r 6 in a town full of
// things smaller than r 6 eats, and grows, with no ceiling at all — and the
// camera follows his size on an ease that __camAim's own comment puts at "up to
// a minute at the 1-2fps a software renderer manages". His disc outgrew a box
// sized before the first mood, and from the second shutter on the frame was
// nothing but face.
//
// So now, per mood: his radius is put back to R and the camera onto its aim for
// that radius (__settleCam), so the four frames start from the same character
// at the same size; and the crop is measured at the shutter, from __voidState().r
// projected through the live camera — the pxR qa/shippedlook.mjs and
// void3d.ts:2276 compute, around the body's own centre (the group, which carries
// the rest lift and every bounce). He still eats while the mood settles, and
// the crop follows whatever size he reached; the line for each frame prints it.
//
// ── THE SELF-CHECK ────────────────────────────────────────────────────────────
// A frame FAILS when the void's projected disc is not wholly inside it. The disc
// is NOT the pxR the crop was sized from, which is the on-axis shortcut and
// would make the check agree with the crop by construction. It is the sphere's
// own outline: the circle where sight lines from the lens graze a sphere of
// radius __voidState().r, projected at 64 points, whose extent is the true
// silhouette's under perspective, off-axis stretch included. It is measured
// immediately before the screenshot and again immediately after, and BOTH must
// sit inside the frame, because frames keep running between the two reads and
// the shutter lands somewhere between them. The crop is kept inside the
// viewport, so a void too near an edge to be framed whole fails rather than
// being written short.
//
// ── WAIT IN GAME TIME, NOT WALL TIME ──────────────────────────────────────────
// This file said so in a comment and then waited 2500, 1500 and 3500 ms of wall
// clock. qa/shippedlook.mjs measured 3400 ms buying ONE frame under swiftshader,
// and one frame of the mood lerp (k = min(1, dt*9), void3d.ts:2433, with dt
// clamped at 0.05, prototype3d.ts:13120) is 0.45 of the way there. Every wait
// below is on tClock, the game's own monotonic clock. 0.6 game-seconds is
// qa/moodrule.mjs's settle: 99.5% of the way for that lerp.
//
// TRAP: voidUnlocked is a COMMA-JOINED STRING (src/game/unlocks.ts:49), not
// JSON — UNLOCK_ALL from qa/worlds.mjs is that string.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { enterMatch } from './_enter.mjs';
import { ALL_WORLDS, UNLOCK_ALL } from './worlds.mjs';

// a run that throws or rejects anywhere below prints a verdict, not a stack
const die = (e) => { console.log(`\nFAIL — moodsheet aborted before a verdict: ${String((e && e.message) || e).split('\n')[0]}`); process.exit(1); };
process.on('uncaughtException', die);
process.on('unhandledRejection', die);

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
// The second argument was the tag until this file took a world. A tag passed in
// the old position is refused by name, not loaded as ?w=job8.
if (!ALL_WORLDS.includes(WORLD)) {
  console.log(`FAIL — "${WORLD}" is not a world (${ALL_WORLDS.join(', ')}). `
    + 'usage: node qa/moodsheet.mjs [port] [world] [tag]');
  process.exit(1);
}
const TAG = process.argv[4] || WORLD;
const OUT = `qa/out/mood/${TAG}`;
const STEPS = ['cruise', 'scared', 'hurt', 'frenzy'];
// A size that fills enough of the frame to judge the face.
const R = 6;
// The frame's half-width in projected radii. 1.1 is the margin the sheet has
// always used; cruise, the one frame the stale box got right, showed the whole
// face at it.
const FRAME_K = Number(process.env.MOOD_FRAME || 1.1);
if (!(FRAME_K > 0)) { console.log(`FAIL — MOOD_FRAME must be a positive number, got "${process.env.MOOD_FRAME}"`); process.exit(1); }
const SETTLE = 0.6;   // game-seconds; see the header

/** Runs IN THE PAGE (Playwright serialises it), so it may use nothing from this
 *  module. Where the body is on screen and how big, two ways: pxR, the on-axis
 *  size the crop is cut from, and the sphere's projected outline, which the
 *  self-check holds the crop to. */
function measureDisc() {
  const THREE = window.__THREE, cam = window.__cam, vs = window.__voidState();
  const W = innerWidth, H = innerHeight;
  const c = new THREE.Vector3(); window.__voidGroup().getWorldPosition(c);
  const q = c.clone().project(cam);
  const camD = cam.position.distanceTo(c);
  const pxR = (H / (2 * Math.max(1e-6, camD) * Math.tan(cam.fov * Math.PI / 360))) * vs.r;
  // the grazing circle: centre pulled r²/d toward the lens, radius r·√(1 − r²/d²)
  const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
  const v = c.clone().sub(cam.position).normalize();
  const rho = vs.r * Math.sqrt(Math.max(0, 1 - (vs.r / Math.max(1e-6, camD)) ** 2));
  const T = c.clone().addScaledVector(v, -(vs.r * vs.r) / Math.max(1e-6, camD));
  const u = new THREE.Vector3().crossVectors(v, Math.abs(v.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
  const w = new THREE.Vector3().crossVectors(v, u);
  // wholly in front of the lens, or its outline does not project to a disc at all
  const front = c.clone().sub(cam.position).dot(fwd) > vs.r + (cam.near || 0);
  let l = Infinity, rt = -Infinity, t = Infinity, b = -Infinity;
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const P = T.clone().addScaledVector(u, rho * Math.cos(a)).addScaledVector(w, rho * Math.sin(a)).project(cam);
    const x = (P.x * 0.5 + 0.5) * W, y = (-P.y * 0.5 + 0.5) * H;
    l = Math.min(l, x); rt = Math.max(rt, x); t = Math.min(t, y); b = Math.max(b, y);
  }
  const ms = window.__matchState();
  return { cx: (q.x * 0.5 + 0.5) * W, cy: (-q.y * 0.5 + 0.5) * H, pxR, r: vs.r, front,
    l, rt, t, b, vw: W, vh: H, tClock: ms.tClock, combo: ms.combo ?? 0 };
}

/** The crop: a square 2·k·pxR on a side, centred on him, SHIFTED (never
 *  shrunk) to stay inside the viewport — Playwright writes whatever part of a
 *  clip is on screen, so a clip hanging off the edge would be a frame the check
 *  never saw. Integer css px, so the file is exactly this rectangle. */
const frameFor = (m, k) => {
  const side = Math.max(1, Math.round(2 * k * m.pxR));
  const width = Math.min(side, m.vw), height = Math.min(side, m.vh);
  const x = Math.min(Math.max(0, Math.round(m.cx - width / 2)), m.vw - width);
  const y = Math.min(Math.max(0, Math.round(m.cy - height / 2)), m.vh - height);
  return { x, y, width, height };
};
const holds = (clip, m) => m.front && [m.l, m.rt, m.t, m.b].every(Number.isFinite)
  && m.l >= clip.x && m.rt <= clip.x + clip.width && m.t >= clip.y && m.b <= clip.y + clip.height;
const span = (m) => `x ${m.l.toFixed(0)}-${m.rt.toFixed(0)} y ${m.t.toFixed(0)}-${m.b.toFixed(0)}`;

mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log(`  [pageerror] ${String(e.message || e).split('\n')[0]}`));
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript((unlock) => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', unlock);
} catch { /* private mode */ } }, UNLOCK_ALL);
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await enterMatch(p, WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 900000 });

// THE HUD OUT OF THE WAY — ALL OF IT, INCLUDING WHAT ARRIVES LATER. This was a
// list of ids written before the NOMS pill (#noms), the wayfinder, the form
// callout and the goal chip existed, and #noms is placed beside his face every
// frame (paintNoms), which is how "28 NOMS" got into the frenzy frame. One rule
// on every child of <body> but the game canvas covers the list and the bubbles
// bubbles.ts appends to <body> mid-run. opacity, not visibility: a child that
// sets `visibility: visible` on itself shows through a hidden parent.
const hudOff = await p.evaluate(() => {
  const cv = document.getElementById('gameCanvas');
  if (!cv || cv.parentElement !== document.body) return false;
  const st = document.createElement('style');
  st.textContent = 'body > :not(#gameCanvas){opacity:0 !important}';
  document.head.appendChild(st);
  return true;
});
if (!hudOff) {
  await b.close();
  console.log('FAIL — the game canvas is not <body>\'s #gameCanvas any more (prototype3d.ts:397), '
    + 'so the HUD rule would hide the game itself');
  process.exit(1);
}

const hasSettle = await p.evaluate(() => typeof window.__settleCam === 'function');
const rows = [];
// THE JAW IS PINNED SHUT, NOT THE GAPE ZEROED. This called __pinGape(0), which
// clears the bite in flight and nothing more (void3d.ts pinGape: `v <= 0` sets
// mouthT and mouthMax to 0 and returns) — the next meal opens the jaw again. A
// settle of 0.6 game-seconds is twelve frames at the 0.05 clamp, and the Job 8
// run's void ate a 28-link spree between its shutters. __pinMouth(true)
// makes chomp() return before it opens anything (void3d.ts:2043) and leaves the
// mood's own mouth alone, which is what shippedlook pins for its hero too.
for (const v of STEPS) {
  await p.evaluate(({ m, r }) => {
    window.__setVoidR(r);
    window.__calm();            // no evolve ribbons carried in from a meal
    window.__pinMouth(true);
    window.__setMood(m);
    window.__settleCam?.(4);
  }, { m: v, r: R });
  const t0 = await p.evaluate(() => window.__matchState().tClock);
  await p.waitForFunction(({ t, s }) => window.__matchState().tClock > t + s, { t: t0, s: SETTLE }, { timeout: 900000 });
  await p.evaluate(() => window.__calm());   // …nor one fired by a meal during the settle
  const name = `mood-${v}.png`;
  const pre = await p.evaluate(measureDisc);
  const clip = frameFor(pre, FRAME_K);
  await p.screenshot({ path: `${OUT}/${name}`, clip });
  const post = await p.evaluate(measureDisc);
  const st = await p.evaluate(() => window.__faceState());
  const whole = holds(clip, pre) && holds(clip, post);
  rows.push({ v, whole });
  console.log(`  ${name.padEnd(18)} mood ${String(st.mood).padEnd(8)} smile ${st.smile ? 'shown ' : 'hidden'}`
    + `  r ${pre.r.toFixed(2)}->${post.r.toFixed(2)}  pxR ${pre.pxR.toFixed(0)}  noms ${pre.combo}`
    + `  frame ${clip.width}x${clip.height} at (${clip.x},${clip.y})  ${whole ? 'whole' : 'CUT'}`);
  if (!whole) {
    const why = (m) => (m.front ? span(m) : 'not in front of the lens');
    console.log(`      disc before the shutter ${why(pre)}, after ${why(post)}; `
      + `frame x ${clip.x}-${clip.x + clip.width} y ${clip.y}-${clip.y + clip.height}`);
  }
}
await p.evaluate(() => { window.__pinMouth(false); window.__pinGape(0); window.__setMood(null); });
await b.close();
console.log('');
if (!hasSettle) console.log('  (no __settleCam in this build: the camera was framed wherever its ease had got to)');
const cut = rows.filter((x) => !x.whole).map((x) => x.v);
if (cut.length) {
  console.log(`FAIL — ${cut.length} of ${STEPS.length} frames in ${OUT}/ cut the void's projected disc `
    + `(${cut.join(', ')}), at MOOD_FRAME ${FRAME_K}. A face that is not in the frame cannot be read off it.`);
  process.exit(1);
}
console.log(`PASS — wrote ${STEPS.length} frames to ${OUT}/, each holding the void's whole projected disc `
  + `before and after its shutter. This sheet does not judge the faces; it is the picture the judgement gets made from.`);
