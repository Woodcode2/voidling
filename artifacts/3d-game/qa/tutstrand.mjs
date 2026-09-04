// SESSION TWO, SWITCH WORLDS, AND THE GAME NEVER STARTS.
//
// Three ordinary facts combine into a dead end:
//
//   1. First launch skips the menu and calls beginMatch() directly
//      (prototype3d.ts:3551-3554). That writes voidPlayed but NOT voidTut —
//      only the teach card's own button writes voidTut. So every player begins
//      session two with voidPlayed='1' and voidTut unset.
//   2. Picking a DIFFERENT world sets voidAutoPlay and reloads the page, because
//      the island has to be rebuilt (:3659-3662).
//   3. On the way back in, the autoplay block takes coverHold('pack')
//      SYNCHRONOUSLY — deliberately, to stop the curtain snapping back — and
//      then calls launchWorld() (:3687-3689).
//
// launchWorld() sees no voidTut, shows the teach card and RETURNS (:3514). It
// never reaches withWorldReady(), and withWorldReady() is the only thing that
// releases the 'pack' hold. So the cover stays up forever — and #loadScr is
// z-index 60 against #tut's z-index 12, so the card the child is supposed to
// tap is UNDERNEATH it. Menu hidden, card unreachable, cover permanent.
//
// This is the same failure withWorldReady's own comment already documents
// having fixed once: "nobody ever released it ... a frozen 100% loading screen
// over the whole screen forever while the match played out behind it". That fix
// covered the fast path. This is the tutorial door into the same room.
//
//   node qa/tutstrand.mjs [port]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 420, height: 860 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));

// EXACTLY session two: they have played, they have never seen the teach card.
await p.addInitScript(() => {
  if (!localStorage.getItem('voidSeeded')) {
    localStorage.clear();
    localStorage.setItem('voidSeeded', '1');
    localStorage.setItem('voidPlayed', '1');            // first launch happened
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.removeItem('voidTut');                  // …and never wrote this
    localStorage.setItem('voidWorld', 'maple');
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');   // the picker refuses a locked world since 589e31e (refute-popup, correction 6)
  }
});
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });

const fail = [];
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${label}${detail ? `   ${detail}` : ''}`);
  if (!cond) fail.push(label);
};

const state = () => p.evaluate(() => {
  const vis = (id) => {
    const el = document.getElementById(id);
    if (!el) return { on: false, z: 0 };
    const cs = getComputedStyle(el);
    return {
      on: cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05,
      z: Number(cs.zIndex) || 0,
    };
  };
  return {
    cover: vis('loadScr'),
    tut: vis('tut'),
    menu: getComputedStyle(document.getElementById('menu')).display !== 'none',
    // A MATCH IS RUNNING WHEN THE CLOCK IS RUNNING. __voidState() returns only
    // {x, z, r} — it has no `started` field, so an earlier version of this probe
    // read undefined and called it "no match" no matter what the game did.
    clock: window.__matchState?.().clock ?? -1,
    hud: !document.body.classList.contains('menu'),
  };
});

console.log(`session two: voidPlayed set, voidTut unset — before the switch:`);
console.log('   ', JSON.stringify(await state()));

// PLAY -> pick a world that is NOT the current one, which forces the reload
await p.click('#btnPlay');
await p.waitForTimeout(1200);
const picked = await p.evaluate(() => {
  const cur = localStorage.getItem('voidWorld') || 'maple';
  const card = [...document.querySelectorAll('#worldRow .wCard[data-world]')]
    .find((c) => c.dataset.world !== cur);
  if (!card) return null;
  const id = card.dataset.world;
  card.click();
  return id;
});
ok(!!picked, 'a second world exists to switch to', String(picked));

// the switch reloads the page; wait for the new document to come up
await p.waitForTimeout(2500);
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.locator('#tapGate').dispatchEvent('pointerdown');   // armGate (29a4d6c) needs a pointerdown on the reload path (refute-popup, correction 6)

// Give it a genuinely generous run at loading. The pack wait is capped at 12s
// inside withWorldReady, so anything still covered well past that is not slow,
// it is stuck.
let s = null;
for (let i = 0; i < 30; i++) {
  s = await state();
  if (!s.cover.on) break;
  await p.waitForTimeout(1000);
}
console.log(`after the world switch: ${JSON.stringify(s)}`);
await p.screenshot({ path: 'qa-out/tutstrand.png' });

ok(!s.cover.on || s.tut.z > s.cover.z,
  'the child can reach whatever is asking them to tap',
  `cover z=${s.cover.z} on=${s.cover.on}, tut z=${s.tut.z} on=${s.tut.on}`);

// …and prove they can actually get OUT: tap the teach card and reach a match.
// Reachable means the card is up and NOTHING is covering it — once the cover is
// gone its z-index is irrelevant, which an earlier version of this check got
// wrong and reported as a product failure.
if (s.tut.on && !s.cover.on) {
  await p.evaluate(() => document.querySelector('#tut button')?.click());
}
// the clock advancing is the proof: a match that exists but is frozen behind a
// cover is exactly the bug this probe is about
let end = await state();
for (let i = 0; i < 25; i++) {
  end = await state();
  if (end.hud && end.clock > 0) break;
  await p.waitForTimeout(1000);
}
const first = end.clock;
await p.waitForTimeout(2500);
const later = await state();
ok(end.hud && end.clock > 0, 'and a match actually starts', JSON.stringify(end));
// the match clock counts DOWN from 180, so "running" means it went lower
ok(later.clock < first, 'and its clock is running, not frozen behind a cover',
  `${first.toFixed(1)}s -> ${later.clock.toFixed(1)}s`);

if (errs.length) console.log('\nPAGE ERRORS:', errs.slice(0, 4));
await b.close();
console.log(fail.length ? `\nFAIL (${fail.length}): ${fail.join(' | ')}` : '\nno dead end');
process.exit(fail.length ? 1 : 0);
