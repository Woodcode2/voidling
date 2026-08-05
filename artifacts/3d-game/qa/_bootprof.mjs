// SCRATCH — CPU profile of the synchronous boot block, split into the island
// build (pure JS/canvas, device-comparable) and everything after it (the first
// render(), which swiftshader inflates and which must never be quoted).
//   node qa/_bootprof.mjs <world> [port]
import { chromium } from 'playwright';

const W = process.argv[2] || 'gameday';
const PORT = process.argv[3] || 4188;

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(`
  window.__doneAt = null;
  Object.defineProperty(window, '__scene', { configurable: true,
    set(v) { window.__doneAt = performance.now();
      Object.defineProperty(window, '__scene', { value: v, writable: true, configurable: true }); },
    get() { return undefined; } });
`);
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
await cdp.send('Profiler.start');
await page.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__doneAt != null, null, { timeout: 400000 });
const doneAt = await page.evaluate(() => window.__doneAt);
const { profile } = await cdp.send('Profiler.stop');

const byId = new Map(profile.nodes.map((n) => [n.id, n]));
// absolute sample times, ms, relative to profile start
const times = [];
let t = 0;
for (let i = 0; i < profile.samples.length; i++) { t += (profile.timeDeltas[i] || 0) / 1000; times.push(t); }

const key = (id) => {
  const n = byId.get(id); if (!n) return '?';
  const f = n.callFrame;
  return `${f.functionName || '(anon)'}  ${(f.url || '').split('/').pop()}:${f.lineNumber + 1}:${f.columnNumber}`;
};
// module eval starts at the first sample whose frame belongs to the app bundle
let tStart = 0;
for (let i = 0; i < profile.samples.length; i++) {
  const n = byId.get(profile.samples[i]);
  if (n && /main-.*\.js/.test(n.callFrame.url || '')) { tStart = times[i]; break; }
}
const windows = [
  ['ISLAND BUILD (JS, device-comparable)', tStart, tStart + doneAt],
  ['AFTER THE BUILD (first render — swiftshader-inflated, do not quote)', tStart + doneAt, times[times.length - 1]],
];
console.log(`world=${W}   island build ended ${Math.round(doneAt)}ms after navigation   ${profile.samples.length} samples`);
for (const [label, a, z] of windows) {
  const self = new Map();
  let n = 0;
  for (let i = 0; i < profile.samples.length; i++) {
    if (times[i] < a || times[i] > z) continue;
    n++;
    const k = key(profile.samples[i]);
    self.set(k, (self.get(k) || 0) + 1);
  }
  const dur = z - a;
  console.log(`\n── ${label} — ${Math.round(dur)}ms, ${n} samples`);
  for (const [k, c] of [...self.entries()].sort((x, y) => y[1] - x[1]).slice(0, 18)) {
    console.log(`${((c / n) * 100).toFixed(1).padStart(5)}%  ${Math.round((c / n) * dur).toString().padStart(6)}ms  ${k}`);
  }
}
await b.close();
