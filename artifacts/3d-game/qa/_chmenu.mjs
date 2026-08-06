// CODE-HEALTH: `started` is set true in beginMatch() and cleared in exactly one
// of the two ways a child leaves a match (pause->HOME clears it; the results
// screen's HOME does not). Attract mode — the wandering void behind the menu —
// is gated on !started. Measure the void's travel on the menu in three states:
//   A. fresh boot, before any match
//   B. after a finished match, exited via the results screen's HOME
//   C. after a match exited via pause -> LEAVE
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const W = process.argv[2] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

async function fresh() {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  const p = await ctx.newPage();
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  return { ctx, p };
}
// travel = total ground distance the void covers over N render frames on the menu
async function travel(p, frames = 240) {
  return await p.evaluate(async (n) => {
    const s0 = window.__voidState();
    let px = s0.x, pz = s0.z, dist = 0;
    for (let i = 0; i < n; i++) {
      await new Promise(r => requestAnimationFrame(r));
      const s = window.__voidState();
      dist += Math.hypot(s.x - px, s.z - pz); px = s.x; pz = s.z;
    }
    return +dist.toFixed(2);
  }, frames);
}

// A — before any match
{
  const { ctx, p } = await fresh();
  await p.waitForTimeout(6000);                 // attract mode needs 4s of no input
  console.log('A  menu on fresh boot            travel =', await travel(p), 'units');
  await ctx.close();
}
// B — results screen -> HOME
{
  const { ctx, p } = await fresh();
  await p.click('#btnPlay'); await p.waitForTimeout(1500);
  await p.click(`#worldRow .wCard[data-world="${W}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 900000 });
  await p.evaluate(() => window.__rushClock(1.2));
  await p.waitForFunction(() => document.getElementById('end').classList.contains('show'), null, { timeout: 900000 });
  await p.click('#btnHome');
  await p.waitForTimeout(8000);
  const st = await p.evaluate(() => ({ menu: document.body.classList.contains('menu') }));
  console.log('B  menu after results -> HOME    travel =', await travel(p), 'units  ', JSON.stringify(st));
  await ctx.close();
}
// C — pause -> LEAVE
{
  const { ctx, p } = await fresh();
  await p.click('#btnPlay'); await p.waitForTimeout(1500);
  await p.click(`#worldRow .wCard[data-world="${W}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 900000 });
  await p.click('#btnQuit'); await p.waitForTimeout(600);
  await p.click('#pauseQuit');
  await p.waitForTimeout(8000);
  console.log('C  menu after pause -> LEAVE     travel =', await travel(p), 'units');
  await ctx.close();
}
await b.close();
