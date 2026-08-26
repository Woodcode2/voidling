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
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
  } catch { }
});
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
}));
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1400);
await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  cv.dispatchEvent(new PointerEvent('pointerdown', {
    pointerId: 1, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true }));
});
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 400000 });
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  for (const el of Array.from(document.body.children)) {
    if (el !== cv && !el.contains(cv)) el.style.display = 'none';
  }
});
// PIN THE RUNG. The whole point is which path rung 0 takes, and a probe that
// lets the adapter wander is reading a rung nobody chose.
await p.evaluate(() => window.__pinQuality(0));
await p.evaluate(() => window.__setVoidR(4));
await p.waitForTimeout(3400);   // evolution burst, see qa/heroface.mjs
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
await p.waitForTimeout(600);

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
  };
});
const path = `${OUT}/${WORLD}_${TAG}.png`;
// stamp the frame with the source it was taken from — see srcDigest above
try { writeFileSync(`${OUT}/${WORLD}_${TAG}.src`, srcDigest()); } catch { /* not fatal to a shot */ }
await p.screenshot({ path });
await b.close();

// measure the void disc out of the PNG — the canvas, as shipped
const { createCanvas, loadImage } = await import('canvas').catch(() => ({}));
if (!createCanvas) {
  console.log(`  frame: ${path}`);
  console.log(`  rung ${box.q.level} pinned=${box.q.pinned} pr=${box.q.pr} shadows=${box.q.shadows}`);
  console.log(`  void at (${box.cx.toFixed(0)}, ${box.cy.toFixed(0)}) r=${box.pxR.toFixed(0)} css px`);
  console.log('  (node-canvas unavailable — measure the PNG externally)');
  console.log(JSON.stringify({ path, ...box }));
  process.exit(0);
}
