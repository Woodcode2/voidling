// SCRATCH — WHAT DOES A CHILD WHO NEVER TOUCHES THE SCREEN GET?
//
// Zero input, cold install. Counts props that leave __edibles (the array is
// spliced on capture) and prints the guide text against match time, so the
// claim "the tutorial's second step is triggered by eats the child did not
// cause" is a count, not an impression.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try { localStorage.clear(); } catch {}
  Object.defineProperty(window, '__renderer', { configurable: true,
    set(v) { try { v.render = () => {}; } catch {} Object.defineProperty(window, '__renderer', { value: v, writable: true, configurable: true }); },
    get() { return undefined; } });
});
await p.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__matchState, null, { timeout: 500000 });
await p.waitForFunction(() => window.__matchState().t > 0, null, { timeout: 600000 });
let n0 = null;
const rows = [];
while (true) {
  const s = await p.evaluate(() => {
    const g = document.getElementById('guide');
    const cs = g ? getComputedStyle(g) : null;
    return { t: window.__matchState().t, sc: window.__matchState().score,
      r: window.__voidState().r, x: window.__voidState().x, z: window.__voidState().z,
      n: window.__edibles.length,
      guide: cs && +cs.opacity > 0.05 ? g.innerText.replace(/\s+/g, ' ').trim() : '' };
  });
  if (n0 === null) n0 = s.n;
  rows.push(s);
  if (s.t > 62) break;
  await p.waitForTimeout(50);
}
console.log('  matchT   score   radius   eaten-with-zero-input   guide');
let lastG = null, lastE = -1;
for (const s of rows) {
  const eaten = n0 - s.n;
  if (s.guide !== lastG || eaten !== lastE) {
    console.log(`${s.t.toFixed(2).padStart(8)} ${String(s.sc).padStart(7)} ${s.r.toFixed(3).padStart(8)} ${String(eaten).padStart(23)}   ${s.guide}`);
    lastG = s.guide; lastE = eaten;
  }
}
const last = rows[rows.length - 1];
console.log(`\nNET MOVEMENT over the whole minute: dx=${(last.x - rows[0].x).toFixed(2)} dz=${(last.z - rows[0].z).toFixed(2)}`);
console.log(`props eaten with the screen untouched: ${n0 - last.n}   final score ${last.sc}   final radius ${last.r.toFixed(3)}`);
await b.close();
