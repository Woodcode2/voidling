// ── NO EMOJI ON A SCREEN A CHILD LOOKS AT ──────────────────────────────────
//
//   node qa/pictograph.mjs [port]              the walk the push gate has run
//   node qa/pictograph.mjs [port] --atrest     each sheet finished arriving first
//
// docs/MENU-BRIEF.md §1.4 ends with one sentence that was never built:
// "The probe for bar 1.3.7 fails on any emoji or dingbat." §1.3.7 names `.pips`
// by selector. Nothing in qa/ has ever grepped for a pictograph, so the ban has
// been a sentence in a document rather than a bar.
//
// IT MATTERS MOST ON iOS, which is where this ships. An emoji is not our art —
// it is the platform's, drawn in Apple's colour and Apple's line weight, at a
// size we do not control, beside a HUD we drew ourselves. On the one frame a
// store reviewer screenshots, "🏠 5  🚗 8  🍿 40" is three pictures from a
// different game. It is also the one kind of glyph that changes under the
// player's feet when the OS updates.
//
// IT WALKS THE DOM, NOT THE SOURCE. The first cut grepped the files and found
// 58,495 "pictographs", 46,075 of which were the ─ in comment headers. A child
// does not read comments. This asks what is ON SCREEN, which is the thing the
// rule is actually about, and it asks it per screen so a finding names the
// place to go and fix.
//
// KNOWN is FROZEN BY NAME and only ever shorter — same rule as qa/assetrefs.mjs
// and qa/calmlist.mjs, for the same reason: a probe that derives its own
// expectations forgives every future regression. A fix is a deletion from that
// list; a new pictograph anywhere is a red on the next push.
import { chromium } from 'playwright';
import { settle, atRest, describeRest } from './_atrest.mjs';

const PORT = process.argv[2] || '4177';

// ── --atrest: THE WALK CAN GO BLIND, AND WITHOUT THIS FLAG IT WOULD SAY PASS ──
// The walk below skips any text node with an ancestor at computed opacity 0,
// which is right for a card that is not showing. Studio round 4 (Job 7) then
// put modalIn on #worlds, #shop and #profile — the three screens every KNOWN
// entry is on — and modalIn's first keyframe is opacity 0. A CSS animation's
// time only advances on a rendered frame, and qa/navtap.mjs traced this
// machine drawing about one every 2.5 s, with a 240 ms animation still at t=0
// 1.2 s after it started. If no frame is drawn during the 700 ms wait below,
// every text node on those three sheets is skipped: 0 of the 10 KNOWN match,
// the "match nothing any more" line is a note and not a failure, and a new
// emoji on those screens passes unseen. Whether that happens on this machine
// has not been measured.
//
// With --atrest, each screen's sheet (its proof element, that element's
// subtree and its ancestors) has every finite animation finished before the
// walk (qa/_atrest.mjs), the probe prints the opacity it read before and
// after, and it FAILS if the sheet is not at opacity 1 with nothing finite
// still running. It also FAILS when a screen that has KNOWN entries shows none
// of them: all of one screen's offenders going at once is either a fix, which
// deletes them from KNOWN in the same change, or a walk that did not see the
// sheet. The flag exists because this file is a push step and this code has
// not been run; qa/gate.mjs registers `pictograph-atrest` in live and quality,
// and the push step keeps the unflagged walk until a run has read this one.
const ATREST = process.argv.includes('--atrest');
// installed on the --atrest path only, so the unflagged path is the one the
// push gate has run plus the flag tests
if (ATREST) {
  process.on('uncaughtException', (e) => {
    console.log(`\nFAIL — pictograph threw: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });
  process.on('unhandledRejection', (e) => {
    console.log(`\nFAIL — pictograph rejected: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });
}

/** UNICODE ALREADY DRAWS THIS LINE, so use its line rather than a hand-picked
 *  range. \p{Emoji_Presentation} is the property for characters that render as
 *  COLOUR EMOJI by default — the platform's art, in the platform's palette, at a
 *  weight we do not control. \uFE0F is the variation selector that forces that
 *  presentation onto a character which would otherwise be text.
 *
 *  Everything else stays legal, and that distinction is the whole point: ✦ (the
 *  coin mark, U+2726), ✓, ★, → and the box-drawing rules are TEXT-presentation
 *  glyphs that render in our own face and our own colour. They are typography we
 *  set. Banning them would be banning punctuation.
 *
 *  The first cut of this file picked ranges by hand and flagged ✦ while
 *  deliberately exempting ✓ and ★ — three characters of exactly the same kind,
 *  two forgiven and one condemned, on nothing but which range I happened to
 *  type. ✨ (U+2728) sits beside ✦ in the same block and IS colour emoji. Only
 *  the Unicode property tells them apart.
 *
 *  RETRACTED IN PART, studio round 4 (Job 7): "render in our own face" is
 *  false for every one of ✦ ✓ ★ →. The four @fontsource/fredoka imports are
 *  unicode-range subsets, and none of those code points is in any of them —
 *  the latin subset even carries U+2191 and U+2193 and skips the U+2192
 *  between them — so each is drawn by the platform's fallback face, in its
 *  weight, inside our own labels. qa/glyphs.mjs reads the ranges out of the
 *  real CSS and bars → ▾ ▴ ▶ ⌂ (drawn from the icon sheet since); ✦ ✓ ★ ✕
 *  are listed there as not yet barred. What stands is the distinction this
 *  file is built on — colour emoji are the platform's ART, a fallback text
 *  glyph is the platform's TYPE — and so does this bar, which is about the
 *  first. The claim that every text glyph is ours does not. */
const PICTO = /\p{Emoji_Presentation}|\uFE0F/u;

/** Screens a child reaches, each with the element that PROVES it opened — the
 *  lesson qa/uisystem.mjs paid for by certifying a picker it never walked. */
const SCREENS = [
  ['menu', null, '#menuLadder'],
  ['picker', () => document.getElementById('worldSwitch')?.click(), '#worlds.show'],
  ['shop', () => { document.getElementById('worlds')?.classList.remove('show'); document.getElementById('btnShop')?.click(); }, '#shop.show'],
  ['settings', () => { document.getElementById('shop')?.classList.remove('show'); document.getElementById('btnSettings')?.click(); }, '#settings.show'],
  ['profile', () => { document.getElementById('settings')?.classList.remove('show'); document.getElementById('btnBook')?.click(); }, '#profile.show'],
];

/** Pictographs already on screen when this probe was written, BY SCREEN AND
 *  SELECTOR. Every one is a thing to fix, not a thing that is fine. */
const KNOWN = new Set([
  'picker .wBest',          // "✨ 12 SECRETS"
  'picker #soloTog',        // "🏝️ BY MYSELF"
  'shop i',                 // "🟣" — the coin-tier dot
  'shop .shopTier',         // "🎨 COINS"
  'shop .pr',               // "💎 25" — the gem price on every paid row
  'shop .shopTier.gold',    // "✨ LEGENDARY"
  'profile #rankChip',      // "🥉 BRONZE · LVL 1"
  'profile button',         // "🎈 SKYLARK FIELD 0/12"
  'profile .on',            // "🍁 MAPLE FALLS 0/12"
  'profile i',              // "💜"
  // Found 2026-09-23 by the --atrest walk, and present on main as well
  // (05c5842, same run): the unflagged walk read the settings sheet before
  // its text had painted, so these two were never in its count. Debt, not new.
  'settings span',          // "🔊 SOUND"
  'settings .setNote',      // "made for kids who like snacks 🍩"
]);

// THE FRONT DOOR IS ALREADY CLEAN — none of the ten is on #menu. They are on
// SHOP, PICKER and PROFILE: the money screen and the progression screen, which
// is where a store reviewer's screenshots come from.
//
// Several already have a drawn symbol waiting in index.html's inline sheet
// (#ic-medal for the bronze rank, #ic-void for the violet dot, #ic-bag, #ic-cup,
// #ic-crown). The rest — a gem, a sparkle, a maple leaf, a balloon, an island —
// are a drawing pass, and drawing ten marks that must read at HUD size is a
// studio job rather than an engineering one, so they are debt here rather than a
// guess committed under a deadline.
//
// NOT COVERED, and saying so because a probe that implies more reach than it has
// is the fault this repo keeps paying for: this walks the five screens reachable
// from the menu. It does NOT walk the in-match HUD, where the SET goal chip
// renders setOrder(w)'s icons — "🏠 5  🚗 8  🍿 40" on dot 2 (prototype3d.ts
// ~:2532) — nor the end card. Those are pictographs on the busiest frame in the
// game and they are not in the ten above because nothing here has looked at
// them yet. Widening this to a live match is the next thing it needs.

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidCoins', '9999');
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));

const found = [], doors = [], unsettled = [];
for (const [name, open, proof] of SCREENS) {
  if (open) { await p.evaluate(open); await p.waitForTimeout(700); }
  const there = await p.evaluate((s) => !!document.querySelector(s), proof);
  if (!there) { doors.push(`${name} (${proof})`); continue; }
  if (ATREST) {
    const rest = await settle(p, proof);
    console.log(`  rest ${name.padEnd(9)} ${proof}: ${describeRest(rest)}`);
    if (!atRest(rest)) unsettled.push(`${name} (${describeRest(rest)})`);
  }
  const hits = await p.evaluate((src) => {
    const re = new RegExp(src, 'u');
    const out = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const t = n.nodeValue || '';
      if (!re.test(t)) continue;
      const el = n.parentElement;
      if (!el) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      let a = el, hidden = false;
      while (a && a !== document.body) {
        const c = getComputedStyle(a);
        if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) { hidden = true; break; }
        a = a.parentElement;
      }
      if (hidden) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const where = el.id ? '#' + el.id : (el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).join('.') : el.tagName.toLowerCase());
      out.push({ where, text: t.trim().slice(0, 40) });
    }
    return out;
  }, PICTO.source);
  for (const h of hits) found.push({ screen: name, ...h });
}
await b.close();

if (doors.length) {
  console.log(`\nFAIL — ${doors.length} screen(s) did not open, so they were not searched: ${doors.join(', ')}\n`);
  process.exit(1);
}

if (unsettled.length) {
  console.log(`\nFAIL — ${unsettled.length} sheet(s) were not at rest after their arrival was finished, `
    + `so text on them could be skipped as invisible: ${unsettled.join('; ')}\n`);
  process.exit(1);
}

const key = (f) => `${f.screen} ${f.where}`;
const fresh = [], debt = [];
const seen = new Set();
for (const f of found) {
  if (seen.has(key(f))) continue;
  seen.add(key(f));
  (KNOWN.has(key(f)) ? debt : fresh).push(f);
}
console.log(`\n  ${SCREENS.length} screens walked, ${found.length} pictograph text node(s), `
  + `${fresh.length} unlisted, ${debt.length} known\n`);
for (const f of debt) console.log(`  debt ${f.screen.padEnd(9)} ${f.where}  "${f.text}"`);
for (const f of fresh) console.log(`  BAD  ${f.screen.padEnd(9)} ${f.where}  "${f.text}"`);
const gone = [...KNOWN].filter((k) => !seen.has(k));
if (gone.length) console.log(`\n  ·    ${gone.length} KNOWN entr(ies) match nothing any more and must be deleted: ${gone.join(', ')}`);

if (fresh.length) {
  console.log(`\nFAIL — ${fresh.length} pictograph(s) render on a screen a child looks at, against `
    + `MENU-BRIEF §1.3.7. Draw it into the inline symbol sheet in index.html and use it, `
    + `or add it to this file's KNOWN set as debt with a reason.\n`);
  process.exit(1);
}
if (ATREST) {
  // a screen whose KNOWN offenders ALL vanished at once
  const blind = [];
  for (const [name] of SCREENS) {
    const mine = [...KNOWN].filter((k) => k.startsWith(`${name} `));
    if (mine.length && !mine.some((k) => seen.has(k))) blind.push(`${name} (0 of ${mine.length})`);
  }
  if (blind.length) {
    console.log(`\nFAIL — ${blind.length} screen(s) showed none of their known offenders: ${blind.join(', ')}. `
      + `Either every one was fixed in the same change (delete them from KNOWN) or the walk did not see the sheet\n`);
    process.exit(1);
  }
  console.log(`\n  every walked sheet was at rest (opacity 1, nothing finite running) when its text was read`);
}
console.log(debt.length
  ? `\nPASS — no NEW pictograph on any walked screen; ${debt.length} known offender(s) remain, listed above\n`
  : `\nPASS — every glyph on every walked screen is our own art\n`);
