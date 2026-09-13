// A TIMED MATCH RUNNING BEHIND THE DAILY REWARD CARD — AND THE FIX, INVERTED.
//
// THE ORIGINAL FINDING, which was real: switching worlds reloads the page, and
// the autoplay block at the bottom of the module starts the match on the next
// animation frame. The daily calendar was built further down that SAME module
// evaluation, so on any unclaimed day it went up first — z-index 45, full screen,
// backdrop eating every pointer event — and the match started underneath it. The
// clock ran the whole time, and the load cover (z-60) sat over the card as well,
// so the reward was not even visible while a child burned a run they could not
// steer.
//
// THE FIRST FIX made the launch WAIT for the card, and this probe drove that:
// "the card goes first, then the match". That fix is gone, because it was the
// wrong shape — a card standing between a child and PLAY is a tollbooth, and this
// is a 4+ title with no timers that pressure. The day is paid silently at the end
// of a match now, and the calendar is a read-only scrapbook page she opens if she
// wants to.
//
// SO THIS PROBE IS INVERTED, and that is the point: it guards the property the
// new design exists for. Same setup — an unclaimed day plus a world switch, which
// is the reload race nothing else in the suite covers — and the bars are now that
// NOTHING interrupts. If the tollbooth ever comes back, this fails.
//
// It used to press #dailyClaim, a button that no longer exists. `?.click()` on
// null is a no-op, so the two bars after that line were asserting against a claim
// that never ran; the probe is unregistered, which is the only reason that was
// not a green lie in the gate.
//
//   node qa/dailyrace.mjs [port]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const errs = [];
const fail = [];
// Did the BROWSER die, or did the game? "Target page has been closed" reads the
// same either way and they need different responses — a crash is retried, a game
// failure is fixed.
let alive = true;
b.on('disconnected', () => { alive = false; });
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${label}${detail ? `   ${detail}` : ''}`);
  if (!cond) fail.push(label);
};

try {
const p = await b.newPage({ viewport: { width: 420, height: 860 } });
p.on('pageerror', (e) => errs.push('pageerror: ' + String(e.message).slice(0, 200)));
p.on('crash', () => errs.push('THE PAGE CRASHED (renderer gone)'));
p.on('close', () => errs.push('the page closed'));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
// a day that has NOT been claimed: voidDailyLast is yesterday, so the day is owing
// for the whole run. That is the state the old race needed and it is the state the
// new design must sail straight through.
await p.addInitScript(() => {
  if (!localStorage.getItem('voidSeeded')) {
    const yd = new Date(Date.now() - 86400000).toDateString();
    localStorage.clear();
    localStorage.setItem('voidSeeded', '1');
    localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', yd);
    localStorage.setItem('voidDailyStreak', '3');
    localStorage.setItem('voidStreakDay', yd);
    localStorage.setItem('voidWorld', 'maple');
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  }
});
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });

const state = () => p.evaluate(() => {
  const on = (id) => {
    const el = document.getElementById(id);
    if (!el) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05;
  };
  return {
    daily: on('daily'),
    cover: on('loadScr'),
    clock: window.__matchState?.().clock ?? -1,
    inMatch: !document.body.classList.contains('menu'),
  };
});

// THE DAY IS OWING. Held against dailyDue() rather than against the card, because
// the whole question is whether an owed day interrupts anything — and a probe that
// looked for the card would pass trivially now that no card opens.
const due = await p.evaluate(() => window.__dailyDue());
console.log(`seeded day owes: ${due ? `day ${due.day + 1}, streak ${due.streak}, ${due.coins} coins` : 'NOTHING'}`);
ok(!!due, 'the seeded profile really has an unclaimed day', due ? '' : 'the seeding did not take, so this probe proves nothing');

const boot = await state();
console.log(`on the menu: ${JSON.stringify(boot)}`);
ok(!boot.daily, 'no reward card on the menu — she opens the scrapbook if she wants it', `daily=${boot.daily}`);

// PLAY -> a DIFFERENT world, which forces the reload the original race needed
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1200);
const picked = await p.evaluate(() => {
  const cur = localStorage.getItem('voidWorld') || 'maple';
  const c = [...document.querySelectorAll('#worldRow .wCard[data-world]')]
    .find((x) => x.dataset.world !== cur);
  const id = c?.dataset.world;
  c?.click();
  return id;
});
ok(!!picked, 'switched to another world', String(picked));

// WATCH THE WHOLE RELOAD, do not sample the end of it. The bug this probe was
// written for lived in a window a few frames wide: the card up, the cover over it,
// the clock already running. Polling through the reload is the only way to see it,
// and a single read afterwards is how it would be missed.
let sawCard = false, sawBurn = false, burnDetail = '';
let prevClock = -1;
for (let i = 0; i < 90; i++) {
  const s = await state().catch(() => null);
  if (!s) { await p.waitForTimeout(1000); continue; }   // mid-navigation
  if (s.daily) sawCard = true;
  // the clock moving while a card or the cover owns the screen is the original bug
  if ((s.daily || s.cover) && prevClock > 0 && s.clock > 0 && s.clock < prevClock - 0.4) {
    sawBurn = true; burnDetail = `clock ${prevClock} -> ${s.clock} with daily=${s.daily} cover=${s.cover}`;
  }
  prevClock = s.clock;
  if (s.inMatch && s.clock > 0 && s.clock < 180 && !s.cover) break;
  await p.waitForTimeout(1000);
}

const held = await state();
console.log(`after the switch: ${JSON.stringify(held)}`);
await p.screenshot({ path: 'qa-out/dailyrace.png' });
ok(!sawCard, 'no reward card ever appeared across the whole reload', sawCard ? 'a card went up — the tollbooth is back' : '');
ok(!sawBurn, 'the match clock never ran behind a card or the load cover', burnDetail);
ok(held.inMatch, 'the world switch went straight into the match', `inMatch=${held.inMatch}`);
ok(!held.cover, 'and the load cover is gone', `cover=${held.cover}`);

// AND THE DAY IS STILL OWED. The point of moving the claim to endMatch is that
// she is paid for playing, not for dismissing a modal — so an unclaimed day must
// survive the launch and be paid at the buzzer, not lost on the way in.
const stillDue = await p.evaluate(() => window.__dailyDue());
ok(!!stillDue, 'the unclaimed day survived the launch and is still owed', stillDue ? `${stillDue.coins} coins waiting` : 'the day was consumed by the launch');

} catch (e) {
  fail.push('threw: ' + String(e && e.message || e).split('\n')[0]);
  console.log(' FAIL  threw: ' + String(e && e.message || e).split('\n')[0]);
} finally {
  // IN THE FINALLY, NOT AFTER THE LAST BAR. The first version of this printed the
  // page errors at the end of the try block, so the one run in five that threw
  // swallowed the only evidence of WHY — which is the opposite of what a probe is
  // for. A throw is exactly when this dump matters.
  if (errs.length) console.log('\nPAGE ERRORS:', errs.slice(0, 6));
  else console.log('\n(no page errors)');
  if (!alive) console.log('the browser DISCONNECTED — a crash, not a game failure');
  await b.close().catch(() => { });
}
console.log(fail.length
  ? `\nFAIL — ${fail.length} bar(s): ${fail.join(' | ')}`
  : '\nPASS — an owed day interrupts nothing: the match goes, and the day is still owed at the buzzer');
process.exit(fail.length ? 1 : 0);
