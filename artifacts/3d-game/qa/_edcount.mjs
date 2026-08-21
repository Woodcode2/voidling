import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const world of ['maple', 'powder', 'lantern']) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
    localStorage.setItem('voidMute','1'); localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder'); } catch {} });
  await p.goto(`http://127.0.0.1:4177/?w=${world}&len=600`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2, null, { timeout: 900000 });
  await p.waitForTimeout(3000);
  const s = await p.evaluate(() => {
    const ed = window.__edibles;
    const byR = { small: 0, mid: 0, big: 0 };
    for (const e of ed) { if (e.radius < 1) byR.small++; else if (e.radius < 3) byR.mid++; else byR.big++; }
    return { total: ed.length, ...byR };
  });
  console.log(world.padEnd(8), JSON.stringify(s));
  await p.close();
}
await b.close();
