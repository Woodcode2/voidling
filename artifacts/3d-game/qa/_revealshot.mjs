// LOOK AT IT. Four shots of the first reveal and one of a hop, to a folder.
//
// Day 8 got the menu's framing wrong four times and every one of them was caught
// by looking rather than by a number: a camera behind a building, a tree filling
// Maple, the void a speck, the void floating. A staggered fade and a ring that
// hops are exactly the kind of thing that measures correct and reads wrong.
//
//   node qa/_revealshot.mjs [port]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.argv[2] || '4177';
const OUT = 'qa/out/revealshot';
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.clear();
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__ladderState, null, { timeout: 420000 });
await p.waitForFunction(() => window.__ladderState().reveal === true, null, { timeout: 120000 }).catch(() => { });

const shot = async (name) => {
  await p.screenshot({ path: `${OUT}/${name}.png` });
  const s = await p.evaluate(() => window.__ladderState());
  console.log(`  ${name.padEnd(16)} shown=${s.shown.join(',')} here=${s.here} ringIn=${s.ringIn} reveal=${s.reveal} glow=${s.glow} look=${s.look}`);
};
await shot('1-reveal-start');
await new Promise((r) => setTimeout(r, 260)); await shot('2-reveal-mid');
await new Promise((r) => setTimeout(r, 500)); await shot('3-reveal-done');
await new Promise((r) => setTimeout(r, 3000)); await shot('4-settled');

// and a hop, on the same page
await p.evaluate(() => {
  window.__recordLevel({ world: 'maple', goal: 1, kind: 'eat', result: 'win',
    cleared: false, score: 999, pct: 12, rank: 1, secs: 61 });
  window.__paintLadder();
});
await shot('5-hop-before');
await p.waitForFunction(() => window.__ladderState().pop === 0, null, { timeout: 60000 }).catch(() => { });
await shot('6-hop-flip');
await p.waitForFunction(() => window.__ladderState().here === 1, null, { timeout: 60000 }).catch(() => { });
await shot('7-hop-ring');
await new Promise((r) => setTimeout(r, 1200)); await shot('8-hop-settled');
await b.close();
console.log(`\n  ${OUT}/`);
