// THE HUD AND THE END, PHOTOGRAPHED — frames a person reads before G4 and G6 ship
//
//   node qa/hudshots.mjs [port]
//
// The studio governor (round 3, 2026-09-23) held the push until G4 and G6
// each had a frame a person had read: both are visual, and qa/nomstream.mjs
// and qa/endparty.mjs measure them without ever taking a picture. This takes
// the three pictures, with the HUD ON, at the moments the features exist:
//
//   1. maple-noms.png     mid-chain (12+ NOMS, the gold tier) with a number
//                         in flight to the bar
//   2. maple-party.png    0.35 s after a dot is won from third place — the
//                         confetti out of the void, before the card
//   3. maple-endcard.png  the card that follows
//
// Everything is timed on the game's own clocks. The frames land in
// qa/out/hudshots/, and the probe prints what each frame should show so the
// reader knows what to look for.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const PORT = process.argv[2] || '4177';
const OUT = 'qa/out/hudshots';
mkdirSync(OUT, { recursive: true });
const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${(e && e.message) || e}`));
process.on('unhandledRejection', (e) => die(`rejected: ${(e && e.message) || e}`));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidFirstNom', '1'); localStorage.setItem('voidMute', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple&g=1&len=60`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });

// 1 — a chain of twelve and a number in the air
const t0 = await p.evaluate(() => window.__matchState().t);
for (let i = 0; i < 40; i++) {
  await p.waitForFunction((x) => window.__matchState().t >= x, t0 + i * 0.2, { timeout: 600000, polling: 100 });
  await p.evaluate(() => window.__eatNearest(0.1));
  const c = await p.evaluate(() => window.__matchState().combo ?? 0);
  if (c >= 12) break;
}
await p.waitForFunction(() => [...document.querySelectorAll('.vf.fly')].some((e) => (e.textContent || '').trim())
  && document.getElementById('noms')?.classList.contains('on'), null, { timeout: 600000, polling: 50 }).catch(() => {});
const s1 = await p.evaluate(() => ({ combo: window.__matchState().combo, pill: document.getElementById('noms')?.textContent,
  fly: [...document.querySelectorAll('.vf.fly')].map((e) => e.textContent).filter(Boolean) }));
await p.screenshot({ path: `${OUT}/maple-noms.png` });
console.log(`  1  ${OUT}/maple-noms.png — chain ${s1.combo}, pill "${s1.pill}", in flight: ${s1.fly.join(' ') || 'none'}`);
console.log('     look for: the pill beside the void (gold at 10+), off his face; one number flying to the bar; no "+N" rising off props');

// 2 — the dot won from third: the party before the card
const eat = await p.evaluate(() => window.__levelSpec().eat);
await p.evaluate((e) => window.__setRivalScores([e * 6, e * 5]), eat);
const t1 = await p.evaluate(() => window.__matchState().tClock);
await p.waitForFunction((t) => window.__matchState().tClock > t + 0.5, t1, { timeout: 600000, polling: 200 });
await p.evaluate((e) => window.__setScore(e + 1), eat);
await p.waitForFunction(() => window.__goalState?.()?.met, null, { timeout: 600000, polling: 50 });
const tm = await p.evaluate(() => window.__matchState().tClock);
await p.waitForFunction((t) => window.__matchState().tClock >= t + 0.35, tm, { timeout: 600000, polling: 50 });
const s2 = await p.evaluate(() => ({ conf: document.querySelectorAll('.wConf').length, mood: window.__matchState().mood }));
await p.screenshot({ path: `${OUT}/maple-party.png` });
console.log(`  2  ${OUT}/maple-party.png — ${s2.conf} confetti scraps, mood '${s2.mood}'`);
console.log('     look for: paper confetti bursting up out of the void over the town; no card yet');

// 3 — the card
await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000, polling: 250 });
const tc = await p.evaluate(() => window.__matchState().tClock);
await p.waitForFunction((t) => window.__matchState().tClock > t + 0.4, tc, { timeout: 600000, polling: 200 });
const s3 = await p.evaluate(() => ({ hd: document.getElementById('endHd')?.textContent, conf: document.querySelectorAll('#end .endConf').length }));
await p.screenshot({ path: `${OUT}/maple-endcard.png` });
console.log(`  3  ${OUT}/maple-endcard.png — "${s3.hd}", ${s3.conf} card confetti`);
console.log('     look for: the win headline and the confetti falling over the card; no match HUD left showing through');

await b.close();
console.log('\nPASS — three frames for a person to read');
