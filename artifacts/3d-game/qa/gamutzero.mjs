// NO SURFACE MAY LOSE A COLOUR CHANNEL TO THE GRADE — the gamut census.
//
//   node qa/gamutzero.mjs
//
// Art direction's round-3 blocker, verified at the pixel: Game Day's CRIM
// (0xc4342f — the dominant colour of that world) rendered rgb(168,0,0). Green
// and blue exactly zero. A surface with one live channel cannot carry a cool
// shadow or a warm highlight, so its shading collapses to a single ramp and it
// photographs as a fill: median TWO distinct luminance levels out of 256
// across 1,325 interior patches.
//
// The mechanism is the per-channel clip this repo already outlawed once (the
// toe, 2026-08-24): the ACES output matrix drives a saturated colour's weakest
// channel negative and clamp() deletes it; at brighter exposures the chroma
// push does the same thing later in the function. prototype3d.ts now carries a
// gamutGuard at both clamp sites.
//
// WHAT IT MEASURES, on the canonical pack (qa/out/shippedlook/<w>_look.png):
//   dead-channel share  chromatic pixels with any channel at exactly 0
//   MONOCHANNEL share   chromatic pixels with only ONE live channel — the
//                       defect itself: these cannot shade in colour at all
//
// The bar is on monochannel share. Dead-channel share is reported unbarred: a
// very dark saturated pixel legitimately rounds its weakest channel to 0 at
// 8 bits, and a bar there would fail on honest darkness.
import { readFileSync } from 'fs';
import { PNG } from 'pngjs';

const WORLDS = ['maple', 'pirate', 'gameday', 'lantern', 'powder'];
const BAR = 1.0;   // % monochannel among chromatic pixels; measured 8-15% before the guard
let fail = 0;
console.log('');
for (const w of WORLDS) {
  let png;
  try { png = PNG.sync.read(readFileSync(`qa/out/shippedlook/${w}_look.png`)); }
  catch { console.log(`  ${w.padEnd(9)} NO FRAME — run qa/shippedlook.mjs first`); fail++; continue; }
  const d = png.data; let chrom = 0, dead = 0, mono = 0;
  for (let i = 0; i < d.length; i += 8) {          // every other pixel
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 38 || (mx - mn) / mx < 0.3) continue;  // achromatic or too dark to judge
    chrom++;
    const zeros = (r === 0) + (g === 0) + (b === 0);
    if (zeros >= 1) dead++;
    if (zeros >= 2) mono++;
  }
  const dp = 100 * dead / Math.max(1, chrom), mp = 100 * mono / Math.max(1, chrom);
  const bad = mp > BAR;
  if (bad) fail++;
  console.log(`  ${w.padEnd(9)} chromatic ${String(chrom).padStart(7)}   dead-channel ${dp.toFixed(1).padStart(5)}%   `
    + `MONOCHANNEL ${mp.toFixed(2).padStart(6)}%  ${bad ? 'FAIL' : 'ok'}`);
}
console.log('');
if (fail) { console.log(`FAIL — ${fail} world(s) above ${BAR}% monochannel: the grade is deleting channels.`); process.exit(1); }
console.log(`PASS — no world renders a chromatic surface down to one live channel (bar ${BAR}%).`);
