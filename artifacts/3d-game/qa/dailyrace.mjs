// A TIMED MATCH RUNNING BEHIND THE DAILY REWARD CARD.
//
// Switching worlds reloads the page, and the autoplay block at the bottom of
// the module starts the match on the next animation frame. The daily calendar
// is built further down that SAME module evaluation, so on any day the card has
// not been claimed yet it goes up first — z-index 45, full screen, backdrop
// eating every pointer event — and the match then starts underneath it.
//
// The clock is running the whole time. A child watching their reward card is
// burning a three-minute run they cannot steer, and the load cover (z-60) sits
// over the card as well, so the reward is not even visible while it happens.
//
// The launch waits for the card now. This drives it: seed an unclaimed day,
// switch worlds, and check that nothing starts until the card is dealt with —
// then that dealing with it does start the match.
//
//   node qa/dailyrace.mjs [port]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const errs = [];
const fail = [];
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${label}${detail ? `   ${detail}` : ''}`);
  if (!cond) fail.push(label);
};

const p = await b.newPage({ viewport: { width: 420, height: 860 } });
p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
// a day that has NOT been claimed: voidDailyLast is yesterday, so the card is due
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

// dismiss the first card by tapping the backdrop, so the day stays unclaimed
await p.waitForSelector('#daily.show', { timeout: 30000 }).catch(() => { });
await p.evaluate(() => document.getElementById('daily')?.classList.remove('show'));

// PLAY -> a DIFFERENT world, which forces the reload
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
await p.waitForTimeout(2500);
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForSelector('#daily.show', { timeout: 60000 }).catch(() => { });
await p.waitForTimeout(2500);

const held = await state();
console.log(`after the switch: ${JSON.stringify(held)}`);
await p.screenshot({ path: 'qa-out/dailyrace.png' });
ok(held.daily, 'the reward card is up');
ok(!held.cover, 'and it is not buried under the loading cover', `cover=${held.cover}`);
ok(!held.inMatch, 'and no match has started underneath it', `inMatch=${held.inMatch}`);

// the clock must not be running while the card owns the screen
const c1 = held.clock;
await p.waitForTimeout(3000);
const c2 = (await state()).clock;
ok(c1 === c2, 'the match clock is not burning behind the card', `${c1} -> ${c2}`);

// …and dealing with the card must actually start the match
await p.evaluate(() => document.getElementById('dailyClaim')?.click());
let after = null;
for (let i = 0; i < 40; i++) {
  after = await state();
  if (after.inMatch && after.clock < 180) break;
  await p.waitForTimeout(1000);
}
console.log(`after claiming: ${JSON.stringify(after)}`);
ok(after.inMatch, 'claiming starts the match that was waiting', `inMatch=${after.inMatch}`);
ok(!after.daily, 'and the card is gone', `daily=${after.daily}`);

if (errs.length) console.log('\nPAGE ERRORS:', errs.slice(0, 4));
await b.close();
console.log(fail.length ? `\nFAIL (${fail.length}): ${fail.join(' | ')}` : '\nthe card goes first, then the match');
process.exit(fail.length ? 1 : 0);
