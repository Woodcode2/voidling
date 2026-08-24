// EVERY GEOMETRY TYPE MUST BE CLASSIFIED — the faceting gate.
//
// THE BUG THIS EXISTS FOR. mergedProp() chooses flat or smooth shading by vote:
// it counts how many of a prop's parts are "round" and assigns PROP_SMOOTH_MAT
// if at least half are. It votes with one regex, island.ts:
//
//     const ROUND_GEO = /^(Cylinder|Cone|Sphere|Torus|Lathe|Capsule|Tube)/;
//
// The polyhedron family is absent. So makeFlowers — an icosahedral mound plus
// five spherical blossoms — voted 5 of 6 round, took the SMOOTH material, and
// rendered its mound as twenty hard triangles anyway, because polyhedron
// geometry carries per-face normals that part()'s toNonIndexed() preserves.
// It was the most-placed small prop in Maple Falls and it shipped like that
// past every probe in this directory, because the probes asked the MATERIAL
// what the shading was. The material was not lying. It simply cannot re-weld
// normals that were already split.
//
// RETRACTION, before this gated anything. The first version of this probe was
// the one TEAM STATIC proposed: measure, at runtime, the share of triangles per
// prop whose three vertex normals agree, and fail any prop above 40% flat. It
// was run and it failed EIGHTEEN forms on Maple, almost all of them correct —
// because a prop earns the smooth material at HALF its parts being round, so a
// barrel with a boxy lid is legitimately ~50% flat triangles. The bar
// misdiagnosed the design as the defect. A runtime share cannot separate "flat
// because a box is meant to be flat" from "flat because a dome is secretly a
// polyhedron", and that distinction is the whole bug.
//
// So this checks the thing that actually went wrong: a geometry type nobody
// classified. It is static, it runs in milliseconds, and it closes the class
// rather than the instance — any NEW geometry type introduced to the prop kits
// must be explicitly declared round or flat by a human, and until it is, this
// fails. That is the only version of this gate that could have caught
// makeFlowers before it shipped.
//
//   node qa/normals.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const fails = [];

// The vote's own list, read from the source rather than copied, so this probe
// cannot drift from the thing it is checking.
const island = readFileSync('src/proto3d/island.ts', 'utf8');
const m = island.match(/const ROUND_GEO = \/\^\(([^)]*)\)/);
if (!m) { console.log('\n  FAIL — ROUND_GEO not found in island.ts; the vote has moved\n'); process.exit(1); }
const ROUND = m[1].split('|').map((s) => s.trim());

// DECLARED FLAT, deliberately. Each of these carries per-face normals and is
// MEANT to: they are architecture, ground decals or faceted-by-design rock.
// Adding a type here is a decision that it should look hard-edged.
const FLAT_OK = ['Box', 'Plane', 'Circle', 'Ring', 'Shape', 'Extrude', 'Edges', 'Wireframe'];
// HAND-BUILT. `new THREE.BufferGeometry()` is the base class: the coastline
// skirt, the two wall meshes and the puff sprite build their own attributes and
// set their own normals, so the vote has nothing to guess at and nothing to get
// wrong. Classified rather than exempted, so the list stays a complete census
// of what the prop kits construct.
const HAND_BUILT = ['Buffer'];
// FACETED ON PURPOSE, and the reason. A polyhedron used AS a polyhedron — a
// crystal, a chunk of rock — is correct. A polyhedron used as a dome is the bug.
const FACETED_ON_PURPOSE = {
  Icosahedron: 'rock and crystal forms only — NOT as a dome or a mound',
  Dodecahedron: 'rock and crystal forms only',
  Octahedron: 'rock and crystal forms only',
  Tetrahedron: 'rock and crystal forms only',
};

// ── AND A CENSUS, BECAUSE THE CLASSIFICATION ALONE IS NOT ENOUGH ────────────
// Being honest about the limits of the check above: it would NOT have caught
// makeFlowers. Icosahedron is on the faceted-on-purpose list, and makeFlowers
// used an icosahedron — as a MOUND. The type was classified; the USE was the
// defect, and no static list of type names can tell a crystal from a dome.
//
// What can be held is the count. Every existing polyhedron use has been looked
// at once; the numbers below are that review. A new one fails this gate until a
// human has looked at it and moved the number, which is the only point at which
// anybody would ask "is this a rock, or is it a dome?" — the question that was
// never asked about the most-placed prop in Maple Falls.
// Reviewed by hand on 2026-08-24, every site opened. The first version of this
// table was GUESSED, which is the opposite of its purpose, and the guesses were
// wrong in both directions — the real review found five faceted "palms" in
// luxe.ts that were potted-plant FOLIAGE, the same defect as makeFlowers, and
// they are spheres now.
const FACETED_BUDGET = {
  // pom-poms and fur lumps at detail 1 (subdivided, so nearly round) plus
  // octahedral gems and a dodecahedral bud. Hats are small and held close.
  'src/proto3d/hatgeo.ts': 8,
  // bollard studs, a kiosk gem, and ICE CUBES in a champagne bucket and a
  // coconut drink — faceted ice is correct and is the point.
  'src/proto3d/luxe.ts': 4,
  'src/proto3d/curio.ts': 2,         // collectible gems — faceted by design
  // the jungle temple idol, and two grey rocks. All three are stone.
  'src/proto3d/island.ts': 3,
  // moss rock and the stone lantern caps — granite, correct
  'src/proto3d/nightmarket.ts': 4,
  'src/proto3d/tailgate.ts': 1,      // ice in a cooler
};

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = join(d, e.name);
  return e.isDirectory() ? walk(p) : (/\.ts$/.test(e.name) ? [p] : []);
});
const files = [...walk('src/proto3d'), 'src/prototype3d.ts'];

const used = new Map();
for (const f of files) {
  const txt = readFileSync(f, 'utf8');
  txt.split('\n').forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    for (const g of line.matchAll(/new THREE\.([A-Za-z]+)Geometry\b/g)) {
      const t = g[1];
      if (!used.has(t)) used.set(t, []);
      used.get(t).push(`${f}:${i + 1}`);
    }
  });
}

const unclassified = [];
const faceted = [];
for (const [t, sites] of [...used.entries()].sort()) {
  const isRound = ROUND.includes(t);
  const isFlat = FLAT_OK.includes(t) || HAND_BUILT.includes(t);
  const onPurpose = Object.prototype.hasOwnProperty.call(FACETED_ON_PURPOSE, t);
  if (isRound || isFlat) continue;
  if (onPurpose) { faceted.push([t, sites]); continue; }
  unclassified.push([t, sites]);
}

console.log(`\n  ROUND_GEO votes on: ${ROUND.join(', ')}`);
console.log(`  declared flat:      ${FLAT_OK.join(', ')}`);
console.log(`  hand-built:         ${HAND_BUILT.map((h) => h + 'Geometry').join(', ')}`);
console.log(`  geometry types used in the prop kits: ${used.size}`);

if (faceted.length) {
  console.log('\n  FACETED ON PURPOSE — each of these must be a rock or a crystal,');
  console.log('  never a dome. A polyhedron used as a rounded form takes the smooth');
  console.log('  material by vote and renders hard anyway, which is invisible to');
  console.log('  every material-reading probe:');
  for (const [t, sites] of faceted)
    console.log(`   · ${t}Geometry — ${FACETED_ON_PURPOSE[t]}\n       ${sites.slice(0, 6).join('\n       ')}${sites.length > 6 ? `\n       …and ${sites.length - 6} more` : ''}`);
}

if (unclassified.length) {
  for (const [t, sites] of unclassified)
    fails.push(`${t}Geometry is used at ${sites[0]} and is in neither ROUND_GEO nor the declared-flat list — mergedProp is guessing`);
  console.log('');
  for (const [t, sites] of unclassified)
    console.log(`   ✗ ${t}Geometry unclassified — ${sites.length} site(s), first ${sites[0]}`);
}

// the census
const perFile = new Map();
for (const [t, sites] of used.entries()) {
  if (!Object.prototype.hasOwnProperty.call(FACETED_ON_PURPOSE, t)) continue;
  for (const s2 of sites) {
    const f = s2.slice(0, s2.lastIndexOf(':'));
    perFile.set(f, (perFile.get(f) || 0) + 1);
  }
}
console.log('\n  FACETED CENSUS — a new one is a question nobody asked:');
for (const [f, n] of [...perFile.entries()].sort()) {
  const budget = FACETED_BUDGET[f];
  const ok = budget !== undefined && n <= budget;
  console.log(`   ${ok ? '·' : '✗'} ${String(n).padStart(2)} in ${f}${budget === undefined ? '  (never reviewed)' : n < budget ? `  (budget ${budget} — fewer now, lower it)` : ''}`);
  if (budget === undefined)
    fails.push(`${n} faceted-polyhedron use(s) in ${f} that nobody has reviewed — each must be a rock or a crystal, never a rounded form`);
  else if (n > budget)
    fails.push(`${f} has ${n} faceted-polyhedron uses against a reviewed budget of ${budget} — look at the new one and ask whether it is a rock or a dome`);
}

console.log('\n  ' + (fails.length ? 'FAIL — ' + fails.join('; ')
  : 'PASS — every geometry type is classified, and no unreviewed faceted form has appeared') + '\n');
process.exit(fails.length ? 1 : 0);
