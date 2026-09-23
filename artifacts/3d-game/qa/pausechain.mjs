// A PAUSE HOLDS THE CHAIN — it does not cash it in behind the sheet
//
//   node qa/pausechain.mjs [port] [world]
//
// Pre-merge review (logic-1 / ux-4): animate() keeps running while paused, and
// the chain's 1.6 s lapse timer ran with it — so a pause taken mid-chain cashed
// the chain in under the pause sheet: the gold float nobody could see, the
// chime and duck a parent paused for quiet then heard, the buzz, the bar punch.
//
// Drive: a chain of 6+ on the game's clock, then the real pause button, then
// 3 s of tClock under the sheet. Bars:
//   (a) no nomCash() call while the sheet is up (the audio call log)
//   (b) the chain is still there when she comes back — combo unchanged
import { chromium } from 'playwright';
const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = POS[0] || '4177', WORLD = POS[1] || 'maple';
const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('unhandledRejection', (e) => die(`rejected: ${(e && e.message) || e}`));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidFirstNom', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&len=90`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
if (typeof (await p.evaluate(() => window.__matchState().combo)) !== 'number') die('__matchState().combo is missing — this build has no chain to hold');
const t0 = await p.evaluate(() => window.__matchState().t);
for (let i = 0; i < 12; i++) {
  await p.waitForFunction((x) => window.__matchState().t >= x, t0 + i * 0.15, { timeout: 600000, polling: 100 });
  await p.evaluate(() => window.__eatNearest(0.1));
}
const before = await p.evaluate(() => ({ combo: window.__matchState().combo, tc: window.__matchState().tClock }));
if (before.combo < 5) die(`the drive built a chain of only ${before.combo} — nothing to hold`);
await p.evaluate(() => document.getElementById('btnQuit').click());
const up = await p.evaluate(() => document.getElementById('pause')?.classList.contains('show'));
if (!up) die('the pause sheet did not come up — cannot test a pause');
const tp = await p.evaluate(() => window.__matchState().tClock);
await p.waitForFunction((t) => window.__matchState().tClock > t + 3, tp, { timeout: 900000, polling: 250 });
const after = await p.evaluate((t) => ({ combo: window.__matchState().combo,
  cash: (window.__audioCalls?.() ?? []).filter((c) => c.t >= t && c.id === 'nomCash').length,
  sheet: document.getElementById('pause')?.classList.contains('show') }), tp);
await b.close();
console.log(`\n  PAUSE CHAIN — ${WORLD} on :${PORT}\n`);
console.log(`  ·    chain ${before.combo} when paused; after 3 s of tClock under the sheet (still up: ${after.sheet}): chain ${after.combo}, nomCash calls ${after.cash}`);
let bad = 0;
if (after.cash) { bad++; console.log(`  BAD  (a) the chain cashed in under the pause sheet (${after.cash} nomCash call(s)) — a chime and a buzz for a payoff she cannot see`); }
else console.log('  ok   (a) no cash-in while paused');
if (after.combo !== before.combo) { bad++; console.log(`  BAD  (b) the chain went from ${before.combo} to ${after.combo} during the pause — it should carry on when she resumes`); }
else console.log(`  ok   (b) the chain is still ${after.combo} when she comes back`);
if (bad) console.log(`\nFAIL — ${bad} of 2 bar(s)`);
else console.log('\nPASS — 2 bar(s)');
process.exit(bad ? 1 : 0);
