// WHERE DO THE THIRTY-FOUR SECONDS GO?
//
//   node qa/_bootprof90.mjs [world]
//
// _bootgl.mjs proved the cold-boot freeze is 99%+ ordinary JavaScript, not
// swiftshader — so it is a real, portable cost and worth attributing. CDP
// sampling profiler over the whole boot, self time rolled up by function.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const PORT = 4237;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear(); } catch { } });
const cdp = await p.context().newCDPSession(p);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 2000 });
await cdp.send('Profiler.start');
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'commit', timeout: 300000 });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.01, null, { timeout: 600000 });
const { profile } = await cdp.send('Profiler.stop');
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const total = profile.samples.length;
for (const s of profile.samples) {
  const n = byId.get(s); if (!n) continue;
  const cf = n.callFrame;
  const k = `${cf.functionName || '(anonymous)'}  ${(cf.url || '').split('/').pop()}:${cf.lineNumber + 1}`;
  self.set(k, (self.get(k) || 0) + 1);
}
const dur = (profile.endTime - profile.startTime) / 1000;
console.log(`\n═══ ${WORLD.toUpperCase()} — cold boot CPU profile, ${Math.round(dur)} ms, ${total} samples ═══`);
const rows = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22);
for (const [k, c] of rows)
  console.log(`  ${(c / total * 100).toFixed(1).padStart(5)}%  ${String(Math.round(c / total * dur)).padStart(6)} ms  ${k}`);
await b.close();
