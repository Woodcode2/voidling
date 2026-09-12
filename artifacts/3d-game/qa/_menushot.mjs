// LOOK AT THE MENU'S LADDER. Three profiles, so the shape of progress is
// visible rather than described: a brand-new child, one mid-world, and one
// several worlds in.
//
//   node qa/_menushot.mjs [port]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.argv[2] || '4177';
const OUT = 'qa/out/menushot';
mkdirSync(OUT, { recursive: true });

// voidLevels is the ladder's own store (src/game/levels.ts). Seeded directly so
// each profile is exactly the state being photographed.
const PROFILES = [
  ['fresh', 'maple', {}],
  ['midworld', 'maple', { v: 1, w: { maple: {
    1: { st: 'clear', best: 24100, pct: 31, n: 3 },
    2: { st: 'done', best: 3, pct: 22, n: 2 },
    3: { st: 'fin', best: 0, pct: 18, n: 4 } } } }],
  ['travelled', 'pirate', { v: 1, w: {
    maple: { 1: { st: 'clear', n: 2 }, 2: { st: 'clear', n: 1 }, 3: { st: 'done', n: 1 },
      4: { st: 'done', n: 2 }, 5: { st: 'done', n: 1 } },
    pirate: { 1: { st: 'clear', n: 1 }, 2: { st: 'done', n: 1 }, 3: { st: 'fin', n: 5 } } } }],
];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const [name, world, levels] of PROFILES) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(([lv, w]) => { try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
    localStorage.setItem('voidWorld', w);
    if (Object.keys(lv).length) localStorage.setItem('voidLevels', JSON.stringify(lv));
  } catch { } }, [levels, world]);
  await p.goto(`http://127.0.0.1:${PORT}/?w=${world}&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 420000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.waitForTimeout(2200);
  const read = await p.evaluate(() => ({
    pips: [...document.querySelectorAll('#mlPips .pip')].map((e) => (e.className.match(/s-(\w+)/) || [])[1]).join('·'),
    here: [...document.querySelectorAll('#mlPips .pip')].findIndex((e) => e.classList.contains('here')) + 1,
    world: document.getElementById('mlWorld')?.textContent ?? '',
    goal: document.getElementById('mlGoal')?.textContent ?? '',
    play: document.getElementById('btnPlay')?.textContent ?? '',
  }));
  await p.screenshot({ path: `${OUT}/${name}-menu.png`, timeout: 180000 });
  // …and the picker, where all thirty are visible at once
  await p.evaluate(() => document.getElementById('worlds')?.classList.add('show'));
  await p.waitForTimeout(1200);
  const grid = await p.evaluate(() => [...document.querySelectorAll('#worldRow .wCard')].map((c) => ({
    w: c.dataset.world,
    pips: [...c.querySelectorAll('.wPips .pip')].map((e) => (e.className.match(/s-(\w+)/) || [])[1]).join('·'),
  })));
  await p.screenshot({ path: `${OUT}/${name}-worlds.png`, timeout: 180000 });
  await p.close();
  console.log(`\n  ${name} (${world})`);
  console.log(`    menu    ${read.world}  ${read.pips}  here=${read.here}  "${read.goal}"  PLAY="${read.play}"`);
  for (const g of grid) console.log(`    picker  ${String(g.w).padEnd(9)} ${g.pips}`);
}
await b.close();
console.log(`\n  shots in ${OUT}/\n`);
