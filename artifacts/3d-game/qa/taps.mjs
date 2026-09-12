// ── HOW MANY TAPS FROM OPENING THE APP TO PLAYING, ON BOTH SIDES OF MIDNIGHT ──
//
// MENU-BRIEF §4.7 bar 1 and §5.1 bar 5. The number is supposed to be ONE, and it
// is one — on the day a probe runs. It is not one on the day after.
//
// WHY NO PROBE HAS EVER CAUGHT THIS. `#daily` rises full-screen at module init
// whenever `voidDailyLast !== today`, and **383 probe files in this directory
// seed `voidDailyLast` to today** — every single one of them, because a probe
// that did not would have had its first click eaten by a modal and its author
// would have added the seed and moved on. So the calendar card is, in QA terms,
// a screen this game does not have. The child skeptic caught it by reading;
// this measures it.
//
// WHAT IT COSTS A CHILD. On her SECOND day — the single most important morning
// in the whole retention loop — the first thing the game asks a five-year-old to
// press is a full-screen modal whose only button is the word CLAIM. She cannot
// read it. MENU-BRIEF §1.2 decided where it goes instead: PLAY is never behind
// it; the day's coins are claimed silently on the first finish of the day and
// counted up on the end card, where the ceremony already lives; the calendar
// page itself becomes a chapter in the scrapbook.
//
// THE THIRD BAR IS THE ONE THAT MATTERS MOST. Taking a modal off the path is
// easy and taking a child's coins with it is easy too. Bar 3 plays a real match
// on a profile that is a day stale and checks the wallet actually grew by the
// day's amount and that `voidDailyLast` rolled — so "we removed the card" can
// never quietly mean "we removed the reward".
//
// NO NAVIGATION, EITHER. `window.__marker` is set before the click and read
// after: PLAY launches the built world in place (§1.2), and a reload would lose
// the diorama, the ladder's last picture and about four seconds of a child's
// attention. A probe that only counted clicks would not notice.
//
//   node qa/taps.mjs [port]
import { chromium } from 'playwright';

const PORT = (process.argv.slice(2).filter((a) => !a.startsWith('--'))[0]) || '4177';
const ONLY = (() => {
  const f = process.argv.find((a) => a.startsWith('--only='));
  return f ? new Set(f.slice(7).split(',').map((x) => x.trim())) : null;
})();
const want = (n) => !ONLY || ONLY.has(String(n));
const WORLD = 'maple';
const t0 = Date.now();
const bad = [];
let bars = 0;
const ok = (m) => { bars++; console.log(`  ok   ${m}  [${((Date.now() - t0) / 1000).toFixed(0)}s]`); };
const no = (m) => { bars++; bad.push(m); console.log(`  BAD  ${m}  [${((Date.now() - t0) / 1000).toFixed(0)}s]`); };

process.on('uncaughtException', (e) => {
  console.log(`\nFAIL — taps threw: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });
process.on('unhandledRejection', (e) => {
  console.log(`\nFAIL — taps rejected: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const YESTERDAY = new Date(Date.now() - 86400000).toDateString();
const TODAY = new Date().toDateString();

/** A page whose profile is written before the game's first line. `last` is what
 *  goes in voidDailyLast — today, or a day stale. */
const open = async (ctx, { last, q = '', coins = '500' } = {}) => {
  const p = await ctx.newPage();
  p.__errs = [];
  p.on('pageerror', (e) => p.__errs.push(String(e && e.message || e).split('\n')[0]));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(([lastSeen, c]) => {
    try {
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidMute', '1');
      localStorage.setItem('voidCoins', c);
      localStorage.setItem('voidUnlocked', 'maple,pirate');
      localStorage.setItem('voidDailyLast', lastSeen);
      // a ladder that has been seen, so the first reveal is not part of what
      // this probe is measuring
      localStorage.setItem('voidLevels', JSON.stringify({ v: 1, seen: 1,
        w: { maple: { 1: { st: 'open', best: 0, pct: 0, first: '', n: 0 } } } }));
    } catch { }
  }, [last, coins]);
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&manual=1${q}`,
    { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__matchState && !!window.__menuState, null, { timeout: 420000 });
  return p;
};

/** Everything that must be true for "one tap" to mean one tap. */
const tapOnce = async (p, label) => {
  // a token this page can only keep if it is never reloaded
  await p.evaluate(() => { window.__marker = 'kept'; });
  // watch the two overlays for the whole attempt, not just at the end: a modal
  // that appears and is dismissed still ate her tap
  await p.evaluate(() => {
    window.__sawOverlay = [];
    const check = () => {
      for (const id of ['daily', 'gift', 'worlds']) {
        if (document.getElementById(id)?.classList.contains('show')
          && !window.__sawOverlay.includes(id)) window.__sawOverlay.push(id);
      }
    };
    check();
    window.__overlayTimer = setInterval(check, 60);
  });
  const before = await p.evaluate(() => ({
    world: window.__menuState().world,
    menuShown: getComputedStyle(document.getElementById('menu')).display !== 'none',
  }));
  await p.click('#btnPlay', { timeout: 60000 }).catch((e) => {
    no(`${label}: PLAY could not be clicked at all — ${String(e.message).split('\n')[0]}`);
  });
  const armed = await p.waitForFunction(() => window.__matchState().armed === true,
    null, { timeout: 300000 }).then(() => true).catch(() => false);
  const after = await p.evaluate(() => {
    clearInterval(window.__overlayTimer);
    return {
      marker: window.__marker, armed: window.__matchState().armed,
      world: window.__menuState().world,
      menuShown: getComputedStyle(document.getElementById('menu')).display !== 'none',
      overlays: window.__sawOverlay.slice(),
    };
  });
  return { before, after, armed };
};

// ═══ BARS 1 AND 2 · ONE TAP, ON BOTH SIDES OF MIDNIGHT ═════════════════════
for (const [n, last, when] of [[1, TODAY, 'today'], [2, YESTERDAY, 'a day stale']]) {
  if (!want(n)) continue;
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  const p = await open(ctx, { last });
  const r = await tapOnce(p, `#${n}`);
  const why = [];
  if (!r.armed) why.push('the match never armed');
  if (r.after.menuShown) why.push('#menu is still on screen');
  if (r.after.marker !== 'kept') why.push('the page NAVIGATED (a reload, not a launch)');
  if (r.after.world !== r.before.world) why.push(`the world changed ${r.before.world} → ${r.after.world}`);
  for (const o of r.after.overlays) why.push(`#${o} took the screen`);
  if (!why.length) ok(`#${n} one tap plays, with voidDailyLast ${when}: armed, menu gone, no overlay, no navigation`);
  else no(`#${n} it is NOT one tap with voidDailyLast ${when} — ${why.join('; ')}`
    + (p.__errs.length ? ` · page said: ${p.__errs.join(' | ')}` : ''));
  await ctx.close();
}

// ═══ BAR 3 · AND THE DAY'S COINS ARE STILL PAID ════════════════════════════
// Taking the card off the path must not take the reward with it. A real match on
// a day-stale profile: the wallet has to grow by at least the day's amount and
// voidDailyLast has to roll to today, whoever or whatever claimed it.
if (want(3)) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  // ?len=8 sets DEBUG_HARNESS, which sets AUTO_START — the match starts itself,
  // so this measures the finish rather than the tap (bars 1 and 2 own the tap).
  const p = await open(ctx, { last: YESTERDAY, q: '&len=8&g=1', coins: '500' });
  const ran = await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.5,
    null, { timeout: 300000 }).then(() => true).catch((e) => String(e.message || e));
  if (ran !== true) {
    no(`#3 the harness match never started, so there was no finish to pay on: ${String(ran).split('\n')[0]}`
      + (p.__errs.length ? ` · page said: ${p.__errs.join(' | ')}` : ''));
  } else {
    const ended = await p.waitForSelector('#end.show', { timeout: 600000 })
      .then(() => true).catch((e) => String(e.message || e));
    if (ended !== true) {
      no(`#3 the match never reached the end card: ${String(ended).split('\n')[0]}`
        + (p.__errs.length ? ` · page said: ${p.__errs.join(' | ')}` : ''));
    } else {
      // the count-up takes 900ms and the day's claim may ride it
      await new Promise((r) => setTimeout(r, 2500));
      const w = await p.evaluate(() => ({
        coins: Number(localStorage.getItem('voidCoins') || 0),
        last: localStorage.getItem('voidDailyLast'),
        life: localStorage.getItem('voidDailyLife'),
        dailyShown: !!document.getElementById('daily')?.classList.contains('show'),
        endSub: (document.getElementById('endSub')?.textContent || '').trim(),
      }));
      // DAILY[0] is 90 at week 1; any honest claim is at least that
      const grew = w.coins - 500;
      if (w.last === TODAY) ok(`#3a the day rolled without a modal: voidDailyLast is today, life=${w.life}`);
      else no(`#3a the day never rolled — voidDailyLast is still "${w.last}", so tomorrow she is asked again`);
      if (grew >= 90) ok(`#3b and the coins were actually paid: 500 → ${w.coins} (+${grew}), "${w.endSub.slice(0, 60)}"`);
      else no(`#3b the reward went missing with the card: wallet 500 → ${w.coins} (+${grew}), under the 90 a day-1 claim pays`);
      if (!w.dailyShown) ok(`#3c and #daily never took the screen`);
      else no(`#3c #daily still took the screen`);
    }
  }
  await ctx.close();
}

await b.close();
const secs = ((Date.now() - t0) / 1000).toFixed(0);
if (bad.length) {
  console.log('');
  for (const m of bad) console.log(`  · ${m}`);
  console.log(`\nFAIL — ${bad.length} of ${bars} bar(s) [${secs}s]`);
  process.exit(1);
}
console.log(`\nPASS — ${bars} bars${ONLY ? ` (--only=${[...ONLY].join(',')}, NOT a full run)` : ''}, `
  + `one tap plays on both sides of midnight and the day is still paid [${secs}s]`);
