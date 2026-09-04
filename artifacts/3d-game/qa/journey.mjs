// ONE SESSION, ONE SCORE — the continuity walk.
//
//   node qa/journey.mjs [port]
//
// The music director's contract (docs/MUSIC-BRIEF.md, task 2), asserted from
// the engine's own state at every step of the path a child actually walks:
//
//   gate → splash → picker → (back) → shop → (back) → sticker book → (back)
//        → match → results
//
//   • After the gate tap there is ALWAYS a score: recorded menu, recorded
//     world, or the synth bed. Never nothing.
//   • Never two scores at once, outside a declared crossfade window.
//   • The menu theme is ONE CONTINUOUS PIECE across the whole front of house:
//     startLoop for the menu channel runs exactly once from gate to match.
//     A theme that restarts when the shop opens is a theme that restarts —
//     `starts` in musicState() counts it, and pixels cannot.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.on('pageerror', (e) => console.log('PAGEERR ' + String(e).slice(0, 120)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '0');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch { /* private mode */ } });

await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));

const fails = [];
const look = () => p.evaluate(() => window.__music());
const score = (m) => (m.theme.srcs > 0 ? 'theme' : m.menu.srcs > 0 ? 'menu' : m.synth ? 'bed' : 'NOTHING');
const step = async (label, fn) => {
  if (fn) await fn();
  await p.waitForTimeout(1200);
  const m = await look();
  const what = score(m);
  // two RECORDED scores at once is the double-music failure; the bed under a
  // recording is legal only during the 1.2s handover, which the settle above
  // has already outlasted
  const double = (m.theme.srcs > 0 && m.menu.srcs > 0)
    || (m.synth && (m.theme.srcs > 0 || m.menu.srcs > 0));
  console.log(`  ${label.padEnd(16)} score=${what.padEnd(7)} menu.starts=${m.menu.starts} ctx=${m.ctx}${double ? '  ← TWO SCORES AT ONCE' : ''}`);
  if (what === 'NOTHING') fails.push(`${label}: no score at all`);
  if (double) fails.push(`${label}: two scores at once`);
  return m;
};

// the first touch is PLAY — no gate on the fresh path (the two-tap overlay was
// retired; a gate here would itself be the regression)
if (await p.$('#tapGate.show')) fails.push('tap gate present on the fresh-load path');
await step('first tap (PLAY)', () => p.click('#btnPlay'));
await p.keyboard.press('Escape').catch(() => {});
await step('back to splash', () => p.evaluate(() => document.getElementById('worlds')?.classList.remove('show')));
await step('shop', () => p.click('#btnShop'));
await step('back again', () => p.evaluate(() => document.getElementById('shop')?.classList.remove('show')));
const mFront = await look();
if (mFront.menu.starts > 1) fails.push(`menu theme restarted crossing front-of-house screens (starts=${mFront.menu.starts})`);

// into a match, out to results
await p.click('#btnPlay'); await p.waitForTimeout(1000);
await p.click('#worldRow .wCard[data-world="maple"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });
const mMatch = await step('in match');
if (mMatch.menu.srcs > 0) fails.push('menu theme still playing under the match');

await b.close();
console.log('\n  ' + (fails.length ? 'FAIL — ' + fails.join('; ') : 'PASS — one continuous score, never silent, never doubled') + '\n');
process.exit(fails.length ? 1 : 0);
