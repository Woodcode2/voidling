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

const FILES = ['src/prototype3d.ts', 'src/proto3d/island.ts', 'src/proto3d/life.ts'];

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
for (const x of findings) {
  console.log(`  ✗ ${x.f}:${x.line}  ${x.name} is missing ${x.missing.join(', ')}`);
}

console.log('');
console.log(findings.length
  ? `FAIL — ${findings.length} per-world table(s) do not know every world; each one falls back to another world's row or to undefined, silently`
  : `PASS — every per-world table covers all ${ALL_WORLDS.length} worlds`);
process.exit(findings.length ? 1 : 0);
