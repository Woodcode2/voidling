// ── A BOX READ INSIDE A SHEET THAT ARRIVES ON A TRANSFORM ───────────────────
//
//   node qa/sheetbox.mjs [port] [world]      (both ignored: static, no browser)
//
// Static: parses index.html's <style> and markup, and every .ts file under src/
// with the TypeScript compiler. Runs no browser.
//
// WHAT WAS WRONG. Studio round 4, Job 7 put modalIn on #shop, #worlds,
// #profile and the pause card. modalIn's first keyframe is
// `translateY(14px) scale(0.94)`, and getBoundingClientRect() includes every
// ancestor's transform. paintThumbs() sized the hat cards' render buffer from
// `#hatGrid .hatCard canvas`'s rect, and with the hats tab remembered both
// shop doors call it from the rAF after #shop gains .show, which is the
// animation's first frame. So the buffer was sized off the card at 0.94 of its
// width, and it is cached (thumbsFor) until the skin changes. That is read
// from the source, not from a browser. A
// layout read (offsetWidth / clientWidth) is not transformed, so it does not
// care what frame of the arrival it lands on.
//
// THE RULE. For every `.getBoundingClientRect()` call in src/ whose receiver
// resolves to an element in index.html (getElementById / el() / querySelector
// with a literal that names an #id, or a const initialised from one), that
// element must not sit inside anything that ARRIVES on a transform keyframe:
// a rule `#id.show`, `#id.show .cls` or `#id.show #id2` whose animation names
// an @keyframes that sets a transform other than none. That is the sheets
// (modalIn) and also the HUD cards that pop in (#news, #banner, #evolve …).
// Receivers that cannot be resolved (a loop variable, a parameter, a pooled
// node) are listed and not graded.
//
// THE BARS
//   (a) the stylesheet walk finds what arrives on a transform (at least four
//       ids: #daily, #skinPrev, #settings and #gate carried modalIn before
//       Job 7, so fewer means the parse broke, not the page)
//   (b) no rect read in src/ measures an element inside one of them
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const die = (m) => { console.log(`\nFAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`sheetbox threw: ${String(e && e.message || e).split('\n')[0]}`));
process.on('unhandledRejection', (e) => die(`sheetbox rejected: ${String(e && e.message || e).split('\n')[0]}`));
// imported after the handlers, so a missing compiler prints a FAIL line
// rather than a module-resolution stack the gate would read as silence
const ts = (await import('typescript')).default;

let bad = 0, bars = 0;
const bar = (ok, id, msg) => { bars++; console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };
console.log('\n  SHEET BOX — no rect read inside anything that arrives on a transform\n');

// ── the stylesheet ───────────────────────────────────────────────────────────
const html = readFileSync('index.html', 'utf8');
const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');
/** the body of the brace block that opens at css[open] ('{'), and where it ends */
const block = (s, open) => {
  let d = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') d++;
    else if (s[i] === '}' && --d === 0) return { body: s.slice(open + 1, i), end: i + 1 };
  }
  return null;
};
const moving = new Set();          // @keyframes names that set a transform other than none
let rest = '';                     // the sheet with every @keyframes block cut out
{
  let at = 0;
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    if (m.index < at) continue;
    const b = block(css, m.index + m[0].length - 1);
    if (!b) die(`@keyframes ${m[1]} never closes — the stylesheet walk cannot continue`);
    rest += css.slice(at, m.index);
    at = b.end;
    for (const t of b.body.matchAll(/(?:^|[;{\s])transform\s*:\s*([^;}]+)/g)) {
      if (t[1].trim() !== 'none') { moving.add(m[1]); break; }
    }
  }
  rest += css.slice(at);
}
const sheets = [];                 // { id, sub, sel, anim }
for (const m of rest.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const decl = m[2];
  const names = [...decl.matchAll(/(?:^|[;\s])animation(?:-name)?\s*:\s*([^;]+)/g)]
    .flatMap((a) => a[1].split(/[\s,]+/)).filter((n) => moving.has(n));
  if (!names.length) continue;
  for (const raw of m[1].split(',')) {
    const sel = raw.trim().replace(/\s+/g, ' ');
    const s = /^#([\w-]+)\.show(?: (.+))?$/.exec(sel);
    if (s) sheets.push({ id: s[1], sub: s[2] || '', sel, anim: names[0] });
  }
}
{
  const ids = [...new Set(sheets.map((s) => s.id))];
  console.log(`  ·    transform keyframes: ${[...moving].join(', ') || 'none'}`);
  console.log(`  ·    .show rules that arrive on one: ${sheets.map((s) => `${s.sel} (${s.anim})`).join(', ') || 'none'}`);
  bar(ids.length >= 4, 'a', ids.length >= 4
    ? `${ids.length} ids arrive on a transform keyframe when they gain .show`
    : `the stylesheet walk found ${ids.length} id(s) arriving on a transform — #daily, #skinPrev, #settings and #gate have all carried modalIn, so the parse is broken`);
}

// ── the markup: every id, and what it sits inside ───────────────────────────
const body = html.slice(html.indexOf('<body'))
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '');
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const stack = [];
const chain = new Map();           // id -> [{ id, cls }] outermost first, the element itself last
for (const m of body.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
  const [, close, tag0, attrs, selfClose] = m;
  const tag = tag0.toLowerCase();
  if (close) {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
    continue;
  }
  const id = (attrs.match(/\sid="([^"]+)"/) || [])[1] || '';
  const cls = (attrs.match(/\sclass="([^"]+)"/) || [])[1] || '';
  if (id) chain.set(id, [...stack.map((s) => ({ id: s.id, cls: s.cls })), { id, cls }]);
  if (!selfClose && !VOID.has(tag)) stack.push({ tag, id, cls });
}
if (chain.size < 50) die(`read only ${chain.size} ids out of index.html — the markup walk is broken, not the page`);
const hasCls = (c, name) => new RegExp(`(^|\\s)${name}(\\s|$)`).test(c.cls);
/** the sheet an element (or a descendant of it, when `under`) sits in, or null */
const sheetOf = (id, under) => {
  const up = chain.get(id);
  if (!up) return null;
  for (const s of sheets) {
    const i = up.findIndex((a) => a.id === s.id);
    if (i < 0) continue;
    if (!s.sub) return s;
    const cm = /^([.#])([\w-]+)$/.exec(s.sub);
    if (!cm) return s;                       // a descendant rule we cannot narrow: the whole sheet
    // the moving part is .cls or #id under the sheet: the element, or something
    // above it below the sheet, has to be it — or, for a read of a descendant
    // of the element, the moving part may be inside it
    if (up.slice(i + 1).some((a) => (cm[1] === '.' ? hasCls(a, cm[2]) : a.id === cm[2]))) return s;
    if (under) return s;
  }
  return null;
};

// ── the source ───────────────────────────────────────────────────────────────
const files = [];
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(n) && !/\.d\.ts$/.test(n)) files.push(p);
  }
};
walk('src');
if (!files.length) die('no .ts files under src/ — run this from artifacts/3d-game');

const strip = (e) => {
  while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e)
    || (ts.isTypeAssertionExpression && ts.isTypeAssertionExpression(e)))) e = e.expression;
  return e;
};
const firstId = (sel) => (/#([\w-]+)/.exec(sel) || [])[1] || null;
/** the const/let declaration of `name` visible from node n, or null */
const declOf = (n, name) => {
  for (let p = n.parent; p; p = p.parent) {
    const stmts = ts.isSourceFile(p) || ts.isBlock(p) || ts.isModuleBlock(p) ? p.statements : null;
    if (!stmts) continue;
    for (const st of stmts) {
      if (!ts.isVariableStatement(st)) continue;
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.name.text === name && d.initializer) return d.initializer;
      }
    }
  }
  return null;
};
/** { id, under } — the element a receiver expression names, or null */
const resolve = (e0, depth = 0) => {
  const e = strip(e0);
  if (!e || depth > 4) return null;
  if (ts.isIdentifier(e)) { const init = declOf(e, e.text); return init ? resolve(init, depth + 1) : null; }
  if (ts.isCallExpression(e)) {
    const arg = e.arguments[0];
    const lit = arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) ? arg.text : null;
    const callee = strip(e.expression);
    const name = ts.isIdentifier(callee) ? callee.text
      : ts.isPropertyAccessExpression(callee) ? callee.name.text : '';
    if (lit != null && (name === 'getElementById' || name === 'el')) return { id: lit, under: false };
    if (lit != null && (name === 'querySelector' || name === 'closest')) {
      const id = firstId(lit);
      if (id) return { id, under: !new RegExp(`^#${id}$`).test(lit.trim()) };
      // a class selector under a receiver that is itself an element we know
      if (name === 'querySelector' && ts.isPropertyAccessExpression(callee)) {
        const host = resolve(callee.expression, depth + 1);
        if (host) return { id: host.id, under: true };
      }
    }
  }
  return null;
};

const reads = [];
for (const f of files) {
  const sf = ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true);
  const visit = (n) => {
    if (ts.isCallExpression(n) && n.arguments.length === 0) {
      const c = n.expression;
      if (ts.isPropertyAccessExpression(c) && c.name.text === 'getBoundingClientRect') {
        const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
        reads.push({ at: `${f}:${line}`, recv: c.expression.getText(sf).replace(/\s+/g, ' ').slice(0, 70), el: resolve(c.expression) });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
if (!reads.length) die('found no getBoundingClientRect() call anywhere in src/ — the source walk is broken');

const hits = [];
for (const r of reads) {
  if (!r.el) { console.log(`  ·    ${r.at}  ${r.recv}  — not resolved to an element in index.html; not graded`); continue; }
  const known = chain.has(r.el.id);
  const s = known ? sheetOf(r.el.id, r.el.under) : null;
  console.log(`  ·    ${r.at}  ${r.recv}  → ${r.el.under ? 'inside ' : ''}#${r.el.id}${known ? '' : ' (no such id in index.html)'}${s ? `  — IN ${s.sel}, which runs ${s.anim}` : ''}`);
  if (s) hits.push(`${r.at} reads ${r.el.under ? 'a box inside ' : ''}#${r.el.id}, inside ${s.sel} (${s.anim})`);
}
bar(!hits.length, 'b', hits.length
  ? `${hits.length} rect read(s) measure an element inside something that arrives on a transform, so they read the arrival's scale, not the element's size — read offsetWidth/clientWidth: ${hits.join('; ')}`
  : `none of the ${reads.length} rect reads in src/ measures an element inside something that arrives on a transform`);

console.log(bad ? `\nFAIL — ${bad} of ${bars} bar(s)` : `\nPASS — ${bars} bar(s)`);
process.exit(bad ? 1 : 0);
