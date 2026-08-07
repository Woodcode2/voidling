// FROM A WILD TAP TO A THROWN-AWAY FIRST MATCH — how many taps?
//
//   node qa/_wild3.mjs [world]
//
// _wild2.mjs: 290 uniformly random touch taps opened #pause on a cold first
// launch at match t=28.8s. #pauseQuit "LEAVE THE MATCH" is a 290x44 target on
// that sheet and prototype3d.ts:3282 wires it straight to doQuit() — no
// confirm, no grown-up gate, and doQuit() sets started=false/ended=true and
// shows the MENU, so there is no results card either.
//
// This measures the whole staircase: taps to the pause sheet, taps from there
// to LEAVE, whether tapping the backdrop escapes, and exactly what the child
// is looking at afterwards.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const WORLD = process.argv[2] || 'maple';
const PORT = 4237;
const RUNS = +(process.argv[3] || 3);
mkdirSync('./qa-out/first90', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const rows = [];
for (let run = 0; run < RUNS; run++) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear(); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.01, null, { timeout: 400000 });
  const snap = () => p.evaluate(() => ({
    t: window.__matchState?.().t ?? 0,
    paused: document.getElementById('pause').classList.contains('show'),
    endUp: document.getElementById('end').classList.contains('show'),
    menuUp: getComputedStyle(document.getElementById('menu')).display !== 'none',
  }));
  let taps = 0, tPause = null, tapsPause = null, tapsLeave = null, tLeft = null;
  for (let i = 0; i < 4000; i++) {
    await p.touchscreen.tap(8 + Math.random() * 374, 30 + Math.random() * 800);
    taps++;
    if (taps % 10) continue;
    const s = await snap();
    if (s.paused && tapsPause === null) { tapsPause = taps; tPause = s.t; }
    if (!s.paused && s.menuUp) { tapsLeave = taps; tLeft = s.t; break; }
  }
  const fin = await snap();
  rows.push({ run: run + 1, taps, tapsPause, tPause, tapsLeave, tLeft, fin });
  console.log(`  run${run + 1}: pause opened after ${tapsPause} taps (match t=${tPause?.toFixed(1)}s); `
    + `LEFT THE MATCH after ${tapsLeave ?? '—'} taps; end card shown: ${fin.endUp}; on the menu: ${fin.menuUp}`);
  if (run === 0) await p.screenshot({ path: './qa-out/first90/wild-after.png' });
  await p.close();
}
const ok = rows.filter((r) => r.tapsLeave);
console.log(`\n═══ ${WORLD.toUpperCase()} — ${ok.length}/${RUNS} wild-tap runs ended the child's first match early ═══`);
if (ok.length) {
  const m = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
  console.log(`  mean taps to the pause sheet : ${m(rows.filter((r) => r.tapsPause).map((r) => r.tapsPause))}`);
  console.log(`  mean taps to LEAVE           : ${m(ok.map((r) => r.tapsLeave))}`);
  console.log(`  results card shown on the way out: ${ok.every((r) => !r.fin.endUp) ? 'NEVER' : 'sometimes'}`);
}
await b.close();
