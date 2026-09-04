// PERF-FRAME pass 4 — WHAT ONE COASTLINE TEST COSTS, per world, in isolation.
//
// The machine this runs on is shared and its load average moves, so an absolute
// millisecond is worthless. Two defences: every number is the MINIMUM of many
// batches (contention only ever adds time, so the minimum is the cleanest
// estimate), and every number is also reported against a REFERENCE loop of
// plain float maths measured in the same page at the same moment. The reference
// is what makes the figure portable to a phone: a device that runs the
// reference 2x faster runs the coastline test 2x faster too.
//
// Driven through the shipped __insideIsland3 hook, so it is the real function.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__insideIsland3, null, { timeout: 400000 });
  const r = await p.evaluate(() => {
    const f = window.__insideIsland3, N = 20000, B = 25;
    // reference: 20,000 iterations of the same shape of work a point-in-polygon
    // inner loop does — two loads, a compare, a divide, a multiply-add
    let sink = 0;
    const REF = () => { let a = 0; for (let i = 0; i < N; i++) { const x = i * 0.017, y = i * 0.031;
      if ((x > y) !== (y > x)) a += (x - y) / (y - x + 1e-6) + x; } sink += a; };
    const CALL = () => { let a = 0; for (let i = 0; i < N; i++) { if (f((i % 700) - 350, ((i * 7) % 700) - 350)) a++; } sink += a; };
    const mn = (fn) => { let best = 1e9; for (let k = 0; k < B; k++) { const t = performance.now(); fn(); const d = performance.now() - t; if (d < best) best = d; } return best; };
    REF(); CALL();                        // warm the JIT
    const ref = mn(REF), call = mn(CALL);
    return { refNsPerIter: (ref * 1e6) / N, callNsPerIter: (call * 1e6) / N, ratio: call / ref, sink };
  });
  console.log(`${wid.padEnd(8)}  insideIsland3 ${r.callNsPerIter.toFixed(0)} ns/call   reference loop ${r.refNsPerIter.toFixed(0)} ns/iter   = ${r.ratio.toFixed(1)}x the reference`);
  await p.close();
}
await b.close();
