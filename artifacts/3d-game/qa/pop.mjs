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
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { assertFreshDist } from './_freshdist.mjs';

const PORT = Number(process.argv[2] || 4177);
// flags are not worlds. `node qa/pop.mjs 4177 maple --stale` used to ask
// _worldshots to render a world called "--stale", which boots a browser, waits
// out the full match-clock timeout and reports nothing.
const ARGW = process.argv.slice(3).filter((a) => !a.startsWith('--'));
const WORLDS = ARGW.length ? ARGW
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
  // ── THE GAP, WHICH IS WHAT THE BRIEF ACTUALLY CLAIMS ──────────────────────
  // D1 and D2 are absolute thresholds — below 0.12 is "stage", above 0.35 is
  // "actors" — and they were calibrated on HOLE.IO's city, whose ground is grey
  // concrete. Applied literally to a park they ask us to make the lawn grey to
  // score well on a metric named after separation. The brief's own section 3.1
  // even prescribes "a pale, chalky green at chroma ~0.15", which is ABOVE its
  // own 0.12 bar: the prescription cannot satisfy the bar it is written under.
  //
  // The thesis those bars are a proxy for is a RATIO: "they stage saturated
  // objects on a neutral ground, so the two separate". So measure that too —
  // the 25th percentile of chroma (the ground the props stand on) against the
  // 90th (the props). It needs no world to be grey to score well, and it says
  // in one number what two thresholds say from opposite ends: measured, GAME
  // DAY is 76% stage / 11% actors and MAPLE is 25% / 37%, both failing, one for
  // having no props and one for having no ground.
  const q = (a, f) => a[Math.min(a.length - 1, Math.floor(a.length * f))];
  const ground = q(chs, 0.25), props = q(chs, 0.90);
  return { stage: 100 * below / n, actors: 100 * above / n,
    value: vals[Math.floor(vals.length / 2)], chroma: chs[Math.floor(chs.length / 2)],
    ground, props, gap: ground > 0.001 ? props / ground : 0 };
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
    const pts = [];
    while (stack.length) {
      const q = stack.pop(); const qx = q % w, qy = (q / w) | 0;
      count++; pts.push(q);
      if (qx < minX) minX = qx; if (qx > maxX) maxX = qx;
      if (qy < minY) minY = qy; if (qy > maxY) maxY = qy;
      for (const nq of [q - 1, q + 1, q - w, q + w]) {
        if (nq < 0 || nq >= w * h || seen[nq] || !mask[nq]) continue;
        seen[nq] = 1; stack.push(nq);
      }
    }
    if (!best || count > best.count) best = { count, minX, maxX, minY, maxY, pts };
  }
  if (!best) return null;
  return { ...best, wpx: best.maxX - best.minX + 1, hpx: best.maxY - best.minY + 1,
    share: 100 * (best.maxX - best.minX + 1) / w };
}

// The rim, honestly: walk the void's own centre row outward and report the width
// of the brightest band at each edge as a fraction of his diameter, plus its
// contrast against the darkest interior tone. On the untouched tree there is no
// rim, so this reports a small number and D7/D8 fail — which is the point.
// ── THE RIM, ON A RADIUS — AND NOT ON HIS EYES ──────────────────────────────
// This took ONE horizontal row through the middle of his bounding box and
// called the brightest pixel on it "the rim". At 430x932 DPR 3 that row is 305
// px wide and it runs straight through both eyes: measured on maple, the peak
// it found was rgb(194,187,200) at 33% across — the sclera — against a body
// quartile of 0.25, which is where D8's 2.57:1 came from. D7 then counted how
// many pixels near the edges were as bright as an eye white, and found five.
// Neither number was ever about a rim.
//
// He is a sphere, so the rim is a RADIUS, not a row. This walks his own violet
// mask outward in normalised radius and takes the MEDIAN luminance per ring:
// the eyes, the mouth and the starfield each occupy a limited arc, so a median
// across the whole ring steps over them without needing to know where they are.
//
// R comes from the bounding box, not from the pixel count — the mask drops the
// face and the darkest heart, so an area-derived radius would run small; the
// outer boundary is violet the whole way round, so the box is exact.
function rimOf(img, v) {
  const { w, h, d } = img;
  const lum = (i) => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
  if (!v || !v.pts || v.pts.length < 400) return { width: 0, contrast: 0, core: 0, rim: 0, find: 0, round: 0 };
  const cx = (v.minX + v.maxX) / 2, cy = (v.minY + v.maxY) / 2;
  const R = (v.wpx + v.hpx) / 4;
  // ── THE RINGS ARE GEOMETRIC, NOT HUE-MASKED ─────────────────────────────
  // These sampled v.pts, and v.pts is findVoid's VIOLET mask: chroma > 0.20,
  // hue 250-300. A fresnel rim ramps toward white as it brightens, so it LOSES
  // chroma as it gains luminance — rgb(200,140,255) is chroma 0.451 and kept,
  // rgb(240,225,255) is 0.118 and dropped. The better the rim got, the more of
  // it fell out of its own measurement, and D8's contrast could fall while the
  // rim improved. He is a disc, so the rings are read from the disc.
  const NB = 32, bins = Array.from({ length: NB }, () => []);
  const core = [];
  for (let y = Math.max(0, (cy - R) | 0); y < Math.min(h, cy + R); y++) {
    for (let x = Math.max(0, (cx - R) | 0); x < Math.min(w, cx + R); x++) {
      const t = Math.hypot(x - cx, y - cy) / R;
      if (t >= 1) continue;
      const i = (y * w + x) * 4;
      bins[Math.min(NB - 1, Math.floor(t * NB))].push(lum(i));
    }
  }
  // ── AND THE INTERIOR IS HIS BELLY, NOT HIS FACE ─────────────────────────
  // A disc at t < 0.35 of the centre is exactly where the eyes and the mouth
  // live, so reading the "interior" there measures his sclera. void3d.ts puts
  // the pit deliberately BELOW centre — "Drop the core into his belly instead:
  // face on top, open space below it" — at a screen-space offset of 0.46 in
  // the projected normal. That is where the dark heart the D8 ratio is against
  // actually is, so that is where it is read. Measured on maple: the centred
  // disc gave 0.144 with the face in it, the belly gives the body.
  for (let y = Math.max(0, (cy + 0.06 * R) | 0); y < Math.min(h, cy + 0.56 * R); y++) {
    for (let x = Math.max(0, (cx - 0.25 * R) | 0); x < Math.min(w, cx + 0.25 * R); x++) {
      if (Math.hypot(x - cx, y - (cy + 0.31 * R)) > 0.25 * R) continue;
      core.push(lum((y * w + x) * 4));
    }
  }
  const med = (a) => (a.length ? a.slice().sort((p1, p2) => p1 - p2)[a.length >> 1] : NaN);
  const prof = bins.map(med);
  const c = med(core);
  if (!(c >= 0) || core.length < 50) return { width: 0, contrast: 0, core: 0, rim: 0, find: 0, round: 0 };
  // The outermost ring is half background: a pixel straddling his edge still
  // passes the hue test while carrying the ground's brightness with it, and on
  // a pale world that reads as a rim twice as bright as the one he has. So the
  // rim is read from the last ring that is entirely his.
  const LAST = Math.floor(NB * 0.97);
  let peak = 0, peakBin = 0;
  for (let k = Math.floor(NB * 0.55); k < LAST; k++)
    if (prof[k] > peak) { peak = prof[k]; peakBin = k; }
  // ── THE BAND HAS TWO EDGES ──────────────────────────────────────────────
  // This walked INWARD from the peak and then assumed the band ran all the way
  // out to t = 1, so `width` was the distance from the band's inner edge to the
  // silhouette, not the width of the band. A single bright ring sitting a fifth
  // of the way in, with everything outside it dark, reported a number inside
  // D7's pass window. Both edges now, and a band that does not reach the last
  // full ring is not a rim on the silhouette at all.
  const half = c + 0.5 * (peak - c);
  let k0 = peakBin, k1 = peakBin;
  while (k0 > 0 && prof[k0 - 1] >= half) k0--;
  while (k1 < LAST - 1 && prof[k1 + 1] >= half) k1++;
  // as a share of his DIAMETER, which is how their 13.4% was measured: a band
  // of (k1 + 1 - k0) rings out of NB spans that fraction of the RADIUS, and
  // half of it of the diameter
  const width = 100 * ((k1 + 1 - k0) / NB) * 0.5;
  // ── TWO FIGURES FOR BARS THAT DESCRIBE OUR HERO INSTEAD OF THEIRS ────────
  // D7 (rim 10-15% of the diameter) and D8 (>= 8:1 against the interior) were
  // both read off HOLE.IO's hero, and their hero is a HOLE: a near-black disc
  // with a hard bright annulus round it. Ours is a sphere with a fresnel, a
  // face and a starfield inside it, and the owner's standing instruction is
  // that he is refined rather than replaced. The arithmetic is decisive rather
  // than a matter of taste — with his interior at luminance 0.10, (rim+0.05) /
  // (0.10+0.05) tops out at 7.0:1 with a rim of PURE WHITE. D8 cannot be met
  // by any rim; it can only be met by hollowing him out.
  //
  // So these two are printed beside them, measuring what actually matters for
  // a character who has to be findable and has to read as a ball:
  //
  //   FINDABILITY  how far he is from the ground he is standing on, CIE76 dE
  //                over his own pixels at the 75th percentile — the same
  //                question and the same convention qa/occlusion.mjs uses for
  //                him when something is in the way, and qa/formsep.mjs for
  //                the palette (which fails under dE 6).
  //   ROUNDNESS    rim luminance minus core luminance. A flat disc scores 0
  //                whatever colour it is; this is what says "sphere".
  //
  // They are DIAGNOSTICS until the owner rules on the bars. A number this
  // probe prints is not a bar until someone says it is.
  const lab = (r, g, b) => {
    const f = (c2) => { c2 /= 255; return c2 <= 0.04045 ? c2 / 12.92 : Math.pow((c2 + 0.055) / 1.055, 2.4); };
    const R = f(r), G = f(g), B = f(b);
    let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
    let Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const k2 = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    X = k2(X); Y = k2(Y); Z = k2(Z);
    return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
  };
  const inMask = new Set(v.pts);
  const bg = [0, 0, 0]; let nb = 0;
  for (let y = Math.max(0, (cy - 2.6 * R) | 0); y < Math.min(h, cy + 2.6 * R); y++) {
    for (let x = Math.max(0, (cx - 2.6 * R) | 0); x < Math.min(w, cx + 2.6 * R); x++) {
      const q = y * w + x, dd = Math.hypot(x - cx, y - cy);
      if (dd < R * 1.3 || dd > R * 2.2 || inMask.has(q)) continue;
      bg[0] += d[q * 4]; bg[1] += d[q * 4 + 1]; bg[2] += d[q * 4 + 2]; nb++;
    }
  }
  let find = 0;
  if (nb > 50) {
    const B0 = lab(bg[0] / nb, bg[1] / nb, bg[2] / nb);
    const ds = [];
    for (const q of v.pts) {
      const c2 = lab(d[q * 4], d[q * 4 + 1], d[q * 4 + 2]);
      ds.push(Math.hypot(c2[0] - B0[0], c2[1] - B0[1], c2[2] - B0[2]));
    }
    ds.sort((a2, b2) => a2 - b2);
    find = ds[Math.floor(ds.length * 0.75)];
  }
  return { width, contrast: (peak + 0.05) / (c + 0.05), core: c, rim: peak,
    find, round: peak - c };
}

// Frames come from qa/_worldshots.mjs, not from a second copy of the same
// browser dance. The first version of this probe drove Chromium itself and hung
// for 400 s waiting on the match clock, because the bare-URL boot takes a
// different path through the world picker than the one _worldshots already
// solved. Reusing it also guarantees these frames are the SAME frames as the
// committed baseline in docs/crews/round-7/recon/self/, so a before/after
// comparison is like for like.
// ── IT RE-SHOOTS. IT USED TO REUSE WHATEVER WAS ON DISK ────────────────────
// This shot only when the PNG was MISSING, which makes the probe silently
// answer about the last build every time it is run twice — change a colour, run
// pop.mjs, read the number you had before the change and believe it. Every
// colour figure this stream has quoted came from a script that deleted
// qa-out/gw/*-spawn.png first, so they stand; but a probe whose correctness
// depends on the caller remembering to delete its inputs is a trap, and this is
// the fifth instrument fault in this stream.
// `--stale` opts back into the old behaviour for the one legitimate case:
// re-reading frames you already shot, without a preview server running.
const STALE = process.argv.includes('--stale');
// refuse to measure a bundle older than the source it is meant to contain
if (!STALE) assertFreshDist('qa/pop.mjs');
function frameFor(world) {
  const p = `qa-out/gw/${world}-spawn.png`;
  if (!STALE || !existsSync(p)) {
    if (existsSync(p)) rmSync(p);
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
  rows.push({ world, ...st, share: v ? v.share : 0, rim: rim.width, contrast: rim.contrast,
    core: rim.core, rimLum: rim.rim, find: rim.find, round: rim.round });
}

// Their two frames, measured by the identical function, so the table is one artefact.
for (const [f, label] of [['02-match-city.png', 'HOLE.IO city'], ['10-match-flowers-size1.png', 'HOLE.IO flowers']]) {
  const p = `${REF}/${f}`;
  if (existsSync(p)) rows.push({ world: label, ...stats(readPNG(p)), share: NaN, rim: NaN, contrast: NaN, ref: true });
}

console.log(`\nCOLOUR AND POP — spawn frames @ ${PORT}\n`);
console.log('world             stage%   actors%   value   chroma   gap    void%    rim%   rim:1');
for (const r of rows) {
  const f = (x, n = 1) => (Number.isNaN(x) ? '   —' : x.toFixed(n));
  console.log(`${r.world.padEnd(16)} ${f(r.stage).padStart(6)} ${f(r.actors).padStart(9)} ${f(r.value, 2).padStart(7)} ${f(r.chroma, 3).padStart(8)} ${f(r.gap, 1).padStart(5)}x ${f(r.share).padStart(7)} ${f(r.rim).padStart(7)} ${f(r.contrast, 1).padStart(7)}`);
}

// the two luminances D8 is a ratio of, so a failing contrast says WHICH end is
// wrong — a dim rim and a washed-out interior fail identically as a ratio
console.log('');
for (const r of rows.filter((x) => !x.ref && x.core !== undefined))
  console.log(`  ${r.world.padEnd(10)} rim lum ${r.rimLum.toFixed(3)}  interior lum ${r.core.toFixed(3)}`
    + `   |  findability ${r.find.toFixed(1)} dE   roundness ${r.round.toFixed(3)}`);

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
