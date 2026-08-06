// REFUTE-PASS — the boot phase table, but with the SwiftShader term split out.
// For every phase: total ms, ms spent INSIDE WebGL driver calls, ms inside
// canvas2d calls, and the plain-JS remainder. Only the remainder transfers to
// a real device at anything like this cost.
import { chromium } from 'playwright';
const PORT = process.argv[2] || 4177;
const WORLDS = (process.argv[3] || 'maple,gameday').split(',');
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
    ctx.__wrapped = true; return ctx;
  };
  const og = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const c = og.call(this, type, ...rest);
    if (/webgl/i.test(String(type))) return wrapCtx(c, 'gl');
    if (String(type) === '2d') return wrapCtx(c, 'c2');
    return c;
  };
  try { localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); } catch {}
};

for (const w of WORLDS) {
  const runs = [];
  for (let i = 0; i < REPS; i++) {
    const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await ctx.addInitScript(INIT);
    const p = await ctx.newPage();
    await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
    await p.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'commit' });
    await p.waitForFunction(() => window.__bt && window.__bt.some(x => x[0] === 'post-first-render'), null, { timeout: 400000 });
    runs.push(await p.evaluate(() => window.__bt));
    await b.close();
  }
  const names = runs[0].map(r => r[0]);
  console.log(`\n=== ${w.toUpperCase()} — min of ${REPS} ===`);
  console.log('  phase                                        total    ofWhichGL   ofWhich2D    pureJS');
  const sum = [0, 0, 0];
  for (let i = 1; i < names.length; i++) {
    const pick = (j) => runs.map(r => r[i][j] - r[i - 1][j]);
    const tot = pick(1), gl = pick(2), c2 = pick(3);
    const k = tot.indexOf(Math.min(...tot));            // report the least-contended run coherently
    const js = tot[k] - gl[k] - c2[k];
    sum[0] += tot[k]; sum[1] += gl[k]; sum[2] += c2[k];
    console.log(`  ${(names[i - 1] + ' → ' + names[i]).padEnd(44)} ${String(Math.round(tot[k])).padStart(6)}  ${String(Math.round(gl[k])).padStart(10)}  ${String(Math.round(c2[k])).padStart(10)}  ${String(Math.round(js)).padStart(8)}`);
  }
  const t0 = runs.map(r => r[0][1]);
  console.log(`  (nav → module-start, incl. download/parse)   ${String(Math.round(Math.min(...t0))).padStart(6)}`);
  console.log(`  SUM of phase minima                          ${String(Math.round(sum[0])).padStart(6)}  ${String(Math.round(sum[1])).padStart(10)}  ${String(Math.round(sum[2])).padStart(10)}  ${String(Math.round(sum[0] - sum[1] - sum[2])).padStart(8)}`);
}
