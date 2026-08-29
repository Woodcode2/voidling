// NO SURFACE MAY LOSE A COLOUR CHANNEL TO THE GRADE — the gamut census.
//
//   node qa/gamutzero.mjs [tag]        tag defaults to `look`, the canonical pack
//
// ── RETRACTION, 2026-08-28: THIS PROBE MEASURED THE GUARD, NOT THE DEFECT ──
//
// Standing rule 3b. The version this replaces asked one question:
//
//     const zeros = (r === 0) + (g === 0) + (b === 0);   // barred at zeros >= 2
//
// **What that measures is a channel being EXACTLY ZERO.** Put plainly: it
// measures whether the gamut guard EXISTS. `gamutGuard` (prototype3d.ts:276)
// was installed for one purpose — to take a channel the ACES output matrix
// drove negative and put a small POSITIVE number in it instead of letting
// clamp() delete it. Its value is l·0.15m/(l + 1.15m) for m = −mn > 0, which is
// strictly positive for every negative input. So the day the guard landed, the
// count of exactly-zero channels went to nothing, by construction, in every
// frame, whether or not one surface in the game got its colour back.
//
// **What the defect is, is a channel carrying NO INFORMATION ABOUT THE
// SURFACE.** A truck's lit cab-top and its shadowed body-side render the same
// red because green and blue are pinned to a constant — and a constant is a
// constant at code 0, at code 1 or at code 4. The channel cannot describe a
// cool shadow or a warm highlight; the shading collapses into a single-channel
// ramp and the surface photographs as a fill. Zero is one way to be dead. It is
// not the definition of dead, and the fix that moved the truck off zero moved
// it to one.
//
// The retracted predicate and the remedy's mechanism are the same operation.
// A probe whose test is `== 0` cannot police a fix whose mechanism is `make it
// non-zero`. That is docs/GOVERNOR.md retraction 10 — "no pure black is not no
// holes" — happening a second time, inside the instrument written for this
// exact class of finding: `blackprops` tested rgb(0,0,0), the toe lifted the
// bathhouse roof off zero, and the probe went green over a building that still
// reads as a silhouette. Ask what a fix DOES before writing the test for it.
//
// MEASURED 2026-08-28. Every number here was run on frames shot into the real
// page — the CANVAS, not a render target, because three@0.185.1 refuses the
// graded tone map when the destination is a render target. Three agents were
// editing src/ during the shoot, so each frame carries its own stamp and the
// probe prints it; Game Day's row was shot off a bundle pinned by route
// interception to HEAD's crimson (0xc4453f / 0x92312d), and the other four
// worlds contain none of the constants that were moving.
//
//   THE FIVE-WORLD PACK              the retracted predicate     this probe
//     maple                                0.09%  ok              9.91%  FAIL
//     pirate                               0.00%  ok              3.32%  FAIL
//     gameday                              0.02%  ok             17.33%  FAIL
//     lantern                              0.00%  ok              0.00%  ok
//     powder                               0.00%  ok              0.76%  ok
//
//   The retracted predicate PASSES every world of today's build, exit 0. (Four
//   of those frames come from one sweep and Game Day's from its own shoot
//   minutes later; the sweep's Game Day attempt died when a concurrent rebuild
//   replaced the hashed bundle while the page was loading it.)
//
//   AND THE FACT THAT SETTLES IT. Two Game Day builds off ONE compiled bundle
//   (raw 752e50e7), served into the same page by route interception, same shot
//   procedure, exposure 1.12 read back off the renderer both times:
//
//     shipped                              0.02%  ok             17.33%  FAIL
//     the two per-channel crushers off     0.00%  ok              0.10%  ok
//
//   The retracted predicate separates a build carrying the defect from one
//   without it by TWO HUNDREDTHS OF A POINT — it cannot tell them apart. This
//   probe separates them by 173x.
//
//   What the defect looks like on the frame the retracted predicate passed:
//   70,210 pixels of EXACTLY rgb(5,139,120), one triple over a ninth of the lit
//   chromatic frame — a teal whose red is pinned at 5 where its own albedo
//   (0x2aa9a0, tailgate.ts TEAL = life.ts GD_AWAY) puts it at 33, beside a green
//   of 139. And 17,552 pixels of rgb(208,153,4): GOLD's blue at 4 where the
//   albedo puts it at 34. Neither surface is dark. Neither channel is zero.
//
// The DEAD-CHANNEL column the old version printed (`zeros >= 1`, unbarred) is
// retracted with the bar it sat beside: it is the same quantity one step
// earlier and it moves for the same wrong reason. docs/GOVERNOR.md:94 records
// Lantern going 65.6% -> 1.8% on the 2026-08-24 toe change and writes the world
// down as fixed. That number is NOT this probe's dead-channel column — the
// ledger's column is "red pixels with G=B=0", the monochannel condition, and it
// was measured two days before qa/gamutzero.mjs existed (created in c775928,
// the same commit as the guard). It is cited as the same MISTAKE, not as the
// same instrument. And the reading that went with it — that Lantern's TIMBER at
// (39,12,0) was "barely alive" — is withdrawn: under the sensitivity model
// below, at the rho this probe measures on Lantern today (0.0875 on a dominant
// median of 91), a channel at code 12 is moved 1.97 codes by that world's own
// light. It is alive. The toe was a real fix; this probe is not the
// instrument that can resolve how much of one, and does not claim to be.
//
// ── WHAT REPLACES IT ──────────────────────────────────────────────────────
//
// A channel carries information about a surface only if the light falling on
// that surface can move it by at least one 8-bit code. Below that level it is a
// CONSTANT — dead — whatever number is in it, zero or one or four. That is the
// whole test, and it is why "is it zero" was the wrong question. It subsumes
// the old predicate (zero is a constant) and it cannot be satisfied by moving a
// number off zero.
//
// Two floors are derived, by independent routes, and a channel must be under
// BOTH to be condemned:
//
//   THE INFORMATION FLOOR   the lowest code the world's own light can move by
//     one. rho is this world's median relative shading depth, measured from the
//     frame itself on the DOMINANT channel (alive by construction) over
//     edge-free single-material patches of 8 css px. See sens() below for why
//     that is NOT simply 1/rho.
//
//   THE PALETTE FLOOR       enc( lin(D) · QMIN ), where D is the pixel's
//     dominant channel and QMIN is the smallest linear min/max channel ratio
//     among the colour constants the world modules author. This is where the
//     most saturated colour this game contains would land under a hue-
//     preserving pipeline. It is parsed from source every run, so it moves with
//     the palette and cannot rot into a snapshot.
//
// The palette floor's justification, stated honestly: nothing in the art asks
// for less than QMIN *under a neutral illuminant* — and the illuminant is not
// neutral. Game Day's key is 0xffd9a8 (prototype3d.ts:727), linear b/r 0.3916,
// so a perfectly hue-preserving render of GOLD (authored b/r 0.02545) under the
// key ALONE lands at 0.00996, below QMIN, before the grade touches it. The
// floor is therefore a lower bound on what the ART asks for and not a statement
// about any one pixel. What carries the finding is the per-albedo check: under
// the key alone, hue-preserving, GOLD at a rendered R of 208 puts blue at 19,
// and it renders at 4. And where the key runs the OTHER way it makes no
// difference: Pirate's sun is 0xfff2d8, linear r/g 1.1262, which would put its
// teal's red at 40 where a neutral illuminant puts it at 37 — and it renders at
// 5. Those surfaces are not being crushed by the light.
//
// AN EARLIER DRAFT OVERSOLD THESE AS AGREEING DERIVATIONS, and its skeptic
// then measured the conjunction against the palette clause alone, found a
// difference of fractions of a point, and concluded the information floor was
// decoration. That was true of the POWER-LAW floor it was measured against —
// about twice too high, and therefore almost never the smaller of the two. With
// sens() the information floor lands at 6-9 codes in four of the five worlds,
// below the palette floor across most of the mid-tones, and it does half the
// work. Measured today, each clause alone against the conjunction:
//
//              conjunction   palette only   info only
//     maple        9.91          10.32         9.91
//     pirate       3.32           3.55         3.32
//     gameday     17.33          31.31        17.33
//     lantern      0.00           0.00         0.00
//     powder       0.76           0.76         3.24  FAIL
//
// Neither clause is decoration and neither alone is the test. The information
// floor is what keeps Game Day's number honest; the palette clause is the only
// thing standing between Powder's pastels and a false FAIL, because Powder's
// snow gives rho 0.023 and a floor of 34 codes. A channel is condemned only
// when quantisation says the light cannot move it AND no authored colour
// explains its level.
//
// LIT is 128/255 on the dominant channel: at or above half the display's code
// range the surface is taking key light and "it is dark" is not an available
// explanation. The frame is sampled at EVERY illumination level above that,
// because CRIM's green is non-monotonic in light — docs/crews/round-3/
// gameday-red.verdict.md measured it recovering only above a rendered R of
// about 205 — and an instrument that samples one exposure lands on one side of
// that V and reports the other side's answer, which is the fault that verdict
// found in qa/formsep.mjs.
//
// THE BAR is 1.5% of lit chromatic pixels carrying a dead channel, and it is
// placed against a build where the defect is provably ABSENT: the two
// per-channel crushers neutralised in the tone-map chunk (TOE 0.014 -> 0.0002
// and the chroma push 1.07 -> 1.00), patched into the compiled bundle and
// served into the real page. That is a NEGATIVE CONTROL, not a proposed fix —
// removing the toe would undo the 2026-08-24 change — and its only job is to
// prove that green is reachable, so that a green reading means something. It
// measures 0.10%, fifteen times under the bar, against 17.33% for the same
// world as shipped. Across the two packs read today no world lands between
// 0.76% and 3.32%, so the bar sits in an empty band.
//
// That band is a property of these packs and NOT of builds near the bar, and a
// reading near 1.5% is not a verdict. This metric reads a photograph: two
// shoots of the SAME build ten minutes apart measured 17.33% and 22.43% on Game
// Day. Read anything between the clean band and ~4% as "unresolved, reshoot" —
// and do not ratchet this number, because a ratchet on a framing-bound metric
// fails the next honest reshoot.
//
// KNOWN LIMITS, written here rather than tuned around:
//   * The Lantern verdict is sensitive to LIT, and to the shoot. On the
//     canonical pack it reads 0.63% at LIT 128 and 2.58% at 96; on a frame shot
//     today, 0.00% and 0.00%. Some of its crushed surfaces sit in the 96-128
//     band and how many are on screen is a framing question. The probe prints
//     the LIT-96 census unbarred on every run so the number is not lost, and
//     Lantern's mid-band stays an open lead, not a claim.
//   * QMIN is set by the SINGLE most saturated constant in the world modules,
//     so authoring one colour more saturated than it lowers the floor for every
//     surface in the game. The probe names the constant that set it on every
//     run; if that name changes, the bar changed with it.
//   * bay.ts and palette.ts contribute nothing to QMIN. bay.ts holds not one
//     hex literal — it is Pirate Bay's geometry, and that world's surface
//     colours come from the shared modules — and palette.ts uses object-
//     property form, which this scan does not read. So Pirate is judged against
//     a floor set by Powder's ORANGE_D. Reading the object-property palettes
//     correctly is the first thing to do to this probe.
//   * A channel pinned HIGH is not caught. The test condemns a channel the
//     light cannot move; a build that pinned a weak channel at a fixed multiple
//     of luminance large enough to ramp would pass, with its hue a luminance
//     echo. That build is not this one: the channels condemned today sit at
//     codes 0-8 in Maple, Pirate and Game Day, and 0-13 in Powder where the
//     floor is higher. Catching it would need a cross-surface hue test.
//   * It does not gate on frame staleness. qa/packfresh.mjs owns that; this
//     probe prints each frame's own stamp for the record.
import { readFileSync, readdirSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import { PNG } from 'pngjs';

const WORLDS = ['maple', 'pirate', 'gameday', 'lantern', 'powder'];
const TAG    = process.argv[2] || 'look';
const BAR    = 1.5;    // % of lit chromatic pixels with a channel that cannot carry the light
const LIT    = 128;    // dominant channel: half the display's code range
const SHADOW = 96;     // the second, unbarred sample — see KNOWN LIMITS
const CHROMA = 0.30;   // (max-min)/max — inherited unchanged from the retracted version
const CSS    = 8;      // patch edge in CSS px, against the 430-wide reference viewport
const STEP   = 8;      // max adjacent step in the dominant channel: an edge, not a ramp

const lin = (s) => { const v = s / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
// d(code)/code per d(L)/L. sRGB is NOT a power law: it is linear below code
// 10.3 and carries a -0.055 offset above it, so a weak channel is ~1.9x MORE
// responsive to the same light than the dominant channel rho was measured on.
// Modelling it as a pure power law puts the information floor about 2x too
// high, which condemns channels the light does move — inert on a broken build,
// decisive on a repaired one, which is the build that would switch this gate
// off. The floor below is the lowest code v with v * sens(v) * relLin >= 1.
const sens = (c) => { const x = c / 255; return x <= 0.04045 ? 1 : (1 / 2.4) * (x + 0.055) / x; };
const enc = (v) => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));

// ── QMIN, PARSED FROM THE REAL PALETTE ────────────────────────────────────
// Rule 4: read the thing itself, and THROW if the call site has moved. A probe
// that silently finds nothing and reports a floor of zero is the snapshot bug
// wearing a hat.
// the five world modules, plus the shared prop/people/island colour sources
const PAL_FILES = ['mainstreet', 'bay', 'tailgate', 'nightmarket', 'alpine',
  'island', 'life', 'palette'].map((b) => `src/proto3d/${b}.ts`);
const CONSTS = /\b([A-Z][A-Z0-9_]{1,20})\s*=\s*0x([0-9a-fA-F]{6})\b/g;
const eligible = (text) => {                 // near-black constants carry no hue by intent
  const out = [];
  for (const m of text.matchAll(CONSTS)) {
    const v = parseInt(m[2], 16), r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 24) continue;
    out.push({ name: m[1], r, g, b, q: lin(mn) / lin(mx) });
  }
  return out;
};
let QMIN = 1, QWHO = '', NCOL = 0;
for (const f of PAL_FILES) {
  for (const c of eligible(readFileSync(f, 'utf8'))) {   // throws if a module was renamed
    NCOL++;
    if (c.q < QMIN) { QMIN = c.q; QWHO = `${f.split('/').pop()} ${c.name} rgb(${c.r},${c.g},${c.b})`; }
  }
}
if (NCOL < 100) throw new Error(`gamutzero: found only ${NCOL} palette constants — the world modules moved; fix the probe, do not skip`);

// PAL_FILES is hand-written, which is half a snapshot: readFileSync throws if a
// listed module is RENAMED, but a NEW world module is simply never scanned and
// NCOL stays over 100, so its palette never reaches the floor. So every module
// in src/proto3d that declares colour constants must be either scanned above or
// named here with a reason. Deliberately unscanned today, all four verified
// above QMIN or not a world surface:
//   hatgeo.ts  30 constants, GOLD_D rgb(216,148,0) has a ZERO blue and would
//              drop QMIN to zero — a shop hat is not a world surface
//   luxe.ts    24, min ratio 0.04971 (GOLD_B) — 3.2x above QMIN
//   curio.ts    2, min 0.41268;  void3d.ts 2, min 0.15896 (the hero, not a world)
// A module with NO eligible constant is not listed: it cannot move the floor,
// and the day it declares one this throws.
const KNOWN = new Set([...PAL_FILES.map((f) => f.split('/').pop()),
  'hatgeo.ts', 'luxe.ts', 'curio.ts', 'void3d.ts']);
for (const e of readdirSync('src/proto3d')) {
  if (!/\.ts$/.test(e) || KNOWN.has(e)) continue;
  if (eligible(readFileSync(`src/proto3d/${e}`, 'utf8')).length === 0) continue;
  throw new Error(`gamutzero: src/proto3d/${e} declares colour constants this probe has never seen — add it to PAL_FILES or to the exclusion list above, do not skip`);
}

const srcDigest = () => {
  const h = createHash('sha256');
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      const q = join(d, e.name);
      if (e.isDirectory()) { walk(q); continue; }
      if (!/\.(ts|tsx)$/.test(e.name)) continue;
      h.update(e.name); h.update(readFileSync(q));
    }
  };
  walk('src');
  return h.digest('hex').slice(0, 16);
};

// this world's own shading depth, from the dominant channel of edge-free,
// single-material patches. The dominant channel is alive by construction, so it
// is the honest witness for how hard the light works on a surface here. The
// median patch level comes back with it: the floor is a comparison between two
// levels on a curve that is not a power law, so it needs both.
function shadingDepth(png) {
  const { width: W, height: H, data: d } = png;
  const S = Math.max(1, Math.round(W / 430)), P = CSS * S;
  const rho = [], meds = [];
  for (let py = 0; py + P <= H; py += P) for (let px = 0; px + P <= W; px += P) {
    let ok = true, dom = -1; const a = [];
    for (let y = 0; y < P && ok; y++) for (let x = 0; x < P; x++) {
      const i = ((py + y) * W + (px + x)) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, g, b), c = r === mx ? 0 : (g === mx ? 1 : 2);
      if (dom < 0) dom = c; else if (c !== dom) { ok = false; break; }
      a.push([r, g, b][dom]);
    }
    if (!ok) continue;
    const s = a.slice().sort((x, y) => x - y), med = s[s.length >> 1];
    if (med < 24) continue;
    let step = 0;
    for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
      const k = y * P + x;
      if (x + 1 < P) step = Math.max(step, Math.abs(a[k] - a[k + 1]));
      if (y + 1 < P) step = Math.max(step, Math.abs(a[k] - a[k + P]));
    }
    if (step > STEP) continue;
    rho.push((s[s.length - 1] - s[0]) / med); meds.push(med);
  }
  if (rho.length < 200) throw new Error(`gamutzero: only ${rho.length} usable patches — this is not a game frame`);
  rho.sort((a, b) => a - b); meds.sort((a, b) => a - b);
  return { rho: rho[rho.length >> 1], med: meds[meds.length >> 1] };
}

function census(png, infoFloor, litGate) {
  const d = png.data;
  let n = 0, dead = 0; const byChan = [0, 0, 0]; const cols = new Map();
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < litGate || (mx - mn) / mx < CHROMA) continue;
    n++;
    const floor = Math.min(infoFloor, enc(lin(mx) * QMIN));
    let bad = false;
    for (let c = 0; c < 3; c++) {
      const v = [r, g, b][c];
      if (v !== mx && v < floor) { bad = true; byChan[c]++; }
    }
    if (bad) { dead++; const k = `${r},${g},${b}`; cols.set(k, (cols.get(k) || 0) + 1); }
  }
  return { n, dead, byChan, cols };
}

console.log('');
console.log(`  palette floor QMIN ${QMIN.toFixed(5)} — set by ${QWHO}, of ${NCOL} constants`);
console.log(`  source ${srcDigest()}`);
console.log('');
let fail = 0, missing = 0;
for (const w of WORLDS) {
  const path = `qa/out/shippedlook/${w}_${TAG}.png`;
  let png;
  try { png = PNG.sync.read(readFileSync(path)); }
  catch { console.log(`  ${w.padEnd(9)} NO FRAME — run qa/shippedlook.mjs first`); missing++; continue; }
  let stamp = '(unstamped)';
  try { stamp = readFileSync(path.replace(/\.png$/, '.src'), 'utf8').trim().split(' ')[0]; } catch { }
  const { rho, med: domMed } = shadingDepth(png);
  // the light moves a channel at level v by v * sens(v)/sens(domMed) * rho
  // codes. The floor is the lowest v that clears one code.
  const relLin = rho / sens(domMed);
  let infoFloor = 1; while (infoFloor < 255 && infoFloor * sens(infoFloor) * relLin < 1) infoFloor++;
  const hot = census(png, infoFloor, LIT);
  const dim = census(png, infoFloor, SHADOW);
  const pct = 100 * hot.dead / Math.max(1, hot.n);
  const bad = pct > BAR;
  if (bad) fail++;
  const top = [...hot.cols.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, v]) => `rgb(${k})x${v}`).join(' ');
  console.log(`  ${w.padEnd(9)} rho ${rho.toFixed(4)} on dom ${String(domMed).padStart(3)}  floors info ${String(infoFloor).padStart(2)} / palette ${String(enc(lin(180) * QMIN)).padStart(2)}@180   `
    + `lit-chromatic ${String(hot.n).padStart(7)}   DEAD ${pct.toFixed(2).padStart(6)}%  ${bad ? 'FAIL' : 'ok'}`);
  console.log(`            by channel R/G/B ${hot.byChan.join('/')}   at LIT ${SHADOW} (unbarred) ${(100 * dim.dead / Math.max(1, dim.n)).toFixed(2)}%   stamp ${stamp}`);
  if (top) console.log(`            crushed most: ${top}`);
}
console.log('');
// A failure message that names the wrong cause is worse than a bare failure
// (GOVERNOR retraction 9). A world with no frame is not a world over the bar,
// and the version this replaces counted the two together.
if (missing) console.log(`FAIL — ${missing} world(s) have no frame at tag '${TAG}' — shoot the pack (qa/shippedlook.mjs) before reading this probe.`);
if (fail) {
  console.log(`FAIL — ${fail} world(s) above ${BAR}% of lit chromatic pixels carrying a channel`);
  console.log(`       the light cannot move by one code. Those channels are constants,`);
  console.log(`       and a constant channel cannot carry a cool shadow or a warm highlight.`);
}
if (fail || missing) process.exit(1);
console.log(`PASS — every world's colour channels can carry the light that falls on them (bar ${BAR}%).`);
