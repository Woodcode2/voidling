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
// THE BARS are island.ts's own dials, read out of the page rather than copied
// here, so the probe cannot drift from the source it grades. There are two,
// because a ground has two different jobs in one texture:
//
//   THE STAGE — the 75th percentile against GROUND_CHROMA. Three quarters of
//     the ground is the surface the props stand on and it has to stay quiet.
//     Not the mean, which lets a big quiet field hide a loud square inside it.
//   THE CEILING — the 99th percentile against GROUND_CEILING. The loudest
//     quarter of a ground is legitimately not stage: MAPLE's autumn leaf
//     litter (the world is called Maple Falls), lane paint, crosswalks, the
//     painted 09 on a runway, PIRATE's lagoon. Grading those at the stage cap
//     would demand grey leaves and a grey-blue puddle. The ceiling still says
//     nothing on the ground may shout, so a stray neon literal is caught.
//
// Measured before this split: maple p75 0.165, p90 0.243 — the p90 was its leaf
// litter, and a p90 bar would have called a correctly-dialled world red.
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
let missing = 0;
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
    // POINT-SAMPLE. The comment above says lattice and drawImage into a canvas
    // six times smaller box-filters instead, averaging each 6x6 block. Chroma
    // is convex in RGB, so chroma(average) <= average(chroma): the downscale
    // can only ever LOWER a texel's chroma, and it lowers it most for exactly
    // the thin marks the p99 ceiling exists to catch — a lane line is 2-3
    // texels wide in a 3072 bake. The ceiling was grading a blur of itself.
    g.imageSmoothingEnabled = false;
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

    // ── AND WHETHER THE DISTRICTS STILL SEPARATE ────────────────────────────
    // The two bars above grade the ground against the cap the dial itself set,
    // which is guaranteed to pass — so they were structurally incapable of
    // noticing the thing the dial actually broke. Capping chroma merges any two
    // surfaces that differed only in how saturated they were: measured on
    // PIRATE's floors, beach against sand went CIE76 dE 11.0 -> 1.5, and five
    // of its nine pairs landed under dE 6.
    //
    // So: quantise the ground into colour cells, keep the ones big enough to be
    // a district (>= 1.5% of the island), and report the SMALLEST separation
    // among them. Not the mean — a mean stays healthy while one pair vanishes,
    // and one pair vanishing is a boundary the player can no longer see.
    // dE 6 is qa/formsep.mjs's floor for "distinguishable"; a district edge has
    // to beat distinguishable, so the bar is 10.
    const cells = new Map();
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 250) continue;
      const k = `${(d[i] / 12) | 0},${(d[i + 1] / 12) | 0},${(d[i + 2] / 12) | 0}`;
      let c2 = cells.get(k); if (!c2) cells.set(k, c2 = { n: 0, r: 0, g: 0, b: 0 });
      c2.n++; c2.r += d[i]; c2.g += d[i + 1]; c2.b += d[i + 2];
    }
    const total = chs.length;
    const big = [...cells.values()].filter((c2) => c2.n / total >= 0.015)
      .map((c2) => [c2.r / c2.n, c2.g / c2.n, c2.b / c2.n, 100 * c2.n / total]);
    const toLab = (r, g, b) => {
      const f = (c2) => { c2 /= 255; return c2 <= 0.04045 ? c2 / 12.92 : Math.pow((c2 + 0.055) / 1.055, 2.4); };
      const R = f(r), G = f(g), B = f(b);
      let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
      let Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
      let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
      const kk = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
      X = kk(X); Y = kk(Y); Z = kk(Z);
      return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
    };
    let sep = Infinity, worstPair = null;
    for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) {
      const A2 = toLab(big[i][0], big[i][1], big[i][2]), B2 = toLab(big[j][0], big[j][1], big[j][2]);
      const e = Math.hypot(A2[0] - B2[0], A2[1] - B2[1], A2[2] - B2[2]);
      if (e < sep) { sep = e; worstPair = [big[i], big[j]]; }
    }
    if (!worstPair) sep = NaN;
    return { n: chs.length, cap: window.__groundChroma, ceil: window.__groundCeiling,
      regions: big.length, sep, worstPair,
      c50: q(chs, 0.50), c75: q(chs, 0.75), c90: q(chs, 0.90), c99: q(chs, 0.99),
      v50: q(vs, 0.50), over: 100 * chs.filter((x) => x > 0.12).length / chs.length };
  });
  // ── A WORLD THIS PROBE CANNOT MEASURE IS A FAILURE, NOT A SKIP ──────────
  // This printed the error and continued, incrementing nothing. With `let fail
  // = 0` and `process.exit(fail ? 1 : 0)`, all six worlds erroring printed six
  // informational lines and exited GREEN on 0/0 graded. The trigger is one edit
  // away and signposted in the source this grades: the finder keys on
  // `image.width === 3072`, and island.ts's TEX is a constant somebody will
  // change. Same fault this project has now fixed three times elsewhere —
  // silence is not a pass.
  if (r.err) { console.log(`FAIL  ${world.padEnd(10)} ${r.err}`); missing++; await p.close(); continue; }
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
console.log('world        texels    chroma p50   p75   p90   p99    value p50   over 0.12   cap   regions   closest');
for (const r of rows)
  console.log(`${r.world.padEnd(11)} ${String(r.n).padStart(7)}      `
    + `${r.c50.toFixed(3)} ${r.c75.toFixed(3)} ${r.c90.toFixed(3)} ${r.c99.toFixed(3)}`
    + `        ${r.v50.toFixed(2)}      ${r.over.toFixed(1)}%   `
    + `${r.cap == null ? '   —' : r.cap.toFixed(2)}`
    + `   ${String(r.regions).padStart(7)}   ${Number.isFinite(r.sep) ? r.sep.toFixed(1).padStart(7) : '      —'}`);
console.log(`\n  the textures: ${OUT}/*-ground.png`);

let fail = 0;
console.log('');
for (const r of rows) {
  if (r.cap === null) { console.log(`----  ${r.world.padEnd(10)} not on the dial yet — ground chroma p90 ${r.c90.toFixed(3)}, ungraded`); continue; }
  if (r.cap === undefined) { console.log(`FAIL  ${r.world.padEnd(10)} the page exposes no __groundChroma at all — nothing to grade against`); fail++; continue; }
  // one rounding step of slack: quiet() lands ON the cap and rounds to whole
  // 8-bit channels, so an exactly-dialled colour can read 0.161 for 0.160
  const stage = r.c75 <= r.cap + 0.005, roof = r.c99 <= r.ceil + 0.005;
  if (!stage) fail++;
  if (!roof) fail++;
  console.log(`${stage ? 'PASS' : 'FAIL'}  ${r.world.padEnd(10)} stage   ground chroma p75 `
    + `${r.c75.toFixed(3)}   cap ${r.cap.toFixed(2)}`);
  console.log(`${roof ? 'PASS' : 'FAIL'}  ${r.world.padEnd(10)} ceiling ground chroma p99 `
    + `${r.c99.toFixed(3)}   max ${r.ceil.toFixed(2)}`);
  const seen = Number.isFinite(r.sep) ? r.sep : NaN;
  const sepOk = !Number.isFinite(seen) || seen >= 10;
  if (!sepOk) fail++;
  const wp = r.worstPair;
  console.log(`${sepOk ? 'PASS' : 'FAIL'}  ${r.world.padEnd(10)} districts closest pair `
    + `${Number.isFinite(seen) ? seen.toFixed(1) : '  —'} dE   want >= 10`
    + (wp && !sepOk ? `   — rgb(${wp[0].slice(0, 3).map((x) => x.toFixed(0)).join(',')}) at `
      + `${wp[0][3].toFixed(1)}% vs rgb(${wp[1].slice(0, 3).map((x) => x.toFixed(0)).join(',')}) at `
      + `${wp[1][3].toFixed(1)}%` : ''));
}
const graded = rows.filter((r) => r.cap != null).length * 3 + missing;
fail += missing;
console.log(`\n${graded - fail}/${graded} graded, ${rows.length - graded / 2} worlds not yet on the dial`);
process.exit(fail ? 1 : 0);
