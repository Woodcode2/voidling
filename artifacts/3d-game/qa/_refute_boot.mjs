// REFUTE-PASS PROBE — split the boot block into (a) time spent inside WebGL /
// canvas2d driver calls, which SwiftShader inflates 9-40x, and (b) time spent
// in plain JS, which only this box's CPU speed affects. Also calibrate this
// box's single-core JS throughput so the SW-renderer numbers can be corrected
// instead of quoted raw.
import { chromium } from 'playwright';
const PORT = process.argv[2] || 4177;
const WORLDS = (process.argv[3] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const REPS = +(process.argv[4] || 3);

const INIT = () => {
  const W = window;
  W.__glMs = 0; W.__glCalls = 0; W.__c2Ms = 0; W.__c2Calls = 0;
  W.__M = (n) => (W.__bt || (W.__bt = [])).push([n, performance.now(), W.__glMs, W.__c2Ms]);
  const now = () => performance.now();
  const wrapCtx = (ctx, kind) => {
    if (!ctx || ctx.__wrapped) return ctx;
    const proto = Object.getPrototypeOf(ctx);
    for (const k of Object.getOwnPropertyNames(proto)) {
      let d; try { d = Object.getOwnPropertyDescriptor(proto, k); } catch { continue; }
      if (!d || typeof d.value !== 'function' || k === 'constructor') continue;
      const fn = d.value;
      try {
        Object.defineProperty(ctx, k, { value: function (...a) {
          const t = now(); const r = fn.apply(this, a); const dt = now() - t;
          if (kind === 'gl') { W.__glMs += dt; W.__glCalls++; } else { W.__c2Ms += dt; W.__c2Calls++; }
          return r;
        }, configurable: true, writable: true });
      } catch {}
    }
    ctx.__wrapped = true;
    return ctx;
  };
  const og = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const c = og.call(this, type, ...rest);
    if (/webgl/i.test(String(type))) return wrapCtx(c, 'gl');
    if (String(type) === '2d') return wrapCtx(c, 'c2');
    return c;
  };
  // pure-JS CPU calibration: a fixed float+alloc workload, same shape as
  // procedural geometry generation. Reported in ms.
  W.__cpuBench = () => {
    const t = performance.now();
    let acc = 0;
    for (let r = 0; r < 40; r++) {
      const a = new Float32Array(60000);
      for (let i = 0; i < 60000; i++) a[i] = Math.sin(i * 0.001 + r) * Math.cos(i * 0.0007) + Math.sqrt(i + 1);
      for (let i = 0; i < 60000; i++) acc += a[i];
    }
    W.__benchAcc = acc;
    return performance.now() - t;
  };
  try { localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); } catch {}
};

for (const w of WORLDS) {
  const rows = [];
  for (let i = 0; i < REPS; i++) {
    const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await ctx.addInitScript(INIT);
    const p = await ctx.newPage();
    await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
    await p.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'commit' });
    await p.waitForFunction(() => !!window.__matchState, null, { timeout: 400000 });
    const r = await p.evaluate(() => {
      const paints = performance.getEntriesByType('paint').map(e => [e.name, Math.round(e.startTime)]);
      const nav = performance.getEntriesByType('navigation')[0];
      return { glMs: Math.round(window.__glMs), glCalls: window.__glCalls,
        c2Ms: Math.round(window.__c2Ms), c2Calls: window.__c2Calls,
        booted: Math.round(performance.now()),
        fcp: (paints.find(x => x[0] === 'first-contentful-paint') || [, -1])[1],
        domInteractive: Math.round(nav.domInteractive), domComplete: Math.round(nav.domComplete) };
    });
    r.bench = Math.round(await p.evaluate(() => window.__cpuBench()));
    rows.push(r);
    await b.close();
  }
  const mn = k => Math.min(...rows.map(x => x[k]));
  console.log(`\n=== ${w.toUpperCase()} (min of ${REPS}) ===`);
  console.log(`  nav → hooks live (boot block done)  ${mn('booted')} ms   [${rows.map(x=>x.booted).join(', ')}]`);
  console.log(`  first-contentful-paint              ${mn('fcp')} ms   [${rows.map(x=>x.fcp).join(', ')}]`);
  console.log(`  time INSIDE WebGL calls             ${mn('glMs')} ms   [${rows.map(x=>x.glMs).join(', ')}]  (${rows[0].glCalls} calls)`);
  console.log(`  time INSIDE canvas2d calls          ${mn('c2Ms')} ms   [${rows.map(x=>x.c2Ms).join(', ')}]  (${rows[0].c2Calls} calls)`);
  console.log(`  pure-JS CPU bench (lower = faster)  ${mn('bench')} ms   [${rows.map(x=>x.bench).join(', ')}]`);
}
