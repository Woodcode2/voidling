// qa/pop.mjs — COLOUR AND POP, MEASURED.
//
// Round 7, stream D. Written against docs/crews/round-7/streamD.colour-brief.md §5.
// Like qa/opening.mjs it exists to fail first: on the untouched tree it must go
// red on D1 for Pirate, Maple and Skylark, on D2 for Lantern and Powder, on D3
// for Game Day and Lantern, and on D7/D8/D10 everywhere.
//
// The one idea this probe is built around: POP IS A GAP. Hole.io stages
// saturated objects on a near-neutral ground, so the two separate. So the
// headline numbers are not "how colourful is it" but the two ends of the
// distribution — how much of the playfield is nearly neutral (the stage) and how
// much is strongly coloured (the actors) — measured with the identical method
// used on the owner's Hole.io screenshots, and printed in the same table as
// theirs so the comparison is one artefact rather than two.
//
//   node qa/pop.mjs [port] [world ...]
//
// Chroma is (max-min)/255, not HSL saturation: near-black reports S=100% and
// that error once made a dimmed end card read as the most colourful frame in the
// reference set. See docs/crews/round-7/holeio.recon.md §9.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const PORT = Number(process.argv[2] || 4177);
const WORLDS = process.argv.slice(3).length ? process.argv.slice(3)
  : ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];
const OUT = 'qa-out/pop';
const REF = 'docs/crews/round-7/reference/holeio';
const BASE = 'qa/pop.baseline.json';       // district hues, so D4 can see drift

// Bars. Their numbers come from the same script run on the owner's screenshots.
const BARS = {
  D1: { what: 'stage: playfield below chroma 0.12', want: '>= 45%', cmp: (v) => v >= 45 },
  D2: { what: 'actors: playfield above chroma 0.35', want: '>= 15%', cmp: (v) => v >= 15 },
  D3: { what: 'value median of the playfield', want: '0.50-0.80', cmp: (v, w) => (w === 'lantern' ? v >= 0.30 : v >= 0.50 && v <= 0.80) },
  D10:{ what: 'void width as a share of the screen', want: '22-26%', cmp: (v) => v >= 22 && v <= 26 },
  D7: { what: 'void rim width as a share of his diameter', want: '10-15%', cmp: (v) => v >= 10 && v <= 15 },
  D8: { what: 'rim contrast against the body interior', want: '>= 8:1', cmp: (v) => v >= 8 },
};

// The playfield is the frame minus the HUD bands. The same crop was used on
// their screenshots, so the numbers are comparable.
const TOP = 0.18, BOT = 0.10;

function readPNG(p) {
  const png = PNG.sync.read(readFileSync(p));
  return { w: png.width, h: png.height, d: png.data };
}

function stats(img) {
  const { w, h, d } = img;
  const y0 = Math.floor(h * TOP), y1 = Math.floor(h * (1 - BOT));
  let n = 0, below = 0, above = 0;
  const vals = [], chs = [];
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const ch = (mx - mn) / 255;
      n++; if (ch < 0.12) below++; if (ch > 0.35) above++;
      if ((n & 7) === 0) { vals.push(mx / 255); chs.push(ch); }   // sample for medians
    }
  }
  vals.sort((a, b) => a - b); chs.sort((a, b) => a - b);
  return { stage: 100 * below / n, actors: 100 * above / n,
    value: vals[Math.floor(vals.length / 2)], chroma: chs[Math.floor(chs.length / 2)] };
}

// The void: his violet body, in the middle band of the playfield so neither the
// HUD nor the space beyond the island edge can be mistaken for him. This is the
// corrected finder from recon/self/self.py — the first version keyed on "lilac
// or very dark" and picked up shadows and the sky.
function findVoid(img) {
  const { w, h, d } = img;
  const y0 = Math.floor(h * (TOP + 0.05)), y1 = Math.floor(h * 0.75);
  const mask = new Uint8Array(w * h);
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), ch = mx - mn;
      if (ch <= 0.20 || mx <= 0.15) continue;
      let hue;
      if (mx === r) hue = ((g - b) / ch % 6 + 6) % 6;
      else if (mx === g) hue = (b - r) / ch + 2;
      else hue = (r - g) / ch + 4;
      hue *= 60;
      if (hue > 250 && hue < 300) mask[y * w + x] = 1;
    }
  }
  // largest connected component, iterative flood fill (the frames are 1290x2796;
  // a recursive fill overflows the stack on the void alone)
  const seen = new Uint8Array(w * h);
  let best = null;
  for (let p = 0; p < w * h; p++) {
    if (!mask[p] || seen[p]) continue;
    const stack = [p]; seen[p] = 1;
    let count = 0, minX = w, maxX = 0, minY = h, maxY = 0;
    while (stack.length) {
      const q = stack.pop(); const qx = q % w, qy = (q / w) | 0;
      count++;
      if (qx < minX) minX = qx; if (qx > maxX) maxX = qx;
      if (qy < minY) minY = qy; if (qy > maxY) maxY = qy;
      for (const nq of [q - 1, q + 1, q - w, q + w]) {
        if (nq < 0 || nq >= w * h || seen[nq] || !mask[nq]) continue;
        seen[nq] = 1; stack.push(nq);
      }
    }
    if (!best || count > best.count) best = { count, minX, maxX, minY, maxY };
  }
  if (!best) return null;
  return { ...best, wpx: best.maxX - best.minX + 1, hpx: best.maxY - best.minY + 1,
    share: 100 * (best.maxX - best.minX + 1) / w };
}

// The rim, honestly: walk the void's own centre row outward and report the width
// of the brightest band at each edge as a fraction of his diameter, plus its
// contrast against the darkest interior tone. On the untouched tree there is no
// rim, so this reports a small number and D7/D8 fail — which is the point.
function rimOf(img, v) {
  const { w, d } = img;
  const cy = Math.round((v.minY + v.maxY) / 2);
  const lum = (x) => { const i = (cy * w + x) * 4; return (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; };
  const row = [];
  for (let x = v.minX; x <= v.maxX; x++) row.push(lum(x));
  if (row.length < 8) return { width: 0, contrast: 0 };
  const sorted = [...row].sort((a, b) => a - b);
  const interior = sorted[Math.floor(sorted.length * 0.25)];   // the body's darker quartile
  const peak = sorted[sorted.length - 1];
  const thresh = interior + 0.6 * (peak - interior);
  // count only pixels within 25% of each edge — a bright specular highlight in
  // the middle of the body is gloss, not a rim
  const edge = Math.max(2, Math.round(row.length * 0.25));
  let lit = 0;
  for (let k = 0; k < edge; k++) { if (row[k] > thresh) lit++; if (row[row.length - 1 - k] > thresh) lit++; }
  const contrast = (peak + 0.05) / (interior + 0.05);
  return { width: 100 * lit / row.length, contrast };
}

// Frames come from qa/_worldshots.mjs, not from a second copy of the same
// browser dance. The first version of this probe drove Chromium itself and hung
// for 400 s waiting on the match clock, because the bare-URL boot takes a
// different path through the world picker than the one _worldshots already
// solved. Reusing it also guarantees these frames are the SAME frames as the
// committed baseline in docs/crews/round-7/recon/self/, so a before/after
// comparison is like for like.
function frameFor(world) {
  const p = `qa-out/gw/${world}-spawn.png`;
  if (!existsSync(p)) {
    execFileSync('node', ['qa/_worldshots.mjs', world, String(PORT)], { stdio: 'inherit' });
  }
  if (!existsSync(p)) throw new Error(`no spawn frame for ${world} at ${p}`);
  return p;
}

const rows = [];
mkdirSync(OUT, { recursive: true });
for (const world of WORLDS) {
  const path = frameFor(world);
  const img = readPNG(path);
  const st = stats(img);
  const v = findVoid(img);
  const rim = v ? rimOf(img, v) : { width: 0, contrast: 0 };
  rows.push({ world, ...st, share: v ? v.share : 0, rim: rim.width, contrast: rim.contrast });
}

// Their two frames, measured by the identical function, so the table is one artefact.
for (const [f, label] of [['02-match-city.png', 'HOLE.IO city'], ['10-match-flowers-size1.png', 'HOLE.IO flowers']]) {
  const p = `${REF}/${f}`;
  if (existsSync(p)) rows.push({ world: label, ...stats(readPNG(p)), share: NaN, rim: NaN, contrast: NaN, ref: true });
}

console.log(`\nCOLOUR AND POP — spawn frames @ ${PORT}\n`);
console.log('world             stage%   actors%   value   chroma   void%    rim%   rim:1');
for (const r of rows) {
  const f = (x, n = 1) => (Number.isNaN(x) ? '   —' : x.toFixed(n));
  console.log(`${r.world.padEnd(16)} ${f(r.stage).padStart(6)} ${f(r.actors).padStart(9)} ${f(r.value, 2).padStart(7)} ${f(r.chroma, 3).padStart(8)} ${f(r.share).padStart(7)} ${f(r.rim).padStart(7)} ${f(r.contrast, 1).padStart(7)}`);
}

let fails = 0;
console.log('');
for (const r of rows.filter((x) => !x.ref)) {
  const got = { D1: r.stage, D2: r.actors, D3: r.value, D10: r.share, D7: r.rim, D8: r.contrast };
  for (const [k, bar] of Object.entries(BARS)) {
    const ok = bar.cmp(got[k], r.world);
    if (!ok) { fails++; console.log(`FAIL  ${r.world.padEnd(9)} ${k.padEnd(3)} ${bar.what.padEnd(46)} got ${got[k].toFixed(2).padStart(8)}  want ${bar.want}`); }
  }
}
// D4 needs a before, so capture one the first time and compare after that.
if (!existsSync(BASE)) {
  writeFileSync(BASE, JSON.stringify(rows.filter((x) => !x.ref), null, 1));
  console.log(`\n  D4 baseline written to ${BASE} — district hue drift is checked against it on later runs.`);
}
console.log(`\n  D5 (two tones per material), D6 (shade hue shift), D11 (type layers) are not yet`);
console.log(`  implemented here and are NOT counted below. They are measured by hand in the brief`);
console.log(`  until this probe grows them; a bar with no probe is not a bar.`);
console.log(`\n${fails} bar-failures across ${rows.filter((x) => !x.ref).length} worlds\n`);
process.exit(fails ? 1 : 0);
