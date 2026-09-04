// ROUND THINGS MUST BE ROUND — the tessellation ratchet.
//
//   node qa/roundlod.mjs
//
// island.ts:4185 states the bar in writing, and has since long before this
// probe: "14x10 is the point where the profile stops reading as a polygon at
// the closest the camera ever gets." Nothing enforced it. Art direction, asked
// whether the five worlds read as one game, found the answer was no — and not
// because the vocabulary differs. Box, cylinder, sphere and cone account for
// essentially every primitive in the game, every prop is merged to one mesh
// with vertex colours and no texture map anywhere, and one light rig serves
// all five. The grammar is disciplined and consistent.
//
// What breaks it is resolution. In one shipped frame, within four hundred
// pixels: a 96x72 hero, smooth bush lobes, hard-faceted flower mounds and a
// visibly octagonal planter dome. Four fidelities, one style, no rule. The eye
// does not read that as one form language rendered four ways; it reads it as
// four games' assets in a bin.
//
// ── WHY THIS IS A RATCHET AND NOT A BAR ──────────────────────────────────
// 166 of 252 spheres are already under the bar. A probe that simply failed
// would be red from the day it was written, and a permanently red gate is a
// gate somebody deletes. Worse, paying the debt down is not free: merged
// geometry here is non-indexed and costs 111 bytes a triangle (qa/heap.mjs),
// a sphere goes 8x6 -> 14x10 for about 3.15x the triangles, and Game Day sits
// near its memory ceiling. The sweep has to be priced world by world.
//
// So this freezes the debt instead. It fails when the count GOES UP, which
// makes every new low-poly round thing a deliberate decision somebody has to
// defend, and it prints the remaining debt every run so paying it down is
// visible progress rather than invisible virtue.
//
// SCOPE, stated rather than assumed: it reads single-line constructor calls in
// src/proto3d/*.ts. A call split across lines is not counted, and the count
// below is therefore a floor. It is a ratchet on what it can see, which is
// enough to stop the number growing in the ordinary case.
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// The recorded debt. LOWER THIS when you pay some down — the probe tells you
// the new number. Never raise it without a reason in the commit message.
//
// 154, NOT THE 166 FIRST REPORTED. That first figure came from a shell one-liner
// whose regex accepted a fragment without its closing parenthesis, so it counted
// some matches twice and some non-calls once. This probe requires a complete
// single-line call. The twelve are a counting-method difference and NOT twelve
// spheres anybody fixed — recording them as progress would have been a lie in
// the ratchet's own baseline, on its first day.
const BASELINE = 154;

// THE SPEND — the same counted calls, priced instead of judged:
// 2*W*(H-1) summed per call SITE (not per instance; the probe cannot see
// spawn loops). It ratchets DOWN like BASELINE and for the same reason:
// triangles harvested from over-tessellated spheres can otherwise be
// quietly given back. RAISING it has exactly one legitimate case — paying
// under-bar debt down (8x6 -> 14x10) costs triangles by design — and it
// happens in the same commit that lowers BASELINE, with the arithmetic in
// the commit message. 39018 = 39242 measured on the pre-harvest tree,
// minus 224: two 14x10 -> 10x8 (tailgate.ts:869,883).
//
// ── A SECOND LEGITIMATE CASE, WHICH THE LINE ABOVE DID NOT ANTICIPATE ──────
// A NEW WORLD. The rule as written has exactly one way to go up, and shipping
// world 6 is not it — so this probe went red the first time it ran after
// SKYLARK FIELD landed, on a delta of one sphere.
//
//   39158 = 39018 + 140: skyfield.ts:99, `const sph = () =>
//   new THREE.SphereGeometry(0.5, 10, 8)`, one shared cached geometry at
//   2*10*(8-1) = 140 triangles.
//
// Priced rather than waved through, and the reasoning is on the record so the
// next reader can disagree with it:
//
//   * It is ONE definition for the whole kit. skyfield.ts routes all twenty of
//     its sphere sites through a single cached geometry; alpine, luxe,
//     nightmarket and tailgate each declare theirs inline, which is how they
//     came to hold 23, 63, 14 and 31 separate calls at nine different
//     resolutions between them. One shared sphere is the shape this probe
//     wants more of, not less.
//   * 10x8 is NOT under-bar debt — the debt line is single-digit on BOTH axes
//     — and it is finer than the resolution most shipped kits use for the same
//     job. BASELINE stays at 154 because this adds nothing to it.
//   * It is never the hero silhouette. World 6 is a field of balloons and not
//     one envelope is a sphere: they are built by goreDome() at 12 gores,
//     purpose-made so the gores reach the crown. sph() in that file is a
//     sheep's body, a hare, a flower, and the whale's eye. A 10x8 eye is not
//     the "visibly octagonal planter dome" this probe was written about.
const TRI_BASELINE = 39158;

const DIR = 'src/proto3d';
const files = readdirSync(DIR).filter((f) => f.endsWith('.ts'));
if (files.length < 10) {
  console.log(`ABORTED — only ${files.length} source files found in ${DIR}. Something moved; this is not a clean result.`);
  process.exit(2);
}

const hits = [];
let total = 0;
let spend = 0;
for (const f of files) {
  const src = readFileSync(join(DIR, f), 'utf8');
  src.split('\n').forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    for (const m of line.matchAll(/SphereGeometry\(\s*([^,()]+),\s*(\d+)\s*,\s*(\d+)\s*\)/g)) {
      total++;
      const w = Number(m[2]), h = Number(m[3]);
      spend += 2 * w * (h - 1);
      if (w < 10 && h < 10) hits.push({ f, line: i + 1, w, h, r: m[1].trim().slice(0, 18) });
    }
  });
}

const byFile = new Map();
for (const h of hits) byFile.set(h.f, (byFile.get(h.f) ?? 0) + 1);
const worst = new Map();
for (const h of hits) { const k = `${h.w}x${h.h}`; worst.set(k, (worst.get(k) ?? 0) + 1); }

console.log(`\n  ROUND LOD — ${total} single-line SphereGeometry calls in ${DIR}`);
console.log(`  ${hits.length} are single-digit on BOTH axes, against the 14x10 bar island.ts states.\n`);
for (const [k, n] of [...worst.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
  console.log(`    ${String(n).padStart(4)} at ${k}`);
}
console.log('');
for (const [f, n] of [...byFile.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${String(n).padStart(4)}  ${f}`);
}
console.log('');
console.log(`  site spend: ${spend} triangles at 2*W*(H-1) per counted call (sites, not instances).`);

if (spend > TRI_BASELINE) {
  console.log(`FAIL — the sphere spend grew: ${spend} against a recorded ${TRI_BASELINE}.`);
  console.log('  Either a harvested sphere was quietly restored, or new/raised tessellation');
  console.log('  shipped unpriced. Paying under-bar debt down IS the legitimate raise — do it');
  console.log('  in the commit that lowers BASELINE, arithmetic in the message.');
  process.exit(1);
}
if (spend < TRI_BASELINE) {
  console.log(`  the spend FELL, ${TRI_BASELINE} -> ${spend}. Lower TRI_BASELINE to ${spend}.`);
}

if (hits.length > BASELINE) {
  console.log(`FAIL — the debt grew: ${hits.length} against a recorded ${BASELINE}.`);
  console.log(`  ${hits.length - BASELINE} new round thing(s) shipped under the bar. Raise the tessellation,`);
  console.log('  or raise BASELINE in this file with a reason in the commit message.');
  process.exit(1);
}
if (hits.length < BASELINE) {
  console.log(`PASS — and the debt FELL, ${BASELINE} -> ${hits.length}. Lower BASELINE in this file to ${hits.length}`);
  console.log('  so the ground you just took cannot be given back.');
  process.exit(0);
}
console.log(`PASS — the debt is unchanged at ${hits.length}. It is frozen, not forgiven.`);
