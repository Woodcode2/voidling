// THE STREAK REWARD USED TO ARRIVE IN SILENCE.
//
// Prism is the seven-day prize. It was granted by a line inside the shop's own
// refresh() — which only runs while the shop is OPEN — so a child who came
// back seven mornings running got confetti for the coins and nothing at all
// for the thing those seven mornings were for. The unlock was discoverable
// only by opening the shop later and noticing a card had changed.
//
// This probe drives the REAL path, not a debug hook: it seeds yesterday's
// daily claim at streak 6, loads the menu, and presses CLAIM. Everything after
// that is the shipping code.
//
// It asserts four things, in the order a child would experience them:
//   1. the skin is OWNED             — voidSkinsOwned gained it
//   2. the game SAID SO              — an unlock card, PAINTED, naming the prize
//   3. the shop shows it as NEW      — voidSkinsNew + an .isnew badge
//   4. the badge CLEARS on a look    — tap the card, badge and key both go
//
// Check 2 is the one that earns its keep. It caught two separate silent
// failures: announce() escapes its argument, so a <br> printed as text; and
// #banner is hidden under body.menu, which is the only place a streak can be
// earned. Both passed a class-and-textContent check. It measures pixels now.
//
//   node qa/streakunlock.mjs [port]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 1 });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));

// yesterday, day 6 of week 1, six days deep, owning only what a real player
// would own by then: classic plus Ember, which is the TWO-day prize.
await p.addInitScript(() => {
  const yd = new Date(Date.now() - 86400000).toDateString();
  localStorage.clear();
  localStorage.setItem('voidPlayed', '1');
  localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', yd);
  localStorage.setItem('voidDailyDay', '5');
  localStorage.setItem('voidDailyWeek', '1');
  localStorage.setItem('voidDailyStreak', '6');
  localStorage.setItem('voidStreak', '6');
  localStorage.setItem('voidSkinsOwned', JSON.stringify(['classic', 'ember']));
  localStorage.removeItem('voidSkinsNew');
});
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });

const fail = [];
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${label}${detail ? `   ${detail}` : ''}`);
  if (!cond) fail.push(label);
};

// ── the claim ──────────────────────────────────────────────────────────────
await p.waitForSelector('#daily.show, #daily[style*="flex"]', { timeout: 30000 }).catch(() => { });
const head = await p.evaluate(() => ({
  streak: document.getElementById('dailyStreak')?.textContent || '',
  claim: document.getElementById('dailyClaim')?.textContent || '',
}));
console.log(`daily card: "${head.streak}"  button "${head.claim}"`);
ok(/7 DAY STREAK/i.test(head.streak), 'the calendar is on day 7', head.streak);

const before = await p.evaluate(() => localStorage.getItem('voidSkinsOwned'));
// .click() rather than p.click(): the claim button pulses on a loop, so
// Playwright's "element is stable" wait never settles and times out on a
// button that is perfectly clickable.
await p.evaluate(() => document.getElementById('dailyClaim').click());
// The unlock card is deliberately delayed 1400ms so it does not land under the
// daily card's own close. Then WAIT FOR PAINT rather than asserting at a fixed
// instant: this sandbox has no GPU, and the menu alone was measured at a 531ms
// median frame gap — under 2fps — so a 0.24s CSS open animation costs three
// frames and about three seconds of wall clock here. That is swiftshader, not
// the game; the point of waiting is to measure the right thing, not to hide it.
const openMs = await p.evaluate(() => new Promise((res) => {
  const t0 = performance.now();
  const tick = () => {
    const c = document.querySelector('#skinPrev .spCard');
    const up = c && Number(getComputedStyle(c).opacity) > 0.95
      && document.getElementById('skinPrev').classList.contains('show');
    if (up || performance.now() - t0 > 20000) return res(Math.round(performance.now() - t0));
    requestAnimationFrame(tick);
  };
  tick();
}));
console.log(`unlock card painted after ${openMs}ms (software GL — see note above)`);

// ── 1. owned ───────────────────────────────────────────────────────────────
const after = await p.evaluate(() => ({
  owned: JSON.parse(localStorage.getItem('voidSkinsOwned') || '[]'),
  fresh: JSON.parse(localStorage.getItem('voidSkinsNew') || '[]'),
  streak: localStorage.getItem('voidStreak'),
}));
console.log(`owned ${before} -> ${JSON.stringify(after.owned)}`);
ok(after.owned.includes('prism'), 'PRISM is owned', after.owned.join(','));
ok(after.streak === '7', 'the shared streak counter reads 7', String(after.streak));

// ── 2. the game said so, ON SCREEN ─────────────────────────────────────────
// PAINTED, not classed. An earlier pass of this probe asked only whether the
// element carried .show and held the right words, and it went green twice on a
// message no child could see: #banner is HUD, and index.html hides it under
// `body.menu { display: none }` — which is exactly where a streak lands, since
// the only thing that advances a streak is the daily card, and the daily card
// only opens on the menu. So every assertion below goes through
// getBoundingClientRect and getComputedStyle.
const seen = await p.evaluate(() => {
  const vis = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      txt: el.textContent || '',
      w: Math.round(r.width), h: Math.round(r.height),
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
      onScreen: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight
        && cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05,
    };
  };
  const card = document.querySelector('#skinPrev .spCard');
  return {
    modal: vis(document.getElementById('skinPrev')),
    card: vis(card),
    win: vis(document.getElementById('spWin')),
    name: vis(document.getElementById('spName')),
    act: vis(document.getElementById('spAct')),
    orbKids: document.getElementById('spOrb')?.children.length ?? 0,
    confetti: document.querySelectorAll('#skinPrev .endConf').length,
  };
});
console.log(`unlock card: "${(seen.win?.txt || '').trim()}" / "${(seen.name?.txt || '').trim()}"`
  + ` / "${(seen.act?.txt || '').trim()}"  ${seen.card?.w}x${seen.card?.h}px`
  + `  orb children=${seen.orbKids}  confetti=${seen.confetti}`);
ok(seen.card?.onScreen, 'the unlock card is actually on screen',
  `${seen.card?.display}/${seen.card?.visibility}/op ${seen.card?.opacity} ${seen.card?.w}x${seen.card?.h}`);
ok(seen.win?.onScreen && /7 DAYS IN A ROW/i.test(seen.win.txt),
  'the headline says what earned it', (seen.win?.txt || '').trim());
ok(seen.name?.onScreen && /PRISM/i.test(seen.name.txt), 'and names the prize',
  (seen.name?.txt || '').trim());
ok(seen.act?.onScreen && /WEAR/i.test(seen.act.txt), 'with one obvious thing to do next',
  (seen.act?.txt || '').trim());
ok(seen.orbKids > 0, 'the real void is rendered in it, not a gradient',
  `${seen.orbKids} children in #spOrb`);
ok(!/&lt;|&gt;|<br/i.test(seen.win?.txt + seen.name?.txt),
  'with no raw markup leaking into the text');
await p.screenshot({ path: 'qa-out/streak-unlock.png' });

// ── 3. NEW in the shop ─────────────────────────────────────────────────────
ok(after.fresh.includes('prism'), 'and it is flagged NEW', after.fresh.join(','));
await p.evaluate(() => {
  document.getElementById('spClose')?.click();       // dismiss the unlock card
  document.getElementById('daily')?.classList.remove('show');
});
await p.waitForTimeout(500);
await p.click('#btnShop');
await p.waitForTimeout(1200);
await p.evaluate(() => window.__shopTab?.());          // make sure the voids tab is up
await p.waitForTimeout(600);
const grid = await p.evaluate(() => {
  // a card has no id of its own; its render canvas is skcv_<skin>
  const cards = [...document.querySelectorAll('#shopGrid .skCard')];
  const idOf = (c) => (c.querySelector('canvas')?.id || '').replace('skcv_', '');
  const find = (id) => cards.find((c) => idOf(c) === id);
  const pip = (c) => c && getComputedStyle(c, '::before').content;
  return {
    n: cards.length,
    newOnes: cards.filter((c) => c.classList.contains('isnew')).map(idOf),
    prismPip: pip(find('prism')),
    emberPip: pip(find('ember')),
  };
});
console.log(`shop: ${grid.n} cards, isnew = [${grid.newOnes.join(', ')}]`);
ok(grid.newOnes.length === 1 && String(grid.newOnes[0]).includes('prism'),
  'exactly the new card carries the badge', grid.newOnes.join(','));
ok(/NEW/.test(String(grid.prismPip)), 'the NEW pill is actually rendered', String(grid.prismPip));
ok(!/NEW/.test(String(grid.emberPip)), 'and an already-owned skin has none', String(grid.emberPip));
await p.screenshot({ path: 'qa-out/streak-shop.png' });

// ── 4. it clears when looked at ────────────────────────────────────────────
await p.evaluate(() => {
  const c = [...document.querySelectorAll('#shopGrid .skCard')].find((x) => x.classList.contains('isnew'));
  c?.click();
});
await p.waitForTimeout(700);
const cleared = await p.evaluate(() => ({
  fresh: JSON.parse(localStorage.getItem('voidSkinsNew') || '[]'),
  badges: document.querySelectorAll('#shopGrid .skCard.isnew').length,
}));
ok(!cleared.fresh.includes('prism'), 'looking at it clears the key', JSON.stringify(cleared.fresh));
ok(cleared.badges === 0, 'and clears the badge', `${cleared.badges} left`);

if (errs.length) console.log('\nPAGE ERRORS:', errs.slice(0, 4));
await b.close();
console.log(fail.length ? `\nFAIL (${fail.length}): ${fail.join(' | ')}` : '\nall checks passed');
process.exit(fail.length || errs.length ? 1 : 0);
