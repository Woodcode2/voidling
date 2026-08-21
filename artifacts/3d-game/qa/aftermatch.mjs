// THE WALK HOME — music after the match is over.
//
//   node qa/aftermatch.mjs [port]
//
// The owner's report, verbatim: "When you exit a match then back on menu the
// main music doesn't start again." qa/journey.mjs walks gate → menu → match
// and STOPS — the one leg it never took is the one that broke. This probe
// takes it, both ways out of a match:
//
//   PLAY → match → (clock runs out) → results card → HOME → splash
//        → PLAY → match → pause → LEAVE THE MATCH ×2 → splash
//        → PLAY → pick the OTHER world → RELOAD → gate tap → match
//        → (clock runs out) → results → HOME → splash
//
// The third leg is the page the owner actually exits matches on: the picker
// switches world by reloading, so the exit happens on a page where the menu
// was hidden from frame one and the menu track was preloaded SECOND. The
// first two legs never touch that page.
//
// and asserts, at every station after the match track stands down:
//   • the MENU theme comes up (srcs>0, not cold) within the settle window —
//     the results card counts as front-of-house by design (see the body.menu
//     sync in prototype3d.ts), so silence there is a failure too;
//   • never two scores at once;
//   • the menu channel's gain node recovers to full level after the
//     stop→start round trip (stopLoop ramps it to 0.0001; a re-entry that
//     forgets to ramp it back is playing and inaudible — srcs alone cannot
//     see that, so the gain is asserted directly).
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
const fails = [];
p.on('pageerror', (e) => fails.push('PAGEERR ' + String(e).slice(0, 140)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '0');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern');
} catch { /* private mode */ } });

await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));

const look = () => p.evaluate(() => window.__music());
const score = (m) => (m.theme.srcs > 0 ? 'theme' : m.menu.srcs > 0 ? 'menu' : m.synth ? 'bed' : 'NOTHING');
// Settle then read. The menu fade-in is 0.25s and the match fade-out 1.2s, so
// 2.5s of settle is outside every declared crossfade window.
const station = async (label, mustBeMenu) => {
  await p.waitForTimeout(2500);
  const m = await look();
  const what = score(m);
  const double = (m.theme.srcs > 0 && m.menu.srcs > 0)
    || (m.synth && (m.theme.srcs > 0 || m.menu.srcs > 0));
  console.log(`  ${label.padEnd(22)} score=${what.padEnd(7)} menu={srcs:${m.menu.srcs},cold:${m.menu.cold},gain:${m.menu.gain},starts:${m.menu.starts}} bus=${m.bus} ctx=${m.ctx}${double ? '  ← TWO SCORES' : ''}`);
  if (what === 'NOTHING') fails.push(`${label}: no score at all`);
  if (double) fails.push(`${label}: two scores at once`);
  if (mustBeMenu) {
    if (m.menu.srcs === 0 || m.menu.cold) fails.push(`${label}: menu theme not playing (srcs=${m.menu.srcs} cold=${m.menu.cold})`);
    // 0.34 is menuCh.vol; the 0.25s ramp has long finished by now. 0.3 gives
    // exponentialRampToValueAtTime's tail room without passing a silent node.
    else if (m.menu.gain < 0.3) fails.push(`${label}: menu channel gain stuck low (${m.menu.gain}) — playing but inaudible`);
    // the win/lose sting ducks the shared bus at match end (-7dB, 1.8s hold,
    // 0.4s recovery ≈ 2.3s total); the 2.5s settle outlasts it, so a bus
    // still on the floor here is a duck that never came home.
    if (m.bus >= 0 && m.bus < 0.85) fails.push(`${label}: music bus stuck ducked (${m.bus}) — every channel healthy, output strangled`);
  }
  return m;
};

const intoMatch = async () => {
  await p.click('#btnPlay'); await p.waitForTimeout(800);
  await p.click('#worldRow .wCard[data-world="maple"]');
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });
};

// ── LEG 1: the clock runs out ─────────────────────────────────────────────
await intoMatch();
const m1 = await station('in match', false);
if (m1.menu.srcs > 0) fails.push('menu theme under the match');
await p.evaluate(() => window.__rushClock(0.05));
await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 120000 });
await station('results card', true);
await p.click('#btnHome');
await station('HOME → splash', true);

// ── LEG 2: quit from the pause sheet ──────────────────────────────────────
await intoMatch();
await station('in match again', false);
await p.evaluate(() => document.getElementById('btnQuit')?.click());
await p.waitForFunction(() => document.getElementById('pause')?.classList.contains('show'), null, { timeout: 30000 });
await p.click('#pauseQuit');            // arms: TAP AGAIN TO LEAVE
await p.waitForTimeout(300);
await p.click('#pauseQuit');            // leaves
await p.waitForFunction(() => document.body.classList.contains('menu'), null, { timeout: 30000 });
await station('quit → splash', true);

// ── LEG 3: the world-switch reload page ───────────────────────────────────
await p.click('#btnPlay'); await p.waitForTimeout(800);
await p.click('#worldRow .wCard[data-world="pirate"]');   // reloads the page
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.waitForSelector('#tapGate.show.armed', { timeout: 400000 });
await p.click('#tapGate');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });
await station('reload → match', false);
await p.evaluate(() => window.__rushClock(0.05));
await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 120000 });
await station('reload results', true);
await p.click('#btnHome');
await station('reload → splash', true);

await b.close();
console.log('\n  ' + (fails.length ? 'FAIL — ' + fails.join('; ') : 'PASS — the theme comes home with the player, both ways out') + '\n');
process.exit(fails.length ? 1 : 0);
