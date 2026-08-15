// ══════════════════════════════════════════════════════════════════════════
//  UNLOCKS — a world opens by FINISHING the one before it
// ══════════════════════════════════════════════════════════════════════════
//
//  Four assertions, all through gestures a child could actually make:
//   A. FRESH PROFILE — Maple playable; the other three locked, each saying
//      which world opens it.
//   B. A LOCKED CARD REFUSES — tapping it does not navigate and does not
//      start a match. (The old bug class here is a "lock" that is purely
//      cosmetic while the click handler happily launches anyway.)
//   C. FINISHING OPENS THE NEXT ONE — play a real, short match (?len=) to its
//      end and assert the end screen shows the NEW WORLD card and that Pirate
//      Bay is unlocked afterwards.
//   D. NOBODY IS RE-LOCKED — a profile that already has a best score on Game
//      Day keeps Game Day, even though Pirate has never been finished.
//
//    node qa/unlocks.mjs
//
import { chromium } from 'playwright';

const BASE = process.env.HITCH_URL || 'http://localhost:4177/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const fail = [];
const ok = (cond, msg) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) fail.push(msg); };

async function session(seed, url = BASE) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
  await ctx.addInitScript(`(${seed.toString()})()`);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  PAGE ERROR: ' + e.message));
  const r = await page.goto(url);
  if (!r || !r.ok()) throw new Error(`server ${r ? r.status() : 'down'} at ${url}`);
  await page.waitForFunction(() => '__season' in window, undefined, { timeout: 180000 });
  // CLAIM THE DAILY FIRST, because a child does. #daily is a full-screen
  // overlay ABOVE the world picker — diagnosed with elementFromPoint at a
  // card's centre, which returned div#daily.show, hitsTheCard:false. Skipping
  // it meant every "tap" in this file landed on the reward card instead of the
  // world card, and the assertions that passed ("no navigation", "no match
  // started") passed because nothing happened at all. A probe that reaches the
  // wrong element is worse than one that fails.
  for (let i = 0; i < 12; i++) {
    const up = await page.evaluate(() => !!document.getElementById('daily')?.classList.contains('show'));
    if (!up) break;
    await page.evaluate(() => document.getElementById('dailyClaim')?.click());
    await page.waitForTimeout(900);
  }
  return { ctx, page };
}
// session two so the MENU shows (first launch is zero-tap autoplay by design)
const seenPlayer = () => {
  try { localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidFirstNom', '1'); localStorage.setItem('voidTut', '1'); } catch {}
};

// ── A + B ─────────────────────────────────────────────────────────────────
console.log('A. fresh profile — only Maple is open');
{
  const { ctx, page } = await session(seenPlayer);
  await page.evaluate(() => document.getElementById('btnPlay').click());
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => {
    const out = {};
    for (const w of ['maple', 'pirate', 'gameday', 'lantern']) {
      const c = document.querySelector(`.wCard[data-world="${w}"]`);
      out[w] = { locked: !!c?.classList.contains('locked'), best: c?.querySelector('.wBest')?.textContent ?? '' };
    }
    return out;
  });
  ok(!state.maple.locked, 'maple is playable');
  ok(state.pirate.locked, 'pirate is locked');
  ok(state.gameday.locked, 'gameday is locked');
  ok(state.lantern.locked, 'lantern is locked');
  ok(/FINISH MAPLE FALLS/.test(state.pirate.best), `pirate says how to open it — "${state.pirate.best}"`);
  ok(/FINISH PIRATE BAY/.test(state.gameday.best), `gameday names ITS gate — "${state.gameday.best}"`);

  console.log('B. tapping a locked card refuses, and does not start anything');
  const before = page.url();
  await page.click('.wCard[data-world="pirate"]', { force: true });
  // READ THE FLASH IMMEDIATELY. The 'why' class is removed after 1.6s, and a
  // 1.2s sleep plus an evaluate round-trip on swiftshader lands past that —
  // which failed the assertion while the feature worked. Tap feedback is
  // supposed to be instant, so check it instantly.
  await page.waitForTimeout(120);
  const reacted = await page.evaluate(() =>
    !!document.querySelector('.wCard[data-world="pirate"]')?.classList.contains('why'));
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => {
    const c = document.querySelector('.wCard[data-world="pirate"]');
    const best = c?.querySelector('.wBest');
    // THE TEXT MUST BE ON SCREEN, not merely in the DOM. The first version of
    // this check read #guide — which the implementation used at the time — and
    // #guide is z-index 7 UNDER the full-screen picker, so it passed nothing
    // to the player. Measure what a child could actually see: the requirement
    // lives on the card, and the card is inside the visible picker.
    const r = best?.getBoundingClientRect();
    const vis = !!r && r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight;
    return {
      url: location.href,
      started: !!(window.__matchState && window.__matchState().t > 0),
      stored: localStorage.getItem('voidWorld'),
      text: best?.textContent ?? '',
      visible: vis,
    };
  });
  after.why = reacted;
  ok(after.url === before, 'no navigation');
  ok(!after.started, 'no match started');
  ok(after.stored !== 'pirate', 'the locked world was not saved as the pick');
  ok(after.why, 'the card reacts to the tap');
  ok(after.visible && /FINISH MAPLE FALLS/.test(after.text),
    `and the reason is ON SCREEN where the finger is — "${after.text.trim()}"`);
  await ctx.close();
}

// ── C ─────────────────────────────────────────────────────────────────────
console.log('C. finishing Maple opens Pirate Bay');
{
  // ?len=12 — a real match, played to a real end, just a short one. Keep it
  // SHORT: dt is clamped at 0.05, so the game clock advances at most 0.05s per
  // frame, and a frame here costs ~0.55s of wall time — 12 game-seconds is
  // already ~4 minutes of real waiting before the outro even starts.
  const { ctx, page } = await session(seenPlayer, `${BASE}?len=12`);
  await page.evaluate(() => document.getElementById('btnPlay').click());
  await page.waitForTimeout(400);
  await page.click('.wCard[data-world="maple"]', { force: true });
  await page.waitForFunction(() => window.__matchState && window.__matchState().t > 1, undefined, { timeout: 180000 });
  // drive a little so it is a genuine match, then let the clock run out
  await page.evaluate(() => {
    const cv = document.querySelector('canvas');
    const r = cv.getBoundingClientRect();
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, clientX: r.width / 2, clientY: r.height / 2, bubbles: true }));
    let a = 0;
    setInterval(() => {
      a += 0.11;
      cv.dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 9, clientX: r.width / 2 + Math.cos(a) * 120, clientY: r.height / 2 + Math.sin(a) * 120, bubbles: true,
      }));
    }, 40);
  });
  // …and say where it got to if it does not arrive, so a timeout is a
  // diagnosis rather than a mystery
  const tick = setInterval(async () => {
    try {
      const s = await page.evaluate(() => ({
        clock: window.__matchState ? Math.round(window.__matchState().clock) : null,
        end: !!document.getElementById('end')?.classList.contains('show'),
        url: location.search,
      }));
      console.log(`     …clock ${s.clock}  end=${s.end}  ${s.url}`);
    } catch { /* page may be closing */ }
  }, 45000);
  // WAIT ON THE RECORD, NOT ONLY THE PANEL. The unlock is written in the same
  // block that paints the card, so voidUnlocked is the authoritative signal;
  // the panel is then asserted separately. A previous run sat through a
  // 900s timeout because __matchState had gone undefined — which only happens
  // if the PAGE RELOADED and dropped ?len=, restarting a full 180s match with
  // no hope of finishing. Detect that instead of waiting it out.
  await page.waitForFunction(() => {
    if (!window.__matchState) return 'reloaded';
    return document.getElementById('end')?.classList.contains('show')
      || (localStorage.getItem('voidUnlocked') || '').includes('pirate');
  }, undefined, { timeout: 900000 }).finally(() => clearInterval(tick));
  const reloaded = await page.evaluate(() => !window.__matchState);
  ok(!reloaded, 'the page did not reload out from under the match');
  await page.waitForTimeout(1500);
  const end = await page.evaluate(() => ({
    unlockCard: !!document.querySelector('#endNext .unlockCard'),
    text: document.getElementById('endNext')?.textContent ?? '',
    unlocked: localStorage.getItem('voidUnlocked') ?? '',
  }));
  ok(end.unlockCard, 'the end screen shows the NEW WORLD card');
  ok(/PIRATE BAY/.test(end.text), `it names the world — "${end.text.trim().slice(0, 56)}"`);
  ok(/pirate/.test(end.unlocked), `and it is recorded (voidUnlocked="${end.unlocked}")`);
  // …and photograph it only once it is actually ON SCREEN. #end carries a
  // fade, so a shot taken the instant the class lands catches the last frame
  // of gameplay instead of the card — the assertions above were reading a DOM
  // that was still transitioning into view.
  await page.waitForFunction(() => {
    const e = document.getElementById('end');
    return !!e && Number(getComputedStyle(e).opacity) > 0.95;
  }, undefined, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'qa/out/unlock_end.png' });
  await ctx.close();
}

// ── D ─────────────────────────────────────────────────────────────────────
console.log('D. an existing player is never re-locked');
{
  const { ctx, page } = await session(() => {
    try {
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidFirstNom', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidBest_gameday', '8400');   // played it before unlocks existed
    } catch {}
  });
  await page.evaluate(() => document.getElementById('btnPlay').click());
  await page.waitForTimeout(500);
  const gd = await page.evaluate(() => ({
    gamedayLocked: !!document.querySelector('.wCard[data-world="gameday"]')?.classList.contains('locked'),
    lanternLocked: !!document.querySelector('.wCard[data-world="lantern"]')?.classList.contains('locked'),
  }));
  ok(!gd.gamedayLocked, 'game day survived — a played world is never taken away');
  ok(gd.lanternLocked, 'but lantern, never played, is still locked');
  await ctx.close();
}

await browser.close();
console.log(fail.length ? `\nFAIL — ${fail.length}: ${fail.join(' | ')}` : '\nPASS — unlocks gate, explain, open and grandfather correctly');
process.exit(fail.length ? 1 : 0);
