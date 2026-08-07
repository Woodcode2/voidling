// THE PAUSE SHEET, AS A SIX-YEAR-OLD'S THUMB MEETS IT.
//   node qa/_pausefit.mjs
// Geometry of every control on #pause, plus whether the backdrop dismisses it.
import { chromium } from 'playwright';
const PORT = 4237;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear(); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.01, null, { timeout: 600000 });
await p.click('#btnQuit');
await p.waitForTimeout(800);
const g = await p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('#pause button, #pause .setTitle, #pause .setCard')) {
    const r = el.getBoundingClientRect();
    out.push({ id: el.id || el.className, x: Math.round(r.x), y: Math.round(r.y),
      w: Math.round(r.width), h: Math.round(r.height), txt: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30) });
  }
  return out;
});
console.log('\n═══ #pause on a 390x844 screen ═══');
for (const x of g) console.log(`  ${String(x.w).padStart(4)}x${String(x.h).padStart(3)} at (${String(x.x).padStart(3)},${String(x.y).padStart(3)})  ${String(x.id).padEnd(14)} "${x.txt}"`);
const keep = g.find((x) => x.id === 'pauseResume'), leave = g.find((x) => x.id === 'pauseQuit');
if (keep && leave) console.log(`  vertical gap between KEEP PLAYING and LEAVE THE MATCH: ${leave.y - (keep.y + keep.h)} px`);
// does tapping the backdrop get out?
await p.touchscreen.tap(195, 60);
await p.waitForTimeout(500);
const still = await p.evaluate(() => document.getElementById('pause').classList.contains('show'));
console.log(`  tapping the backdrop dismisses the sheet: ${!still}`);
await p.screenshot({ path: './qa-out/first90/pause.png' });
await b.close();
