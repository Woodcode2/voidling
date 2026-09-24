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
// ── WHAT WENT WRONG, AND HOW MUCH OF IT IS KNOWN ──────────────────────────────
// Seen, in the lead's run of `node qa/moodsheet.mjs 4177 job8` (studio round 4,
// Job 8): four 410x410 frames. cruise showed the whole face. hurt, scared and
// frenzy were cropped deep inside it — a pink blob and a stripe — and the
// frenzy frame carried a "28 NOMS" pill. The file's last line printed PASS
// unconditionally once the frames were written.
//
// Read from the source, NOT measured — no browser has checked any of this:
//   · That file measured its crop box ONCE and reused it for all four moods.
//   · It measured the box after waiting for t > 0.2 and then 4000 ms of wall
//     clock, and gave each mood 3500 ms more. The match opens on the descent:
//     startMatch sets introT = DESCENT_LEN, 1.2 game-seconds
//     (prototype3d.ts:9695), and while introT > 0 the camera update writes
//     camDist from 132 down to 22 every frame, whatever his radius
//     (:14534-14537). A frame is at most 0.05 game-seconds, and
//     qa/shippedlook.mjs measured a 3400 ms wait buying ONE frame under
//     swiftshader, so at that rate those waits come to a handful of frames:
//     the box and all four shutters would fall inside the dive.
//   · Growth moved him too, and the source bounds it to a few per cent.
//     __setVoidR's frozenR switches off only the growth law's two clamps
//     (:13503-13504) and every meal still grows him (:8826), but at r 6
//     growRadius (:6016-6020) adds 0.19·eR² to r² per meal: 28 meals of eR 1.0
//     take r from 6 to 6.44.
//
// So now:
//   · nothing is framed until the descent is over. The wait is on
//     __matchState().introT, the game's own countdown, not on a copy of 1.2,
//     and each frame re-reads introT at both of its measurements and FAILS by
//     name if the dive is still running.
//   · per mood, his radius goes back to R, the jaw is pinned, the mood is set,
//     and __settleCam puts the camera onto its aim for that radius
//     (prototype3d.ts:14578-14579 sets camDist = targetDist for the next N
//     frames; during the descent targetDist IS the dive, which is why the wait
//     above has to come first). After the mood's settle, __settleCam again,
//     and the shutter waits for a frame to have run under it.
//   · the crop is cut at the shutter from __voidState().r projected through
//     the live camera — the pxR qa/shippedlook.mjs and void3d.ts:2276 compute,
//     around the body's own centre (the group, which carries the rest lift and
//     every bounce).
// He still eats while the mood settles. Each frame's line prints, at both
// reads, r, the drawn radius, and the camera's distance beside its aim
// (__camAim), so a frame shot at another size or off its aim says so.
//
// ── THE SELF-CHECK ────────────────────────────────────────────────────────────
// A frame FAILS when the descent is running at either read, or when the void's
// projected disc is not wholly inside it. The disc is NOT the pxR the crop was
// sized from, which is the on-axis shortcut and would make the check agree
// with the crop by construction. It is the sphere's own outline: the circle
// where sight lines from the lens graze the sphere, projected at 64 points,
// whose extent is the true silhouette's under perspective, off-axis stretch
// included. The sphere's radius is the larger of __voidState().r and the DRAWN
// radius: the body mesh's largest world scale, which is dispR (it springs past
// r on every meal, void3d.ts:2095-2097) times the breath and squash
// (void3d.ts:2257). What the body's vertex shader adds on top of that scale
// (the jelly idle, the late forms' churn, the stretch along travel; VOID_VERT)
// is in neither number. The disc is measured immediately before the
// screenshot and again immediately after, and BOTH must sit inside the frame,
// because frames keep running between the two reads and the shutter lands
// somewhere between them. The crop is kept inside the viewport, so a void too
// near an edge to be framed whole fails rather than being written short.
//
// ── WAIT ON THE GAME, NOT ON THE WALL ─────────────────────────────────────────
// This file said so in a comment and then waited 2500, 1500 and 3500 ms of wall
// clock. qa/shippedlook.mjs measured 3400 ms buying ONE frame under swiftshader,
// and one frame of the mood lerp (k = min(1, dt*9), void3d.ts:2433, with dt
// clamped at 0.05, prototype3d.ts:13120) is 0.45 of the way there. Every wait
// below is on the game's own state: introT for the descent, tClock (the game's
// monotonic clock) for the rest. 0.6 game-seconds is qa/moodrule.mjs's settle:
// 99.5% of the way for that lerp.
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
// Frames __settleCam holds the camera on its aim for: at the start of a mood,
// and again at its shutter, where the count has to outlast the frame waited for,
// both reads and the screenshot. The camera's gap to its aim is printed at both
// reads either way.
const SETTLE_CAM = 4, SHUTTER_CAM = 8;
// The page hooks this file cannot frame without. Checked up front, so an older
// build is refused by name instead of timing out on a wait that cannot end.
const HOOKS = ['__voidState', '__voidGroup', '__matchState', '__camAim', '__settleCam',
  '__setVoidR', '__setMood', '__pinMouth', '__pinGape', '__calm', '__faceState'];

/** Runs IN THE PAGE (Playwright serialises it), so it may use nothing from this
 *  module. Where the body is on screen and how big, two ways: pxR, the on-axis
 *  size the crop is cut from, and the sphere's projected outline, which the
 *  self-check holds the crop to. */
function measureDisc() {
  const THREE = window.__THREE, cam = window.__cam, vs = window.__voidState(), g = window.__voidGroup();
  const W = innerWidth, H = innerHeight;
  const c = new THREE.Vector3(); g.getWorldPosition(c);
  const q = c.clone().project(cam);
  const camD = cam.position.distanceTo(c);
  const pxR = (H / (2 * Math.max(1e-6, camD) * Math.tan(cam.fov * Math.PI / 360))) * vs.r;
  // the DRAWN radius: the largest world scale of the mesh in his group that
  // carries the body shader's uPxR uniform (bob.scale, void3d.ts:2257)
  let drawn = -Infinity;
  g.traverse((o) => {
    if (o.isMesh && o.material && o.material.uniforms && o.material.uniforms.uPxR) {
      const s = o.getWorldScale(new THREE.Vector3());
      drawn = Math.max(drawn, s.x, s.y, s.z);
    }
  });
  const rr = Math.max(vs.r, drawn);
  // the grazing circle: centre pulled r²/d toward the lens, radius r·√(1 − r²/d²)
  const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
  const v = c.clone().sub(cam.position).normalize();
  const rho = rr * Math.sqrt(Math.max(0, 1 - (rr / Math.max(1e-6, camD)) ** 2));
  const T = c.clone().addScaledVector(v, -(rr * rr) / Math.max(1e-6, camD));
  const u = new THREE.Vector3().crossVectors(v, Math.abs(v.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
  const w = new THREE.Vector3().crossVectors(v, u);
  // wholly in front of the lens, or its outline does not project to a disc at all
  const front = c.clone().sub(cam.position).dot(fwd) > rr + (cam.near || 0);
  let l = Infinity, rt = -Infinity, t = Infinity, b = -Infinity;
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const P = T.clone().addScaledVector(u, rho * Math.cos(a)).addScaledVector(w, rho * Math.sin(a)).project(cam);
    const x = (P.x * 0.5 + 0.5) * W, y = (-P.y * 0.5 + 0.5) * H;
    l = Math.min(l, x); rt = Math.max(rt, x); t = Math.min(t, y); b = Math.max(b, y);
  }
  const ms = window.__matchState(), aim = window.__camAim();
  return { cx: (q.x * 0.5 + 0.5) * W, cy: (-q.y * 0.5 + 0.5) * H, pxR, r: vs.r,
    drawn: Number.isFinite(drawn) ? drawn : null, front,
    l, rt, t, b, vw: W, vh: H, tClock: ms.tClock, introT: ms.introT, combo: ms.combo ?? 0,
    camNow: aim.now, camAim: aim.aim };
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
const span = (m) => `x ${m.l.toFixed(0)}-${m.rt.toFixed(0)} y ${m.t.toFixed(0)}-${m.b.toFixed(0)}`;
/** Every reason one read fails its frame; empty when it holds. */
const faults = (clip, m) => {
  const f = [];
  if (!(m.introT <= 0)) f.push(`the descent was still running (introT ${Number(m.introT).toFixed(3)})`);
  if (m.drawn === null) f.push('no mesh in __voidGroup() carries the body shader, so the drawn radius was not read');
  if (!m.front) f.push('the disc is not in front of the lens');
  else if (![m.l, m.rt, m.t, m.b].every(Number.isFinite)) f.push('the outline did not project');
  else if (!(m.l >= clip.x && m.rt <= clip.x + clip.width && m.t >= clip.y && m.b <= clip.y + clip.height)) {
    f.push(`disc ${span(m)} is outside the frame`);
  }
  return f;
};
const fx = (n, d = 2) => (n === null || n === undefined ? 'n/a' : Number(n).toFixed(d));

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
const missing = await p.evaluate((names) => {
  const gone = names.filter((k) => typeof window[k] !== 'function');
  if (!gone.includes('__matchState') && !('introT' in window.__matchState())) gone.push('__matchState().introT');
  if (!window.__THREE || !window.__cam) gone.push('__THREE/__cam');
  return gone;
}, HOOKS);
if (missing.length) {
  await b.close();
  console.log(`FAIL — this build has no ${missing.join(', ')}, which the mood sheet needs to wait out the `
    + 'descent and to frame him on a settled camera');
  process.exit(1);
}
await enterMatch(p, WORLD);
// PAST THE DESCENT, on the game's own countdown. t > 0 says the match has
// started (t is 0 until it does, and startMatch sets introT in the same call
// that sets started, prototype3d.ts:9664 and :9695), and introT <= 0 says the
// dive is over and its shadows-off is lifted (:14508-14510).
const landed = await p.waitForFunction(() => { const m = window.__matchState(); return m.t > 0 && m.introT <= 0; },
  null, { timeout: 900000 }).then(() => true, () => false);
if (!landed) {
  await b.close();
  console.log('FAIL — the match never got past its descent: __matchState() did not show t > 0 with introT <= 0 '
    + 'inside 900 s, so there was no settled camera to frame him under');
  process.exit(1);
}

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

const rows = [];
// THE JAW IS PINNED SHUT, NOT THE GAPE ZEROED. This called __pinGape(0), which
// clears the bite in flight and nothing more (void3d.ts pinGape: `v <= 0` sets
// mouthT and mouthMax to 0 and returns) — the next meal opens the jaw again. A
// settle of 0.6 game-seconds is twelve frames at the 0.05 clamp, and the Job 8
// run's frenzy frame showed a 28-link NOMS chain. __pinMouth(true) makes
// chomp() return before it opens anything (void3d.ts:2043) and leaves the
// mood's own mouth alone, which is what shippedlook pins for its hero too.
for (const v of STEPS) {
  await p.evaluate(({ m, r, n }) => {
    window.__setVoidR(r);
    window.__calm();            // no evolve ribbons carried in from a meal
    window.__pinMouth(true);
    window.__setMood(m);
    window.__settleCam(n);
  }, { m: v, r: R, n: SETTLE_CAM });
  const t0 = await p.evaluate(() => window.__matchState().tClock);
  await p.waitForFunction(({ t, s }) => window.__matchState().tClock > t + s, { t: t0, s: SETTLE }, { timeout: 900000 });
  // …nor ribbons fired by a meal during the settle; and the camera back onto
  // its aim for whatever radius he reached, with one frame run under the snap
  // before anything is read
  const t1 = await p.evaluate((n) => { window.__calm(); window.__settleCam(n); return window.__matchState().tClock; }, SHUTTER_CAM);
  await p.waitForFunction((t) => window.__matchState().tClock > t, t1, { timeout: 900000 });
  const name = `mood-${v}.png`;
  const pre = await p.evaluate(measureDisc);
  const clip = frameFor(pre, FRAME_K);
  await p.screenshot({ path: `${OUT}/${name}`, clip });
  const post = await p.evaluate(measureDisc);
  const st = await p.evaluate(() => window.__faceState());
  const fPre = faults(clip, pre), fPost = faults(clip, post);
  const whole = !fPre.length && !fPost.length;
  rows.push({ v, whole });
  console.log(`  ${name.padEnd(18)} mood ${String(st.mood).padEnd(8)} smile ${st.smile ? 'shown ' : 'hidden'}`
    + `  r ${fx(pre.r)}->${fx(post.r)}  drawn ${fx(pre.drawn)}->${fx(post.drawn)}`
    + `  cam ${fx(pre.camNow, 1)}->${fx(post.camNow, 1)} aim ${fx(pre.camAim, 1)}->${fx(post.camAim, 1)}`
    + `  pxR ${pre.pxR.toFixed(0)}  noms ${pre.combo}`
    + `  frame ${clip.width}x${clip.height} at (${clip.x},${clip.y})  ${whole ? 'whole' : 'CUT'}`);
  if (!whole) {
    const why = (f) => (f.length ? f.join('; ') : 'held');
    console.log(`      before the shutter: ${why(fPre)}. after: ${why(fPost)}. `
      + `frame x ${clip.x}-${clip.x + clip.width} y ${clip.y}-${clip.y + clip.height}`);
  }
}
await p.evaluate(() => { window.__pinMouth(false); window.__pinGape(0); window.__setMood(null); });
await b.close();
console.log('');
const cut = rows.filter((x) => !x.whole).map((x) => x.v);
if (cut.length) {
  console.log(`FAIL — ${cut.length} of ${STEPS.length} frames in ${OUT}/ cut the void's projected disc or were shot `
    + `inside the descent (${cut.join(', ')}), at MOOD_FRAME ${FRAME_K}. A face that is not in the frame cannot be read off it.`);
  process.exit(1);
}
console.log(`PASS — wrote ${STEPS.length} frames to ${OUT}/, each shot after the descent and holding the void's whole `
  + `projected disc, at the larger of his gameplay and drawn radius, before and after its shutter. `
  + `This sheet does not judge the faces; it is the picture the judgement gets made from.`);
