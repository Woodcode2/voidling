// CAN YOU ACTUALLY CHANGE WORLDS? Picking a different world writes
// voidAutoPlay and reloads the page; the block at the bottom of prototype3d
// takes a cover hold, and withWorldReady is supposed to give it back.
//
//   node qa/worldswitch.mjs [port]
//
// It stopped doing that when requestedReady() began resolving instantly:
// packReady flips in a microtask that runs AFTER the world-switch block, so
// the block takes a hold that the fast path then returns early past. The match
// runs, scores and finishes behind a frozen 100% cover the child cannot
// dismiss. Every world, every run.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
let bad = 0;
for (const [from, to] of [['maple', 'pirate'], ['pirate', 'gameday'], ['gameday', 'lantern'], ['lantern', 'maple']]) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${from}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  // pick the OTHER world — this is the path that reloads
  await p.click(`#worldRow .wCard[data-world="${to}"]`);
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForTimeout(9000);
  const r = await p.evaluate(() => {
    const scr = document.getElementById('loadScr');
    const cs = scr ? getComputedStyle(scr) : null;
    return {
      coverShown: !!scr && scr.classList.contains('show') && cs.display !== 'none' && +cs.opacity > 0.05,
      t: +(window.__matchState?.().t ?? -1).toFixed(1),
      world: localStorage.getItem('voidWorld'),
    };
  });
  const ok = !r.coverShown && r.t > 0;
  if (!ok) bad++;
  console.log(`${from} -> ${to}   cover up: ${r.coverShown ? 'YES (stuck)' : 'no'}   match t=${r.t}s   ${ok ? 'ok' : '<-- BRICKED'}`);
  await p.close();
}
await b.close();
console.log(bad ? `\n${bad} of 4 world switches leave the player stuck behind the cover` : '\nall four world switches land in a playable match');
process.exit(bad ? 1 : 0);
