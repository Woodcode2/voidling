// IS ANYTHING IN THE WORLD A HOLE? — the crushed-albedo probe.
//
//   node qa/blackprops.mjs [images...]        (default: store/*.png)
//
// Found by TEAM STATIC in studio round 3 and verified independently before it
// was written down. In store/04-lantern-market.png there are two solid black
// squares sitting on the market floor — 73×78 and 66×71 device pixels, filling
// 83% and 73% of their own bounding boxes, with soft shadows underneath them so
// they are definitely raised props and not gaps in the ground. Cropped at 3×
// they have no shading, no gradient and hard edges. They do not read as dark
// objects. They read as missing geometry.
//
// ── WHY PURE BLACK AND NOT MERELY DARK ───────────────────────────────────
// Lantern Night's palette runs to 0x1e1e26, 0x222834, 0x2e3440 and 0x1a3a52
// (nightmarket.ts:57-66) against the dimmest key in the game — WORLD_LIGHT
// .lantern.sunI is 0.55 where Game Day's is 2.55. That alone would only make
// them dark. What makes them ZERO is the grade's toe:
//
//     prototype3d.ts:270   color = max(0, (color - 0.014) / (1 - 0.014))
//
// Anything arriving under 0.014 leaves as exactly 0.0, and every pixel of the
// face goes at once — which is why the result is a flat shape with hard edges
// rather than a dark object with shading. The toe is doing what a toe is for;
// the albedos are simply below it.
//
// ── THE DISCRIMINATOR, AND IT IS THE WHOLE PROBE ─────────────────────────
// A world at night is SUPPOSED to have black in it. Measured on the shipped
// set, 3.06% of Lantern's play area is exactly rgb(0,0,0) — and most of that is
// legitimate shadow. Counting black pixels cannot tell the two apart and would
// fail this world forever, which is the same unsatisfiable-bar mistake
// qa/pickerfit.mjs had to retract.
//
// TWO RETRACTIONS, both before this gated anything, and the second one is the
// worst thing I have done to an instrument in this project.
//
// 1. BBOX FILL. Crushed faces measured 83% and 73% of their own bounding box
//    against 11-46% for the shadows, and the bar went in the gap. It then
//    flagged the ambient occlusion between two maple canopy lobes at exactly
//    65%, which the crop shows is correct depth between two spheres. Fill is
//    not a principled separator anyway: a circle fills 78.5% of its box and a
//    square rotated 45 degrees fills 50%, so a round dark prop and a
//    diamond-shaped shadow would both score backwards. It worked by luck.
//
// 2. EDGE HARDNESS, AND I FABRICATED THE EVIDENCE FOR IT. I reasoned that a
//    face which drops under the toe steps straight into a lit surface while a
//    shadow ramps, wrote "measured on the shipped set: 0.121, 0.196 for prop
//    faces against 0.041 for occlusion" into this header, and set a bar from
//    those numbers. I never took that measurement. When I finally did, it came
//    out exactly backwards — the two confirmed holes are 0.0009 and 0.0023 and
//    the maple occlusion is 0.0157 — because a night market's floor is dark
//    too, so "the step outside the blob" was measuring how bright the
//    neighbourhood is, not how sharp the transition is. The bar I invented
//    passed both holes I had seen with my own eyes.
//
//    Numbers in a comment are load-bearing. Every later reader treats them as
//    evidence. Inventing them is worse than having none.
//
// ── WHAT IT ACTUALLY MEASURES ────────────────────────────────────────────
// SOLIDITY: the blob's area over the area of its own convex hull. A flat prop
// face is a convex polygon and tends to 1.0. A cast shadow bends around the
// geometry it falls on, and an occlusion crevice between two spheres is a
// concave lens; both come in well under. Unlike fill it does not care how the
// shape is rotated, and unlike the edge test it does not care how bright the
// surroundings happen to be.
//
// Measured, this time, across the shipped set:
//
//     confirmed holes (cropped and looked at)   0.987, 0.976
//     maple canopy occlusion                    0.889, 0.869
//     every other black region in the frames    0.929 and below
//
// The bar is 0.95, in the gap. Honest caveat: that is two positives against ten
// negatives, which is a small sample for a bar — the nearest negative is a thin
// straight pole shadow at 0.929, and a straight shadow is legitimately convex,
// so this metric will not stay clean forever. It is good enough to catch the
// class of defect it was built for, and it should be re-derived the first time
// it disagrees with a crop.

import { PNG } from 'pngjs';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Monotone-chain convex hull, and the polygon area of it. Standard, exact,
 *  no dependency — the blob is at most a few thousand points. */
const hull = (pts) => {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  lo.pop(); up.pop();
  return lo.concat(up);
};
const polyArea = (h) => {
  let a = 0;
  for (let i = 0; i < h.length; i++) { const j = (i + 1) % h.length; a += h[i][0] * h[j][1] - h[j][0] * h[i][1]; }
  return Math.abs(a) / 2;
};

// ── THIRD RETRACTION: THE AREA BAR GAVE A FALSE PASS ─────────────────────
// This was 2000 device px, justified as "about 15 css px square, i.e.
// visible". TEAM MOVERS then found the Maple food truck's wheels rendering as
// pure rgb(0,0,0) ellipses with no shading at all — flat holes in a bright pale
// road — and this probe had reported PASS on that exact frame. They measure
// 1785 and 1698 px. The bar was 2000.
//
// A defect does not become acceptable at fourteen css pixels instead of
// fifteen, and 2000 was never derived from anything except my own guess at
// where "visible" starts. 1200 device px at 3x is roughly 12 x 11 css px —
// smaller than a fingertip target, larger than any speck a person would forgive
// — and it catches wheels.
//
// KNOWN LIMIT, stated rather than tuned around: at 1200 this also catches a
// 1298px occlusion under a maple canopy (36x61 at 1214,952 in 03-devouring),
// which reads as depth under a tree rather than a hole. Solidity cannot
// separate those two — a trunk shadow is convex as well. Moving the bar to
// 1500 would hide it, and would be fitting the bar to the answer I wanted,
// which is how the first two versions of this file went wrong. Both are
// surfaces landing at exactly zero; whether the tree one is acceptable is a
// judgement for the studio, not a number for me to pick.
const MIN_AREA = 1200;   // device px at 3x — about 12 x 11 css px
const MIN_SOLIDITY = 0.95;   // area over convex-hull area; see the measurements above
// The HUD is drawn in HTML over the game and is legitimately near-black in
// places. Only the play area is under test.
const TOP = 620, BOTTOM_PAD = 240;

const args = process.argv.slice(2);
const files = args.length ? args
  : readdirSync('store').filter((f) => /^\d\d-.*\.png$/.test(f)).map((f) => join('store', f));

let worst = [];
for (const f of files) {
  const p = PNG.sync.read(readFileSync(f));
  const W = p.width, H = p.height, y0 = TOP, y1 = H - BOTTOM_PAD;
  const seen = new Uint8Array(W * H);
  const isB = (x, y) => { const i = (y * W + x) * 4; return p.data[i] === 0 && p.data[i + 1] === 0 && p.data[i + 2] === 0; };
  const blobs = [];
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
    const id = y * W + x;
    if (seen[id] || !isB(x, y)) continue;
    let n = 0, minx = x, maxx = x, miny = y, maxy = y;
    const st = [id]; seen[id] = 1;
    const pts = [];
    while (st.length) {
      const c = st.pop(), cy = (c / W) | 0, cx = c - cy * W;
      n++; pts.push([cx, cy]);
      if (cx < minx) minx = cx; if (cx > maxx) maxx = cx;
      if (cy < miny) miny = cy; if (cy > maxy) maxy = cy;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < y0 || nx >= W || ny >= y1) continue;
        const ni = ny * W + nx;
        if (!seen[ni] && isB(nx, ny)) { seen[ni] = 1; st.push(ni); }
      }
    }
    const bw = maxx - minx + 1, bh = maxy - miny + 1;
    if (n < MIN_AREA) continue;
    const h = hull(pts);
    const ha = polyArea(h) || n;
    const sol = n / ha;
    if (sol >= MIN_SOLIDITY) blobs.push({ n, x: minx, y: miny, w: bw, h: bh, sol });
  }
  blobs.sort((a, b) => b.sol - a.sol);
  console.log(`  ${f.replace(/^store\//, '').padEnd(26)} ${blobs.length} crushed prop face(s)`
    + (blobs.length ? `   worst ${blobs[0].n}px at ${blobs[0].x},${blobs[0].y} `
      + `${blobs[0].w}x${blobs[0].h}, solidity ${blobs[0].sol.toFixed(3)}` : ''));
  if (blobs.length) worst.push({ f, blobs });
}

console.log('');
if (worst.length) {
  for (const { f, blobs } of worst) {
    console.log(`  · ${f}: ${blobs.length} shape(s) of pure rgb(0,0,0) that are convex enough to be a PROP `
      + `rather than a shadow (>=${MIN_AREA}px, solidity `
      + `${blobs.map((b) => b.sol.toFixed(3)).join(', ')} against a bar of ${MIN_SOLIDITY}). `
      + `A face this flat has no shading at all — it reads as missing geometry, not as a dark object. `
      + `Cause: an albedo below the grade's toe (prototype3d.ts:270) under a dim key. `
      + `Fix the ALBEDO, not the light — the light rig is on the governor's HANDS OFF list and a `
      + `Lantern-only lift was already tried and measured at nothing`);
  }
  console.log(`\nFAIL — ${worst.reduce((a, w) => a + w.blobs.length, 0)} prop face(s) render as holes`);
  process.exit(1);
}
console.log(`PASS — across ${files.length} frame(s) every pure-black region is concave enough to be a `
  + `shadow rather than a flat prop face; nothing renders as a hole`);
