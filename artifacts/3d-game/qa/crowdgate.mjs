// WHAT DOES THE CROWD COST, AND DOES GATING IT CHANGE WHAT YOU SEE?
//
// The mover dispatch had no cull of any kind — Lantern Night spawns ~966
// walkers and every one ran a full update every frame, three point-in-polygon
// biomeAt() tests included, however far off screen it was.
//
// Two questions, and the second is the one that matters:
//   1. How much frame time does the gate actually save?
//   2. Does anything VISIBLE change? A gate that saves 30% and freezes the
//      street in front of you is not a win.
//
// Timing is measured by calling life.update() directly in a tight loop with
// the gate on and off, so it isolates the crowd from the renderer, the sim and
// the software-GL noise floor. Visibility is measured by counting movers
// inside the gate: those run every frame either way, so if that count is the
// whole visible population the change is invisible by construction.
import { chromium } from 'playwright';
const worlds = (process.argv[2] || 'lantern,gameday,maple,pirate').split(',');
const PORT = process.argv[3] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of worlds) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1000);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 8, null, { timeout: 600000 });

  const r = await p.evaluate(async () => {
    window.__renderer.render = () => {};
    const life = window.__life;
    if (!life) return { err: 'no __life hook' };
    const vs = window.__voidState();
    // the gate the game would be using right now
    const gate = window.__crowdGate ?? Infinity;
    const time = (g) => {
      // warm, then measure — first call pays for megamorphic dispatch
      for (let i = 0; i < 12; i++) life.update(1 / 60, 10, vs.x, vs.z, vs.r, g);
      const t0 = performance.now();
      for (let i = 0; i < 90; i++) life.update(1 / 60, 10, vs.x, vs.z, vs.r, g);
      return (performance.now() - t0) / 90;
    };
    const off = time(Infinity);
    const on = time(gate);
    return { gate, off, on, movers: window.__moverStats ? window.__moverStats(gate) : null };
  });
  if (r.err) { console.log(`${wid.padEnd(8)} ${r.err}`); await p.close(); continue; }
  const save = (1 - r.on / r.off) * 100;
  console.log(`${wid.toUpperCase().padEnd(8)} gate ${r.gate === null ? '?' : r.gate.toFixed(0)}u`
    + `   ungated ${r.off.toFixed(2)}ms/frame  ->  gated ${r.on.toFixed(2)}ms   ${save >= 0 ? '-' : '+'}${Math.abs(save).toFixed(0)}%`
    + (r.movers ? `   ${r.movers.near}/${r.movers.total} movers inside the gate` : ''));
  await p.close();
}
await b.close();
