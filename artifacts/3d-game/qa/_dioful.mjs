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
// NO THRESHOLD IS SET IN THIS FILE YET, deliberately. Picking a floor before
// seeing the six numbers is how a bar ends up passing exactly what it was written
// beside. It prints, and the floor goes in once there is a spread to put it in.
//
//   node qa/_dioful.mjs [port] [world]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv[3] ? [process.argv[3]] : ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];
const BAND = 0.55;   // top fraction of the canvas the UI does not cover

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [];
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

    // readPixels is bottom-up, so the TOP band of the screen is the HIGH rows
    const y0 = Math.floor(H * (1 - band));
    let n = 0, diff = 0;
    const D = 10;
    for (let y = y0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4; n++;
      if (Math.abs(A[i] - B[i]) > D || Math.abs(A[i + 1] - B[i + 1]) > D || Math.abs(A[i + 2] - B[i + 2]) > D) diff++;
    }
    return { propsPct: n ? +(100 * diff / n).toFixed(1) : 0, band: n, edibles: eds.length };
  }, BAND);
  rows.push({ w, dio, ...r });
  console.log(`  ${w.padEnd(8)} dio=${dio}  ${String(r.propsPct).padStart(5)}% of the visible band is props   (${r.edibles} edibles in the world)`);
  await p.close();
}
} finally { await b.close(); }

console.log('\nworld     props as a share of the visible band');
console.log('          diorama   today');
for (const w of WORLDS) {
  const a = rows.find((r) => r.w === w && r.dio === 1), c = rows.find((r) => r.w === w && r.dio === 0);
  if (!a || !c) continue;
  console.log(`${w.padEnd(9)} ${String(a.propsPct).padStart(6)}% ${String(c.propsPct).padStart(7)}%`);
}
const d = rows.filter((r) => r.dio === 1).map((r) => r.propsPct);
if (d.length) console.log(`\ndiorama spread: ${Math.min(...d)}% to ${Math.max(...d)}%  — the floor goes in once this spread is understood, not before`);
