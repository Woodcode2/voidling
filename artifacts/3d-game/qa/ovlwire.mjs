// ── IS THE SWITCH THAT HIDES THE HUD UNDER A SHEET WIRED IN THE SHIPPED GAME? ─
//
//   node qa/ovlwire.mjs [port] [world]      (both ignored: static, no browser)
//
// Studio round 4, Job 7: "move the overlay observer out of the DEV-only guard
// and add 'end' to it". Static: parses src/prototype3d.ts with the TypeScript
// compiler and index.html's markup, runs no browser, 1.0 s on the machine it
// was written on. The
// runtime half — body.ovl actually set while the shop is open, on the
// PRODUCTION build — is qa/endghost.mjs bar (d); this is the half that can be
// proven without one.
//
// WHAT WAS WRONG. index.html carries six `body.ovl …{display:none}` rules — the
// goal chip, the growth bar, the NOMS pill, the form callout, the wayfinder and
// the quest board — each one written so that HUD furniture cannot sit on top of
// a sheet. The ONLY writer of `body.ovl` was a MutationObserver declared inside
// `if (import.meta.env.DEV || ?stamp)`, the block that draws the build stamp.
// So all six rules have been live in development and dead in every build a
// child has ever run, and the one screen every match ends on — #end — was never
// in its list at all (prototype3d.ts's own comment beside the growth bar says
// so: "#end is not in OVERLAYS, so the bar was sitting on top of the score
// screen at full opacity").
//
// AND THE LIST WAS WRONG IN A WAY THAT ONLY SHIPPING IT WOULD HAVE SHOWN.
// 'trophies' and 'topvoids' stopped being sheets when MY VOID absorbed them:
// they are PANES of #profile now, and openProfile() sets a pane's .show only
// when the profile OPENS — BACK clears #profile.show and leaves the pane's
// alone. Read from the source, not yet observed in a browser: with either name
// in the list, a child who looked at her trophies and pressed BACK would have
// body.ovl pinned on for the rest of the session, and every one of those six
// HUD elements would vanish from every match after it. Moving the observer to
// production without fixing the list would have shipped that. The sheet is
// #profile; the list now names the sheet.
//
// THE BARS
//   (a) the `body.classList.toggle('ovl', …)` call and the observer that
//       subscribes to the OVERLAYS ids sit outside any `import.meta.env.DEV`
//       guard — they run in the build a child gets
//   (b) OVERLAYS names 'end'
//   (c) every OVERLAYS id is an element in index.html — a name that matches
//       nothing reads as coverage that is not there (calmlist's lesson)
//   (d) no OVERLAYS id is nested inside another full-screen sheet — a pane
//       keeps its own .show after its sheet closes, so it would hold body.ovl
//       on with nothing on screen
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const die = (m) => { console.log(`\nFAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`ovlwire threw: ${String(e && e.message || e).split('\n')[0]}`));
process.on('unhandledRejection', (e) => die(`ovlwire rejected: ${String(e && e.message || e).split('\n')[0]}`));

let bad = 0, bars = 0;
const bar = (ok, id, msg) => { bars++; console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };
console.log('\n  OVL WIRE — the HUD\'s hide-under-a-sheet switch, in the shipped build\n');

const SRC = 'src/prototype3d.ts';
const sf = ts.createSourceFile(SRC, readFileSync(SRC, 'utf8'), ts.ScriptTarget.Latest, true);
const text = (n) => n.getText(sf);
const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

let overlays = null, overlaysAt = 0;
const toggles = [], subscribes = [];
const visit = (n) => {
  if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'OVERLAYS'
    && n.initializer && ts.isArrayLiteralExpression(n.initializer)) {
    overlays = n.initializer.elements.filter(ts.isStringLiteral).map((e) => e.text);
    overlaysAt = lineOf(n);
  }
  // document.body.classList.toggle('ovl', …)
  if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)
    && n.expression.name.text === 'toggle' && /classList$/.test(text(n.expression.expression))
    && n.arguments[0] && ts.isStringLiteral(n.arguments[0]) && n.arguments[0].text === 'ovl') toggles.push(n);
  // for (const id of OVERLAYS) { … .observe(…) }
  if (ts.isForOfStatement(n) && text(n.expression) === 'OVERLAYS' && /\.observe\(/.test(text(n.statement))) subscribes.push(n);
  ts.forEachChild(n, visit);
};
visit(sf);
if (!overlays) die(`no \`const OVERLAYS = [ … ]\` in ${SRC} — the list moved, so this probe cannot read it`);
if (!toggles.length) die(`nothing in ${SRC} toggles body.ovl any more — every body.ovl rule in index.html is dead`);
if (!subscribes.length) die(`no \`for (const id of OVERLAYS) … .observe(…)\` in ${SRC} — nothing watches the sheets`);

/** The DEV guard an ancestor if-statement imposes on n, or null. Only the THEN
 *  branch is guarded; an else branch runs precisely when DEV is false. */
const devGuard = (n) => {
  for (let c = n, p = n.parent; p; c = p, p = p.parent) {
    if (ts.isIfStatement(p) && p.thenStatement === c && /import\.meta\.env\.DEV/.test(text(p.expression))) {
      return `if (${text(p.expression).replace(/\s+/g, ' ').slice(0, 70)}) at :${lineOf(p)}`;
    }
  }
  return null;
};
console.log(`  ·    OVERLAYS (:${overlaysAt}) = ${overlays.join(', ')}`);
{
  const guarded = [...toggles, ...subscribes].map((n) => [n, devGuard(n)]).filter(([, g]) => g);
  for (const [n, g] of guarded) console.log(`  ·      :${lineOf(n)} ${text(n).split('\n')[0].trim().slice(0, 60)} — inside ${g}`);
  bar(!guarded.length, 'a', guarded.length
    ? `the body.ovl writer is DEV-only: ${guarded.length} of ${toggles.length + subscribes.length} call site(s) sit inside the build-stamp guard, so no shipped build ever sets it`
    : `the body.ovl writer (:${toggles.map(lineOf).join(', :')}) and its observer (:${subscribes.map(lineOf).join(', :')}) run on every build`);
}
bar(overlays.includes('end'), 'b', overlays.includes('end')
  ? "the results card is a sheet: 'end' is in OVERLAYS"
  : "'end' is not in OVERLAYS — the goal chip, the NOMS pill, the form callout and the wayfinder all stay up over the results card");

// ── the markup: which ids exist, and what each one sits inside ──────────────
const html = readFileSync('index.html', 'utf8');
const body = html.slice(html.indexOf('<body'))
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '');
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const stack = [];               // { tag, id, cls }
const ancestry = new Map();     // id -> [{ id, cls }] outermost first
for (const m of body.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
  const [, close, tag0, attrs, selfClose] = m;
  const tag = tag0.toLowerCase();
  if (close) {
    // pop to the matching open tag; tolerate an unclosed <p> or <li>
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
    continue;
  }
  const id = (attrs.match(/\sid="([^"]+)"/) || [])[1] || '';
  const cls = (attrs.match(/\sclass="([^"]+)"/) || [])[1] || '';
  if (id) ancestry.set(id, stack.map((s) => ({ id: s.id, cls: s.cls })));
  if (!selfClose && !VOID.has(tag)) stack.push({ tag, id, cls });
}
if (ancestry.size < 50) die(`read only ${ancestry.size} ids out of index.html — the markup walk is broken, not the page`);
{
  const missing = overlays.filter((id) => !ancestry.has(id));
  bar(!missing.length, 'c', missing.length
    ? `${missing.length} OVERLAYS name(s) match no element in index.html: ${missing.join(', ')}`
    : `all ${overlays.length} OVERLAYS names are elements in index.html`);
}
{
  // A full-screen sheet: an OVERLAYS id, or anything carrying .metaScr (the
  // class #worlds and #profile share). An entry with one of those above it is
  // a pane, not a sheet.
  const sheetIds = new Set(overlays);
  const nested = [];
  for (const id of overlays) {
    const up = ancestry.get(id) || [];
    const host = up.find((a) => (a.id && sheetIds.has(a.id)) || /(^|\s)metaScr(\s|$)/.test(a.cls));
    if (host) nested.push(`${id} (inside #${host.id || '?'}${host.cls ? '.' + host.cls.split(/\s+/).join('.') : ''})`);
  }
  bar(!nested.length, 'd', nested.length
    ? `${nested.length} OVERLAYS entr(ies) are panes of another sheet and keep .show after it closes, pinning body.ovl on: ${nested.join(', ')}`
    : 'every OVERLAYS entry is a top-level sheet, so closing it clears it');
}

console.log(bad ? `\nFAIL — ${bad} of ${bars} bar(s)` : `\nPASS — ${bars} bar(s)`);
process.exit(bad ? 1 : 0);
