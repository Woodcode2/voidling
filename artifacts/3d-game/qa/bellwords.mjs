// ── WORLD 6 SAYS BELLCLOUD HEIGHTS, EVERYWHERE A CHILD READS IT ─────────────
//
//   node qa/bellwords.mjs               # the working tree
//   node qa/bellwords.mjs --rev=<sha>   # any commit, read through `git show`
//
// Static: reads files, runs no browser. docs/BELLCLOUD.md §9 (the WORDS half).
//
// The owner renamed world 6 on 2026-09-25: SKYLARK FIELD, a balloon meet on an
// airfield, became BELLCLOUD HEIGHTS, a kingdom on the clouds with a great bell
// at its heart. The internal id stays 'skylark' — saves, unlocks, sticker and
// season ids and probe arguments all key on it — so a grep for "skylark" cannot
// tell a leftover from a correct id. This reads the child-facing rows by name
// instead, and fails if any of them still describes the airfield.
//
// WHY A PROBE AND NOT A GREP ONCE: the rename touches nine surfaces in eight
// files, two of which (prototype3d.ts, index.html) another team is editing the
// same week. A merge that resolves one hunk the wrong way puts "THE WHALE IS
// GOING UP!!" back over a world with no whale, and nothing else would notice:
// newsstyle meters the voice, not the vocabulary, and passes either way.
//
// THE BARS
//   (a) the name: WORLD_NAMES, the unlock label, the scrapbook tab and the
//       picker card all say BELLCLOUD HEIGHTS; the store description names it
//   (b) dot 3 asks for the Great Bell: LEVEL_SPEC.skylark.landmark is the tag
//       the WORLD builder's prop carries, 'great bell' (§5.2)
//   (c) no child-facing world-6 string uses the airfield's words — the whale,
//       the runway, Mr Pym, the hangars, the bacon van, the notams. The bird
//       (a skylark) and the balloons stay: visitors still arrive by balloon.
//
// A row that cannot be found THROWS (GOVERNOR rule 4): silently skipping a
// moved table is the same bug as not checking it.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const rev = (process.argv.find((a) => a.startsWith('--rev=')) || '').slice(6);
const read = (p) => rev
  ? execFileSync('git', ['show', `${rev}:./${p}`], { encoding: 'utf8', maxBuffer: 64 << 20 })
  : fs.readFileSync(p, 'utf8');

/** `[start, end)` of `const NAME … = <literal>` by bracket matching, skipping
 *  strings and // comments (the same scanner qa/newsstyle.mjs uses). */
function block(src, name, file) {
  const m = new RegExp(`^\\s*(?:export )?const ${name}(?::[^=]*)?\\s*=\\s*`, 'm').exec(src);
  if (!m) throw new Error(`bellwords: ${file} has no declaration for ${name} — the row moved`);
  return bracketFrom(src, m.index + m[0].length, `${file} ${name}`);
}
function bracketFrom(src, i0, what) {
  let i = i0, depth = 0, q = '', esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (q) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === q) q = ''; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) i = src.length; continue; }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') { if (--depth === 0) return src.slice(i0, i + 1); }
  }
  throw new Error(`bellwords: unbalanced brackets reading ${what}`);
}
/** the `skylark: { … }` or `skylark: [ … ]` entry inside a table's text */
function entry(tableText, key, what) {
  const m = new RegExp(`\\b${key}:\\s*[\\[{]`).exec(tableText);
  if (!m) throw new Error(`bellwords: ${what} has no ${key} entry`);
  return bracketFrom(tableText, m.index + m[0].length - 1, what);
}
/** every quoted literal, comments skipped */
function strs(b) {
  const out = [];
  for (let i = 0; i < b.length; i++) {
    if (b[i] === '/' && b[i + 1] === '/') { i = b.indexOf('\n', i); if (i < 0) break; continue; }
    const q = b[i];
    if (q !== "'" && q !== '"') continue;
    let s = '';
    for (i++; i < b.length && b[i] !== q; i++) s += b[i] === '\\' ? b[++i] : b[i];
    out.push(s);
  }
  return out;
}
const strField = (text, field, what) => {
  const m = new RegExp(`\\b${field}:\\s*'((?:[^'\\\\]|\\\\.)*)'`).exec(text);
  if (!m) throw new Error(`bellwords: ${what} has no ${field}`);
  return m[1];
};

const fails = [];
const ok = (m) => console.log(`  ok   ${m}`);
const bad = (m) => { fails.push(m); console.log(`  BAD  ${m}`); };
const NAME = 'BELLCLOUD HEIGHTS';

const P3 = read('src/prototype3d.ts');
const HTML = read('index.html');
const UNL = read('src/game/unlocks.ts');
const STK = read('src/game/stickers.ts');
const SEA = read('src/game/seasons.ts');
const NEWS = read('src/proto3d/newsroom_skylark.ts');
const REACT = read('src/proto3d/newsroom_react.ts');
const STORE = read('APPSTORE.md');

// ── (a) THE NAME ─────────────────────────────────────────────────────────────
console.log(`bellwords${rev ? ` @ ${rev}` : ''}\n(a) the name`);
const names = {
  'WORLD_NAMES (title card, document.title)': strField(block(P3, 'WORLD_NAMES', 'prototype3d.ts'), 'skylark', 'WORLD_NAMES'),
  'WORLD_LABEL ("finish X to unlock")': strField(block(UNL, 'WORLD_LABEL', 'unlocks.ts'), 'skylark', 'WORLD_LABEL'),
  'the scrapbook tab': strField(block(P3, 'NAMES', 'prototype3d.ts renderBook'), 'skylark', 'renderBook NAMES'),
};
const card = /data-world="skylark">[\s\S]*?<b>([^<]*)<\/b><span>([^<]*)<\/span>/.exec(HTML);
if (!card) throw new Error('bellwords: index.html has no skylark picker card with <b>/<span>');
names['the picker card'] = card[1];
for (const [where, v] of Object.entries(names)) {
  if (v.replace(/^\S*\p{Extended_Pictographic}\S*\s*/u, '') === NAME) ok(`${where}: "${v}"`);
  else bad(`${where} says "${v}", not ${NAME}`);
}
const desc = /\*\*\w+ worlds\*\*[^\n]*\n[^\n]*/.exec(STORE)?.[0] ?? '';
if (/Bellcloud Heights/.test(desc) && !/Skylark Field/i.test(desc)) ok('APPSTORE.md description names Bellcloud Heights');
else bad(`APPSTORE.md's description does not name Bellcloud Heights: "${desc.replace(/\s+/g, ' ').trim()}"`);

// ── (b) DOT 3 ────────────────────────────────────────────────────────────────
console.log('(b) dot 3');
const lvl = entry(block(P3, 'LEVEL_SPEC', 'prototype3d.ts'), 'skylark', 'LEVEL_SPEC');
const landmark = strField(lvl, 'landmark', 'LEVEL_SPEC.skylark');
if (landmark === 'great bell') ok(`LEVEL_SPEC.skylark.landmark is '${landmark}', so dot 3 reads EAT THE GREAT BELL`);
else bad(`LEVEL_SPEC.skylark.landmark is '${landmark}', not 'great bell' (the Great Bell's asLandmark tag, BELLCLOUD.md §5.2)`);

// ── (c) NO AIRFIELD WORDS ────────────────────────────────────────────────────
console.log('(c) the airfield is gone from what a child reads');
// Word-bounded, so 'the skylark' (the bird) and 'hangs' pass; 'hangar' does not.
const AIRFIELD = /\b(skylark field|whales?|g-wail|runways?|pym|balloonmeister|bacon|hangars?|airfield|notams?|windsocks?|anemometer|met balloon|flea market|launch field|launch circle|arrivals field|breakfast row|the rough|briefing|tannoy|zero-nine|09)\b/i;
const surfaces = [];
const push = (where, list) => surfaces.push([where, list]);
const copy = entry(block(P3, 'WORLD_COPY', 'prototype3d.ts'), 'skylark', 'WORLD_COPY');
push('WORLD_COPY.skylark', strs(copy));
push('SKYLARK_BEATS (text fields)', strs(block(P3, 'SKYLARK_BEATS', 'prototype3d.ts'))
  .filter((s) => !/^rgba|^skylark\.|^(sheep|whale)$/.test(s)));   // colours, ids and cue names are not copy
const mid = entry(block(P3, 'MID_POOL', 'prototype3d.ts'), 'skylark', 'MID_POOL');
push('MID_POOL.skylark (text fields)', strs(mid).filter((s) => !/^rgba|^skylark\./.test(s)));
push('WORLD_COPY.skylark.place', [strField(copy, 'place', 'WORLD_COPY.skylark')]);
for (const n of ['SKYLARK_BRAND', 'SIGN_ON', 'MORNING', 'T0_GENERAL', 'T1_GENERAL', 'T2_GENERAL',
  'T0_BY_DIST', 'T1_BY_DIST', 'T2_BY_DIST', 'MEAL_HOUSE', 'MEAL_CAR', 'MEAL_BIG', 'MEAL_SMALL',
  'LIVE', 'SIGN_OFF', 'DIST_NAME', 'SKYLARK_VOICE_AMBIENT', 'SKYLARK_VOICE_PANIC']) {
  push(`newsroom_skylark ${n}`, strs(block(NEWS, n, 'newsroom_skylark.ts')));
}
push('newsroom_react SKYLARK', strs(block(REACT, 'SKYLARK', 'newsroom_react.ts')));
const midReact = block(REACT, 'MID_REACT', 'newsroom_react.ts');
for (const k of ['skylark.crown', 'skylark.bacon']) {
  const m = new RegExp(`'${k.replace('.', '\\.')}':\\s*\\[`).exec(midReact);
  if (!m) throw new Error(`bellwords: MID_REACT has no '${k}' pool`);
  push(`MID_REACT ${k}`, strs(bracketFrom(midReact, m.index + m[0].length - 1, k)));
}
// stickers: name, where and hint are what the book shows; ids are save keys
const stickerText = (tbl) => [...block(STK, tbl, 'stickers.ts').matchAll(/\b(name|where|hint): (['"])((?:(?!\2)[^\\]|\\.)*)\2/g)].map((m) => m[3]);
push('stickers SKYLARK (name/where/hint)', stickerText('SKYLARK'));
push('stickers NIGHTGLOW (name/where/hint)', stickerText('NIGHTGLOW'));
const season = /\{ id: 'nightglow'[\s\S]*?line: '([^']*)' \}/.exec(SEA);
if (!season) throw new Error('bellwords: seasons.ts has no nightglow row');
push('season nightglow (name/line)', [strField(season[0], 'name', 'nightglow'), season[1]]);
push('the picker card tagline', [card[2]]);

let lines = 0;
for (const [where, list] of surfaces) {
  if (!list.length) throw new Error(`bellwords: ${where} read as empty — the scanner lost the row`);
  lines += list.length;
  const hits = list.filter((s) => AIRFIELD.test(s));
  if (hits.length) bad(`${where}: ${hits.length} of ${list.length} still describe the airfield, e.g. "${hits[0]}"`);
  else ok(`${where}: ${list.length} line(s)`);
}

console.log(fails.length
  ? `\nFAIL — bellwords: ${fails.length} surface(s) of world 6 still read as the airfield (${lines} lines read)`
  : `\nPASS — bellwords: world 6 is BELLCLOUD HEIGHTS on every surface a child reads (${lines} lines read)`);
process.exit(fails.length ? 1 : 0);
