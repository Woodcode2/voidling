// ── HOW FAR MUST THE HERO STEP TO GET HIS FACE BACK ON THE SHIPPED MENU? ─────
//
// qa/_dioocc.mjs, both clocks pinned: on the menu that ships today the hero is
// 100% behind something on pirate, lantern and powder, and 44.8% on maple. He
// stands on the stage point and deriveStage sets that to the world's landmark,
// so he is inside the thing the shot is aimed at.
//
// DIO_MARK = 16 fixes this on the diorama and is `dio ? DIO_MARK : 0`, so it is
// zero here. The obvious move is to give the shipped menu a mark too — but the
// right size cannot be derived with confidence, because the shipped camera's own
// comment says 32 degrees while `h = dist * 0.62` implies 38.3. So sweep it.
//
// Two things have to come back at once, which is why this measures both:
//   COVERED  — how much of him is behind something, the thing we are fixing
//   FOOT y   — where his feet land in CSS px; the ladder panel's top edge is at
//              ~y536 of 932, and a mark that clears the landmark by burying him
//              in the panel is not a fix.
//
// ── MEASURED. THE STEP CANNOT FIX THE SHIPPED MENU. ─────────────────────────
//
// All six worlds, both clocks pinned. % of the hero covered:
//
//   world       m0     m4     m8    m12    m16    m20
//   pirate     100    100   97.1   87.5   43.5   21.3
//   lantern    100    100    100   56.5   12.9      0
//   powder     100    100    100   32.9      0      0
//   maple     55.3   63.3   41.3    5.2    3.2      0
//   gameday      0      0   14.3   54.9   90.7   35.1
//   skylark    0.5      0      0      0      0      0
//
// His feet, CSS y, against the ladder panel's top edge at 536:
//
//   pirate     322    371    423    479    541    607
//   lantern    321    366    413    464    517    576
//   powder     322    368    418    471    528    591
//   maple      300    370    447    533    629    738
//   gameday    321    366    413    464    518    577
//   skylark    389    429    472    518    568    621
//
// NO GLOBAL MARK WORKS, and the reason is gameday. It is the one world that is
// already clear at m0, and the mark WALKS HIM INTO SOMETHING: 0 -> 14.3 -> 54.9
// -> 90.7. A constant that rescues powder breaks the world that was fine. The
// diorama's "one constant clears every measured case" is true of the diorama's
// camera and does not port to this one.
//
// NO PER-WORLD MARK WORKS EITHER, on three of the six, because the two
// constraints pull opposite ways — every step that clears the landmark walks him
// further down the frame and into the ladder panel:
//
//   powder    mark 16   0% covered, feet y528     OK
//   gameday   mark  0   0% covered, feet y321     OK, unchanged
//   skylark   mark  0   0.5% covered, feet y389   OK, unchanged
//   pirate    nothing   best 21.3% and feet y607  FAILS BOTH
//   lantern   nothing   reaches 0% only at m20, feet y576, behind the panel
//   maple     nothing   reaches 0% only at m20, feet y738, far behind it
//
// SO THE AIM HAS TO MOVE, not the hero. deriveStage points the shot at the
// world's landmark and enterMenu parks him on that same point; while those two
// are the same point, clearing one costs the other. That is a per-world
// composition change to the first screen a child sees — the DIO_AIM mechanism,
// applied to the shipped menu — and it is the owner's call, not a probe's.
//
//   node qa/_marksweep.mjs [port] [world]
import { chromium } from 'playwright';
import { measureOcclusion, waitForScene } from './_occlib.mjs';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv[3] ? [process.argv[3]] : ['pirate', 'lantern', 'powder', 'maple', 'gameday', 'skylark'];
// (mark along the azimuth, lateral step across it). The pure-lateral row exists
// because stepping toward the lens is what walks him into the ladder panel, and
// a step ACROSS the view costs nothing against y536.
let MARKS = [[0, 0], [0, 8], [0, 14], [0, 20], [8, 14], [12, 12]];
// node qa/_marksweep.mjs 4177 maple '[[0,-20],[0,-14],[0,26]]'  — sweep your own
if (process.argv[4]) MARKS = JSON.parse(process.argv[4]);
const PANEL_Y = 536;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const out = [];
try {
for (const w of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror ${w}] ` + e.message.split('\n')[0]));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&manual=1&dio=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
  await p.waitForTimeout(20000);
  // both clocks pinned, same as _dioocc: a fixed point in GAME time, then freeze
  await p.waitForFunction(() => window.__menuState().menuT >= 4, null, { timeout: 420000 });
  // …and wait for the WORLD, not just the clocks. The GLBs stream on wall time.
  await waitForScene(p);

  for (const [mk, lat] of MARKS) {
    await p.evaluate(([m, l]) => { window.__menuMark(m, l); window.__menuFreeze(0); }, [mk, lat]);
    await p.waitForFunction(() => {
      const s = window.__menuState();
      return s.azimuth !== null && Math.abs(s.azimuth - s.a0) < 0.01;
    }, null, { timeout: 180000 });
    const r = await p.evaluate(measureOcclusion);
    out.push({ w, mark: mk, lat, ...r });
    const under = r.footY > PANEL_Y;
    console.log(`  ${w.padEnd(8)} fwd ${String(mk).padStart(2)} lat ${String(lat).padStart(2)}  covered ${String(r.coveredPct).padStart(5)}%  feet y${String(r.footY).padStart(4)}${under ? ' <-- BEHIND THE LADDER PANEL' : ''}  ${r.worst || ''}`);
  }
  await p.close();
}
} finally { await b.close(); }

const lbl = MARKS.map(([m, l]) => `${m}/${l}`.padStart(8)).join('');
console.log('\nworld  fwd/lat' + lbl + '     (% of him covered)');
for (const w of WORLDS) {
  console.log(w.padEnd(14) + MARKS.map(([m, l]) => { const x = out.find((o) => o.w === w && o.mark === m && o.lat === l); return x ? String(x.coveredPct).padStart(8) : '       ?'; }).join(''));
}
console.log('\nworld  fwd/lat' + lbl + '     (feet, CSS y; panel edge 536)');
for (const w of WORLDS) {
  console.log(w.padEnd(14) + MARKS.map(([m, l]) => { const x = out.find((o) => o.w === w && o.mark === m && o.lat === l); return x ? String(x.footY).padStart(8) : '       ?'; }).join(''));
}
const ok = MARKS.filter(([m, l]) => WORLDS.every((w) => {
  const x = out.find((o) => o.w === w && o.mark === m && o.lat === l);
  return x && !x.error && x.coveredPct <= 5 && x.footY <= PANEL_Y;
}));
console.log(ok.length
  ? `\nPASS — fwd ${ok[0][0]} / lat ${ok[0][1]} clears every world under 5% covered with feet above y${PANEL_Y}`
  : `\nFAIL — no swept offset clears every world; stepping him alone does not fix this`);
process.exit(ok.length ? 0 : 1);
