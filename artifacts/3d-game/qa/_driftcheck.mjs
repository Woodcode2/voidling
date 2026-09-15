// ── DOES THE OFFSET SURVIVE THE SWING? ──────────────────────────────────────
//
// qa/_marksweep.mjs found a lateral offset per world that takes the hero from
// 100% covered to under 5% on the shipped menu. Every one of those numbers was
// taken with menuT pinned at 0 — ONE azimuth, the authored a0.
//
// The menu does not sit at a0. stageCam.az = a0 + 7*sin(2*pi*menuT/28), so it
// swings 14 degrees peak to peak on a 28-second cycle, and 7 degrees is half a
// step of the 24-sample azimuth search — enough to put a different building
// between the lens and the hero. An offset that clears the landmark only at a0
// would leave him buried for most of the swing, and the sweep could not have
// seen it. That is the same mistake as grading a moving camera with one shot,
// one level up: grading a moving camera with one CORRECTLY FROZEN shot.
//
// So: walk menuT over a full cycle at each world's chosen offset and take the
// WORST, not the median. The bar is what a child sees at her unluckiest moment,
// not on average.
//
//   node qa/_driftcheck.mjs [port]
import { chromium } from 'playwright';
import { measureOcclusion, waitForScene } from './_occlib.mjs';

const PORT = process.argv[2] || '4177';
// world -> [forward, lateral], from qa/_marksweep.mjs
// THE CHOSEN OFFSETS, each [forward, lateral], picked on WORST-across-the-swing
// and on margin rather than on a bare pass — and every one of them reads flat
// from the FIRST phase, which matters (see the transient note below).
//   pirate  [0, 26]   worst 0.9%, feet y360   was 100% covered
//   lantern [0,-20]   worst 0.0%, feet y348   was 100%
//   powder  [0, 20]   to be re-verified on the corrected instrument
//   maple   [0,-26]   to be re-verified
//   gameday [0,  0]   already clear, deliberately untouched
//   skylark [0,  0]   already clear, deliberately untouched
//
// A TRANSIENT EXISTS AND IT IS NOT THE AZIMUTH. pirate at [0,-20] measured
// 16.1 13.8 20.6 14.5 2.5 0 0 0 across the eight phases — that decays with TIME,
// not with the camera angle, and t14 onward is clean. Something in that page load
// was still settling after waitForScene and the menuT gate had both passed.
// Every offset picked above reads 0 or flat from the first phase, so none of them
// rests on it, but it is not yet explained and it is written down rather than
// discovered again later.
let PICK = { pirate: [0, 26], lantern: [0, -20], powder: [0, 20], maple: [0, -26], gameday: [0, 0], skylark: [0, 0] };
// SEARCH MODE: one world, many candidate offsets, each graded on the WORST value
// across a full swing — which is the grading function every earlier search here
// got wrong by scoring a single phase.
//   node qa/_driftcheck.mjs 4177 pirate '[[0,-20],[0,26],[8,20]]'
const ONE = process.argv[3], CANDS = process.argv[4] ? JSON.parse(process.argv[4]) : null;
if (ONE && CANDS) PICK = Object.fromEntries(CANDS.map((c, i) => [`${ONE}#${i}`, c]));
else if (ONE) PICK = { [ONE]: PICK[ONE] };
const PHASES = [0, 3.5, 7, 10.5, 14, 17.5, 21, 24.5];   // a full 28s cycle
const BAR = 5, PANEL_Y = 536;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [];
try {
for (const [w, off] of Object.entries(PICK)) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror ${w}] ` + e.message.split('\n')[0]));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w.split('#')[0]}&manual=1&dio=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
  await p.waitForTimeout(20000);
  // ORDER MATTERS, AND I HAD IT BACKWARDS. The scene gate polls for three stable
  // rounds, which costs a VARIABLE amount of wall time — and the game clock runs
  // throughout it, so the crowd keeps walking. Gating game time first and then
  // waiting on the scene let game time advance again by an unknown amount, which
  // is the thing the gate existed to prevent: pirate then measured 7.3, 14.1 and
  // 1.1 across three runs while his feet stayed at y348, y348, y349 — he and the
  // camera were pinned and only what stood in front of him moved.
  // So: let the WORLD finish arriving first (wall-clock work), and only then pin
  // the game clock, which nothing after this is allowed to advance.
  await waitForScene(p);
  await p.waitForFunction(() => window.__menuState().menuT >= 4, null, { timeout: 420000 });
  await p.evaluate((o) => window.__menuMark(o[0], o[1]), off);

  const per = [];
  for (const ph of PHASES) {
    await p.evaluate((t) => window.__menuFreeze(t), ph);
    // wait for the camera to reach the azimuth this phase implies
    await p.waitForFunction((t) => {
      const s = window.__menuState();
      const want = s.a0 + s.amp * Math.sin((t / s.period) * Math.PI * 2);
      return s.azimuth !== null && Math.abs(s.azimuth - want) < 0.01;
    }, ph, { timeout: 180000 });
    const r = await p.evaluate(measureOcclusion);
    per.push(r);
  }
  const worst = Math.max(...per.map((x) => x.coveredPct));
  const lowest = Math.max(...per.map((x) => x.footY));
  rows.push({ w, off, per, worst, lowest });
  console.log(`  ${w.padEnd(8)} lat ${String(off[1]).padStart(3)}  ` +
    per.map((x) => String(x.coveredPct).padStart(6)).join('') +
    `   worst ${String(worst).padStart(5)}%  lowest feet y${lowest}`);
  await p.close();
}
} finally { await b.close(); }

console.log('\n                 ' + PHASES.map((t) => ('t' + t).padStart(6)).join('') + '   (% covered over one 28s swing)');
for (const r of rows) console.log('  ' + r.w.padEnd(9) + 'lat ' + String(r.off[1]).padStart(3) + ' ' + r.per.map((x) => String(x.coveredPct).padStart(6)).join(''));
console.log('\n                 ' + PHASES.map((t) => ('t' + t).padStart(6)).join('') + '   (azimuth)');
for (const r of rows) console.log('  ' + r.w.padEnd(9) + '        ' + r.per.map((x) => String(x.az).padStart(6)).join(''));

const bad = rows.filter((r) => r.worst > BAR || r.lowest > PANEL_Y);
for (const r of bad) console.log(`\n  ${r.w}: worst ${r.worst}% over the swing (bar ${BAR}), lowest feet y${r.lowest} (panel ${PANEL_Y})`);
console.log(bad.length
  ? `\nFAIL — ${bad.length} world(s) lose the hero somewhere in the swing; the offset only holds at one azimuth`
  : `\nPASS — every world stays under ${BAR}% covered across the WHOLE swing, feet above y${PANEL_Y}`);
process.exit(bad.length ? 1 : 0);
