// WHAT THE PLAYER'S SCREEN ACTUALLY SHOWS — not what a render target says.
//
// qa/heroface.mjs has reported healthy saturation on the void all session, while
// the owner kept reporting the opposite: "Sometimes that light purple wash is
// still showing rather than our crisp dark one", "Color is still switching
// throughout." Both were right, because they were looking at different frames.
//
// heroface measures by calling renderer.render() into its OWN WebGLRenderTarget
// and reading it back. That is the DIRECT path. The shipped game may instead go
// through EffectComposer — and three refuses to run the graded CustomToneMapping
// when the destination is a render target, so the composer path is a different
// colour pipeline. A probe that renders its own frame can never see that.
//
// So this one measures the CANVAS, via a screenshot, exactly as a player's eye
// and a store screenshot would. It is slower and less precise than reading a
// buffer, and it is the only thing that can catch a whole-pipeline swap.
//
//   node qa/shippedlook.mjs [port] [world] [tag]
import { chromium } from 'playwright';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';

// ── A FRAME RECORDS WHAT IT IS A PHOTOGRAPH OF ────────────────────────────
// qa/packfresh.mjs first compared file mtimes and I defeated it with `touch`
// in the same minute I wrote it. Worse, mtime cannot see an uncommitted edit,
// which is most of what changes during a working session — exactly the window
// in which somebody reshoots, keeps working, and hands out the pack. A digest
// of the source cannot be bumped and cannot be faked by saving a file.
const srcDigest = () => {
  const h = createHash('sha256');
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      const q = join(d, e.name);
      if (e.isDirectory()) { walk(q); continue; }
      if (!/\.(ts|tsx)$/.test(e.name)) continue;
      h.update(e.name); h.update(readFileSync(q));
    }
  };
  walk('src');
  return h.digest('hex').slice(0, 16);
};
import { mkdirSync } from 'node:fs';

const PORT = process.argv[2] || '4173';
const WORLD = process.argv[3] || 'maple';
// ── ONE FILENAME PER WORLD, OR THE STALE SHOT OUTLIVES THE RESHOOT ────────
// The default was 'run'. docs/STUDIO.md points teams at <world>_look.png, so a
// reshoot wrote a SECOND set beside the old one and left the pack the teams
// actually read untouched — 46 hours and six island.ts commits stale. Two
// consecutive studio rounds were spent on a build that no longer existed, and
// the commit meant to fix it ("reshot at HEAD") only added more filenames.
// TEAM STATIC came within one paragraph of filing a blocker on a defect fixed
// 85 minutes after its photograph. A tag that varies lets a stale frame
// survive; the canonical shot overwrites itself.
const TAG = process.argv[4] || 'look';
const OUT = 'qa/out/shippedlook';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    // worlds unlock by finishing the one before; a fresh profile has only
    // Maple, so a locked card refuses the tap BY DESIGN and the probe hangs
    // waiting for a match that can never start — the exact qa/music.mjs trap
    // recorded in FABLE-BRIEF. Seed all four.
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  } catch { }
});
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
}));
// ── ONE MATCH, NOT TWO. THIS IS WHY THE HERO WAS NOT IN THE PACK ──────────
// This used to click #btnPlay and then click a world card behind it. #btnPlay
// stopped opening the picker (it is startFresh(false) — it launches the dot the
// ring is on); aadebff fixed the two probes that broke LOUDLY on that and did
// not reach this one, because this one broke silently. personsheet used
// Playwright's click(), which waits for visibility and timed out. This uses
// evaluate + .click(), which fires a hidden element's handler perfectly well —
// so the card ran a SECOND beginMatch on top of a live match.
//
// Under AUTO_START (any webdriver browser arms and starts in the same tick) the
// second beginMatch found `started` already true, so it lifted the hero to
// ARRIVE_HIGH for the drop-in and neither of the two things that put him back
// down could run — both are gated on `started`. Every frame in the pack was
// taken with the hero twenty-six world units above the town, off the top of the
// viewport, while every debug hook reported him present, visible, correctly
// sized and correctly placed in x and z.
//
// TEAM ART filed "the void is missing from the play frames" as a SHIP BLOCKER
// off these frames, and it was right about the frames and wrong about the game.
// src/prototype3d.ts resetMatch() now clears `started` so the second begin
// cannot strand him; this probe stops making a second begin at all.
//
// ?w=<world> was always the whole world selection — same finding as aadebff.
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  cv.dispatchEvent(new PointerEvent('pointerdown', {
    pointerId: 1, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true }));
});
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 400000 });
// HIDE THE HUD WITH A STYLESHEET, NOT INLINE STYLES. addCoins() rewrites the
// coin chip's inline style every time she earns, so "✦ 35" came back into
// maple_look.png alone of the six (studio round 4, Job 0). A marked class and
// an !important rule outrank anything the game writes inline.
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  for (const el of Array.from(document.body.children)) {
    if (el !== cv && !el.contains(cv)) el.setAttribute('data-qahide', '');
  }
  const st = document.createElement('style');
  st.textContent = '[data-qahide]{display:none !important}';
  document.head.appendChild(st);
});
// PIN THE RUNG. The whole point is which path rung 0 takes, and a probe that
// lets the adapter wander is reading a rung nobody chose.
await p.evaluate(() => window.__pinQuality(0));
await p.evaluate(() => window.__setVoidR(4));
// ── WAIT IN FRAMES, NOT IN MILLISECONDS ───────────────────────────────────
// This was `waitForTimeout(3400)`, copied from qa/heroface.mjs and described
// as the evolution burst. Under swiftshader with no GPU a frame takes about
// 2.5 wall-seconds, so 3400 ms buys ONE — measured: the match clock advanced
// 0.05 s, which is exactly one dt, across the whole wait. Everything the burst
// is being waited out (dispR springing to the new radius, the stage swap, the
// ribbons) needs frames and not time. The match clock only moves when a frame
// runs, so waiting on it is waiting on the renderer.
await p.waitForFunction((t0) => (window.__matchState?.().t ?? 0) > t0 + 0.6,
  await p.evaluate(() => window.__matchState().t), { timeout: 400000 }).catch(() => { });
// ── PIN THE FACE, OR PHOTOGRAPH A DIFFERENT CHARACTER IN EVERY WORLD ──────
// The studio reviewed a pack in which the mascot wore a small round gasp in
// Maple, Pirate, Game Day and Lantern and a wide grin with a tongue in Powder.
// Four alarmed, one delighted, one game. Eight teams looked at those five
// frames and only TEAM HERO's skeptic noticed.
//
// It is not a rendering bug. The gape is driven by EATING, not by mood, so a
// hero parked anywhere with food in reach is mid-bite in almost every frame —
// which world he happens to be caught chewing in is luck. void3d.ts:54 says so
// and shipped the fix: "Pinning is the only deterministic way to take that
// picture; waiting for a gap means waiting while he eats the set." The
// lookbook, which is the studio's whole evidence base, never called it.
//
// Held shut and set to cruise, so every world photographs the SAME character
// wearing his resting grin, and a difference between two frames is a
// difference in the world rather than in his lunch.
await p.evaluate(() => {
  window.__setMood?.('cruise');
  window.__pinMouth?.(true);
  window.__calm?.();          // and no leftover evolve ribbons across the shot
});
// ── THE CAMERA WHERE A CHILD HAS IT ───────────────────────────────────────
// Waiting out the ease under the software renderer takes ~57 frames, and the
// pack used to be shot after 0.75 match-seconds of it: every play frame had the
// hero at 0.544-0.572 of the frame width against 0.405 settled, a town 37%
// closer than a child ever sees it (studio round 4, Job 0 / I-1). __settleCam
// puts the distance on its aim and the follow on its target for a few frames.
const settled = await p.evaluate(() => { if (typeof window.__settleCam !== 'function') return false; window.__settleCam(4); return true; });
await p.waitForFunction((t0) => (window.__matchState?.().t ?? 0) > t0 + 0.15,
  await p.evaluate(() => window.__matchState().t), { timeout: 400000 }).catch(() => { });

const box = await p.evaluate(() => {
  const THREE = window.__THREE, cam = window.__cam;
  const vs = window.__voidState();
  const wp = new THREE.Vector3(vs.x, vs.r, vs.z);
  const sp = wp.clone().project(cam);
  const camD = Math.max(1, cam.position.distanceTo(wp));
  return {
    cx: (sp.x * 0.5 + 0.5) * innerWidth,
    cy: (1 - (sp.y * 0.5 + 0.5)) * innerHeight,
    pxR: (innerHeight / (2 * camD * Math.tan(cam.fov * Math.PI / 360))) * vs.r,
    q: window.__quality(),
    r: vs.r, aim: window.__camAim?.().aim ?? 0, now: window.__camAim?.().now ?? 0, vw: innerWidth,
  };
});
const path = `${OUT}/${WORLD}_${TAG}.png`;
// stamp the frame with the source it was taken from AND the frame's own hash.
// The one-field stamp diverged in the worst way: a container restart reverted
// the untracked PNGs to an old snapshot while the committed stamps survived,
// and qa/packfresh.mjs said PASS over three-day-old pixels. A stamp that does
// not identify the image it describes is a claim about nothing.
// …and the stamp is written AFTER the screenshot, not before. The first
// version of the two-field stamp hashed the file at `path` before
// p.screenshot() had replaced it — so it stamped the PREVIOUS frame, and
// qa/packfresh.mjs reported stamp/image MISMATCH on all five worlds within
// minutes of the check existing. The gate caught its own writer.
await p.screenshot({ path });
try {
  const img = createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16);
  writeFileSync(`${OUT}/${WORLD}_${TAG}.src`, srcDigest() + ' ' + img);
} catch { /* not fatal to a shot */ }
await b.close();

// ══ AND NOW MEASURE IT — WHICH THIS FILE HAS NEVER ONCE DONE ═══════════════
// Everything above this line is the picture. Everything below it was the point:
// "So this one measures the CANVAS, via a screenshot, exactly as a player's eye
// and a store screenshot would." It was written against node-canvas, which is
// not installed and never has been, so every run since the file was created hit
//
//     if (!createCanvas) { ...console.log('measure the PNG externally'); exit(0) }
//
// printed four lines of geometry and exited GREEN. Not one pixel was ever read.
// The file's whole reason to exist — it is slower and less precise than reading
// a buffer, and it is the only thing that can catch a whole-pipeline swap — was
// dead code behind a module that isn't there, and the dead branch exited 0, so
// nothing anywhere said so.
//
// What it cost: six play frames with no hero in them went into the studio's
// evidence pack, TEAM ART filed a ship blocker off them, and the pack was
// reshot twice through the same silence.
//
// pngjs is already a dependency (qa/_crop.mjs reads frames with it) and decodes
// what we need. No new install, and the measurement runs on every invocation.
import { PNG } from 'pngjs';

const DSF = 2;                      // deviceScaleFactor above
const img = PNG.sync.read(readFileSync(path));
const lumaAt = (ix, iy) => {
  const i = (iy * img.width + ix) * 4;
  return { r: img.data[i], g: img.data[i + 1], b: img.data[i + 2],
    // Rec.709 on the sRGB values, which is what an eye weights
    y: (0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2]) / 255 };
};
// Sample a disc over the hero and an annulus of town around him. The disc is
// 0.55 of his radius so the rim ring and the silhouette edge stay out of it;
// the annulus is 1.5-1.9r, past him and short of the frame edge.
const ring = (r0, r1) => {
  const px = [];
  const cx = box.cx * DSF, cy = box.cy * DSF, R = box.pxR * DSF;
  for (let a = 0; a < 512; a++) {
    const th = (a / 512) * Math.PI * 2;
    for (let k = 0; k <= 8; k++) {
      const rr = R * (r0 + (r1 - r0) * (k / 8));
      const ix = Math.round(cx + Math.cos(th) * rr), iy = Math.round(cy + Math.sin(th) * rr);
      if (ix < 0 || iy < 0 || ix >= img.width || iy >= img.height) continue;
      px.push(lumaAt(ix, iy));
    }
  }
  return px;
};
const mean = (px, k) => px.reduce((t, q) => t + q[k], 0) / Math.max(1, px.length);
const disc = ring(0, 0.55), town = ring(1.5, 1.9);
const dY = mean(disc, 'y'), tY = mean(town, 'y');
// HOW MUCH OF HIS OWN DISC IS HIM. The void is a dark body under the same sun
// as the town, so his pixels sit well below the town's. A frame with no hero in
// it has town in that disc and this lands near zero.
const cut = tY - 0.12;
const cover = disc.filter((q) => q.y < cut).length / Math.max(1, disc.length);
// …and the colour of the body, because "Sometimes that light purple wash is
// still showing rather than our crisp dark one" is the complaint this file was
// built to answer with a number.
const dark = disc.filter((q) => q.y < cut);
const mR = mean(dark, 'r'), mG = mean(dark, 'g'), mB = mean(dark, 'b');
const mx = Math.max(mR, mG, mB), mn = Math.min(mR, mG, mB);
const sat = mx <= 0 ? 0 : (mx - mn) / mx;

// THE BAR. Not frozen debt and not a tuned constant: a hero who fills at least
// a third of the inner 55% of his own disc is the weakest claim that can still
// only be true when he is drawn there. The frames this file has been producing
// score 0.00. A real hero fills most of it.
const COVER_MIN = 0.33;
console.log(`\n  frame: ${path}`);
console.log(`  rung ${box.q.level} pinned=${box.q.pinned} pr=${box.q.pr} shadows=${box.q.shadows}`);
console.log(`  void at (${box.cx.toFixed(0)}, ${box.cy.toFixed(0)}) r=${box.pxR.toFixed(0)} css px`);
console.log(`  disc luma ${dY.toFixed(3)} vs town ${tY.toFixed(3)}  -> hero covers ${(cover * 100).toFixed(1)}% of it`);
console.log(`  body rgb(${mR.toFixed(0)}, ${mG.toFixed(0)}, ${mB.toFixed(0)}) sat ${sat.toFixed(3)}`
  + (dark.length ? '' : '  (no body pixels to describe)'));
// THE SETTLED CHECK (Job 0's gate). The question is whether the frame was shot
// where a child has the camera, so the bar is the camera itself: its distance
// within 1% of its aim. The studio's width formula — the hero's share of the
// frame against (R / aim) / 0.1323 — is printed beside it and held to a loose
// 10% sanity bar only: with the camera EXACTLY on its aim it over-reads by a
// steady 4.4-5.4% on every world measured (maple 4.7, pirate 4.5, powder 4.4,
// lantern 4.6, skylark 5.4 — 2026-09-24), because the lens constant ignores
// the sphere's perspective and the camera's lookahead. Barring that at 5% was
// barring the formula's bias, and Skylark failed a frame that was settled.
const wFrac = (2 * box.pxR) / box.vw, wWant = box.aim > 0 ? (box.r / box.aim) / 0.1323 : 0;
const wOff = wWant > 0 ? Math.abs(wFrac / wWant - 1) : 1;
const camOff = box.aim > 0 ? Math.abs(box.now / box.aim - 1) : 1;
console.log(`  hero width ${wFrac.toFixed(3)} of the frame against ${wWant.toFixed(3)} by the lens formula (${(wOff * 100).toFixed(1)}% off; sanity bar 10%); `
  + `camera at ${box.now.toFixed(1)}, aim ${box.aim.toFixed(1)} -> ${(camOff * 100).toFixed(1)}% off (bar 1%; ${settled ? 'settled by __settleCam' : 'no __settleCam in this build'})`);
const inFrame = cover >= COVER_MIN, atAim = camOff <= 0.01 && wOff <= 0.10;
if (!inFrame) console.log(`\n  ${(cover * 100).toFixed(1)}% of his own disc is him, against a bar of ${(COVER_MIN * 100).toFixed(0)}%.`
  + '\n  Nothing below that can be a rendering nuance: he is somewhere else, or he is not drawn.');
if (!atAim) console.log(`\n  the camera is ${(camOff * 100).toFixed(1)}% off its aim (bar 1%) and the width ${(wOff * 100).toFixed(1)}% off the formula (bar 10%): shot mid-ease, a town closer than a child sees it.`);
// two literal verdicts for qa/idiomguard.mjs (#2a)
if (inFrame && atAim) console.log('\n  PASS — the hero is in the frame this pack hands the studio, at the distance a child has the camera');
else console.log(`\n  FAIL — ${!inFrame ? 'the hero is NOT in the frame' : 'the frame is not at the settled camera'}`);
process.exit(inFrame && atAim ? 0 : 1);
