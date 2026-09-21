// ── EVERY ANIMATION IS EITHER SILENCED UNDER CALM OR EXEMPT BY NAME ─────────
//
// index.html's reduced-motion contract is a HAND-WRITTEN LIST, and its own
// header says so: "This list is EXPLICIT, so every animation has to be named in
// it by hand — and naming the parent does not reach a `::before` or `::after`."
// That header then records the list being wrong: `#growth .gFill` sat in it
// "for a long time doing nothing at all", because the animation was authored on
// `#growth .gFill::after`.
//
// It was wrong again. `.handG` (index.html:414) — the drag tutorial's hand, the
// ONLY wordless teaching a pre-reader gets — carries
// `animation: handMove 3.8s linear infinite` and appears in neither the
// body.calm list nor either @media (prefers-reduced-motion) block. A child who
// asked for less motion got an infinitely looping hand. `.hTrail`'s opacity
// pulse is in the same position.
//
// A hand-maintained list needs a machine to read it back. This asks the CSSOM,
// not the file: for every rule that STARTS an animation, there must be a
// matching rule that stops it under calm — `body.calm <selector>` in the
// explicit list, or the same selector inside a prefers-reduced-motion block.
//
// EXEMPT IS FROZEN BY NAME, NEVER DERIVED. A probe that built its exemptions by
// reading the stylesheet would forgive every future omission — the exact fault
// qa/assetrefs.mjs was rewritten to avoid. Each entry below is a deliberate
// always-on animation with a one-line reason.
//
//   node qa/calmlist.mjs [port]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';

/** KNOWN DEBT, FROZEN BY NAME AND ONLY EVER SHORTER.
 *  Twenty-nine animations ignored the reduced-motion contract when this probe
 *  was written. Listing a COUNT would let one fix pay for one new omission;
 *  listing the selectors means a new one fails immediately and a fix is a
 *  deletion from this list. Same rule as qa/assetrefs.mjs, for the same
 *  reason: a probe that derives its own expectations forgives everything.
 *
 *  Each of these needs the same check the hand needed before it can be
 *  silenced: if the keyframes supply a position or an opacity the base rule
 *  does not, silencing the animation moves or reveals the element. .handG
 *  jumped to the SVG origin and .hTouch rendered a solid white disc.
 *
 *  DO NOT ADD TO THIS LIST. A new animation goes in index.html’s two calm
 *  lists, or in EXEMPT with a reason. */
const DEBT = new Set([
  '#count span.pop',
  '#daily .dCard::after',
  '#daily .dGift',
  '#daily.show .dCard',
  '#dailyClaim',
  '#dailyGrid .dCell.now::before',
  '#dailyGrid .dCell.pop',
  '#drop.charging .dropOrb',
  '#drop.opened .dropOrb',
  '#drop.show',
  '#end .er',
  '#endFinds .stk',
  '#endStats .es',
  '#endStats .es.rk.up',
  '#eventRibbon::after',
  '#evolve.show::after',
  '#evolve.show::before',
  '#gate.show .setCard',
  '#gift',
  '#settings.show .setCard',
  '#skinPrev .spOrb',
  '#skinPrev.show .spCard',
  '#tapGate .gPill',
  '.dropOrb',
  '.endConf',
  '.pip.pop .pipDot',
  '.skCard.legend::after',
  '.wCard.shake',
  '.wEvent',
]);

/** Animations that must keep RUNNING with motion reduced, by name, with why. */
const EXEMPT = new Set([
  // (none yet — add with a reason, never to make a red go away)
]);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.goto(`http://127.0.0.1:${PORT}/?w=maple&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => document.styleSheets.length > 0, null, { timeout: 300000 });

const out = await p.evaluate(() => {
  const starts = [], stops = [];
  const norm = (s) => s.trim().replace(/\s+/g, ' ');
  const errs = [];
  // INDEX, NOT for...of. CSSRuleList is a legacy platform object and is not
  // reliably iterable; the first draft used for...of, threw TypeError on the
  // very first sheet, had it swallowed by a bare catch, and printed
  // "0 animation declaration(s) ... PASS" — a probe that measured nothing and
  // reported green, which is the exact fault this file exists to catch in the
  // stylesheet. The catch below now records instead of hiding, and an empty
  // result is a FAIL.
  const walk = (rules, inCalmMedia) => {
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      // TYPE BY WHAT THE RULE HAS THAT IS ITS OWN, NOT BY `cssRules`. Modern
      // Chrome gives EVERY CSSStyleRule a `cssRules` property — an empty list,
      // there for CSS nesting — so `if (r.cssRules)` is true for an ordinary
      // rule and the first draft recursed straight past 689 of 869 rules into
      // their empty children and reported zero animations on a stylesheet that
      // declares twenty-five.
      if (r.conditionText !== undefined && r.cssRules) {            // @media / @supports
        walk(r.cssRules, inCalmMedia || /prefers-reduced-motion/.test(r.conditionText));
        continue;
      }
      if (!r.selectorText) continue;   // @keyframes, @font-face, a keyframe step
      const name = r.style && r.style.animationName;
      if (!name) continue;
      for (const sel of r.selectorText.split(',').map(norm)) {
        // ── SILENCE IS NOT THE ONLY WAY TO HANDLE MOTION ────────────────
        // `animation: none` is one answer; a SUBSTITUTE is the other, and this
        // stylesheet uses both — bnrStill, evCalm, newsCalm and goalStill are
        // calm-only replacements that hold the same element still while keeping
        // it on screen, which index.html:808 calls the accessible version of a
        // flip rather than a missing feature. Counting those as violations put
        // the first run at 47. Any rule that applies ONLY under calm therefore
        // COVERS its selector, whatever animation it names.
        const calmScoped = inCalmMedia || sel.startsWith('body.calm');
        if (calmScoped) {
          stops.push(sel.startsWith('body.calm ') ? norm(sel.slice('body.calm '.length)) : sel);
          continue;
        }
        if (name === 'none') continue;   // an unconditional none starts nothing
        starts.push({ sel, name });
      }
      // …and a style rule may itself hold rules, which is what that empty list
      // is actually for.
      if (r.cssRules && r.cssRules.length) walk(r.cssRules, inCalmMedia);
    }
  };
  for (const sheet of document.styleSheets) {
    try { walk(sheet.cssRules, false); }
    catch (e) { errs.push((sheet.href || "(inline)") + ": " + String(e && e.message || e).slice(0, 80)); }
  }
  return { starts, stops, errs, sheets: document.styleSheets.length };
});
await b.close();

if (out.errs.length) {
  console.log("");
  for (const e of out.errs) console.log("  !    could not read " + e);
  console.log(`
FAIL — ${out.errs.length} of ${out.sheets} stylesheet(s) could not be walked, so this probe did not measure what it claims to.
`);
  process.exit(1);
}
if (!out.starts.length) {
  console.log(`
FAIL — walked ${out.sheets} stylesheet(s) and found NO animation declarations at all. index.html declares ~25, so the walk is broken, not the stylesheet.
`);
  process.exit(1);
}
const stops = new Set(out.stops);
/** `body.calm X` stops `X`, and it also stops `X:hover` or `X.mod` only if that
 *  exact selector is listed — naming the parent does not reach a pseudo-element,
 *  which is the trap index.html's own header records. So: exact match only. */
const bare = new Set();
const uncovered = [], debt = [];
for (const s of out.starts) {
  if (bare.has(s.sel + '|' + s.name)) continue;
  bare.add(s.sel + '|' + s.name);
  if (stops.has(s.sel) || EXEMPT.has(s.sel)) continue;
  if (DEBT.has(s.sel)) { debt.push(s); continue; }
  uncovered.push(s);
}

console.log(`\n  ${out.starts.length} animation declaration(s), ${stops.size} silenced under calm, ${EXEMPT.size} exempt by name, ${debt.length} known debt\n`);
// NEVER A SILENT BACKLOG. A pass that hides twenty-nine known offenders
// reads as "every animation is handled", which is the same lie as a probe
// that measures nothing. The debt is printed on every run, pass or fail.
for (const d of debt) console.log(`  debt ${d.sel}  runs "${d.name}" with motion reduced`);
const gone = [...DEBT].filter((d) => !out.starts.some((x) => x.sel === d));
if (gone.length) console.log(`\n  ·    ${gone.length} DEBT entr(ies) no longer match anything and must be deleted from this file, or it is guarding selectors that do not exist: ${gone.join(", ")}`);
for (const s of uncovered) console.log(`  BAD  ${s.sel}  runs "${s.name}" with motion reduced`);
if (uncovered.length) {
  console.log(`\nFAIL — ${uncovered.length} animation(s) ignore the reduced-motion contract. `
    + `Add each to BOTH lists in index.html (body.calm and @media prefers-reduced-motion), `
    + `or to this file's EXEMPT set with a reason. Check the element has a base transform first: `
    + `an animation that supplies position leaves its element at transform:none when silenced.\n`);
  process.exit(1);
}
console.log(debt.length
  ? `\nPASS — no NEW animation ignores the reduced-motion contract; ${debt.length} known offender(s) remain, listed above and frozen by name in this file\n`
  : `\nPASS — every animation the stylesheet starts is stopped under calm or exempt by name\n`);
