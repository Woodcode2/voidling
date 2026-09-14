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
// ── AND THE FIRST RUN SHOWED THE PIXEL SHARE IS NOT THE WHOLE QUESTION ─────
// Measured: powder 13.8%, skylark 30.2%, maple 33.1%, lantern 41.7%, pirate
// 51.4%, gameday 56.3%. Powder being lowest matches the photograph exactly. But
// SKYLARK CAME BACK MID-PACK, and higher than its own 24.1% on today's menu —
// while by eye it is an empty green field. The measure is honest and it is not
// the question: a single long barrier covering 30% of the frame scores the same
// as thirty varied props covering 30%. Pixel share is COVERAGE, not INTEREST.
//
// So a second number, on the axis that actually separates them: how many
// DISTINCT props have their centre inside the visible band. One big thing and
// many small things are the same area and very different pictures, and a floor
// set on area alone would have passed skylark and called it done.
//
// ── AND THE COUNT WAS NOT IT EITHER ────────────────────────────────────────
// Skylark came back with 622 distinct props in the band against today's 49 — so
// the frame is not empty by count, and it is still an empty green field to look
// at. Those 622 are a distant crowd clustered on the horizon; the middle of the
// picture, where the hero is, has nothing in it.
//
// The axis that matches the eye is DISTRIBUTION. A 6x8 grid over the band, and
// the fraction of cells holding at least one prop: props packed into two rows
// score low however many there are, props spread across the frame score high.
// Three numbers now — area, count, spread — because the first two each looked
// sufficient and each passed the one world this bar exists for.
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
    return { propsPct: n ? +(100 * diff / n).toFixed(1) : 0, inBand,
      spreadPct: +(100 * cell.size / (GX * GY)).toFixed(0), band: n, edibles: eds.length };
  }, BAND);
  rows.push({ w, dio, ...r });
  console.log(`  ${w.padEnd(8)} dio=${dio}  area ${String(r.propsPct).padStart(5)}%  count ${String(r.inBand).padStart(4)}  spread ${String(r.spreadPct).padStart(3)}% of 48 cells`);
  await p.close();
}
} finally { await b.close(); }

console.log('\nworld         area%        count       spread% (cells of 48 with a prop)');
console.log('            dio  today    dio  today      dio   today');
for (const w of WORLDS) {
  const a = rows.find((r) => r.w === w && r.dio === 1), c = rows.find((r) => r.w === w && r.dio === 0);
  if (!a || !c) continue;
  console.log(`${w.padEnd(9)} ${String(a.propsPct).padStart(5)} ${String(c.propsPct).padStart(6)} ${String(a.inBand).padStart(6)} ${String(c.inBand).padStart(6)} ${String(a.spreadPct).padStart(8)} ${String(c.spreadPct).padStart(7)}`);
}
const d = rows.filter((r) => r.dio === 1);
if (d.length) {
  const f = (k) => `${Math.min(...d.map((r) => r[k]))} to ${Math.max(...d.map((r) => r[k]))}`;
  console.log(`\nacross the diorama: area ${f('propsPct')}%, count ${f('inBand')}, spread ${f('spreadPct')}%`);
  console.log('the floor goes on the axis that separates the worlds the eye separates — not before that is clear');
}
