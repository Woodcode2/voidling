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

const DIR = 'src/proto3d';
const files = readdirSync(DIR).filter((f) => f.endsWith('.ts'));
if (files.length < 10) {
  console.log(`ABORTED — only ${files.length} source files found in ${DIR}. Something moved; this is not a clean result.`);
  process.exit(2);
}

const hits = [];
let total = 0;
for (const f of files) {
  const src = readFileSync(join(DIR, f), 'utf8');
  src.split('\n').forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    for (const m of line.matchAll(/SphereGeometry\(\s*([^,()]+),\s*(\d+)\s*,\s*(\d+)\s*\)/g)) {
      total++;
      const w = Number(m[2]), h = Number(m[3]);
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
