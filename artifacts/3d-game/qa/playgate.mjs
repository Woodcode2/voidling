// HOW LONG DOES PLAY HOLD THE CHILD? Wall clock from the tap on the world card
// to the first live match frame.
//
//   node qa/playgate.mjs [port]
//
// This one IS a wall-clock measurement and that is deliberate: the gate is a
// Promise.race against a 12-second setTimeout, so it is real seconds a real
// child waits, not sim time. Everything else in qa/ samples __matchState().t
// for good reason — this is the exception, and the number here is a floor, not
// a phone's number, because a phone's network is not this one.
import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';
const PORT = process.argv[2] || '4188';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
console.log('world     PLAY -> first frame');
for (const wid of ALL_WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  const t0 = Date.now();
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.05, null, { timeout: 400000 });
  const ms = Date.now() - t0;
  const capped = ms > 11500 ? '  <-- hit the 12s cap' : '';
  console.log(`${wid.padEnd(9)} ${String(ms).padStart(6)} ms${capped}`);
  await p.close();
}
await b.close();
