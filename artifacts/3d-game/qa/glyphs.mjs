// ── THE FIVE MARKS THE FONT DOES NOT HAVE ───────────────────────────────────
//
//   node qa/glyphs.mjs [port] [world]      (both ignored: static, no browser)
//
// Studio round 4, Job 7 (docs/STUDIO-ROUND-4.md): "draw → ▾ ▶ ⌂ from the
// existing <symbol> sheet". Static: reads files, runs no browser, 1.7 s on the
// machine it was written on.
//
// WHY A TEXT ARROW IS A DEFECT AND NOT PUNCTUATION. The game ships Fredoka
// through four @fontsource imports (prototype3d.ts:24-27), and each one is a
// set of @font-face blocks carved into unicode-range SUBSETS. A character that
// falls outside every range is not drawn in Fredoka at all: the browser walks
// its fallback list and lands on the system UI face — a different typeface, a
// different weight, a different optical size, inside our own buttons. index.html
// said so about ✦ → ▾ ✕ in the icon sheet's own header, and the four were still
// on buttons a child taps: CONTINUE →, MY NUMBERS ▾, ▶ KEEP PLAYING, ▶ PLAY on
// all six posters, and ⌂ as the only in-match control.
//
// AND qa/pictograph.mjs SAYS THE OPPOSITE, in writing: "✦ (the coin mark), ✓,
// ★, → and the box-drawing rules are TEXT-presentation glyphs that render in our
// own face". For → that is false, and this file measures why: Fredoka's latin
// subset carries U+2191 and U+2193 — the up and down arrows — and skips U+2192
// between them. The claim is retracted in pictograph's header, pointing here.
//
// SO THE PROBE READS THE FONT, NOT A LIST OF CHARACTERS SOMEBODY BELIEVED. For
// each glyph it first asks the real @fontsource CSS whether any imported weight
// covers it. A glyph the font DOES cover is reported and dropped from the bar,
// because then it is typography and not a fallback.
//
// WHAT IT SCANS, and what it deliberately does not:
//   · index.html markup text and CSS `content:` strings, with <!-- --> and
//     /* */ comments removed — the icon sheet's own header names these glyphs
//     and a child does not read comments;
//   · every string and template literal in every module the game's entry
//     reaches (src/prototype3d.ts and its relative imports, static and dynamic,
//     followed transitively) — parsed with the TypeScript compiler, so a glyph
//     in a comment is never a hit and a glyph in a template is;
//   · NOT console.* arguments: debug output no child sees.
//
// THE BARS
//   (a) every glyph named in the job is outside every Fredoka range the build
//       imports — the premise, measured; a covered glyph leaves the bar
//   (b) no uncovered glyph from (a) appears in user-visible text
//   (c) every <use href="#ic-…"> in the markup and in the modules resolves to a
//       <symbol> that exists — a drawn replacement that points at nothing is
//       an empty box, which is worse than the fallback it replaced
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const die = (m) => { console.log(`\nFAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`glyphs threw: ${String(e && e.message || e).split('\n')[0]}`));
process.on('unhandledRejection', (e) => die(`glyphs rejected: ${String(e && e.message || e).split('\n')[0]}`));

/** The job's four, plus ▴ — the open state of the same MY NUMBERS control,
 *  which prototype3d.ts wrote on the second tap. */
const GLYPHS = [
  ['→', 'CONTINUE / OPEN SHOP / TAKE ME THERE'],
  ['▾', 'MY NUMBERS, closed'],
  ['▴', 'MY NUMBERS, open'],
  ['▶', 'KEEP PLAYING and the six PLAY posters'],
  ['⌂', 'the in-match pause button'],
];
const cp = (ch) => ch.codePointAt(0);
const hex = (n) => 'U+' + n.toString(16).toUpperCase().padStart(4, '0');

let bad = 0, bars = 0;
const bar = (ok, id, msg) => { bars++; console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };
console.log('\n  GLYPHS — the marks the shipped font does not carry\n');

// ── THE FONT, READ FROM THE BUILD'S OWN IMPORTS ──────────────────────────────
const entry = readFileSync('src/prototype3d.ts', 'utf8');
const weights = [...entry.matchAll(/^import\s+'@fontsource\/fredoka\/([\w-]+)\.css';/gm)].map((m) => m[1]);
if (!weights.length) die('found no `import \'@fontsource/fredoka/…css\'` in src/prototype3d.ts — the font moved, so this probe cannot say what it covers');
const ranges = [];
for (const w of weights) {
  const f = `node_modules/@fontsource/fredoka/${w}.css`;
  if (!existsSync(f)) die(`${f} is not on disk — run from artifacts/3d-game with its node_modules installed`);
  const css = readFileSync(f, 'utf8');
  const blocks = [...css.matchAll(/unicode-range:\s*([^;]+);/g)];
  if (!blocks.length) die(`${f} declares no unicode-range — the subset model this probe relies on is gone`);
  for (const b of blocks) {
    for (const part of b[1].split(',')) {
      const m = part.trim().match(/^U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?$/);
      if (!m) die(`${f}: cannot parse unicode-range entry "${part.trim()}"`);
      ranges.push([parseInt(m[1], 16), parseInt(m[2] ?? m[1], 16), w]);
    }
  }
}
const covering = (n) => ranges.filter(([lo, hi]) => n >= lo && n <= hi).map((r) => r[2]);
const barred = [];
for (const [ch, where] of GLYPHS) {
  const by = [...new Set(covering(cp(ch)))];
  if (by.length) console.log(`  ·    ${ch} ${hex(cp(ch))} IS covered by Fredoka ${by.join('/')} — typography, not a fallback; dropped from bar (b)`);
  else { barred.push(ch); console.log(`  ·    ${ch} ${hex(cp(ch))} (${where}) is outside all ${ranges.length} ranges of Fredoka ${weights.join('/')}`); }
}
{
  // the neighbours that prove the arrow finding is the subset, not the parse
  const up = covering(0x2191).length > 0, down = covering(0x2193).length > 0;
  console.log(`  ·    for scale: ${hex(0x2191)} ↑ ${up ? 'covered' : 'NOT covered'}, ${hex(0x2193)} ↓ ${down ? 'covered' : 'NOT covered'}, ${hex(0x2192)} → ${covering(0x2192).length ? 'covered' : 'NOT covered'}`);
}
bar(barred.length > 0, 'a', barred.length
  ? `${barred.length} of ${GLYPHS.length} named glyph(s) fall outside the shipped font: ${barred.join(' ')}`
  : 'every named glyph is covered by the shipped font — this probe has nothing left to guard');

const BAR_RE = new RegExp(`[${barred.join('')}]`, 'u');
const hits = [];

// ── index.html: markup text and CSS content strings, comments removed ────────
const html = readFileSync('index.html', 'utf8');
const lineAt = (s, i) => s.slice(0, i).split('\n').length;
// blank a span without moving any line number: keep every newline
const blank = (s, re) => s.replace(re, (m) => m.replace(/[^\n]/g, ' '));
let h = blank(html, /<!--[\s\S]*?-->/g);
const styles = [];
h = h.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (m, body, off) => {
  styles.push({ body: blank(body, /\/\*[\s\S]*?\*\//g), off: off + m.indexOf(body) });
  return m.replace(/[^\n]/g, ' ');
});
const scripts = [];
h = h.replace(/<script[^>]*>([\s\S]*?)<\/script>/g, (m, body, off) => {
  scripts.push({ body, off: off + m.indexOf(body) });
  return m.replace(/[^\n]/g, ' ');
});
for (const s of styles) {
  for (const m of s.body.matchAll(/content:\s*(['"])(.*?)\1/g)) {
    if (BAR_RE.test(m[2])) hits.push(`index.html:${lineAt(html, s.off + m.index)} CSS content ${JSON.stringify(m[2])}`);
  }
}
// text between tags. Attribute values are skipped: title and aria-label are
// not drawn in the font on the screen.
for (const m of h.matchAll(/>([^<]+)</g)) {
  if (BAR_RE.test(m[1])) hits.push(`index.html:${lineAt(html, m.index)} ${JSON.stringify(m[1].trim().slice(0, 50))}`);
}

// ── the modules the game actually bundles ───────────────────────────────────
const strings = [];   // every user-visible literal, kept for bar (c)
const seen = new Set();
const queue = ['src/prototype3d.ts'];
const isConsoleArg = (n) => {
  for (let p = n.parent; p; p = p.parent) {
    if (ts.isCallExpression(p)) {
      const e = p.expression;
      return ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'console';
    }
    if (ts.isBlock(p) || ts.isSourceFile(p)) return false;
  }
  return false;
};
while (queue.length) {
  const f = queue.shift();
  if (seen.has(f)) continue;
  seen.add(f);
  const sf = ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true);
  const follow = (spec) => {
    if (!spec.startsWith('.')) return;
    const base = path.join(path.dirname(f), spec);
    for (const c of [`${base}.ts`, base, `${base}/index.ts`]) {
      if (c.endsWith('.ts') && existsSync(c)) { queue.push(c); return; }
    }
  };
  const visit = (n) => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier
      && ts.isStringLiteral(n.moduleSpecifier)) follow(n.moduleSpecifier.text);
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword
      && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) follow(n.arguments[0].text);
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)
      || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
      if (!isConsoleArg(n)) {
        const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
        // a stylesheet, a shader or a fragment of markup injected from a module
        // carries its own comments (bubbles.ts's whole style block is one
        // template literal; the GLSL chunks carry `// ──` headers), and a
        // comment inside a string is still a comment. A line comment needs
        // whitespace or a statement edge before it, so a URL's `://` survives.
        const t = n.text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
          .replace(/(^|[\s;{}])\/\/[^\n]*/g, '$1');
        strings.push({ f, line, t });
        if (BAR_RE.test(t)) hits.push(`${f}:${line} ${JSON.stringify(t.trim().slice(0, 50))}`);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
if (seen.size < 10) die(`followed only ${seen.size} module(s) from src/prototype3d.ts — the import walk is broken, not the game`);
console.log(`  ·    scanned index.html and ${seen.size} module(s) reachable from src/prototype3d.ts`);
for (const x of hits) console.log(`  ·      ${x}`);
bar(!hits.length, 'b', hits.length
  ? `${hits.length} place(s) still set a fallback glyph in text a child sees`
  : `no fallback glyph in any user-visible string (${barred.join(' ') || 'nothing barred'})`);

// ── (c) every drawn mark points at a symbol that exists ────────────────────
const defined = new Set([...html.matchAll(/<symbol\s+id="([^"]+)"/g)].map((m) => m[1]));
for (const s of strings) for (const m of s.t.matchAll(/<symbol\s+id="([^"]+)"/g)) defined.add(m[1]);
const refs = [];
for (const m of h.matchAll(/<use\s+href="#([^"]+)"/g)) refs.push({ id: m[1], at: `index.html:${lineAt(html, m.index)}` });
for (const s of strings) for (const m of s.t.matchAll(/<use\s+href="#([^"$]+)"/g)) refs.push({ id: m[1], at: `${s.f}:${s.line}` });
const dangling = refs.filter((r) => !defined.has(r.id));
for (const d of dangling) console.log(`  ·      #${d.id} at ${d.at} has no <symbol>`);
bar(!dangling.length, 'c', dangling.length
  ? `${dangling.length} <use> reference(s) point at a symbol nobody defines — an empty box on screen`
  : `all ${refs.length} literal <use> reference(s) resolve to one of ${defined.size} symbol(s)`);

// ── REPORTED, NOT BARRED: the rest of the fallback set ─────────────────────
// ✦ is the coin mark on every chip and every price, and ✓/✕ are not this
// job's; they are listed so the next job starts from a number. Colour emoji are
// qa/pictograph.mjs's and are excluded here by the same Unicode property.
{
  const other = new Map();
  // Extended_Pictographic, not Emoji_Presentation, for the EXCLUSION: 🏔 and
  // ⛱ are text-default code points that the game always follows with U+FE0F,
  // so they reach the screen as colour emoji and belong to pictograph
  const EMOJI = /\p{Extended_Pictographic}|️/u;
  const note = (t) => {
    for (const ch of t) {
      const n = cp(ch);
      if (n < 0x2000 || EMOJI.test(ch) || barred.includes(ch)) continue;
      if (n >= 0xD800 && n <= 0xDFFF) continue;
      if (covering(n).length) continue;
      other.set(ch, (other.get(ch) || 0) + 1);
    }
  };
  for (const m of h.matchAll(/>([^<]+)</g)) note(m[1]);
  for (const s of strings) note(s.t);
  if (other.size) {
    console.log(`  ·    also outside the font, not barred here: ${[...other].sort((a, b) => b[1] - a[1])
      .map(([c, k]) => `${c} ${hex(cp(c))} ×${k}`).join(', ')}`);
  }
}

console.log(bad ? `\nFAIL — ${bad} of ${bars} bar(s)` : `\nPASS — ${bars} bar(s)`);
process.exit(bad ? 1 : 0);
