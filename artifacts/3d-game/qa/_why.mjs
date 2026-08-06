// SCRATCH — why does the match clock not advance in the QA sandbox?
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const log = (s) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.setDefaultTimeout(600000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !!window.__voidState);
log('boot');
await p.evaluate(() => {
  window.__fps = 0;
  const tick = () => { window.__fps++; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
await p.click('#btnPlay'); await p.waitForTimeout(1500);
await p.click('#worldRow .wCard[data-world="maple"]');
log('clicked maple');
for (let i = 0; i < 30; i++) {
  await p.waitForTimeout(5000);
  const s = await p.evaluate(() => ({
    t: window.__matchState?.().t, clock: window.__matchState?.().clock,
    r: window.__voidState?.().r, frames: window.__fps, hidden: document.hidden,
    load: document.getElementById('loadScr')?.className,
    body: document.body.className,
  }));
  log(JSON.stringify(s));
  if (s.t > 4) { log('MATCH RUNNING'); break; }
}
await b.close();
