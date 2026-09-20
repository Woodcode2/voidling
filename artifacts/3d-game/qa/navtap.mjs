// CAN A SIX-YEAR-OLD HIT IT, AND CAN THEY READ IT WHEN THEY DO?
//
//   node qa/navtap.mjs [port]
//
// The owner's note on the front door, watching a recording of it: "Needs a ton
// of work. It's basic and over complicated for navigation." This probe turns
// the second half of that sentence into numbers, because "over complicated" is
// an opinion and "the door to thirty levels is 551 square pixels while the
// trophy shelf is 5,828" is a finding.
//
// ── THE THREE BARS ──────────────────────────────────────────────────────────
//
// (a) 44x44. Apple's Human Interface Guidelines have named one number for a
//     touch target since 2013 and it has never moved. It is not a style
//     preference: it is the width of an adult fingertip's contact patch. A
//     child's finger is smaller but their AIM is far worse, which is the same
//     problem from the other end.
//
// (b) NO LABEL IS ELLIPSISED. qa/navfit.mjs already asks whether a nav CARD is
//     on screen, and it passes today — but .navCard carries `overflow: hidden;
//     text-overflow: ellipsis`, so a card can be 100% on screen with its word
//     cut in half inside it. SCRAPBOOK is the headline feature of this pass and
//     it renders as SCRAPBO… on the phone most children hold. navfit cannot see
//     that, by construction, and the gap is exactly the kind a passing suite
//     hides.
//
// (d) AND THE DOOR OPENS. A bar on size alone passes a button that is the right
//     shape and wired to nothing, which is exactly the failure the change that
//     prompted this probe could have introduced.
//
// (c) THE HIERARCHY IS NOT INVERTED. Every screen teaches a child what matters
//     by what is big. On this one the four biggest things after PLAY are places
//     to go AFTER a match — a scrapbook, a shop, a trophy shelf, a leaderboard
//     — and the smallest thing on the screen is the control that chooses which
//     island she plays. That is the navigation being "over complicated": not
//     too many pixels, the wrong ones.
//
// ── WHICH ELEMENTS COUNT, AND WHY THE LIST IS NOT WRITTEN HERE ──────────────
// A hand-written selector list is a guard that silently shrinks: the day
// somebody adds a fifth destination, the probe keeps passing over four. So the
// set is DERIVED, twice over and unioned:
//
//   · every <button> inside #menu — the honest majority; and
//   · every id inside the #menu subtree that prototype3d.ts binds a click to.
//
// The second half is what caught the world switcher when it was a bare <div
// id="mlWorld"> that opened the picker: no button tag, no role, 144.8 x 19, and
// the second most important control on the screen.
//
// ONE CONSEQUENCE, WRITTEN DOWN BECAUSE IT COST ME A CONFUSED READING. Half the
// list comes from the source tree on disk and half from the page in the browser,
// so this probe can only grade a build made from THIS source. Pointed at an
// older dist it looks for the ids the current source binds, finds fewer
// controls, and bar (a) passes over a screen it never fully examined. Bar (c)
// fails loudly when the door is missing, which is the guard against that — but
// a before/after comparison has to rebuild, not reuse a dist from an hour ago.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const PORT = process.argv[2] || '4188';
const MIN = 44;                 // HIG minimum, both axes
let fail = 0, bars = 0;
const ok = (m) => { bars++; console.log(`  ok   ${m}`); };
const no = (m) => { bars++; fail++; console.log(`  BAD  ${m}`); };

// guard 2 (qa/idiomguard.mjs): a throw must become a verdict, not silence
const die = (e) => { console.log(`\nFAIL — navtap threw: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); };
process.on('uncaughtException', die);
process.on('unhandledRejection', die);

// ── the derived list, half of it static ─────────────────────────────────────
const html = readFileSync('index.html', 'utf8');
const menuStart = html.indexOf('<div id="menu">');
if (menuStart < 0) die(new Error('no <div id="menu"> in index.html — the front door moved'));
// the subtree ends where the next top-level sibling begins; the scrapbook is
// the first thing after it and is named in a comment rule, so anchor on the
// element itself rather than on the comment.
const menuEnd = html.indexOf('<div id="book">', menuStart);
const menuHtml = html.slice(menuStart, menuEnd > 0 ? menuEnd : menuStart + 20000);
const idsInMenu = new Set([...menuHtml.matchAll(/\bid="([A-Za-z0-9_-]+)"/g)].map((m) => m[1]));

const js = readFileSync('src/prototype3d.ts', 'utf8');
const clicked = new Set();
for (const m of js.matchAll(/getElementById\(\s*'([A-Za-z0-9_-]+)'\s*\)\s*\??\.\s*addEventListener\(\s*'click'/g)) clicked.add(m[1]);
for (const m of js.matchAll(/\bel\(\s*'([A-Za-z0-9_-]+)'\s*\)\s*\.\s*addEventListener\(\s*'click'/g)) clicked.add(m[1]);
for (const m of js.matchAll(/\bel\(\s*'([A-Za-z0-9_-]+)'\s*\)\s*\.\s*onclick\s*=/g)) clicked.add(m[1]);
const taggedIds = [...clicked].filter((id) => idsInMenu.has(id));
if (!taggedIds.length) die(new Error('the static half found no clickable id inside #menu — the parse broke, not the menu'));

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

// 375pt is the narrowest phone still sold and the width SCRAPBOOK loses at.
for (const [W, H, label] of [[375, 812, 'SE / 13 mini'], [390, 844, 'iPhone 15'], [430, 932, 'Pro Max']]) {
  const pg = await br.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  pg.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await pg.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  // a RETURNING player: a first launch autoplays straight into the world by
  // design, and ?manual stops AUTO_START firing on navigator.webdriver.
  await pg.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { } });
  await pg.goto(`http://127.0.0.1:${PORT}/?manual=1`, { waitUntil: 'domcontentloaded', timeout: 400000 });
  await pg.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
  // the menu's own paint has to have run: #mlWorld is written by paintLadder
  await pg.waitForFunction(() => (document.getElementById('mlWorld')?.textContent || '').length > 0,
    null, { timeout: 120000 });
  await pg.waitForTimeout(900);

  const r = await pg.evaluate(({ tagged, MIN }) => {
    const menu = document.getElementById('menu');
    const seen = new Map();
    const add = (el, how) => {
      if (!el || seen.has(el)) return;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || b.width < 1 || b.height < 1) return;
      // the label, and whether it is being cut: ask every descendant that owns
      // its own overflow, not just the element itself
      //
      // MEASURED WITH A RANGE, NOT WITH scrollWidth. scrollWidth is an INTEGER
      // and it is rounded, so a word overflowing its box by 0.6px reports the
      // same number as one that fits — which is exactly the margin SCRAPBOOK
      // sits on at 375pt. A Range over the text node gives the true laid-out
      // width in fractional pixels, against the content box it has to fit in.
      let clip = null, tight = null;
      const cand = [el, ...el.querySelectorAll('*')];
      for (const c of cand) {
        const cs2 = getComputedStyle(c);
        if (cs2.overflow === 'visible' && cs2.overflowX === 'visible') continue;
        // the widest single text node inside this clipping box
        let wantW = 0, wantT = '';
        for (const n of c.childNodes) {
          if (n.nodeType !== 3 || !n.textContent.trim()) continue;
          const rg = document.createRange(); rg.selectNodeContents(n);
          const w = rg.getBoundingClientRect().width;
          if (w > wantW) { wantW = w; wantT = n.textContent.trim(); }
        }
        if (!wantW) continue;
        const inner = c.clientWidth - parseFloat(cs2.paddingLeft) - parseFloat(cs2.paddingRight);
        const slack = inner - wantW;
        if (!tight || slack < tight.slack) tight = { text: wantT.slice(0, 20), want: +wantW.toFixed(1), got: +inner.toFixed(1), slack: +slack.toFixed(1) };
        if (slack < -0.05) { clip = { text: wantT.slice(0, 20), want: +wantW.toFixed(1), got: +inner.toFixed(1) }; break; }
      }
      seen.set(el, { id: el.id || ('.' + (el.className || '').toString().split(' ')[0]),
        cls: (el.className || '').toString(),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 14),
        w: +b.width.toFixed(1), h: +b.height.toFixed(1), area: Math.round(b.width * b.height), how, clip, tight });
    };
    for (const b of menu.querySelectorAll('button')) add(b, 'button');
    for (const id of tagged) add(document.getElementById(id), 'click');
    return [...seen.values()];
  }, { tagged: taggedIds, MIN });

  console.log(`\n  ${label} (${W}x${H}) — ${r.length} live control(s) on the front door`);
  const rows = [...r].sort((a, b) => a.area - b.area);
  for (const c of rows) {
    const flagSize = c.w < MIN || c.h < MIN ? '  <-- under 44x44' : '';
    const flagClip = c.clip ? `  <-- "${c.clip.text}" needs ${c.clip.want}px, has ${c.clip.got}`
      : c.tight ? `  "${c.tight.text}" ${c.tight.want}px in ${c.tight.got}px (${c.tight.slack >= 0 ? '+' : ''}${c.tight.slack})` : '';
    console.log(`    ${String(c.id).padEnd(13)} ${String(c.w).padStart(6)} x ${String(c.h).padStart(5)}  ${String(c.area).padStart(6)}px²  ${c.how}${flagSize}${flagClip}`);
  }

  // (a)
  const small = rows.filter((c) => c.w < MIN || c.h < MIN);
  if (!small.length) ok(`(a) ${label}: every one of the ${rows.length} controls is at least ${MIN}x${MIN}`);
  else no(`(a) ${label}: ${small.length} control(s) under ${MIN}x${MIN} — `
    + small.map((c) => `${c.id} ${c.w}x${c.h}`).join(', '));

  // (b)
  const cut = rows.filter((c) => c.clip);
  if (!cut.length) ok(`(b) ${label}: no label is being cut off inside its own control`);
  else no(`(b) ${label}: ${cut.length} label(s) ellipsised — `
    + cut.map((c) => `${c.id} shows "${c.clip.text}" of ${c.clip.want}px in ${c.clip.got}px`).join('; '));

  // (c) — the door to the worlds against the after-play shelf
  // BY EITHER NAME. The control that opens the world picker was a bare <div
  // id="mlWorld"> and is now a <button id="worldSwitch"> wrapped around that
  // same label — and a bar that names one of them reports the screen as broken
  // the day the fix lands. What is being measured is the DOOR, not its id.
  const world = rows.find((c) => c.id === 'worldSwitch' || c.id === 'mlWorld');
  // BY CLASS, NOT BY ID. The first cut of this bar matched `/^\.navCard/` against
  // the display name — and the display name falls back to the class only when the
  // element has no id. All four cards have one, so the bar reported "no .navCard
  // found" on a screen with four of them. A guard that fails for the wrong reason
  // sends somebody looking for a deletion that never happened.
  const navs = rows.filter((c) => /\bnavCard\b/.test(c.cls || ''));
  if (!world) {
    no(`(c) ${label}: neither #worldSwitch nor #mlWorld is a live control on the front door — the probe cannot judge the hierarchy it was written for`);
  } else if (!navs.length) {
    no(`(c) ${label}: no .navCard found — the after-play shelf the hierarchy is measured against is gone`);
  } else {
    const smallestNav = Math.min(...navs.map((c) => c.area));
    if (world.area >= smallestNav) {
      ok(`(c) ${label}: the world door (${world.area}px²) is not smaller than the after-play shelf (smallest ${smallestNav}px²)`);
    } else {
      no(`(c) ${label}: the hierarchy is inverted — the door to every world is ${world.area}px² `
        + `against ${smallestNav}px² for the smallest after-play destination `
        + `(${(smallestNav / world.area).toFixed(1)}x bigger)`);
    }
  }
  // (d) — AND IT STILL OPENS. This bar exists because the change that made the
  // world door a button MOVED its click listener from the label to the pill
  // around it, and a measurement of size cannot tell a 44px button that works
  // from a 44px button that does nothing. Only run where the door was found.
  if (world) {
    const opened = await pg.evaluate(async (id) => {
      document.getElementById('worlds')?.classList.remove('show');
      document.getElementById(id)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 250));
      return !!document.getElementById('worlds')?.classList.contains('show');
    }, world.id);
    if (opened) ok(`(d) ${label}: tapping the world door opens the picker`);
    else no(`(d) ${label}: #${world.id} is ${world.w}x${world.h} and does nothing — the picker did not open`);
  }
  await pg.close();
}
await br.close();

console.log('');
if (fail) { console.log(`FAIL — ${fail} of ${bars} bar(s) on the front door.`); process.exit(1); }
console.log(`PASS — ${bars} bars: every control is thumb-sized, every label fits, and the biggest thing after PLAY is not the trophy shelf.`);
