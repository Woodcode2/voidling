// SIDE BY SIDE WITH THE COMPETITION.
//
//   node qa/compare.mjs            # all four worlds, three moments each
//   node qa/compare.mjs maple
//
// The competitor screenshots that started this are all mid-match: hole big
// enough to be swallowing a building, full HUD, rivals on screen. Comparing our
// spawn frame against their mid-match frame flatters us and teaches nothing, so
// this puts the game in THEIR framing — small, mid and large — and shoots the
// composited frame at phone size.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { ALL_WORLDS } from './worlds.mjs';

const ALL = ALL_WORLDS;
const list = process.argv.slice(2).filter((w) => ALL.includes(w));
const worlds = list.length ? list : ALL;
const PORT = '4177';
fs.mkdirSync('qa-out/compare', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const w of worlds) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { /* private mode */ } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show')
    .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${w}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 600000 });

  for (const [label, r] of [['1-small', 1.4], ['2-mid', 5], ['3-large', 10]]) {
    await p.evaluate((rr) => window.__setVoidR(rr), r);
    // let the camera pull back, the ring re-fit and any eat animation settle
    await p.waitForTimeout(2600);
    await p.screenshot({ path: `qa-out/compare/${w}-${label}.png` });
    console.log(`qa-out/compare/${w}-${label}.png`);
  }
  await p.close();
}
await b.close();
