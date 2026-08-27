// RUNG 1's NUMBER: does the renderer's tone-mapping exposure equal the
// per-world column in WORLD_LIGHT?
//
// The rig carried a per-world `exposure` column since it landed, and RIG
// pinned the renderer to a literal 1.0, so the column never reached a frame.
// Owner decision 1 (docs/OWNER-2026-08-25.md) unlocked the rig; RUNG 1
// replaces the literal with LIGHT.exposure. This probe FAILS on the pre-rung
// build — gameday, powder and lantern read 1.0 against a table that says
// 1.12 / 1.18 / 1.42 — and passes only when the table value is what the
// renderer actually applies, measured live in each world with the match
// clock running (waits are on __matchState().t — MATCH seconds, not wall).
//
// The expectations are PARSED FROM THE REAL SOURCE, never copied here: a
// snapshot table describes the build it was written against forever
// (GOVERNOR.md rule 4), and this THROWS if the anchor has moved.
//
//   node qa/rigexposure.mjs [port] [worlds]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const PORT = process.argv[2] || '4177';
const WORLDS = (process.argv[3] || 'maple,pirate,gameday,lantern,powder').split(',');

const src = readFileSync('src/prototype3d.ts', 'utf8');
const at = src.indexOf('const WORLD_LIGHT');
if (at < 0) throw new Error('anchor moved: `const WORLD_LIGHT` not found in src/prototype3d.ts');
const block = src.slice(at, src.indexOf('\n};', at));
const expected = {};
for (const w of WORLDS) {
  const m = block.match(new RegExp(w + ':\\s*\\{[\\s\\S]*?exposure:\\s*([0-9.]+)'));
  if (!m) throw new Error(`anchor moved: no exposure for "${w}" inside WORLD_LIGHT`);
  expected[w] = parseFloat(m[1]);
}
console.log('table says:', WORLDS.map((w) => `${w} ${expected[w]}`).join('  '));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
let bad = 0;
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    // comma-joined, NOT JSON.stringify — the seed shape that hid four worlds
    // from seven probes in a row (GOVERNOR.md, the voidUnlocked retraction)
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  // MATCH seconds, not wall — swiftshader runs this clock 14-40x slow
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });
  const got = await p.evaluate(() => +window.__renderer.toneMappingExposure);
  const want = expected[wid];
  const ok = Math.abs(got - want) < 1e-9;
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${wid.padEnd(8)} table ${want}   renderer ${got}`);
  await p.close();
}
await b.close();
// silence is a FAIL — always print a verdict line (GOVERNOR.md, the gate rule)
console.log(bad === 0
  ? `RIGEXPOSURE: PASS — renderer matches WORLD_LIGHT in ${WORLDS.length}/${WORLDS.length} worlds`
  : `RIGEXPOSURE: FAIL — ${bad} of ${WORLDS.length} worlds render an exposure their table does not hold`);
process.exit(bad === 0 ? 0 : 1);
