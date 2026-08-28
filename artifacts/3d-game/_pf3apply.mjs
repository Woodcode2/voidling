// Applies patch A (the Powder bake's wind/chip pass) and patch B (GRAIN.powder)
// to an island.ts given on the command line. Each anchor must match EXACTLY
// once or nothing is written.
import { readFileSync, writeFileSync } from 'node:fs';
const path = process.argv[2];
let src = readFileSync(path, 'utf8');

const A_ANCHOR = `      g.beginPath(); g.arc(x, y, rand(3, 10), 0, Math.PI * 2); g.fill();
    }
    // 2. RIM SHADE — the mountain walls throw the bowl's edge into blue`;

const A_AFTER = `      g.beginPath(); g.arc(x, y, rand(3, 10), 0, Math.PI * 2); g.fill();
    }
    // 1b. WIND. Snow's texture is not speckle, it is DIRECTION: the wind that
    // dropped it leaves long shallow ridges — sastrugi — all lying on one
    // bearing, each with a blue lee shadow and a bright windward crest. That
    // pairing is what makes a snowfield read as a SURFACE rather than as
    // paper, and it is the one thing a radial blob cannot do.
    //
    // Step 1 above was the only grain in this whole bake — 3,600 soft arcs at
    // alpha 0.10-0.16, about 5% coverage — and everything after it is a REGION
    // fill: the rim stroke, the pinewood floor, the village floor, the lodge
    // apron. Those separate districts; none of them can put information inside
    // one. Pirate Bay's step 4b lays 13,000 hard chips and 9,000 directional
    // strokes over its island for exactly this reason and says so in its own
    // title. Powder had no equivalent pass at all.
    //
    // THE SIZES ARE DERIVED, AND THEY ARE IN DEVICE PIXELS, which is the space
    // mip selection and a phone's own pixel grid live in. (Quoting this in css
    // px — as this patch was first filed — halves every texel-per-pixel figure
    // and doubles every apparent size. renderer.setPixelRatio caps at PR_TOP =
    // 2, prototype3d.ts:140.) PW_LAND is 5,900 x 9,500 world units at
    // SCALE 0.05, so this 3072px bake covers a 295 x 475-unit bowl and one
    // canvas px is 0.096 scene units in x; on the 32-degree lens at pixelRatio
    // 2 the camera shows 125 device px per scene unit at camDist 26 and 9.6 at
    // the 340 clamp. So, measured off those two numbers:
    //   ridge width  3-7 canvas px = 0.29-0.67 units = 2.8-6.4 device px at
    //                the 340 clamp and 36-84 at 26 — it resolves across the
    //                WHOLE follow range, where the x140 speckle layer is
    //                already at 6.35 texels per device px by 340.
    //   ridge length 40-190 canvas px = 3.8-18.2 units = 97-460 device px at
    //                the R=4 camera (camDist 129).
    //   chip         1-3.4 canvas px = 0.9-3.1 device px at the clamp, 12-41
    //                at the tightest. Hard edges for the near camera, where a
    //                soft blob is a smudge and the eye has nothing to catch on.
    //
    // Zero triangles, zero draw calls, zero seeded draws: \`rand\` at :268 is
    // Math.random, this block is inside \`WORLD_ID === 'powder'\`, and there is
    // not one mrnd/mr/mpick/mchance in the Powder bake — so Maple Falls'
    // mulberry32 stream cannot move. It does spend 91,800 more Math.random
    // calls, counted off the code below: 9 per ridge x 5,200 and 5 per chip
    // x 9,000. That stream is unseeded, so Powder's layout already differs on
    // every load and qa/determ.mjs reads "DIFFERS — reseeds" either side.
    // 19,400 canvas ops against Pirate Bay's 22,000, on a canvas that is
    // already being painted.
    //
    // NO CLIP PATH, for the reason step 4b gives: clipping tens of thousands
    // of tiny ops against the coastline took that bake from milliseconds to
    // minutes in a software rasteriser, and texels outside the coastline are
    // never sampled because the ground mesh IS the silhouette.
    const WIND = -0.55;                      // one bearing for the whole valley
    // SAVE/RESTORE, because lineCap LEAKS: step 2's rim stroke and step 4's
    // piste both run off whatever this pass leaves set, and step 4b of the
    // Pirate bake is a live example of a grain pass changing it for everything
    // painted after it.
    g.save();
    g.lineCap = 'round';
    for (let i = 0; i < 5200; i++) {
      const x = Math.random() * TEX, y = Math.random() * TEX;
      const L = rand(40, 190), a = WIND + rand(-0.22, 0.22);
      const dx = Math.cos(a), dy = Math.sin(a);
      g.strokeStyle = \`rgba(126,152,198,\${(0.05 + Math.random() * 0.09).toFixed(3)})\`;
      g.lineWidth = rand(3, 7);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * L, y + dy * L); g.stroke();
      const o = rand(3, 7), ox = -dy * o, oy = dx * o;     // the crest, across the ridge
      g.strokeStyle = \`rgba(255,255,255,\${(0.06 + Math.random() * 0.10).toFixed(3)})\`;
      g.lineWidth = rand(2, 4);
      g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + dx * L + ox, y + dy * L + oy); g.stroke();
    }
    // 1c. CRUST CHIPS — the only high-frequency thing on this ground.
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * TEX, y = Math.random() * TEX;
      g.fillStyle = Math.random() < 0.5 ? 'rgba(122,148,196,0.13)' : 'rgba(255,255,255,0.15)';
      g.fillRect(x, y, 1 + Math.random() * 2.4, 1 + Math.random() * 2.4);
    }
    g.restore();
    // 2. RIM SHADE — the mountain walls throw the bowl's edge into blue`;

const B_ANCHOR = `    // snow: nearly grainless — fresh powder is the smoothest ground in the
    // game, and the bake's own blue shadowing carries the variation
    powder:  [0.20, 0.06, 0.00, 9],`;

const B_AFTER = `    // SNOW IS NOT SMOOTH, IT IS SMOOTH-LOOKING, and the difference is the
    // whole world. The claim this comment used to make — "the bake's own blue
    // shadowing carries the variation" — was checked against the bake and does
    // not hold: every blue thing in the Powder bake is REGION-scale (a
    // 900-unit rim stroke, a district fill), so it separates districts and
    // carries nothing at grain frequency.
    //
    // MEASURED, and this is what qa/groundgrain.mjs measures: median 16x16
    // luminance tile sd over the whole frame, one build, five worlds at their
    // own named fixed spots, camera settled at the R=4 lens
    // (qa/out/lookpair, src digest 8bdf1a860df35055):
    //     powder 0.0036 · pirate 0.0113 · maple 0.0172 · lantern 0.0203 ·
    //     gameday 0.0360
    // Powder's typical square of picture carries 3.1x less local tonal
    // variation than the next flattest world in the game, and its flat-tile
    // share is 51.3% against maple's 13.3%. It reproduces on four frames from
    // four builds across five days, including a PRE-RUNG one: this is the
    // world, not the shot and not the rig.
    //
    // THE LAYER THAT MATTERS IS THE COARSE ONE, and it was the one at zero.
    // The bake is 3072px over a 295x475-unit bowl and the camera runs 26-340
    // units out, which at pixelRatio 2 (PR_TOP, prototype3d.ts:140) on the
    // 32-degree lens is 125 down to 9.6 DEVICE px per scene unit — device,
    // because that is the space mip selection happens in, and quoting it in
    // css px halves every figure. Texels per device pixel, camDist 26 -> 340:
    //     fine (x140) 0.49 -> 6.35 · mid (x34) 0.12 -> 1.54 · coarse (x7)
    //     0.05 -> 0.64
    // Past camDist ~250 the fine layer is gone and the mid one is at the mip
    // boundary; the coarse layer is the only one still sharp at the 340 clamp,
    // which is most of every match — and Powder was spending its weight on the
    // fine layer alone.
    //
    // WHAT IT SPENDS: nothing measurable, and this number is from the CANVAS.
    // A probe that renders into its own WebGLRenderTarget cannot answer a
    // question about clipping — three 0.185.1 forces NoToneMapping and linear
    // output for one of those (three.module.js:7549-7559, :7585), which
    // prototype3d.ts:1099-1112 already records — and the first filing of this
    // patch quoted "1.0778% -> 1.0777%" out of exactly that buffer. On the
    // canvas, one settled Powder frame with only uGrain moving between
    // renders, any-channel >= 250 goes 0.0089% -> 0.0087% and NOT ONE PIXEL
    // crosses into clipping; the largest single-channel rise anywhere in the
    // frame is 9 codes, and at [1,1,1,7] — four times these weights — still
    // zero (docs/crews/round-3/powder-form.verdict.md §1.2).
    powder:  [0.45, 0.16, 0.22, 7],`;

for (const [anchor, after, name] of [[A_ANCHOR, A_AFTER, 'A (bake)'], [B_ANCHOR, B_AFTER, 'B (grain)']]) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error(`patch ${name}: anchor matched ${n} times, expected exactly 1. NOTHING WRITTEN.`); process.exit(1); }
  src = src.replace(anchor, after);
}
writeFileSync(path, src);
console.log(`patched ${path}`);
