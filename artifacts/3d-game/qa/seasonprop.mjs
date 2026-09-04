// ── EVERY SEASON HAS ITS OWN PROP ───────────────────────────────────────────
//
//   node qa/seasonprop.mjs
//
// src/game/seasons.ts declares one limited-time event per world. Fourteen days
// a year that world's picker card carries a ribbon, and scatterSeasonProps()
// dresses the island with 44 little seasonal objects. Which object it dresses
// it with is chosen by an IF-CHAIN in makeSeasonProp() (src/prototype3d.ts),
// and the chain ends in an `else` rather than a default.
//
// So the day a FIFTH world was added, this happened and nothing said so:
//
//     seasons.ts        { id: 'snowday', world: 'powder', from [12,18] to [1,4] }
//     prototype3d.ts    harvest? regatta? homecoming? ELSE → a moon lantern
//
// Powder Pass — a snow valley at blue dusk — has been scattering forty-four of
// LANTERN NIGHT's warm paper moon lanterns across its drifts from 18 December
// to 4 January. seasons.ts's own header still says "sized to four worlds".
//
// This is the exact shape of failure the world 6 contract was written to stop:
// a table keyed by an if-chain gains no compile error when the game gains a
// world, so the fifth world silently wears the fourth world's clothes. The
// contract counts ~140 such obligations and twelve that a compiler catches.
//
// The bar: EVERY event id in EVENTS has its OWN branch in makeSeasonProp. The
// terminal `else` is a fallback for a corrupt id, not a home for a real season.
import fs from 'node:fs';

const src = (p) => fs.readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

// the declared seasons, with the world each one dresses
const seasons = [...src('game/seasons.ts')
  .matchAll(/\{\s*id:\s*'([a-z]+)',\s*world:\s*'([a-z]+)',\s*name:\s*'([^']+)'/g)]
  .map(([, id, world, name]) => ({ id, world, name }));

// the branches makeSeasonProp actually tests for, and what the else falls to
const body = /function makeSeasonProp[\s\S]*?\n}/.exec(src('prototype3d.ts'))?.[0] ?? '';
if (!body) { console.log('FAIL — seasonprop: makeSeasonProp not found in src/prototype3d.ts'); process.exit(1); }
const branches = [...body.matchAll(/ev\.id === '([a-z]+)'/g)].map(([, id]) => id);
const elseNote = /\/\/\s*([a-z]+)\s*:/.exec(body.slice(body.lastIndexOf('} else {')))?.[1] ?? '(unnamed)';

console.log(`  ${seasons.length} season(s) declared, ${branches.length} branch(es) in makeSeasonProp`);
console.log(`  the terminal else builds: ${elseNote}`);

let bad = 0;
for (const s of seasons) {
  const own = branches.includes(s.id);
  if (!own) bad++;
  console.log(`  ${own ? 'ok  ' : 'FAIL'} ${s.world.padEnd(8)} ${s.id.padEnd(11)} ${s.name}` +
    (own ? '' : `  → falls through to "${elseNote}", which belongs to another world`));
}
// a branch with no season is dead code, and the next world to reuse that id
// inherits a prop nobody chose for it
for (const b of branches) {
  if (!seasons.some((s) => s.id === b)) { bad++; console.log(`  FAIL branch '${b}' has no season in EVENTS`); }
}

console.log(bad
  ? `FAIL — seasonprop: ${bad} season(s) wearing another world's prop`
  : `PASS — seasonprop: every declared season has its own prop, and every prop has its season`);
if (bad) process.exitCode = 1;
