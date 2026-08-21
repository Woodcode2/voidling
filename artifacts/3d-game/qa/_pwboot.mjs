import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.on('pageerror', (e) => console.log('PAGEERR', String(e).slice(0, 300)));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidMute','1'); localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder'); } catch {} });
await p.goto('http://127.0.0.1:4177/?w=powder', { waitUntil: 'domcontentloaded', timeout: 300000 });
for (let i = 0; i < 24; i++) {
  await p.waitForTimeout(5000);
  const st = await p.evaluate(() => ({ hasVoid: !!window.__voidState,
    boot: document.querySelector('#loadScr .lTip')?.textContent?.slice(0, 40) ?? null,
    stage: window.__bootStage ?? null }));
  console.log(i * 5 + 's', JSON.stringify(st));
  if (st.hasVoid) break;
}
await b.close();
