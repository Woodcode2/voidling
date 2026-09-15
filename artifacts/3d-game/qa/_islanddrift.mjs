// ── DOES THE ISLAND STAY IN FRAME THROUGH THE SWING? ────────────────────────
//
// Every island shot so far is ONE FROZEN AZIMUTH. The picker drifts +/-7 degrees
// on a 28s cycle, and a square island does not project at a constant width: a
// square of side S seen t degrees off square projects to S*(|cos t| + |sin t|),
// which runs from 1.00 at square to 1.41 at 45. So an island that sits at 0.85 of
// the frame at a0 can overflow at the ends of the swing, and every picture I have
// would still look correct.
//
// This is the exact blind spot that let an off-screen hero measure as a perfect
// pass this morning: the instrument was sound and it only ever looked at one
// moment. So walk the phases and take the WORST.
//
//   node qa/_islanddrift.mjs [port]
import { chromium } from 'playwright';
import { waitForScene } from './_occlib.mjs';

const PORT = process.argv[2] || '4177';
const WORLDS = ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];
const PHASES = [0, 3.5, 7, 10.5, 14, 17.5, 21, 24.5];
const W = 430, H = 932;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [];
try {
for (const w of WORLDS) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror ${w}] ` + e.message.split('\n')[0]));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&manual=1&dio=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
  await waitForScene(p);
  await p.evaluate(() => { window.__dioDist(500); window.__menuHero(false); window.__dioCut(56); });

  const per = [];
  for (const ph of PHASES) {
    await p.evaluate((t) => window.__menuFreeze(t), ph);
    await p.waitForFunction((t) => {
      const s = window.__menuState();
      const want = s.a0 + s.amp * Math.sin((t / s.period) * Math.PI * 2);
      return s.azimuth !== null && Math.abs(s.azimuth - want) < 0.01;
    }, ph, { timeout: 180000 });
    const r = await p.evaluate(() => {
      const T = window.__THREE, cam = window.__cam, s = window.__menuState();
      // the cut box's eight corners, projected. That IS the island's silhouette.
      const L = window.__dioBox;
      const xs = [], ys = [];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const sy of [0, 1]) {
        const v = new T.Vector3(L.cx + sx * L.half, sy ? 2 : -L.depth, L.cz + sz * L.half).project(cam);
        xs.push((v.x + 1) * 0.5 * 430); ys.push((1 - v.y) * 0.5 * 932);
      }
      return { az: +s.azimuth.toFixed(1),
        x0: Math.round(Math.min(...xs)), x1: Math.round(Math.max(...xs)),
        y0: Math.round(Math.min(...ys)), y1: Math.round(Math.max(...ys)) };
    });
    per.push(r);
  }
  const offL = Math.min(...per.map((r) => r.x0));
  const offR = Math.max(...per.map((r) => r.x1));
  const top = Math.min(...per.map((r) => r.y0));
  const bot = Math.max(...per.map((r) => r.y1));
  rows.push({ w, offL, offR, top, bot, per });
  console.log(`  ${w.padEnd(8)} across the swing: x ${String(offL).padStart(5)}..${String(offR).padStart(4)}   y ${String(top).padStart(4)}..${String(bot).padStart(4)}` +
    `${offL < 4 || offR > W - 4 ? '   <-- RUNS OFF THE SIDE' : ''}${bot > 536 ? '   <-- UNDER THE LADDER PANEL' : ''}`);
  await p.close();
}
} finally { await b.close(); }
const bad = rows.filter((r) => r.offL < 4 || r.offR > W - 4);
console.log(bad.length
  ? `\nFAIL — ${bad.length} world(s) run off the frame somewhere in the swing: ${bad.map((r) => r.w).join(', ')}`
  : `\nPASS — every island stays inside the frame across the whole 28s swing`);
process.exit(bad.length ? 1 : 0);
