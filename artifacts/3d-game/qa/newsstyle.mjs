// ── THE HOUSE STYLE, ENFORCED ────────────────────────────────────────────────
//
//   node qa/newsstyle.mjs           # every world, every beat
//
// The four newsroom files each open with a HOUSE STYLE box that has always been
// prose: capital at the start, one joke per line, punctuation escalates with
// the beat, {S} only near the end, 78 characters at worst-case token fill.
// Prose does not fail a build. This does.
//
// It exists because of a specific complaint about a specific shipped line:
//
//     'It ate {M}. Nobody saw a thing. Everybody saw it happen.'
//
// Abstract, no concrete noun, and it contradicts itself for a rhythm rather
// than a joke. It was not an outlier — it was the corpus average. Measured
// across every ticker pool before the rewrite: 57% of lines in MAPLE FALLS were
// exactly two sentences, the LIVE pool ran to 71%, and in ~1,500 lines across
// four worlds there was not ONE question mark. Read three in a row and you hear
// a metronome, which is what the owner heard: "the news is so bad. The style.
// The two sentences."
//
// So the shape of the corpus is now a checked property, not a hope:
//   - at most 45% of a world's arc lines may be exactly two sentences
//   - at least 35% must be a single sentence
//   - some must be real questions
// plus the punctuation ladder, the token vocabulary, and the length cap.
//
// SCOPE. SIGN_ON, the three GENERAL tiers, SIGN_OFF, LIVE and the four per-meal
// pools — the guaranteed beats plus the two pools that carry every {M}/{D}/{P}
// token and, by the picker's own weighting, half of everything aired. The
// per-district pools are the one gap: 767 lines, and the healthiest of the
// bunch when measured (40-52% two-sentence against LIVE's 71%).
import fs from 'node:fs';

const DIR = new URL('../src/proto3d/', import.meta.url);
const F = { maple: 'newsroom_maple.ts', pirate: 'newsroom.ts',
  gameday: 'newsroom_gameday.ts', lantern: 'newsroom_lantern.ts' };

/** [start,end) of `const NAME ... = <literal>;` — bracket-matched, because a
 *  headline containing "];" would truncate any regex that tried this. */
function declSpan(src, name) {
  const m = new RegExp(`^(?:export )?const ${name}(?::[^=]*)?\\s*=\\s*`, 'm').exec(src);
  if (!m) throw new Error(`no declaration for ${name}`);
  let i = m.index + m[0].length, depth = 0, inStr = false, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === "'") inStr = false; continue; }
    if (c === "'") { inStr = true; continue; }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) i = src.length; continue; }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') { if (--depth === 0) { i++; break; } }
  }
  return [m.index, i];
}
/** Every single-quoted literal in a block, scanned rather than matched: these
 *  pools are full of comments, and a comment containing an apostrophe ("the
 *  PA's voice") reads as an opening quote to any regex and swallows the pool. */
function strs(b) {
  const out = [];
  for (let i = 0; i < b.length; i++) {
    if (b[i] === '/' && b[i + 1] === '/') { i = b.indexOf('\n', i); if (i < 0) break; continue; }
    if (b[i] !== "'") continue;
    let s = '';
    for (i++; i < b.length && b[i] !== "'"; i++) s += b[i] === '\\' ? b[++i] : b[i];
    out.push(s);
  }
  return out;
}
const grab = (src, n) => { const [a, b] = declSpan(src, n); return src.slice(a, b); };
const tiersOf = (b) => b.split(/\],\s*\[/).map(strs);

const sentences = (s) => s.split(/(?<=[.!?])\s+/).filter(Boolean).length;
/** the ticker gets the FILLED line, so measure the FILLED length. The call site
 *  clips {F} to 14 and {M} to 22; {D} is not clipped at all, so its worst case
 *  is whatever this world's longest district name happens to be — 14 at Pirate
 *  Bay ("Smugglers Cove"), 20 at Lantern Night ("the teahouse terrace"). Using
 *  one flat number for all four fails lines that are in fact fine. */
const worstFill = (s, dw) => s.replace(/\{M\}/g, 'x'.repeat(22)).replace(/\{F\}/g, 'x'.repeat(14))
  .replace(/\{D\}/g, 'x'.repeat(dw)).replace(/\{[PRS]\}/g, '99');
const longestDistrict = (src) =>
  Math.max(...strs(grab(src, 'DIST_NAME')).map((v) => v.length));

let bad = 0;
const fail = (w, beat, why, line) => {
  bad++; console.log(`  ✗ ${w} ${beat}: ${why}${line ? `\n      ${line}` : ''}`);
};

for (const [w, f] of Object.entries(F)) {
  const src = fs.readFileSync(new URL(f, DIR), 'utf8');
  const dw = longestDistrict(src);
  // `tier` is the beat index the punctuation ladder is keyed on; null means the
  // pool sits outside the ladder (sign-on and sign-off both get one "!").
  const beats = [['sign-on', strs(grab(src, 'SIGN_ON')), null]];
  // LANTERN NIGHT keeps its tiers in three separate consts; the other three
  // share one `Pools` triple, and only they have LIVE and per-meal pools.
  if (w === 'lantern') for (let t = 0; t < 3; t++) beats.push([`tier${t}`, strs(grab(src, `T${t}_GENERAL`)), t]);
  else {
    for (const name of ['GENERAL', 'LIVE', 'MEAL_HOUSE', 'MEAL_CAR', 'MEAL_BIG', 'MEAL_SMALL']) {
      const label = name === 'GENERAL' ? 'tier' : name.replace('MEAL_', 'meal-').toLowerCase() + ' ';
      tiersOf(grab(src, name)).forEach((p, t) => beats.push([`${label}${t}`, p, t]));
    }
  }
  beats.push(['sign-off', strs(grab(src, 'SIGN_OFF')), null]);

  let n = 0, one = 0, two = 0, q = 0;
  console.log('\n' + w);
  for (const [beat, pool, tier] of beats) {
    const maxBang = tier === null ? 1 : tier;
    if (!pool.length) fail(w, beat, 'empty pool', '');
    for (const line of pool) {
      n++;
      const s = sentences(line);
      if (s === 1) one++; else if (s === 2) two++;
      if (line.includes('?')) q++;

      // ── the punctuation ladder IS the arc, felt rather than read ──
      const bangs = (line.match(/!/g) || []).length;
      if (tier === 0 && bangs) fail(w, beat, 'denial carries zero "!"', line);
      else if (tier === 2 && bangs === 1) fail(w, beat, 'panic uses "!!" or nothing, never a lone "!"', line);
      else if (bangs > 2 || (tier !== 2 && bangs > maxBang)) fail(w, beat, `${bangs} "!"`, line);
      if ((line.match(/\?/g) || []).length > 1) fail(w, beat, 'more than one "?"', line);
      if (/\?!|!\?|\.\.\.|—/.test(line)) fail(w, beat, 'banned punctuation', line);
      if (!/^["'(]?[A-Z0-9{]/.test(line)) fail(w, beat, 'does not open with a capital', line);

      // ── the ticker is one line on a phone ──
      const len = worstFill(line, dw).length;
      if (len > 78) fail(w, beat, `${len} chars once the tokens fill`, line);

      // ── an unfillable token reaches the child as literal braces. This is the
      //    mechanism that keeps rival voids out of print; do not weaken it. ──
      for (const [, t] of line.matchAll(/\{([^}]*)\}/g)) {
        if (!/^[DMFPRS]$/.test(t)) fail(w, beat, `unfillable token {${t}}`, line);
      }
      // a countdown at 2:40 remaining is a weather report. Only the last beat.
      if (line.includes('{S}') && tier !== 2) fail(w, beat, '{S} outside the final beat', line);
      // MOST DISTRICT NAMES CARRY THEIR OWN ARTICLE — "the tailgate", "the
      // practice field", "the teahouse terrace"; 25 of the 34 across the four
      // worlds do. So a template that supplies one as well prints "There is no
      // the tailgate to stay with", which is what shipped.
      if (/\b(the|a|an|no)\s+\{D\}/i.test(line)) fail(w, beat, 'article before {D}, which brings its own', line);
    }
    console.log(`  ${beat.padEnd(9)} n=${String(pool.length).padStart(3)}`);
  }
  const pc = (x) => ((100 * x) / n).toFixed(0) + '%';
  console.log(`  ── ${n} lines: 1-sentence ${pc(one)}, 2-sentence ${pc(two)}, questions ${pc(q)}`);
  if (two / n > 0.45) fail(w, 'corpus', `${pc(two)} two-sentence lines, ceiling 45%`, '');
  if (one / n < 0.35) fail(w, 'corpus', `${pc(one)} one-sentence lines, floor 35%`, '');
  if (q < 2) fail(w, 'corpus', `${q} questions in ${n} lines — the metronome is back`, '');
}

console.log(bad ? `\n${bad} problem(s)` : '\nclean');
process.exit(bad ? 1 : 0);
