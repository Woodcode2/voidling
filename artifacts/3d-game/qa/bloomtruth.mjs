// qa/bloomtruth.mjs — DO WE MEASURE THE PIPELINE WE SHIP?
//
//   node qa/bloomtruth.mjs [world] [port]
//
// Every colour figure in round 7 stream D was measured from a frame shot under
// swiftshader, where the adaptive quality ladder demotes hard because the
// software renderer holds about one frame a second. QUALITY[0] and QUALITY[1]
// carry bloom: true; QUALITY[2] and [3] carry bloom: false (prototype3d.ts).
// A phone at 60fps sits at the top of that ladder. A probe under swiftshader
// does not.
//
// If bloom moves the numbers, then D1 (stage), D2 (actors) and D3 (value) have
// all been graded against a pipeline the game does not ship, and every target
// in the brief needs re-baselining. If it does not move them, the stream's
// measurements stand and this probe says so once, with figures.
//
// __pinQuality(n) parks the ladder on rung n and stops the adapter, so the two
// frames differ in exactly one thing.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4177';
const TOP = 0.18, BOT = 0.10;

function stats(w, h, d) {
  const y0 = Math.floor(h * TOP), y1 = Math.floor(h * (1 - BOT));
  let n = 0, below = 0, above = 0; const vals = [], chs = [];
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const ch = (mx - mn) / 255;
    n++; if (ch < 0.12) below++; if (ch > 0.35) above++;
    if ((n & 7) === 0) { vals.push(mx / 255); chs.push(ch); }
  }
  vals.sort((a, b) => a - b); chs.sort((a, b) => a - b);
  return { stage: 100 * below / n, actors: 100 * above / n,
    value: vals[Math.floor(vals.length / 2)], chroma: chs[Math.floor(chs.length / 2)] };
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
p.setDefaultTimeout(400000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

// where the ladder actually settles when nobody pins it — the state every
// stream D frame was shot in
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 600000 });
const settled = await p.evaluate(() => window.__quality());

const out = {};
for (const rung of [0, 2]) {
  await p.evaluate((n) => window.__pinQuality(n), rung);
  await p.waitForTimeout(2500);              // let the composer resize and a few frames land
  const q = await p.evaluate(() => window.__quality());
  const buf = await p.screenshot();
  const png = PNG.sync.read(buf);
  out[rung] = { q, ...stats(png.width, png.height, png.data) };
}
await p.evaluate(() => window.__pinQuality(null));
await b.close();

const on = out[0], off = out[2];
console.log(`\nBLOOM TRUTH — ${WORLD} @ ${PORT}`);
console.log(`  the ladder settled UNPINNED at rung ${settled.level} (pinned ${settled.pinned}, pr ${settled.pr}) — this is what every stream D frame was shot at\n`);
console.log('  rung   bloom   stage%   actors%   value   chroma');
console.log(`  0      on    ${on.stage.toFixed(1).padStart(7)} ${on.actors.toFixed(1).padStart(9)} ${on.value.toFixed(3).padStart(7)} ${on.chroma.toFixed(3).padStart(8)}`);
console.log(`  2      off   ${off.stage.toFixed(1).padStart(7)} ${off.actors.toFixed(1).padStart(9)} ${off.value.toFixed(3).padStart(7)} ${off.chroma.toFixed(3).padStart(8)}`);
const d = { stage: on.stage - off.stage, actors: on.actors - off.actors,
  value: on.value - off.value, chroma: on.chroma - off.chroma };
console.log(`  delta        ${d.stage.toFixed(1).padStart(7)} ${d.actors.toFixed(1).padStart(9)} ${d.value.toFixed(3).padStart(7)} ${d.chroma.toFixed(3).padStart(8)}`);
// rung 0 also raises the pixel ratio, so a difference here is bloom AND
// resolution together; the probe says so rather than pretending otherwise.
console.log(`\n  NOTE: rung 0 and rung 2 differ in pixel ratio as well as bloom (${on.q.pr} vs ${off.q.pr}),`);
console.log('  so this is an upper bound on bloom alone. It answers the question that matters —');
console.log('  whether the numbers the brief grades against survive the pipeline the game ships.');
// ── ONLY THE QUANTITIES THAT ARE ACTUALLY BARS ─────────────────────────────
// The first version of this also failed on chroma moving more than 0.015, and
// duly failed on 0.016 — but chroma median is REPORTED CONTEXT in the brief, not
// a bar. D1 is stage, D2 is actors, D3 is value. Gating on a number nothing is
// graded against turns a passing result into a false alarm, which is what it
// did: value moved 0.000 and the verdict line said re-baseline everything.
// The thresholds are the margin by which a world's verdict could flip.
const material = Math.abs(d.stage) > 3 || Math.abs(d.actors) > 3 || Math.abs(d.value) > 0.04;
console.log(`\n  chroma moved ${d.chroma.toFixed(3)} — reported, not graded: the brief's bars are stage, actors and value.`);
console.log(`\n${material ? 'FAIL — the shipped pipeline grades differently; stream D needs re-baselining'
  : 'PASS — the measurements stand under the pipeline the game ships'}\n`);
process.exit(material ? 1 : 0);
