// SCRATCH — how much money is lying on the ground, per world. Counts every
// edible carrying userData.coin at t≈1, split into the 20 per-match GILDED
// finds and the world's permanent COIN PILES, and reports the total wallet
// value a player can pick up without ever finishing the match.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
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
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1, null, { timeout: 400000 });
  const c = await p.evaluate(() => {
    let gild = 0, gildVal = 0, pile = 0, pileVal = 0, pr = [];
    const vs = window.__voidState();
    for (const e of window.__edibles) {
      const v = e.mesh?.userData?.coin;
      if (!v) continue;
      if (e.mesh.userData.gild) { gild++; gildVal += v; }
      else { pile++; pileVal += v;
        pr.push(Math.round(Math.hypot(e.mesh.position.x - vs.x, e.mesh.position.z - vs.z))); }
    }
    pr.sort((a, b) => a - b);
    return { gild, gildVal, pile, pileVal, total: window.__edibles.length,
      nearPiles: pr.slice(0, 5), medPile: pr[pr.length >> 1] ?? null };
  });
  console.log(`${wid.padEnd(8)} props ${String(c.total).padStart(5)}   GILDED ${String(c.gild).padStart(3)} = ${String(c.gildVal).padStart(4)}✦   ` +
    `COIN PILES ${String(c.pile).padStart(4)} = ${String(c.pileVal).padStart(5)}✦   ` +
    `GROUND TOTAL ${String(c.gildVal + c.pileVal).padStart(5)}✦   nearest piles ${c.nearPiles.join(',')}u  median ${c.medPile}u`);
  await p.close();
}
await b.close();
