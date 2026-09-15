// ── THE PICKER AS A FLOATING ISLAND. THE OWNER'S DIRECTION, PHOTOGRAPHED. ───
//
// Two decisions from the owner, against a hole.io screenshot:
//   1. the picker should read as a floating island on flat colour
//   2. the void comes OFF it — hole.io puts no character on their picker at all
//
// (2) is the unlock. The camera fork that pinned this at 178 units only existed
// because the hero had to stay legible; DIORAMA-BRIEF measured the trade as
// 244px of hero against a block 1.95x too wide to read as an object. With no
// hero in the shot there is nothing to trade.
//
// The block is 92 units across (BLOCK_SIZE 1600 * SCALE 0.05 = 80, plus roads).
// Frame width at distance D on a 430x932 screen is 2*D*tan16 * 430/932, so:
//   D=178  frame  47u   the block is 1.95x the frame     today
//   D=386  frame 102u   fits face-on at 0.90 fill
//   D=528  frame 140u   fits at 30 degrees off square
//   D=546  frame 145u   fits corner-on at 45, which is hole.io's view
//
//   node qa/_islandshot.mjs [port] [world]
import { chromium } from 'playwright';
import { waitForScene } from './_occlib.mjs';
import { mkdirSync } from 'node:fs';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
// [distance, cut half-size or null]. The cut is what turns a crop into an object.
const DISTS = [[386, 60], [420, 60], [460, 60], [460, 72], [500, 72], [528, 80]];
const OUT = 'qa/out/island';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
try {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror] ` + e.message.split('\n')[0]));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&manual=1&dio=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
  await waitForScene(p);
  await p.waitForFunction(() => window.__menuState().menuT >= 4, null, { timeout: 420000 });
  await p.evaluate(() => window.__menuHero(false));    // the void comes off the picker

  for (const [d, cut] of DISTS) {
    await p.evaluate((x) => {
      window.__dioDist(x[0]); window.__menuHero(false);
      window.__dioCut(x[1]); window.__menuFreeze(0);
    }, [d, cut]);
    await p.waitForFunction(() => {
      const s = window.__menuState();
      return s.azimuth !== null && Math.abs(s.azimuth - s.a0) < 0.01;
    }, null, { timeout: 180000 });
    await p.waitForTimeout(1500);
    const st = await p.evaluate(() => {
      const s = window.__menuState();
      return { dist: Math.round(s.menuDist), az: s.azimuth };
    });
    const f = `${OUT}/${WORLD}-${d}-cut${cut ?? 'none'}.png`;
    await p.screenshot({ path: f });
    const frameW = (2 * d * Math.tan(16 * Math.PI / 180)) * 430 / 932;
    console.log(`  ${WORLD.padEnd(8)} dist ${String(d).padStart(4)}  cut ${String(cut ?? '-').padStart(4)}  frame ${frameW.toFixed(0)}u  -> ${f}`);
  }
  await p.close();
} finally { await b.close(); }
