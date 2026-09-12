// THE MENU, ON EVERY WORLD. The diorama's whole claim is "this is the world you
// are on" — six worlds, six frames, and the only way to know whether a derived
// camera found a shot is to look at all six.
//
//   node qa/_dioshot.mjs [port]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.argv[2] || '4177';
const OUT = 'qa/out/dioshot';
mkdirSync(OUT, { recursive: true });
const WORLDS = ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
console.log('\n  THE MENU DIORAMA\n');
for (const w of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
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
  await p.screenshot({ path: `${OUT}/${w}.png`, timeout: 180000 });
  await p.close();
  console.log(`  ${w.padEnd(9)} aim (${m.stageAt.x}, ${m.stageAt.z})  az ${m.azimuth}  dist ${m.menuDist}  h ${m.stageH}`
    + `  void@stage ${m.onStage}  calls ${m.drawCalls}  tris ${m.tris}`);
}
await b.close();
console.log(`\n  shots in ${OUT}/\n`);
