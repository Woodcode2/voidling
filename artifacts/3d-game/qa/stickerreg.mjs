// STICKERREG — every world the game renders hides things worth finding.
//
// The Scrapbook is a per-world collection, and the world picker sells it: each
// card's badge reads "✨ N SECRETS" for a world nobody has played, and the
// comment on that line calls the secrets "the invitation". So a world with no
// stickers ships a card whose invitation reads ✨ 0 SECRETS.
//
// That is what SKYLARK FIELD was going to do. src/game/stickers.ts exports
//
//     STICKERS = [...MAPLE, ...PIRATE, ...GAMEDAY, ...LANTERN, ...POWDER, ...]
//
// — a hand-written spread of five arrays, one per world, and world 6 was not in
// it. Nothing anywhere would have said so: totalCount('skylark') returns 0, the
// badge renders, the book opens on an empty page, and every probe stays green.
//
// The same list found POWDER PASS half-registered one world earlier: SNOW DAY
// is a declared season with ZERO seasonal stickers, while all four older
// seasons carry exactly four. A season with no stickers is a ribbon and a
// palette swap — the seasonal gate in stickers.ts exists to make a season
// something you can HUNT, and world 5 shipped without that half.
//
// Three bars, all static:
//   permanent  every rendered world has at least MIN_PER_WORLD of its own
//   seasonal   every season in EVENTS has stickers, and the same number as its
//              siblings, so one world's season is not thinner than another's
//   districts  every sticker's `biome` is a district its own world actually
//              has, so the placer cannot be handed a district that is not there
//
//   node qa/stickerreg.mjs
import fs from 'node:fs';
import { ALL_WORLDS } from './worlds.mjs';

const src = (f) => fs.readFileSync(f, 'utf8');
const STK = src('src/game/stickers.ts');
const SEA = src('src/game/seasons.ts');
const ISL = src('src/proto3d/island.ts');
const PROTO = src('src/prototype3d.ts');
const SKY = fs.existsSync('src/proto3d/skylark.ts') ? src('src/proto3d/skylark.ts') : '';

const MIN_PER_WORLD = 12;   // POWDER PASS, the leanest shipped world, carries 12

// Each sticker is one object literal. Brace-matched from each `{ id:` rather
// than regexed with a lookahead — a first pass used `id: 'X' ... event: 'Y'`
// inside a 600-character window and happily attributed the NEXT sticker's
// season to the one before it, which reported maple with 5 harvest stickers
// and powder with 1 snowday sticker. A parser that can read a field off the
// wrong object is not evidence about anything.
function literals(src) {
  const out = [];
  for (const m of src.matchAll(/\{\s*id:\s*'[^']+'/g)) {
    let i = m.index, d = 0, q = '', esc = false;
    for (; i < src.length; i++) {
      const c = src[i];
      // BOTH QUOTE KINDS, and remember WHICH opened the string. Tracking only
      // `'` desynchronises on the first double-quoted name that contains an
      // apostrophe — `name: "Instructor Bo's Bobble"` — after which every
      // brace is counted inside a string that never closes. That is not a
      // hypothetical: it made this probe read the last POWDER sticker as
      // carrying maple's `harvest` season, and report powder 11+1 and harvest
      // 5. Two wrong numbers from one unhandled apostrophe.
      if (q) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === q) q = ''; continue; }
      if (c === "'" || c === '"' || c === '`') { q = c; continue; }
      if (c === '{') d++;
      else if (c === '}') { if (--d === 0) { i++; break; } }
    }
    out.push(src.slice(m.index, i));
  }
  return out;
}
const field = (lit, name) => (new RegExp(`\\b${name}:\\s*'([^']*)'`).exec(lit) ?? [])[1];

const stickers = literals(STK)
  .filter((l) => field(l, 'world') && field(l, 'biome'))
  .map((l) => ({ id: field(l, 'id'), world: field(l, 'world'),
    event: field(l, 'event'), biome: field(l, 'biome') }));

const seasons = [...SEA.matchAll(/\{\s*id:\s*'([a-z0-9]+)',\s*world:\s*'([a-z0-9]+)'/g)]
  .map(([, id, world]) => ({ id, world }));

// THE DISTRICTS A WORLD ACTUALLY HAS — which is NOT the same as its biomes.
// placeStickers() rejects a point unless distOf(x,z) === sticker.biome, and
// distOf maps a raw biome through MAPLE_DIST / GAMEDAY_DIST first. So Maple's
// stickers legitimately name 'mainst' and 'burb', which are not in the Biome
// union at all — a first version of this check called all nine of them broken.
// The valid set for a world is therefore the IMAGE of its map, plus the raw
// biomes for the worlds that speak in biome ids already.
//
// It matters because the failure is SILENT: `if (!put) continue;  // this world
// has no such district — skip, never crash`. A sticker naming a district that
// does not exist is simply never placed, and the book keeps its empty cell.
const mapValues = (name) => new Set([...(new RegExp(`const ${name}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`).exec(PROTO)?.[1] ?? '')
  .matchAll(/:\s*'([a-z0-9]+)'/g)].map(([, v]) => v));
// skylark's districts come from its SkBiome UNION, not from its region
// literals. Two of its nine — the runway strips and the perimeter track — are
// not polygons at all; skRegionAt tests them geometrically before it walks
// SK_REGIONS, because a strip is not a polygon. Reading the literals found
// seven districts and called three of world 6's own stickers broken.
const skDistricts = new Set([...(/export type SkBiome =([^;]+);/.exec(SKY)?.[1] ?? '')
  .matchAll(/'([a-z0-9]+)'/g)].map(([, d]) => d));
const allBiomes = new Set([...(/export type Biome =([^;]+);/.exec(ISL)?.[1] ?? '')
  .matchAll(/'([a-z0-9]+)'/g)].map(([, b]) => b));
const districtsFor = (w) => {
  if (w === 'skylark') return skDistricts;
  if (w === 'maple') return new Set([...allBiomes, ...mapValues('MAPLE_DIST')]);
  if (w === 'gameday') return new Set([...allBiomes, ...mapValues('GAMEDAY_DIST')]);
  return allBiomes;
};

const bad = [];

// ── 1. every rendered world has its own permanent set ──────────────────────
console.log(`the game renders ${ALL_WORLDS.length} worlds, and hides ${stickers.length} stickers`);
for (const w of ALL_WORLDS) {
  const mine = stickers.filter((s) => s.world === w);
  const perm = mine.filter((s) => !s.event);
  const seas = mine.filter((s) => s.event);
  const ok = perm.length >= MIN_PER_WORLD;
  console.log(`  ${ok ? 'ok  ' : '✗   '} ${w.padEnd(9)} ${String(perm.length).padStart(2)} permanent`
    + `${seas.length ? ` + ${seas.length} seasonal` : ''}`);
  if (!ok) {
    bad.push(`${w} hides ${perm.length} sticker(s), floor ${MIN_PER_WORLD}`
      + ` — its card would invite a child with "✨ ${perm.length} SECRETS"`);
  }
}

// ── 2. every season is something you can hunt ──────────────────────────────
const counts = seasons.map((e) => stickers.filter((s) => s.event === e.id).length);
const want = Math.max(0, ...counts);
console.log('');
for (const e of seasons) {
  const n = stickers.filter((s) => s.event === e.id).length;
  console.log(`  ${n === want ? 'ok  ' : '✗   '} ${e.id.padEnd(11)} ${e.world.padEnd(9)} ${n} seasonal sticker(s)`);
  if (n !== want) {
    bad.push(`season ${e.id} (${e.world}) has ${n} sticker(s) against ${want} for every other season`
      + ' — a season nobody can hunt is a ribbon and a palette swap');
  }
}

// ── 3. no sticker hides in a district that does not exist ──────────────────
for (const s of stickers) {
  const known = districtsFor(s.world);
  if (known.size && !known.has(s.biome)) {
    bad.push(`sticker ${s.id} (${s.world}) hides in district '${s.biome}', which that world does not have`);
  }
}

console.log('');
for (const b of bad) console.log(`  ✗ ${b}`);
console.log('');
console.log(bad.length
  ? `FAIL — ${bad.length} problem(s): a world or a season that hides nothing ships a book of empty cells`
  : `PASS — every world hides at least ${MIN_PER_WORLD} stickers, every season hides ${want}, and every sticker's district exists`);
process.exit(bad.length ? 1 : 0);
