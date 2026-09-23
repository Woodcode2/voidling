// THE RESULTS CARD, WITHOUT THE MATCH SHOWING THROUGH IT
//
//   node qa/endghost.mjs [port] [world]
//
// Studio round 4, Job 7 ("screens without ghosts"). #end is a 0.82 scrim over
// a live page, and nothing took the match's HUD down when it came up: the clock,
// the pause button, a bulletin or a banner still in flight, a countdown
// numeral, a crowd bubble, a score floater — and the goal chip, which sits at
// z-index 12, ABOVE the card: qa/out/hudshots/maple-endcard.png, shot on the
// card's first frames, reads "EAT 18,020 / 18,000" over the result it produced,
// until the HUD's 0.2 s tick (refreshGoalChip) catches up and hides it. And the
// switch index.html already has for exactly this — body.ovl, which six HUD
// rules key on — was only ever set by an observer inside the DEV-only
// build-stamp block, and #end was not in its list.
//
// Drive: a level match (?g=1, so the goal chip exists), the dot's EAT line
// crossed with __setScore so the card opens through the game's own goal door.
// The HUD is read TWICE: on the first animation frame after #end gains .show
// (an in-page observer, so no reading depends on the probe's round-trip), and
// again 1.2 s of tClock later. Then the in-flight furniture is STAGED over the
// card — a bulletin, a banner, a countdown numeral, the wayfinder, the form
// callout, the NOMS pill, one crowd bubble and one floater, each forced visible
// with inline styles — because each one lives for a second or two and whether
// it happens to be up at the buzzer is luck. Staging asks the question the CSS
// has to answer: if one WERE up when the card came, would it show?
//
// Then HOME, the shop from the front door, and the profile's TROPHIES tab and
// BACK — the places body.ovl has to be right on a shipped build.
//
// Every visibility reading is the page's own: getClientRects() (display:none on
// the element or an ancestor leaves none), computed visibility, the product of
// opacity up the ancestor chain, and a box that intersects the viewport.
// Stacking under the scrim is NOT forgiveness: the card fades in over 0.28 s
// now, and for those frames there is no scrim to hide behind.
//
// THE BARS
//   (a) on the card's first frame and 1.2 s in, nothing the match left on
//       screen is visible: #timer, #btnQuit, #goal, #growth — no staging, this
//       is what a child sees today
//   (b) with the card up, none of the eight staged in-flight elements is
//       visible (#news, #banner, #count span, #wayfind, #form, #noms, .vb, .vf)
//   (c) #coins IS visible on the card — the wallet the payout lands in stays
//   (d) body.ovl is set on the card's first frame and 1.2 s in
//   (e) on a PRODUCTION build, body.ovl is clear on the bare menu and set with
//       the shop open. On a dev server this bar is a FAIL by construction: the
//       observer always ran in DEV, so a pass there is not evidence of anything
//   (f) after TROPHIES then BACK, body.ovl is clear — a profile pane keeps its
//       own .show after the profile closes, and a list that names a pane
//       would hold the whole HUD down for the rest of the session
import { chromium } from 'playwright';

const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = POS[0] || '4177';
const WORLD = POS[1] || 'maple';

const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${(e && e.message) || e}`));
process.on('unhandledRejection', (e) => die(`rejected: ${(e && e.message) || e}`));

const LEFT = ['#timer', '#btnQuit', '#goal', '#growth'];
const STAGED = ['#news', '#banner', '#count span', '#wayfind', '#form', '#noms', '.vb', '.vf'];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidFirstNom', '1');
  // a wallet with something in it: addCoins() hides a ZERO wallet on purpose,
  // and bar (c) is about the card keeping a wallet that exists
  localStorage.setItem('voidCoins', '500');
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  // the day's coins are claimed silently on the first finish of the day; seeded
  // so this run is on the far side of midnight from that (idiomguard guard 3)
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private mode */ } });
// THE PAGE'S OWN EYES, installed before the game boots.
await p.addInitScript((left) => {
  /** can a child see anything this selector matches? one line per visible node */
  window.__egLook = (sels) => {
    const out = [];
    for (const sel of sels) {
      for (const el of document.querySelectorAll(sel)) {
        if (!el.getClientRects().length) continue;              // display:none, here or above
        if (getComputedStyle(el).visibility !== 'visible') continue;
        let op = 1;
        for (let a = el; a && a !== document.documentElement; a = a.parentElement) op *= +getComputedStyle(a).opacity;
        if (op < 0.02) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) continue;
        out.push(`${sel} ${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)}, opacity ${op.toFixed(2)}`);
      }
    }
    return out;
  };
  // the card's FIRST FRAME: the frame after the class lands, read before the
  // HUD's 0.2 s tick has had a chance to tidy anything away
  const arm = () => {
    const end = document.getElementById('end');
    if (!end) { setTimeout(arm, 50); return; }
    new MutationObserver(() => {
      if (!end.classList.contains('show') || window.__egOpen) return;
      window.__egOpen = 'pending';
      requestAnimationFrame(() => {
        window.__egOpen = { left: window.__egLook(left), ovl: document.body.classList.contains('ovl') };
      });
    }).observe(end, { attributes: true, attributeFilter: ['class'] });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm); else arm();
}, LEFT);
// ?len= is what makes a harness match auto-start; ?g=1 makes it a level, so
// the goal chip is on screen and the card opens through the goal door
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&g=1&len=60`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });

const build = await p.evaluate(() => ({
  dev: !!document.querySelector('script[src*="/src/prototype3d"], script[src*="/@vite/client"]'),
  hooks: ['__levelSpec', '__setScore', '__goalState', '__matchState'].filter((h) => typeof window[h] !== 'function'),
}));
if (build.hooks.length) die(`this build has no ${build.hooks.join(', ')} — it cannot open the card through the goal door`);
console.log(`\n  END GHOSTS — ${WORLD} on :${PORT} (${build.dev ? 'DEV server' : 'production build'})\n`);

const setup = await p.evaluate(() => ({ eat: window.__levelSpec().eat, goal: window.__goalState(),
  goalShown: !!document.getElementById('goal') && !document.getElementById('goal').hidden }));
if (!setup.goal || setup.goal.n !== 1) die(`?g=1 did not make this a dot-1 level match (goal ${JSON.stringify(setup.goal)})`);
if (!setup.goalShown) die('the goal chip is not up in a level match — bar (a) would pass on its absence');
await p.evaluate((eat) => window.__setScore(eat + 1), setup.eat);
await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000, polling: 250 });
await p.waitForFunction(() => window.__egOpen && window.__egOpen !== 'pending', null, { timeout: 300000, polling: 100 });
const cardT = await p.evaluate(() => window.__matchState().tClock);
await p.waitForFunction((t) => window.__matchState().tClock > t + 1.2, cardT, { timeout: 600000, polling: 250 });

let bad = 0, bars = 0;
const bar = (ok, id, msg) => { bars++; console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };

// ── (a) what the match left on screen, unstaged ─────────────────────────────
const open = await p.evaluate(() => window.__egOpen);
const later = await p.evaluate((s) => window.__egLook(s), LEFT);
for (const g of open.left) console.log(`  ·      first frame: ${g}`);
for (const g of later) console.log(`  ·      1.2 s in:    ${g}`);
bar(!open.left.length && !later.length, 'a', open.left.length || later.length
  ? `the match's HUD shows on the results card — ${open.left.length} piece(s) on its first frame, ${later.length} still there 1.2 s in`
  : `none of ${LEFT.join(', ')} shows on the card, on its first frame or 1.2 s in`);

// ── (b) the in-flight furniture, staged over the card ───────────────────────
const staged = await p.evaluate(() => {
  const done = [];
  const up = (el, text) => {
    if (!el) return;
    if (text != null) el.textContent = text;
    el.style.animation = 'none'; el.style.opacity = '1'; el.style.visibility = 'visible';
    done.push(el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`);
  };
  const news = document.getElementById('news');
  if (news) { news.classList.add('show'); up(news, 'MAPLE ISLE NEWS · STILL ON AIR'); }
  const ban = document.getElementById('banner');
  if (ban) { ban.innerHTML = '<div class="bCard"><span class="bTx">STILL UP</span></div>'; ban.classList.add('show'); up(ban); }
  const cnt = document.querySelector('#count span');
  if (cnt) { cnt.classList.remove('pop'); up(cnt, '3'); cnt.style.transform = 'none'; }
  for (const id of ['wayfind', 'noms', 'form']) {
    const e = document.getElementById(id);
    if (!e) continue;
    e.classList.add('on');
    e.style.left = '215px'; e.style.top = '420px';
    up(e, id === 'wayfind' ? null : id === 'noms' ? '12 NOMS' : 'CHOMPOSAURUS');
  }
  // a pooled node nobody is using, so the pool's own retire cannot undo it
  const vb = [...document.querySelectorAll('.vb')].find((e) => !e.classList.contains('show')) || document.querySelector('.vb');
  if (vb) { vb.classList.add('show'); vb.style.left = '215px'; vb.style.top = '520px'; up(vb, 'is it over?'); }
  const vf = document.querySelector('.vf:not(.go):not(.fly)') || document.querySelector('.vf');
  if (vf) { vf.className = 'vf fly'; vf.style.left = '215px'; vf.style.top = '600px'; up(vf, '+49'); }
  return done;
});
// a painted frame on the page's own clock, so the staging has been styled
{
  const t0 = await p.evaluate(() => window.__matchState().tClock);
  await p.waitForFunction((t) => window.__matchState().tClock > t + 0.1, t0, { timeout: 600000, polling: 100 });
}
console.log(`  ·    staged over the card: ${staged.join(' ') || 'nothing — the elements are gone'}`);
if (staged.length < STAGED.length) die(`staged ${staged.length} of ${STAGED.length} elements — an element this probe grades is missing from the page, so (b) would pass on its absence`);
const flying = await p.evaluate((s) => window.__egLook(s), STAGED);
for (const g of flying) console.log(`  ·      ${g}`);
bar(!flying.length, 'b', flying.length
  ? `${flying.length} in-flight element(s) would show on the results card if they were up at the buzzer`
  : `none of the ${STAGED.length} staged in-flight elements shows on the results card`);

// ── (c) and (d) ──────────────────────────────────────────────────────────────
const wallet = await p.evaluate(() => window.__egLook(['#coins']));
const coinText = await p.evaluate(() => document.getElementById('coins')?.textContent?.trim() ?? '');
bar(wallet.length === 1, 'c', wallet.length
  ? `#coins stays on the card (${coinText})`
  : `#coins is gone from the card — the wallet the payout lands in (reads "${coinText}")`);
const ovlLater = await p.evaluate(() => document.body.classList.contains('ovl'));
bar(open.ovl && ovlLater, 'd', open.ovl && ovlLater ? 'body.ovl is set on the card, first frame and 1.2 s in'
  : `body.ovl is NOT set on the results card (first frame ${open.ovl}, 1.2 s in ${ovlLater}) — the six HUD rules that key on it do nothing here`);

// ── (e) HOME, then the shop from the front door ──────────────────────────────
await p.evaluate(() => document.getElementById('btnHome')?.click());
await p.waitForFunction(() => document.body.classList.contains('menu')
  && !document.getElementById('end')?.classList.contains('show'), null, { timeout: 300000 });
await p.waitForTimeout(400);
const ovlOnMenu = await p.evaluate(() => document.body.classList.contains('ovl'));
await p.evaluate(() => document.getElementById('btnShop')?.click());
await p.waitForFunction(() => document.getElementById('shop')?.classList.contains('show'), null, { timeout: 300000 });
await p.waitForTimeout(400);
const ovlOnShop = await p.evaluate(() => document.body.classList.contains('ovl'));
console.log(`  ·    body.ovl on the bare menu after HOME: ${ovlOnMenu ? 'SET' : 'clear'}; with the shop open: ${ovlOnShop ? 'set' : 'CLEAR'}`);
if (build.dev) {
  bar(false, 'e', 'this is a DEV server, where the observer always ran — point this at the production build (vite preview of dist) for (e) to mean anything');
} else {
  bar(ovlOnShop && !ovlOnMenu, 'e', ovlOnShop && !ovlOnMenu
    ? 'production build: body.ovl clear on the menu, set with the shop open'
    : ovlOnShop
      ? 'production build: body.ovl is set in the shop, but it was already set on the bare menu — it is not tracking the sheet'
      : 'production build: the shop is open and body.ovl is not set — every body.ovl rule is dead in a shipped build');
}

// ── (f) TROPHIES, then BACK ──────────────────────────────────────────────────
await p.evaluate(() => document.getElementById('btnBack')?.click());
await p.waitForFunction(() => !document.getElementById('shop')?.classList.contains('show'), null, { timeout: 300000 });
await p.evaluate(() => document.getElementById('btnBook')?.click());
await p.waitForFunction(() => document.getElementById('profile')?.classList.contains('show'), null, { timeout: 300000 });
await p.evaluate(() => document.querySelector('.profTab[data-pane="trophies"]')?.click());
await p.waitForFunction(() => document.getElementById('trophies')?.classList.contains('show'), null, { timeout: 300000 });
await p.evaluate(() => document.querySelector('#profile .backBtn[data-close="profile"]')?.click());
await p.waitForFunction(() => !document.getElementById('profile')?.classList.contains('show'), null, { timeout: 300000 });
await p.waitForTimeout(400);
const after = await p.evaluate(() => ({ ovl: document.body.classList.contains('ovl'),
  pane: !!document.getElementById('trophies')?.classList.contains('show') }));
bar(!after.ovl, 'f', after.ovl
  ? `body.ovl is still set on the menu after TROPHIES then BACK (the pane's own .show: ${after.pane}) — the whole HUD would stay down`
  : `body.ovl clears on BACK from TROPHIES (the pane keeps its own .show: ${after.pane}, and nothing listens to it)`);

await b.close();
console.log(bad ? `\nFAIL — ${bad} of ${bars} bar(s)` : `\nPASS — ${bars} bar(s)`);
process.exit(bad ? 1 : 0);
