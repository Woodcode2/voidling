// HOW FAR SHOULD THE FACE BE SEATED ONTO THE BALL?
//
// The features used to live on one flat plane at z = 1.0 — the sphere's tangent
// plane at its front pole. A brow at (0.36, 0.4) therefore floated 0.16 proud
// of the head it is painted on, and nothing ever foreshortened toward the rim.
// That is a decal on a ball, and it is the biggest single reason the character
// read as a sticker rather than as a face.
//
// FACE_WRAP (void3d.ts) is the fix, and it is a LOOK decision, not a correctness
// one: a full wrap is geometrically honest and turns the outer eye into a hard
// ellipse, on a face that is read at 40 px far more often than at 400. So this
// renders the same frame at several values and lets the pictures decide.
//
// Everything except the knob is held still on purpose:
//   · one mood, pinned, so the brows and mouth are in the same place each shot
//   · one radius, one camera, one frame of settle between shots
//   · #joy hidden — it is a 128 px DOM ring drawn at the held touch point, which
//     is dead centre of screen, which is exactly where the follow camera keeps
//     the void. It cost three wrong shader changes once. See qa/heroface.mjs.
//
//   node qa/facewrap.mjs [port] [wraps] [radius] [mood]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.argv[2] || '4173';
const WRAPS = (process.argv[3] || '0,0.35,0.62,0.9').split(',').map(Number);
const R = Number(process.argv[4] || 4);
const MOOD = process.argv[5] || 'cruise';
const OUT = 'qa/out/facewrap';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
// animate() re-arms itself on its LAST line, so any throw inside it kills the
// render loop permanently and silently. Surface it.
p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { }
});
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
}));
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1400);
await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  cv.dispatchEvent(new PointerEvent('pointerdown', {
    pointerId: 1, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true }));
});
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2.5, null, { timeout: 400000 });
await p.addStyleTag({ content: '#joy,#joyNub{display:none !important}' });
// …and every other DOM layer over the game. The newsroom bubbles and the HUD
// drift on their own clock, so leaving them in makes four shots of one face
// look like four different moments and invites reading a difference that is not
// there. The canvas is the only thing under test.
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  for (const el of Array.from(document.body.children)) {
    if (el !== cv && !el.contains(cv)) el.style.display = 'none';
  }
});
await p.evaluate((m) => window.__setMood(m), MOOD);
await p.evaluate((v) => window.__setVoidR(v), R);
// 3.4 s. Jumping the radius fires the EVOLUTION BURST, whose torus sits at
// 1.42x the body and takes about three seconds to reach opacity zero. Shorter
// waits photograph a hard bright ring around the character and send you hunting
// a bug in the shader. IF A FRAME SHOWS A RING, SUSPECT THIS NUMBER FIRST.
await p.waitForTimeout(3400);

// ── STOP THE CLOCK ─────────────────────────────────────────────────────────
// The first version of this file let the game run between shots. The follow
// camera drifted, the void's on-screen radius changed by a third, and the maw
// opened on one shot and not the next — four pictures of four different frames,
// with the knob as the least significant difference between them. Useless.
//
// So the rAF loop is captured and hand-cranked. The wrap has to be applied
// inside a real game frame (the mouth and the brows re-wrap in update(), not in
// render), which rules out simply freezing and re-rendering; stepping exactly
// two frames per variant applies it while advancing the world by 33 ms total
// across the entire sweep.
await p.evaluate(() => {
  const raw = window.requestAnimationFrame.bind(window);
  window.__pend = null; window.__hits = 0;
  // …AND THE WALL CLOCK GOES WITH IT. animate() takes its dt from
  // THREE.Clock, which reads performance.now(), so hand-cranking alone still
  // hands the game the REAL time that elapsed while a screenshot was being
  // encoded — clamped to 50 ms, but 50 ms four times over is enough for the
  // follow camera to pull back and the maw to shut between variants. That is
  // exactly the artefact that made the first two sweeps unreadable. Virtualise
  // the clock and every stepped frame is exactly 1/60 s.
  const rawNow = performance.now.bind(performance);
  window.__virt = rawNow();
  performance.now = () => window.__virt;
  window.requestAnimationFrame = (cb) => { window.__hits++; window.__pend = cb; return 0; };
  // one last REAL frame, so the loop's next rAF lands in __pend and stops there
  raw(() => { });
});
// wait for the loop to actually hand itself over rather than assuming a frame
// fits in a fixed sleep — under swiftshader a heavy frame does not
await p.waitForFunction(() => !!window.__pend, null, { timeout: 30000 }).catch(() => { });
const step = (n) => p.evaluate((n) => {
  for (let i = 0; i < n; i++) {
    const cb = window.__pend; if (!cb) return i;
    window.__pend = null; window.__virt += 1000 / 60; cb(window.__virt);
  }
  return n;
}, n);
if (!(await step(1))) {
  const d = await p.evaluate(() => ({ hits: window.__hits, pend: !!window.__pend }));
  console.log(`FAIL — the rAF loop was never captured (rAF calls seen: ${d.hits}, pending: ${d.pend}).`);
  await b.close(); process.exit(1);
}
// ── AND PROVE IT STOPPED ───────────────────────────────────────────────────
// A freeze that silently does not freeze produces exactly the artefact it was
// installed to prevent, and looks like a real difference between the variants.
// So: sit still for half a second of wall clock and check the match did not.
{
  const t0 = await p.evaluate(() => window.__matchState().t);
  await p.waitForTimeout(600);
  const t1 = await p.evaluate(() => window.__matchState().t);
  if (t1 - t0 > 0.05) {
    console.log(`FAIL — the loop is still running: match clock moved ${(t1 - t0).toFixed(2)}s`
      + ' in 0.6s of wall time with the rAF loop supposedly captured.');
    await b.close(); process.exit(1);
  }
  console.log(`clock held: ${(t1 - t0).toFixed(3)}s drift over 0.6s wall`);
}

// where is his face on screen, and how big? Projected, not guessed.
const box = await p.evaluate(() => {
  const THREE = window.__THREE, ren = window.__renderer, cam = window.__cam;
  const vs = window.__voidState();
  const wp = new THREE.Vector3(vs.x, vs.r, vs.z);
  const sp = wp.clone().project(cam);
  const cx = (sp.x * 0.5 + 0.5) * innerWidth, cy = (1 - (sp.y * 0.5 + 0.5)) * innerHeight;
  const camD = Math.max(1, cam.position.distanceTo(wp));
  const pxR = (innerHeight / (2 * camD * Math.tan(cam.fov * Math.PI / 360))) * vs.r;
  return { cx, cy, pxR, dpr: ren.getPixelRatio() };
});
// FULL frames when asked. The crop is 2.6x his on-screen radius, which is right
// for reading the face and useless for reading whether he is GROUNDED — at
// WORLD ENDER and TITAN the crop clamps to the viewport and lands inside his
// own cheek. Grounding questions need the floor in frame.
const FULL = process.argv.includes('--full');
const side = Math.min(430, Math.max(120, box.pxR * 2.6));
const clip = FULL ? undefined : {
  x: Math.max(0, Math.min(430 - side, box.cx - side / 2)),
  y: Math.max(0, Math.min(932 - side, box.cy - side / 2)),
  width: side, height: side,
};
console.log(`mood=${MOOD}  r=${R}  on-screen radius ${box.pxR.toFixed(0)} css px  crop ${side.toFixed(0)}px`);

for (const w of WRAPS) {
  // DO NOT re-assert the radius here. setRadius sets a TARGET the growth spring
  // eases toward, so calling it once per variant on a void that had grown past
  // it makes him shrink a little on every step — a monotonic 10% ramp across
  // the sweep that reads exactly like "the wrap makes his face smaller". It is
  // set once, before the freeze, with 3.4 s to settle.
  await p.evaluate((v) => window.__faceWrap(v), w);
  await step(2);                        // apply it in a real frame, then settle
  const name = `wrap${String(w).replace('.', 'p')}.png`;
  await p.screenshot(clip ? { path: `${OUT}/${name}`, clip } : { path: `${OUT}/${name}` });
  console.log(`  ${String(w).padStart(5)}  ->  ${OUT}/${name}`);
}
await b.close();
console.log('\n0 is the old flat decal. 0.9 is fully seated (1.0 is clamped away —');
console.log('at a full wrap the cheeks land ON the surface and depth-fight it).');
