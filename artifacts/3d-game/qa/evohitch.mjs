// ══════════════════════════════════════════════════════════════════════════
//  EVOHITCH — what actually costs the frame at the first evolution
// ══════════════════════════════════════════════════════════════════════════
//
//  qa/hitch.mjs found the worst frames of every run sitting at t=10-13s and
//  could not say WHY — it measures frame deltas, not causes. This attaches the
//  V8 sampling profiler through CDP across that window and reports the
//  functions with the highest SELF time, so the answer is a name and a line
//  rather than a hypothesis.
//
//  It also records the frame deltas alongside, and reports the radius at each
//  spike, so the profile can be tied to the evolution rather than assumed.
//
//  Reading it: `self` is time spent IN that function, excluding callees, so
//  the top of the list is the real work. (top-down callers would just show
//  animate() forever). Sub-millisecond entries are noise on swiftshader.
//
//    node qa/evohitch.mjs
//
import { chromium } from 'playwright';

const URL = process.env.HITCH_URL || 'http://localhost:4177/';
const UNTIL = Number(process.env.EVO_UNTIL || 16);   // game seconds to profile through

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
const page = await ctx.newPage();
await page.goto(URL);
await page.waitForFunction(() => window.__matchState && window.__matchState().t > 1, undefined, { timeout: 180000 });

// frame recorder + a radius trace, so a spike can be located in the growth curve
await page.evaluate(() => {
  const rec = { d: [], r: [] };
  window.__evoRec = rec;
  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    rec.d.push(now - last); last = now;
    rec.r.push(window.__matchState ? +window.__matchState().r.toFixed(2) : 0);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

// drive, exactly like qa/hitch.mjs, so the two are comparable
await page.evaluate(() => {
  const cv = document.querySelector('canvas');
  const r = cv.getBoundingClientRect();
  const cx = r.width / 2, cy = r.height / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, clientX: cx, clientY: cy, bubbles: true }));
  let a = 0;
  window.__driveTimer = setInterval(() => {
    a += 0.11;
    cv.dispatchEvent(new PointerEvent('pointermove', {
      pointerId: 9, clientX: cx + Math.cos(a) * 130, clientY: cy + Math.sin(a) * 130, bubbles: true,
    }));
  }, 40);
});

const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });   // 0.2ms — swiftshader frames are long
await cdp.send('Profiler.start');
await page.waitForFunction((u) => window.__matchState && window.__matchState().t > u, UNTIL, { timeout: 900000 });
const { profile } = await cdp.send('Profiler.stop');

// self time per node, from the sample counts
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const total = profile.samples.length;
for (const id of profile.samples) self.set(id, (self.get(id) || 0) + 1);
const dur = (profile.endTime - profile.startTime) / 1000;   // ms
const rows = [...self.entries()]
  .map(([id, n]) => {
    const cf = byId.get(id)?.callFrame ?? {};
    const url = (cf.url || '').split('/').pop() || '';
    return {
      fn: cf.functionName || '(anonymous)',
      at: url ? `${url}:${(cf.lineNumber ?? 0) + 1}` : '(native)',
      pct: +(n / total * 100).toFixed(1),
      ms: Math.round(n / total * dur),
    };
  })
  .filter((r) => r.pct >= 0.8)
  .sort((a, b) => b.pct - a.pct)
  .slice(0, 18);

const frames = await page.evaluate(() => {
  const d = window.__evoRec.d.slice(20), r = window.__evoRec.r.slice(20);
  const sorted = [...d].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  const spikes = [];
  for (let i = 0; i < d.length; i++) if (d[i] > med * 2.5) spikes.push({ i, ms: Math.round(d[i]), r: r[i] });
  return { median: Math.round(med), spikes: spikes.sort((a, b) => b.ms - a.ms).slice(0, 10) };
});

console.log(`PROFILE ${Math.round(dur)}ms wall, ${total} samples, frame median ${frames.median}ms`);
console.log('SPIKES  ' + JSON.stringify(frames.spikes));
console.log('── highest SELF time ──');
for (const r of rows) console.log(`  ${String(r.pct).padStart(5)}%  ${String(r.ms).padStart(6)}ms  ${r.fn}  ${r.at}`);
await browser.close();
