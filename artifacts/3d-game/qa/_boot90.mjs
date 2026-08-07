// COLD BOOT: WHAT IS THE CHILD WAITING FOR, AND WHAT BLOCKS THE MAIN THREAD.
//
//   node qa/_boot90.mjs [world]
//
// Boot is the one place a wall clock is honest — it is real seconds a real
// child waits — but this box renders in SOFTWARE, so the totals here are an
// upper bound, not a device number. What IS portable is the shape: which
// phases exist, and how long the main thread is unresponsive inside each,
// because a blocked main thread is blocked on a phone too (just for less
// time). Everything is recorded from inside the page by a 100ms heartbeat
// installed before any app code runs, so a blocked thread shows up as a gap
// in the heartbeat rather than as a probe that times out.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const WORLD = process.argv[2] || 'maple';
const PORT = 4237;
const OUT = './qa-out/first90/';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try { localStorage.clear(); } catch { }
  const M = []; window.__M = M; const H = []; window.__H = H;
  const mark = (n) => M.push({ n, t: Math.round(performance.now()) });
  mark('initscript');
  document.addEventListener('readystatechange', () => mark('readyState=' + document.readyState));
  window.addEventListener('load', () => mark('window.load'));
  let last = performance.now();
  setInterval(() => {
    const now = performance.now(); const gap = now - last; last = now;
    if (gap > 250) H.push({ at: Math.round(now), block: Math.round(gap) });
  }, 100);
  let rafs = 0;
  const r = () => { rafs++; if (rafs === 1) mark('first rAF'); window.__rafs = rafs; requestAnimationFrame(r); };
  requestAnimationFrame(r);
  // poll for the app's own milestones without blocking anything
  const poll = setInterval(() => {
    if (!window.__hooksAt && window.__voidState) { window.__hooksAt = 1; mark('__voidState exists'); }
    const t = window.__matchState?.().t ?? 0;
    if (!window.__liveAt && t > 0.01) { window.__liveAt = 1; mark('match clock running'); clearInterval(poll); }
  }, 100);
});
const t0 = Date.now();
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'commit', timeout: 300000 });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.01, null, { timeout: 600000 });
const wall = Date.now() - t0;
await p.waitForTimeout(3000);
const r = await p.evaluate(() => ({
  M: window.__M, H: window.__H, rafs: window.__rafs,
  nav: (() => { const n = performance.getEntriesByType('navigation')[0];
    return n ? { resp: Math.round(n.responseEnd), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) } : null; })(),
  res: performance.getEntriesByType('resource').filter((x) => x.transferSize > 20000)
    .map((x) => ({ n: x.name.split('/').pop().slice(0, 36), ms: Math.round(x.responseEnd - x.startTime), kb: Math.round(x.transferSize / 1024) })),
}));
console.log(`\n═══ ${WORLD.toUpperCase()} — cold boot, empty localStorage (SOFTWARE RENDERER: upper bound) ═══`);
console.log(`  wall clock from navigation to a running match clock: ${wall} ms`);
console.log(`  navigation: responseEnd ${r.nav?.resp}ms   DOMContentLoaded ${r.nav?.dcl}ms   load ${r.nav?.load}ms`);
console.log(`  (through to DOMContentLoaded is network + parse + module eval — the portable part)`);
console.log(`  resources over 20 kB:`);
for (const x of r.res) console.log(`     ${String(x.kb).padStart(5)} kB  ${String(x.ms).padStart(6)}ms  ${x.n}`);
console.log(`  milestones:`);
for (const m of r.M) console.log(`     ${String(m.t).padStart(7)}ms  ${m.n}`);
console.log(`  MAIN-THREAD BLOCKS over 250ms (a 100ms heartbeat, installed before app code):`);
let tot = 0, worst = 0;
for (const h of r.H) { tot += h.block; if (h.block > worst) worst = h.block; }
for (const h of r.H.slice(0, 25)) console.log(`     at ${String(h.at).padStart(7)}ms  blocked ${h.block} ms`);
console.log(`     ${r.H.length} blocks, ${tot} ms blocked in total, worst single block ${worst} ms`);
await p.screenshot({ path: `${OUT}boot-${WORLD}-live.png` });
await b.close();
