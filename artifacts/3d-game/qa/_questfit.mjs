// SCRATCH — CAN THE DAY'S QUESTS BE DONE ON THIS WORLD?
// The per-world quest table (prototype3d.ts:1424-1426) special-cases 'pirate'
// only; every other world gets the board that was authored for Maple, which
// asks for CARS and HOUSES. Count the props each world actually tags.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => { try { window.__renderer.render = () => {}; } catch {} });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1, null, { timeout: 400000 });
  const r = await p.evaluate(() => {
    const tags = {};
    for (const e of window.__edibles) {
      const k = e.mesh?.userData?.qk ?? '_untagged';
      tags[k] = (tags[k] || 0) + 1;
    }
    const chips = [...document.querySelectorAll('#quests .q')].map(q =>
      (q.getAttribute('title') || '').slice(0, 40));
    return { tags, chips, n: window.__edibles.length };
  });
  const want = ['car', 'rv', 'house', 'cabana', 'gild', 'big'];
  console.log(`${wid.padEnd(8)} edibles ${String(r.n).padStart(5)}   ` +
    want.map(k => `${k}=${String(r.tags[k] ?? 0).padStart(4)}`).join('  '));
  console.log(`         today's board: ${r.chips.join(' | ')}`);
  await p.close();
}
await b.close();
