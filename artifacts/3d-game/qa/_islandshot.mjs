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
const ALL = WORLD === 'all';
const WORLDS = ALL ? ['maple','pirate','gameday','lantern','powder','skylark'] : [WORLD];
// [distance, cut half-size or null]. The cut is what turns a crop into an object.
// [distance, cut, lookAhead] — lookAhead lifts the island so its cut edge clears
// the level card and the earth slab's thickness is actually visible.
// THE CHOSEN SETTING, from the sweeps: 500 units back, cut 56, lookAhead 0.16.
// Island 112u against a 132u frame = 0.85, so it has hole.io's side margin.
const PICKED = [500, 56, 0.16];
// PHASE SWEEP. The drift probe's corner projection is wrong — it reports a 112u
// island spanning 1290px in a 132u frame, which six photographs contradict — so
// the swing gets checked the way everything else today got checked: by looking.
// menuT 0 is the authored azimuth, 7 is +7 degrees, 21 is -7. The extremes are
// where a square island is widest on screen.
const PHASE = process.env.PHASE ? Number(process.env.PHASE) : null;
const DISTS = ALL ? [PICKED] : [PICKED]
const OUT = 'qa/out/island';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
try {
  for (const W of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror] ` + e.message.split('\n')[0]));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${W}&manual=1&dio=1&slab=${process.env.SLAB ?? 14}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
  await waitForScene(p);
  await p.waitForFunction(() => window.__menuState().menuT >= 4, null, { timeout: 420000 });
  await p.evaluate(() => { window.__menuHero(false); window.__DEPTH = Number(new URLSearchParams(location.search).get('slab') ?? 14); });    // the void comes off the picker

  for (const [d, cut, look] of DISTS) {
    await p.evaluate((x) => {
      window.__dioLook(x[2]); window.__dioDist(x[0]); window.__menuHero(false);
      window.__dioCut(x[1], window.__DEPTH ?? 14); window.__menuFreeze(x[3] ?? 0);
    }, [d, cut, look, PHASE ?? 0]);
    await p.waitForFunction((t) => {
      const s = window.__menuState();
      const want = s.a0 + s.amp * Math.sin((t / s.period) * Math.PI * 2);
      return s.azimuth !== null && Math.abs(s.azimuth - want) < 0.01;
    }, PHASE ?? 0, { timeout: 180000 });
    await p.waitForTimeout(1500);
    const st = await p.evaluate(() => {
      const s = window.__menuState();
      return { dist: Math.round(s.menuDist), az: s.azimuth };
    });
    const f = `${OUT}/${W}-t${PHASE ?? 0}.png`;
    await p.screenshot({ path: f });
    const frameW = (2 * d * Math.tan(16 * Math.PI / 180)) * 430 / 932;
    console.log(`  ${W.padEnd(8)} dist ${String(d).padStart(4)} cut ${String(cut).padStart(3)} look ${String(look).padStart(5)}  frame ${frameW.toFixed(0)}u  island/frame ${((cut * 2) / frameW).toFixed(2)}x  -> ${f}`);
  }
  await p.close();
  }
} finally { await b.close(); }
