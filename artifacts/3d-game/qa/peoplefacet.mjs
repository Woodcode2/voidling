// IS A PERSON A CURVE OR A PRISM?
//
//   node qa/peoplefacet.mjs
//
// The owner, on his own recording: "You can see the people in game as like
// Lego. Hole's people look way more realistic."
//
// qa/people.mjs answers the SHADING half of that sentence — whether a sleeve
// and a shoe come out of pc() at the same value. This answers the GEOMETRY
// half, which nothing measured: how long a straight edge a person actually
// shows at the closest the camera ever settles behind her.
//
// ── WHY THIS IS NOT qa/roundlod.mjs ──────────────────────────────────────────
// roundlod reads SphereGeometry and nothing else, so every cylinder in the game
// is invisible to it. A townsperson's chest, hips, thighs, shins and neck are
// ALL cylinders. The probe that exists to stop faceted things shipping cannot
// see the most-looked-at faceted thing in the game.
//
// ── AND IT COVERS BOTH POPULATIONS, WHICH IT DID NOT ─────────────────────────
// There are two townsperson species in this game and they share no code.
// src/proto3d/life.ts makePerson is the WALKING crowd; src/proto3d/mainstreet.ts
// personParts is the STATIC crowd — the people standing still on a path while
// the void rolls past, which is the longest a child ever looks at a person.
// This file read life.ts and nothing else, and roundlod cannot see mainstreet
// either (its spheres go through a helper whose segment counts are
// identifiers, not literals). So the static half of the population had never
// been under any geometry bar at all. What that hid: an 8x6 shoe showing
// 14.8px of straight edge, and a ten-sided leg that passed on a short
// townsperson and failed on a tall one. Both are fixed; both would now fail
// this probe loudly. The second half of the file is the parser for them.
//
// ── THE ARITHMETIC ───────────────────────────────────────────────────────────
// A regular N-gon of radius r has a facet chord of 2*r*sin(PI/N). The camera:
// fov 32 vertical, 430x932, so tan(fovx/2) = 0.1323 and the frustum is
// 2*0.1323*d wide in world units at distance d. camDist settles to
//   targetDist = min(340, max(26, PLAY_DIST * (R/0.9)^0.82))
// whose FLOOR is 26 — the closest the camera ever gets, at spawn, which is
// also the moment a child is looking straight at a person beside a small void.
// So 430 / (2*0.1323*26) = 62.5 css px per world unit, and a facet is
//   2 * r * sin(PI/N) * 62.5  css px
// of dead-straight edge. At 3x device pixels, triple it.
//
// pc() in life.ts scales a base primitive whose radius is 0.5, so a part's
// world radius is 0.5 * the scale argument — the arms and legs are much
// smaller than the raw numbers in the source read, and the torso much bigger.
// That is the whole finding: the limbs were never the Lego tell.
//
// ── THE BAR ──────────────────────────────────────────────────────────────────
// island.ts states the game's own bar in a comment beside makeTree: "14x10 is
// the point where the profile stops reading as a polygon at the closest the
// camera ever gets." This probe applies that stated bar to people rather than
// inventing a second one, and only to the parts big enough for a facet to read
// at all: a 3-pixel button does not need fourteen sides.
// A part passes if it carries the 14 sides OR shows less than EDGE_PX of
// straight edge. The escape hatch is the economics: enforcing 14 uniformly
// over-spends on small parts and under-spends on big ones, because what the
// eye reads is the absolute length of the flat, not the side count. Measured:
// taking B.dot from 9x6 to 14x10 cost +1,242 triangles per person — 69% — to
// fix the SMALLEST straight edge of the five, while 12x8 buys 12.0px -> 9.1px
// for half of that. EDGE_PX is a judgement and not a measurement: it sits
// below the 13.1px the chest still shows once it MEETS the 14 bar, so nothing
// can buy its way out at a size the bar itself would tolerate.
const BAR = 14;        // radial segments, island.ts's own number
const EDGE_PX = 10;    // ...or a straight edge shorter than this

// THE RESIDUAL, FROZEN THE WAY qa/roundlod.mjs FREEZES ITS DEBT. Meeting the
// 14 bar is not the same as being smooth: B.disc is a 162px-wide part because
// line 792 is the farmer's straw brim, the widest in the game on purpose, and
// fourteen sides still leave 36.2px of flat across it. Taking it to twenty
// only reaches 25.4px and thirty-four would be needed for fifteen, so it is a
// diminishing return rather than an oversight. This records it instead of
// forgetting it: the number may FALL freely, and raising it means somebody
// shipped a bigger polygon than the biggest hat in the game.
const WIDEST_PX = 36.2;
const PXU = 430 / (2 * 0.1323 * 26);

import { readFileSync } from 'fs';
const SRC = readFileSync('src/proto3d/life.ts', 'utf8');

// ── the shared primitive cache ───────────────────────────────────────────────
const block = SRC.match(/const B = \{([\s\S]*?)\n\};/);
if (!block) { console.log('ABORTED — the B primitive cache in life.ts did not parse. Something moved.'); process.exit(2); }
const prim = new Map();
for (const line of block[1].split('\n')) {
  const key = line.match(/^\s*(\w+):\s*nb\(new THREE\.(\w+)\(([^)]*)\)/);
  if (!key) continue;
  const [, name, kind, argstr] = key;
  const a = argstr.split(',').map((s) => Number(s.trim()));
  // A primitive whose own cache comment says the shape is the POINT is exempt:
  // B.tri is a three-sided prism because a tricorn brim is a triangle from
  // above, and rounding it off would delete the hat. The exemption is spelled
  // in the source next to the thing it exempts, so it cannot drift.
  const deliberate = /deliberately/.test(line);
  if (kind === 'CylinderGeometry') prim.set(name, { kind, r: Math.max(a[0], a[1]), n: a[3], deliberate });
  else if (kind === 'SphereGeometry') prim.set(name, { kind, r: a[0], n: a[1], deliberate });
  else if (kind === 'ConeGeometry') prim.set(name, { kind, r: a[0], n: a[2], deliberate });
}
if (prim.size < 8) { console.log(`ABORTED — only ${prim.size} primitives parsed out of the cache.`); process.exit(2); }

// ── the widest use of each, across every call site in the file ───────────────
// pc(B.key, col, x, y, z, sx, sy, sz, ...) — sy and sz default to sx, and the
// radius is governed by sx and sz, never sy (that is the length of the limb).
const widest = new Map();
for (const m of SRC.matchAll(/\bpc\(\s*B\.(\w+)\s*,([^;]*?)\)[,;)]/g)) {
  const name = m[1];
  if (!prim.has(name)) continue;
  const args = m[2].split(',').map((s) => s.trim());
  const num = (s) => { const v = Number((s ?? '').replace(/\s*\*\s*(gr|th|L|s)\b/g, '')); return Number.isFinite(v) ? v : NaN; };
  const sx = num(args[4]); if (!Number.isFinite(sx)) continue;
  const sz = Number.isFinite(num(args[6])) ? num(args[6]) : sx;
  const s = Math.max(sx, sz);
  if (!(widest.get(name) >= s)) widest.set(name, s);
}

const rows = [];
for (const [name, p] of prim) {
  const s = widest.get(name);
  if (s === undefined) continue;                 // never used through pc() in this file
  const r = p.r * s;                             // pc scales the base radius
  rows.push({ name, n: p.n, kind: p.kind, deliberate: p.deliberate, wpx: 2 * r * PXU, facet: 2 * r * Math.sin(Math.PI / p.n) * PXU });
}

// ══ AND THE OTHER HALF OF THE POPULATION, WHICH THIS FILE HAS NEVER READ ════
// Everything above reads src/proto3d/life.ts and nothing else. There are TWO
// townsperson species in this game and they do not share a line of code:
// life.ts makePerson is the WALKING crowd, a six-mesh rig off the B cache;
// src/proto3d/mainstreet.ts personParts is the STATIC crowd, sixteen
// primitives welded into one mesh. The statics are the ones standing still on
// the path while the void rolls past, which is the longest a child ever looks
// at a person — and the 14-side bar has never been applied to one of them.
//
// qa/roundlod.mjs does not cover them either, for a different reason: it
// matches `SphereGeometry(<expr>, <int>, <int>)` written literally on one
// line, and every sphere in mainstreet.ts goes through the helper
//     const sph = (r, s = 8, t = 6) => new THREE.SphereGeometry(r, s, t);
// whose W and H are identifiers. Both probes were blind to the same file, and
// what they missed was an 8x6 shoe showing 14.8px of straight edge — the only
// part in either population that failed BOTH halves of the bar at once.
//
// THE UNIT CONVERSION IS THE WHOLE TRICK. life.ts writes radii against body
// symbols (gr, th, L) whose reference value is 1, which is why num() above can
// simply strip them. mainstreet.ts writes them against T, the per-person
// height, which is S * (0.94 + v2 * 0.12) with S read from the source — so a
// radius of `0.155 * T` is 0.155 * 1.41 * up-to-1.06 world units. The bar is a
// worst case, so this takes the TOP of the jitter.
//
// …AND part()'s SCALE ARGUMENTS COUNT. part(geo, col, x, y, z, rx, ry, rz,
// sx, sy, sz) scales before it rotates, so a ball stretched 1.42 along the
// facing has a 1.42x semi-major axis and a 1.42x facet chord with it. That is
// exactly the difference between the shoe passing at twelve sides and failing:
// 7.1px on the written radius, 10.0px on the axis actually drawn.
const MS = readFileSync('src/proto3d/mainstreet.ts', 'utf8');
const sm = MS.match(/const S = ([0-9.]+);/);
if (!sm) { console.log('ABORTED — the S body scale in mainstreet.ts did not parse. Something moved.'); process.exit(2); }
const T_MAX = Number(sm[1]) * 1.06;      // the top of the per-person height jitter
// radii are written as `<number> * T`; anything else is not a people radius
const rad = (str) => {
  const m = String(str).trim().match(/^([0-9.]+)\s*\*\s*T$/);
  return m ? Number(m[1]) * T_MAX : NaN;
};
const msRows = [];
// part(sph(r, W, H), col, x, y, z, rx, ry, rz, sx, sy, sz)
for (const m of MS.matchAll(/\bpart\(\s*sph\(([^,]+),\s*(\d+)\s*,\s*(\d+)\s*\)([^;]*?)\);/g)) {
  const r = rad(m[1]); if (!Number.isFinite(r)) continue;
  const tail = m[4].split(',').map((q) => q.trim());
  // args after the geometry: col, x, y, z, rx, ry, rz, sx, sy, sz -> indices 8/10
  const sx = Number(tail[8]), sz = Number(tail[10]);
  const k = Math.max(Number.isFinite(sx) ? sx : 1, Number.isFinite(sz) ? sz : 1);
  msRows.push({ r: r * k, n: Number(m[2]), line: m[0].slice(0, 46) });
}
// part(cyl(rTop, rBot, h, N), ...)
for (const m of MS.matchAll(/\bpart\(\s*cyl\(([^,]+),\s*([^,]+),\s*([^,]+),\s*(\d+)\s*\)([^;]*?)\);/g)) {
  const r = Math.max(rad(m[1]), rad(m[2])); if (!Number.isFinite(r)) continue;
  msRows.push({ r, n: Number(m[4]), line: m[0].slice(0, 46) });
}
if (msRows.length < 10) {
  console.log(`ABORTED — only ${msRows.length} static-townsfolk parts parsed out of mainstreet.ts.`);
  process.exit(2);
}
// the widest use of each side count, which is the one that can fail
const bySides = new Map();
for (const q of msRows) if (!(bySides.get(q.n)?.r >= q.r)) bySides.set(q.n, q);
for (const [n, q] of bySides) rows.push({
  name: `ms:${n}-gon`, n, kind: 'static', deliberate: false,
  wpx: 2 * q.r * PXU, facet: 2 * q.r * Math.sin(Math.PI / n) * PXU,
});

rows.sort((a, b) => b.facet - a.facet);

console.log(`\n  PEOPLE FACETS — ${PXU.toFixed(1)} css px per world unit at d=26, the closest the camera settles\n`);
console.log('    part      sides   on screen   straight edge');
for (const r of rows) {
  const flag = r.deliberate ? '  (deliberate shape, exempt)'
    : r.n >= BAR ? ''
    : r.facet < EDGE_PX ? '  (under 10px, exempt)'
    : '  <-- OVER THE 14 BAR';
  console.log(`    ${r.name.padEnd(8)}  ${String(r.n).padStart(3)}   ${r.wpx.toFixed(1).padStart(7)}px  ${r.facet.toFixed(1).padStart(8)}px${flag}`);
}

const bad = rows.filter((r) => !r.deliberate && r.n < BAR && r.facet >= EDGE_PX);
console.log('');
if (bad.length) {
  console.log(`FAIL — ${bad.length} part(s) carry fewer than ${BAR} sides AND show ${EDGE_PX}px or more of straight edge.`);
  for (const r of bad) console.log(`  ${r.name}: ${r.n} sides, ${r.facet.toFixed(1)}px of straight edge across a ${r.wpx.toFixed(0)}px part.`);
  console.log(`  island.ts states the bar beside makeTree: 14x10 is where a profile stops reading`);
  console.log(`  as a polygon at the closest the camera ever gets. People are closer than trees.`);
  process.exit(1);
}
console.log(`PASS — every people part carries ${BAR} sides or shows under ${EDGE_PX}px of straight edge.`);
const w = rows.find((r) => !r.deliberate);
if (w.facet > WIDEST_PX) {
  console.log(`FAIL — the widest residual straight edge GREW: ${w.name} at ${w.facet.toFixed(1)}px against a frozen ${WIDEST_PX}px.`);
  console.log(`  Meeting the 14 bar is not the same as being smooth. Either give ${w.name} more sides,`);
  console.log('  or raise WIDEST_PX in this file with the reason in the commit message.');
  process.exit(1);
}
console.log(`  Widest residual straight edge: ${w.name} at ${w.facet.toFixed(1)}px, frozen at ${WIDEST_PX}px.`);
if (w.facet < WIDEST_PX - 0.05) console.log(`  It FELL — lower WIDEST_PX to ${w.facet.toFixed(1)}.`);
