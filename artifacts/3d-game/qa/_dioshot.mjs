// THE MENU, ON EVERY WORLD. The diorama's whole claim is "this is the world you
// are on" — six worlds, six frames, and the only way to know whether a derived
// camera found a shot is to look at all six.
//
// THREE VIEWS, ON DEMAND (MENU-BRIEF §6 day 12: "the six menu stages at three
// views"). One 430x932 frame is what you want while iterating on a stage and is
// no evidence at all about the two widths where this screen is hardest: 360,
// where the ladder panel and PLAY have the least room, and the tablet, where
// everything is suddenly swimming in it. `--views` takes all three; the default
// stays one, because eighteen page loads is eighteen minutes in this sandbox and
// nobody iterates on that.
//
//   node qa/_dioshot.mjs [port] [--views]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.argv.slice(2).find((a) => !a.startsWith('--')) || '4177';
const ALL_VIEWS = process.argv.includes('--views');
const VIEWS = ALL_VIEWS
  ? [[430, 932, ''], [360, 780, '-small'], [834, 1194, '-tablet']]
  : [[430, 932, '']];
const OUT = 'qa/out/dioshot';
mkdirSync(OUT, { recursive: true });
const WORLDS = ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
console.log('\n  THE MENU DIORAMA\n');
for (const w of WORLDS) {
 for (const [vw, vh, suffix] of VIEWS) {
  const p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark');
  } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 })
    .catch(() => { });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.waitForTimeout(4000);
  const m = await p.evaluate(() => window.__menuState());
  await p.screenshot({ path: `${OUT}/${w}${suffix}.png`, timeout: 180000 });
  await p.close();
  console.log(`  ${(w + suffix).padEnd(17)} ${String(vw).padStart(4)}x${vh}  aim (${m.stageAt.x}, ${m.stageAt.z})`
    + `  az ${m.azimuth}  dist ${m.menuDist}  h ${m.stageH}`
    + `  void@stage ${m.onStage}  calls ${m.drawCalls}  tris ${m.tris}`);
 }
}
await b.close();
console.log(`\n  shots in ${OUT}/\n`);
