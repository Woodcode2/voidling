// DOES THE TOWN STOP RUNNING WHEN THE MATCH DOES?
//
// Day 2 of the menu stream (docs/MENU-BRIEF.md §6, "life.calm/tension on the
// menu path"; the bar is §2.8.7).
//
// THE BUG. endMatch calls life.calm(Infinity) (prototype3d.ts:5494) so the town
// settles behind the results card — the crowd's panic contagion is held off
// and the world behind the menu is a place, not an emergency. The pause
// sheet's LEAVE THE MATCH takes a different exit: doQuit() sets started =
// false, armed = false, ended = true, shows the menu, and never touches calm.
// So a menu reached by QUITTING sits inside a crowd that is still fleeing the
// void, at whatever panic the match left behind.
//
// WHY IT HAS SURVIVED. Nothing could see it. life.moverStats returned only
// { near, total } — how many people, not whether they were running — and
// `tension` is driven to 0 by animate() on the very next frame
// (`life.tension(started && !ended ? tension() : 0)`), so the one number a
// probe could read said "calm" while the people were still sprinting. The
// half that actually suppresses panic is `calmT`, and it was not exposed at
// all. So this probe's first deliverable is the instrument: moverStats now
// also returns `panicked` (people currently fleeing) and `calm` (seconds of
// hold left, Infinity when held indefinitely).
//
// IT MATTERS MORE AFTER THE MENU REBUILD, WHICH IS WHY IT IS FIXED NOW. Today
// the menu is opaque and nobody sees the town. From §2 onward the menu is a
// window onto it, with the void parked in the middle of the crowd — and
// entering that window by quitting would show a child a town screaming at a
// creature standing still. §2.2.2 puts life.calm(Infinity) in enterMenu() for
// this reason; this is the same fix on the path that exists today, so day 8
// inherits a working one rather than debugging two.
//
// THE BAR. Quit to the menu, then hold: `calm` must be Infinity (held), and
// `panicked` must fall to 0 and stay there. Measured against the END-CARD path
// in the same run, which is the behaviour being matched — a bar of "0" with
// nothing to compare it to would not have caught this either.
//
//   node qa/menucalm.mjs [world] [port]
import { chromium } from 'playwright';
import { ALL_WORLDS, initScript } from './worlds.mjs';
import { DRIVE_NEAREST } from './_drive.mjs';

const pos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const WORLD = pos[0] || 'maple';
const PORT = pos[1] || '4177';
if (!ALL_WORLDS.includes(WORLD)) { console.log(`\nFAIL — unknown world "${WORLD}"`); process.exit(1); }

const fails = [];
process.on('uncaughtException', (e) => { console.log(`\nFAIL — threw: ${e.message.split('\n')[0]}`); process.exit(1); });
process.on('unhandledRejection', (e) => { console.log(`\nFAIL — rejected: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const open = async () => {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(initScript(7));
  await p.addInitScript(() => { try { localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 420000 });
  const missing = await p.evaluate(() => ['__moverStats', '__matchState', '__renderer'].filter((k) => !(k in window)));
  if (missing.length) { console.log(`\nFAIL — this build has no ${missing.join(', ')}`); process.exit(1); }
  const shape = await p.evaluate(() => window.__moverStats(200));
  if (!('panicked' in shape) || !('calm' in shape)) {
    console.log(`\nFAIL — life.moverStats does not report panic or calm (got ${Object.keys(shape).join(', ')}); `
      + `the crowd's fear is not measurable on this build, so "the town is calm" cannot be asserted`);
    process.exit(1);
  }
  return p;
};

// run a match far enough in that the crowd is genuinely frightened, then leave
// it by `exit` and watch what the town does.
const leaveBy = async (exit) => {
  const p = await open();
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
  }));
  await p.evaluate(() => document.getElementById('btnPlay')?.click());
  await p.waitForSelector(`#worldRow .wCard[data-world="${WORLD}"]`, { state: 'visible', timeout: 400000 });
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
  await p.waitForFunction(() => (window.__matchState?.().armed ?? false) === true, null, { timeout: 400000 });
  await p.evaluate(DRIVE_NEAREST);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => { }; });
  // far enough in that the town is running: the calm hold beginMatch sets is
  // introLen + 1.2 seconds, so anything past ~20 match-seconds is well clear
  // of it and the void is big enough to frighten people.
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 25, null, { timeout: 900000 });
  const during = await p.evaluate(() => window.__moverStats(200));

  if (exit === 'quit') {
    // the pause sheet's LEAVE THE MATCH. The in-game HOME button (#btnQuit, the
    // house glyph) opens the pause sheet on its FIRST tap; LEAVE THE MATCH then
    // arms on one tap and is taken on the second — one stray tap must not eat a
    // three-minute match, which is the rule this path exists to keep.
    await p.evaluate(() => document.getElementById('btnQuit')?.click());
    await p.waitForTimeout(400);
    await p.evaluate(() => document.getElementById('pauseQuit')?.click());
    await p.waitForTimeout(200);
    await p.evaluate(() => document.getElementById('pauseQuit')?.click());
  } else {
    // the ordinary end: rush the clock to the buzzer, then HOME off the end card
    await p.evaluate(() => window.__rushClock(2));
    await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000 });
    await p.evaluate(() => document.getElementById('btnHome')?.click());
  }
  await p.waitForFunction(() => getComputedStyle(document.getElementById('menu')).display !== 'none',
    null, { timeout: 120000 }).catch(() => { });
  // hold on the menu and watch. Real frames: the crowd is simulated in
  // animate(), and panic decays over seconds of game time.
  const series = [];
  for (let i = 0; i < 12; i++) {
    await p.waitForTimeout(500);
    series.push(await p.evaluate(() => {
      const m = window.__moverStats(200);
      return { panicked: m.panicked, calm: m.calm === Infinity ? 'inf' : +m.calm.toFixed(1), peds: m.peds };
    }));
  }
  await p.close();
  return { during, series };
};

console.log(`\n  MENUCALM — ${WORLD} @ :${PORT}`);
console.log(`  Does the town stop running when the match does? Two exits, same match.\n`);

for (const exit of ['end', 'quit']) {
  const { during, series } = await leaveBy(exit);
  const last = series[series.length - 1];
  const worst = Math.max(...series.map((s) => s.panicked));
  const held = series.every((s) => s.calm === 'inf');
  console.log(`  ${exit === 'end' ? 'END CARD → HOME' : 'PAUSE → LEAVE  '}  in-match panicked ${during.panicked}/${during.peds}`
    + ` · on the menu ${series.map((s) => s.panicked).join(',')}`
    + ` · calm hold ${[...new Set(series.map((s) => s.calm))].join(',')}`);
  if (!held) fails.push(`${exit}: the calm hold on the menu is ${[...new Set(series.map((s) => s.calm))].join(',')}, not Infinity — `
    + `panic contagion is live behind the menu (endMatch sets calm(Infinity); this path does not)`);
  if (last.panicked > 0 || worst > 0) fails.push(`${exit}: ${worst} of ${last.peds} people were still fleeing on the menu `
    + `(${series.map((s) => s.panicked).join(',')} over 6s) — the town behind the menu is still running from a match that is over`);
}

await b.close();
if (fails.length) {
  for (const f of fails) console.log(`  · ${f}`);
  console.log(`\nFAIL — the town does not settle on every path to the menu (${fails.length} finding(s))`);
  process.exit(1);
}
console.log(`\nPASS — the town settles on both paths to the menu: calm held, nobody left running`);
