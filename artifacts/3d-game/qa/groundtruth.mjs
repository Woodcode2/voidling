// qa/groundtruth.mjs — WHAT THE GROUND IS ACTUALLY PAINTED, not what a table says.
//
//   node qa/groundtruth.mjs [port] [world ...]
//
// Round 7, stream D. This exists because the same bug has now been found three
// times in this repo, each time by accident and each time after work had been
// committed against the wrong copy:
//
//   biomeColor   — a full ground table, live for ONE of six worlds. Five worlds'
//                  entries painted nothing, and a measured, reasoned lift of
//                  Game Day's tarmac was written into a dead row.
//   GD_FLOOR.lot — the same fix, in the same round, in the copy that does paint,
//                  which is how the first one was finally caught.
//   palette.ts   — meadow 0.443 -> 0.169, park 0.439 -> 0.169, forest and sand
//                  likewise, with the arithmetic recorded in the file. The bake
//                  paints WORLD.meadow once as a base fillRect and then covers
//                  it with about sixty CSS literals at chroma 0.25-0.48. Maple's
//                  town square — the block the match OPENS on — was #8ddc63 at
//                  chroma 0.475 and rendered as the pre-desaturation green.
//
// Every one of those is the same shape: a colour edited somewhere authoritative
// that never reaches a pixel. qa/pop.mjs cannot catch it, because pop.mjs
// measures the SCREEN, where ground, props, sky, light, grain and the tone map
// are already mixed together and a change of 0.3 in one surface is a change of
// 3% in a histogram.
//
// So this measures the ALBEDO: the baked ground canvas itself, straight out of
// the live page, before a single light touches it. No camera, no exposure, no
// props, no frame to choose — the same texture every player gets, so two runs
// agree exactly rather than approximately.
//
// THE BAR is island.ts's own GROUND_CHROMA dial, read out of the page rather
// than copied here, so the probe cannot drift from the source it grades. It
// fails when the ground's 90th-percentile chroma exceeds the cap: not the mean
// (a big quiet field hides a loud square inside it) and not the maximum (one
// painted line is not a stage).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { assertFreshDist } from './_freshdist.mjs';

const PORT = Number(process.argv[2] || 4177);
const ARGW = process.argv.slice(3).filter((a) => !a.startsWith('--'));
const WORLDS = ARGW.length ? ARGW : ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];
const OUT = 'qa-out/ground';
mkdirSync(OUT, { recursive: true });
assertFreshDist('qa/groundtruth.mjs');

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [];
for (const world of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark'); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${world}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  const r = await p.evaluate(() => {
    // THE GROUND IS FOUND BY ITS TEXTURE, not by a name it does not have: the
    // bake is the only 3072-square canvas in the scene.
    let img = null;
    window.__scene.traverse((o) => {
      const m = o.material;
      if (!img && m && m.map && m.map.image && m.map.image.width === 3072) img = m.map.image;
    });
    if (!img) return { err: 'no 3072 ground canvas in the scene' };
    // sample on a lattice rather than all 9.4M texels — 512x512 is 262k
    // samples of a texture whose smallest painted feature is metres wide
    const N = 512;
    const c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, N, N);
    const d = g.getImageData(0, 0, N, N).data;
    const chs = [], vs = [];
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 250) continue;                  // outside the island silhouette
      const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
      if (mx === 0) continue;                        // unpainted
      chs.push((mx - mn) / 255); vs.push(mx / 255);
    }
    chs.sort((a, b2) => a - b2); vs.sort((a, b2) => a - b2);
    const q = (a, f) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * f))] : NaN);
    return { n: chs.length, cap: window.__groundChroma,
      c50: q(chs, 0.50), c75: q(chs, 0.75), c90: q(chs, 0.90), c99: q(chs, 0.99),
      v50: q(vs, 0.50), over: 100 * chs.filter((x) => x > 0.12).length / chs.length };
  });
  if (r.err) { console.log(`  ${world}: ${r.err}`); await p.close(); continue; }
  const png = await p.evaluate(() => {
    let img = null;
    window.__scene.traverse((o) => { const m = o.material;
      if (!img && m && m.map && m.map.image && m.map.image.width === 3072) img = m.map.image; });
    const c = document.createElement('canvas'); c.width = c.height = 768;
    c.getContext('2d').drawImage(img, 0, 0, 768, 768);
    return c.toDataURL('image/png');
  });
  writeFileSync(`${OUT}/${world}-ground.png`, Buffer.from(png.split(',')[1], 'base64'));
  rows.push({ world, ...r });
  await p.close();
}
await b.close();

console.log('\nGROUND ALBEDO — the baked texture, before any light\n');
console.log('world        texels    chroma p50   p75   p90   p99    value p50   over 0.12   cap');
for (const r of rows)
  console.log(`${r.world.padEnd(11)} ${String(r.n).padStart(7)}      `
    + `${r.c50.toFixed(3)} ${r.c75.toFixed(3)} ${r.c90.toFixed(3)} ${r.c99.toFixed(3)}`
    + `        ${r.v50.toFixed(2)}      ${r.over.toFixed(1)}%   `
    + `${r.cap == null ? '   —' : r.cap.toFixed(2)}`);
console.log(`\n  the textures: ${OUT}/*-ground.png`);

let fail = 0;
console.log('');
for (const r of rows) {
  if (r.cap === null) { console.log(`----  ${r.world.padEnd(10)} not on the dial yet — ground chroma p90 ${r.c90.toFixed(3)}, ungraded`); continue; }
  if (r.cap === undefined) { console.log(`FAIL  ${r.world.padEnd(10)} the page exposes no __groundChroma at all — nothing to grade against`); fail++; continue; }
  const ok = r.c90 <= r.cap + 0.005;   // one rounding step of slack on the cap itself
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.world.padEnd(10)} 90th-percentile ground chroma `
    + `${r.c90.toFixed(3)}   cap ${r.cap.toFixed(2)}`);
}
const graded = rows.filter((r) => r.cap != null).length;
console.log(`\n${graded - fail}/${graded} graded, ${rows.length - graded} not yet on the dial`);
process.exit(fail ? 1 : 0);
