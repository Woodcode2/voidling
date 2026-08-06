// CODE-HEALTH: beginMatch() schedules validateWorld() to re-run at match+8s and
// match+22s (_revalQueue), each followed by bakeContactShadows(). Both are
// whole-list passes with Box3.setFromObject inside. Time the cold pass (what
// beginMatch pays) and the warm pass (what the two mid-match re-sweeps pay).
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const WORLDS = (process.argv[2] || 'maple').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const W of WORLDS) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  const p = await ctx.newPage();
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  const r = await p.evaluate(() => {
    const es = window.__edibles;
    const warm = [], cold = [];
    // warm = every prop already stamped vChecked, which is what the +8s and
    // +22s re-sweeps face for everything resident at match start
    for (let i = 0; i < 4; i++) {
      const t = performance.now(); window.__validateWorld(); warm.push(+(performance.now() - t).toFixed(1));
    }
    // cold = every prop needs its world bounding box measured again, which is
    // what beginMatch() pays on the first match and what the re-sweeps pay for
    // anything that streamed in late
    for (let i = 0; i < 4; i++) {
      for (const e of es) e.mesh.userData.vChecked = false;
      const t = performance.now(); window.__validateWorld(); cold.push(+(performance.now() - t).toFixed(1));
    }
    return { n: es.length, warm, cold };
  });
  console.log(`${W.padEnd(8)} props=${r.n}  validateWorld cold=[${r.cold}] ms  warm=[${r.warm}] ms`);
  await ctx.close();
}
await b.close();
