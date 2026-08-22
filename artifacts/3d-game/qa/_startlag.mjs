// TAP → SCORE latency, the owner's "music doesn't always start the moment
// you play". Starts matches repeatedly (same-world path: menu PLAY → card,
// no reload) and clocks wall ms from the card tap until SOMETHING scores the
// match (recording srcs > 0, or the synth bed) with the context running.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '0');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
} catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
for (let i = 0; i < 4; i++) {
  await p.click('#btnPlay'); await p.waitForTimeout(900);
  const t0 = Date.now();
  await p.click('#worldRow .wCard[data-world="maple"]');
  let ms = -1, what = 'NOTHING in 12s';
  for (let k = 0; k < 120; k++) {
    const m = await p.evaluate(() => window.__music());
    if (m.ctx === 'running' && (m.theme.srcs > 0 || m.synth)) {
      ms = Date.now() - t0; what = m.theme.srcs > 0 ? 'recording' : 'bed'; break;
    }
    await p.waitForTimeout(100);
  }
  console.log(`  start ${i + 1}: score after ${ms}ms  (${what})`);
  await p.evaluate(() => window.__rushClock(0.05));
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 120000 });
  await p.click('#btnHome'); await p.waitForTimeout(1500);
}
await b.close();
