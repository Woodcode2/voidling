// WORLDREG — a world the game can render is a world every per-world table knows.
//
// Adding a world means writing its land, its props, its crowd and its newsroom
// — and then remembering to add a row to a dozen unrelated tables scattered
// across two files. The remembering is the part that fails, and it fails
// SILENTLY, because every one of those tables has a `?? maple` fallback or an
// `undefined` that reads as a default. SKYLARK FIELD shipped its land, its kit,
// its crowd and its newsroom and was still missing FIVE rows:
//
//   WORLD_PAR       undefined -> rivals.ts falls back to the OLD scale-invariant
//                   ladder that nine tuning attempts failed to fix. World 6's
//                   rivals would behave unlike every other world's, and the
//                   only symptom is a difficulty curve nobody measured.
//   MED_BY_WORLD    undefined -> ?? MED_BY_WORLD.maple. A child on an airfield
//   HARD_BY_WORLD   gets Maple's chips. This is the exact bug qa/questable.mjs
//                   was written for after it shipped three times (Lantern drew
//                   'cars' on a level with zero cars, 149 days a year).
//   CARD_ART        no poster.
//   CARD_FALLBACK   no gradient behind the poster that isn't there.
//
// None of these is a crash, which is why none of them was noticed. The tables
// are found BY SHAPE — any `const NAME: Record<...>` or object literal keyed by
// world ids — so a table added next round is covered the day it lands, without
// this file being edited.
//
//   node qa/worldreg.mjs
import fs from 'node:fs';
import { ALL_WORLDS } from './worlds.mjs';

const FILES = ['src/prototype3d.ts', 'src/proto3d/island.ts', 'src/proto3d/life.ts',
  'src/game/unlocks.ts', 'src/game/stickers.ts', 'src/game/seasons.ts'];

/** [start,end) of a declaration's initialiser, bracket-matched through strings,
 *  template literals and both comment forms — a table holding a headline with a
 *  brace in it truncates any regex that tries this. */
function declBody(src, at) {
  let i = at, d = 0, inS = false, esc = false, q = '';
  for (; i < src.length; i++) {
    const c = src[i];
    if (inS) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === q) inS = false; continue; }
    if (c === "'" || c === '"' || c === '`') { inS = true; q = c; continue; }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) i = src.length; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c === '[' || c === '{' || c === '(') d++;
    else if (c === ']' || c === '}' || c === ')') { if (--d === 0) return src.slice(at, i + 1); }
  }
  return src.slice(at);
}

/** Comments are where a table EXPLAINS which worlds it covers ("'big' on Powder
 *  is removed, because those are honest absences"). Counting a world id out of
 *  prose as a table row is how a probe reports a hole as filled, so strip them
 *  before looking for keys. */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

// A world id at the head of a property — `skylark:` or `'skylark':` — and not
// part of a longer identifier like `skylarkBeats:`.
const keyRe = (w) => new RegExp(`(^|[^A-Za-z0-9_$'"])['"]?${w}['"]?\\s*:`, 'm');

// ── OWED, NAMED, AND VISIBLE EVERY RUN ─────────────────────────────────────
// A gap that cannot be closed from here is recorded rather than hidden or
// silently passed. The rule this repo already runs on (qa/placement.baseline
// .json's frozen ceiling, roundlod's frozen 154): the debt is stated, it is
// printed on every run, and it can only ever shrink. An entry here needs the
// table, the world, and a reason that is a FACT about the environment — never
// "not done yet", which is what the rest of the probe is for.
const OWED = [
  { name: 'CARD_ART', world: 'skylark',
    why: 'the poster is painted (two takes, nano_banana_pro, 3:4) and CANNOT BE '
       + 'VENDORED FROM THIS ENVIRONMENT: scripts/asset-refs.mjs requires every '
       + '/assets/hf/ reference to exist on disk, and the origin it fetches from '
       + '(d8j0ntlcm91z4.cloudfront.net) is refused by this container\'s network '
       + 'policy -- the proxy answers 403 to CONNECT, on every retry. The card is '
       + 'not blank meanwhile: CARD_FALLBACK paints skylark\'s own dawn amber, '
       + 'balloon violet and morning blue, which is exactly what that table was '
       + 'written for. The two takes are recorded in the CARD_ART comment; '
       + 'vendoring them is one curl in an environment that can reach the CDN.' },
];

const findings = [];
let tables = 0;

for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  const decl = /^(?:export )?const ([A-Za-z_][A-Za-z0-9_]*)\s*(?::[^=\n]*)?=\s*[{[]/gm;
  let m;
  while ((m = decl.exec(src))) {
    const at = src.indexOf(src[m.index + m[0].length - 1], m.index + m[0].length - 1);
    const body = stripComments(declBody(src, at));
    const have = ALL_WORLDS.filter((w) => keyRe(w).test(body));
    // A TABLE IS ONE THAT MEANS TO COVER THE WORLDS. Two worlds named on
    // purpose is a pair, not a per-world table; a table holding all but one or
    // two is the rot. The bar is "most of them", which is what every real
    // per-world table in this tree looks like and what no incidental pair does.
    if (have.length < ALL_WORLDS.length - 2) continue;
    tables++;
    const missing = ALL_WORLDS.filter((w) => !have.includes(w));
    if (missing.length) {
      const line = src.slice(0, m.index).split('\n').length;
      findings.push({ f, line, name: m[1], missing });
    }
  }
}

// ── TWO SHAPES THAT ARE NOT KEYED TABLES, AND BOTH GATE THE WHOLE GAME ─────
// The keyed-table scan above misses an ORDERED LIST and a TYPE UNION, and
// world 6 was missing from both:
//
//   WORLD_ORDER (src/game/unlocks.ts) IS THE UNLOCK LADDER. completeWorld()
//   returns null for the last entry — "no world after the last" — so with
//   skylark off the end, finishing POWDER PASS opened nothing and
//   isUnlocked('skylark') was false forever. World 6 was built, lit, populated,
//   given a crowd, a newsroom and twelve stickers, and could not be reached by
//   PLAYING. Every probe that force-writes voidUnlocked sails straight past it.
//
//   The unions — WorldKey, Sticker.world, SeasonEvent.world — are what tsc
//   checks new rows against, so a union missing a world turns "add world 6
//   here" into a type error and quietly invites the next author to skip it.
for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  const clean = stripComments(src);

  // an ordered list of world ids: ['maple', 'pirate', ...]
  for (const m of clean.matchAll(/\[\s*'[a-z0-9]+'(?:\s*,\s*'[a-z0-9]+')*\s*,?\s*\]/g)) {
    const ids = [...m[0].matchAll(/'([a-z0-9]+)'/g)].map(([, w]) => w);
    if (!ids.every((w) => ALL_WORLDS.includes(w))) continue;
    if (ids.length < ALL_WORLDS.length - 2) continue;
    tables++;
    const missing = ALL_WORLDS.filter((w) => !ids.includes(w));
    if (missing.length) {
      const line = src.slice(0, src.indexOf(m[0])).split('\n').length;
      findings.push({ f, line, name: 'world list', missing });
    }
  }

  // a type union of world ids: 'maple' | 'pirate' | ...
  for (const m of clean.matchAll(/'[a-z0-9]+'(?:\s*\|\s*'[a-z0-9]+')+/g)) {
    const ids = [...m[0].matchAll(/'([a-z0-9]+)'/g)].map(([, w]) => w);
    if (!ids.every((w) => ALL_WORLDS.includes(w))) continue;
    if (ids.length < ALL_WORLDS.length - 2) continue;
    tables++;
    const missing = ALL_WORLDS.filter((w) => !ids.includes(w));
    if (missing.length) {
      const line = src.slice(0, src.indexOf(m[0])).split('\n').length;
      findings.push({ f, line, name: 'world union', missing });
    }
  }
}

// ── THE SCORE IS AN IF-CHAIN, WHICH NO TABLE SCAN CAN SEE ──────────────────
// audio3d.ts picks a world's music with a chain that ENDS IN MAPLE:
//
//     isPirate() ? startTropical : isGameday() ? ... : isPowder() ? ... : startTown
//
// A world missing from it does not fail, it inherits — so SKYLARK FIELD, a
// dawn balloon meet, played MAPLE FALLS's sleepy-autumn-town score, and the
// music slot next to it meant a licensed skylark.mp3 dropped into public/
// would have been ignored too. Nothing is keyed, nothing is a table, and every
// probe stayed green.
//
// The check is deliberately crude — the world's own guard `isSkylark()` must
// appear in the file — because the failure it catches is total absence, and
// a chain that names a world is a chain somebody thought about.
const AUDIO = 'src/proto3d/audio3d.ts';
if (fs.existsSync(AUDIO)) {
  const a = stripComments(fs.readFileSync(AUDIO, 'utf8'));
  // maple is the terminal fallback by design and has no is-guard of its own
  const named = ALL_WORLDS.filter((w) => w !== 'maple');
  const missing = named.filter((w) => !new RegExp(`is${w[0].toUpperCase()}${w.slice(1)}\\s*\\(`).test(a));
  tables++;
  if (missing.length) findings.push({ f: AUDIO, line: 0, name: 'the score if-chain', missing });
}

// ── THE PICKER IS MARKUP, NOT CODE ─────────────────────────────────────────
// index.html carries the world cards as five (now six) hand-written <div>s, and
// this is the world list that MATTERS MOST: it is the surface. SKYLARK FIELD
// had its land, kit, crowd, newsroom, lighting rig, WorldId entry and copy —
// and no card. A child could not pick world 6, and no browser probe could
// reach it either: qa/newsfeed.mjs and qa/purpose.mjs each clicked a selector
// that matched nothing, then sat on a 400-600 second timeout and died. Two
// probe failures whose real cause was a missing div.
const HTML = 'index.html';
if (fs.existsSync(HTML)) {
  const html = fs.readFileSync(HTML, 'utf8');
  const cards = new Set([...html.matchAll(/data-world="([a-z0-9]+)"/g)].map(([, w]) => w));
  const missing = ALL_WORLDS.filter((w) => !cards.has(w));
  if (missing.length) findings.push({ f: HTML, line: 0, name: '#worldRow cards', missing });
  tables++;
}

console.log(`the game renders ${ALL_WORLDS.length} worlds: ${ALL_WORLDS.join(', ')}`);
console.log(`found ${tables} per-world table(s) across ${FILES.length} files, plus the picker markup`);
// An OWED entry excuses exactly one world in exactly one table, and only while
// it is still actually missing — the day it is filled the entry is dead weight
// and this says so, so the debt cannot outlive its reason.
const owedHit = new Set();
const real = [];
for (const x of findings) {
  const kept = [];
  for (const w of x.missing) {
    const o = OWED.find((e) => e.name === x.name && e.world === w);
    if (o) owedHit.add(o); else kept.push(w);
  }
  if (kept.length) real.push({ ...x, missing: kept });
}
for (const x of real) {
  console.log(`  ✗ ${x.f}:${x.line}  ${x.name} is missing ${x.missing.join(', ')}`);
}
for (const o of OWED) {
  if (owedHit.has(o)) console.log(`  OWED  ${o.name} / ${o.world}\n        ${o.why.replace(/(.{72}) /g, '$1\n        ')}`);
  else console.log(`  ✗ OWED entry ${o.name}/${o.world} no longer applies — it is filled in. Delete it.`);
}
const stale = OWED.filter((o) => !owedHit.has(o)).length;

console.log('');
const bad = real.length + stale;
console.log(bad
  ? `FAIL — ${real.length} per-world table(s) do not know every world`
    + `${stale ? ` and ${stale} OWED entry/entries no longer apply` : ''}`
    + `; a missing row falls back to another world's numbers or to undefined, silently`
  : `PASS — every per-world table covers all ${ALL_WORLDS.length} worlds`
    + `${OWED.length ? `, with ${OWED.length} owed and named above` : ''}`);
process.exit(bad ? 1 : 0);
