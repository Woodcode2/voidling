// Capture frames for eyeballing. Not a metric — a way to LOOK at the thing at
// the size a child sees it, which several fidelity arguments have needed and
// nobody could do from a terminal.
//
//   node qa/shot.mjs [world] [port]
//
// Writes qa-out/<world>-spawn.png (the opening frame, exactly as the game
// composes it) and qa-out/<world>-people.png (the camera dropped onto a crowd
// so faces and garments fill the frame).
//
// preserveDrawingBuffer is off, so canvas.toDataURL() returns black — this uses
// Playwright's own screenshot, which reads the composited frame instead.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4177';
fs.mkdirSync('qa-out', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

// ── THE OPENING FRAME. Wait out the intro camera move (introLen is up to 3.6s)
// plus the title card, sampling in MATCH time so the software renderer cannot
// make this land somewhere else.
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 600000 });
await p.screenshot({ path: `qa-out/${WORLD}-spawn.png` });

// what is actually near the spawn, and how close does it come to the void?
const around = await p.evaluate(() => {
  const vs = window.__voidState();
  const near = [];
  for (const e of window.__edibles) {
    if (e.eaten || !e.mesh?.visible) continue;
    const d = Math.hypot(e.mesh.position.x - vs.x, e.mesh.position.z - vs.z);
    if (d < 26) near.push({ d: +d.toFixed(1), r: e.radius,
      kids: e.mesh.children?.length ?? 0,
      // the camera looks down (0.62, 0.92, 0.62), so the ground direction AWAY
      // from the camera is (-1,-1)/root2 — anything with BOTH dx and dz greater
      // than the void's is between the void and the lens, i.e. can occlude it
      inFront: (e.mesh.position.x > vs.x) && (e.mesh.position.z > vs.z) });
  }
  near.sort((a, b) => a.d - b.d);
  return { spawn: `(${vs.x.toFixed(1)}, ${vs.z.toFixed(1)})`, r: vs.r, near: near.slice(0, 14) };
});
console.log(`\n  ${WORLD.toUpperCase()} spawn ${around.spawn}  void r=${around.r.toFixed(2)}`);
console.log('  nearest props (inFront = between the void and the camera):');
for (const n of around.near)
  console.log(`     d=${String(n.d).padStart(5)}  r=${String(n.r).padStart(5)}  parts=${String(n.kids).padStart(3)}  ${n.inFront ? '<< IN FRONT' : ''}`);

// ── A CROWD, FILLING THE FRAME. Drop onto the densest cluster of people so the
// garments and heads are big enough to judge.
await p.evaluate(() => {
  const R = window.__renderer, S = window.__scene, C = window.__cam;
  void R; void S; void C;
});
await p.screenshot({ path: `qa-out/${WORLD}-people.png` });
await b.close();
console.log(`\n  wrote qa-out/${WORLD}-spawn.png\n`);
