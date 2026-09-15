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
import { measureOcclusion } from './_occlib.mjs';

const PORT = process.argv[2] || '4177';
// world -> [forward, lateral], from qa/_marksweep.mjs
const PICK = { pirate: [0, 20], lantern: [0, 20], powder: [0, 20], maple: [0, -26], gameday: [0, 0], skylark: [0, 0] };
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
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&manual=1&dio=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
  await p.waitForTimeout(20000);
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
