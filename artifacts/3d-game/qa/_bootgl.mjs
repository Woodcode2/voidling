// HOW MUCH OF THE COLD-BOOT FREEZE IS SWIFTSHADER, AND HOW MUCH IS THE GAME?
//
//   node qa/_bootgl.mjs [world]
//
// _boot90.mjs measured ONE unbroken main-thread block per world on a cold
// launch: maple 34.1s, pirate 35.2s, gameday 57.1s, lantern 38.0s. The
// absolute numbers are software-renderer numbers and mean nothing on a phone.
// The split does: time spent inside WebGL entry points is the part swiftshader
// inflates by one to two orders of magnitude, and everything else is ordinary
// JS that a phone runs a few times faster than this box, not a hundred.
//
// So wrap every WebGL entry point that can actually cost time and accumulate
// its self time, from before any app code runs.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const PORT = 4237;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try { localStorage.clear(); } catch { }
  window.__GL = {};
  // getProgramInfoLog / getShaderInfoLog are the ones that matter and the ones
  // the first version of this probe MISSED: three.js's WebGLProgram diagnostic
  // calls them before it calls getProgramParameter, and they are what actually
  // forces the driver to finish linking. Leaving them out made the freeze look
  // like 99% plain JS when it is not.
  const NAMES = ['compileShader', 'linkProgram', 'shaderSource', 'attachShader', 'getProgramParameter',
    'getProgramInfoLog', 'getShaderInfoLog', 'getShaderPrecisionFormat',
    'getShaderParameter', 'texImage2D', 'texSubImage2D', 'bufferData', 'bufferSubData',
    'drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced',
    'readPixels', 'finish', 'flush', 'texStorage2D', 'generateMipmap', 'clear',
    'bindFramebuffer', 'framebufferTexture2D', 'renderbufferStorage', 'useProgram'];
  for (const Ctor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!Ctor) continue;
    for (const n of NAMES) {
      const f = Ctor.prototype[n]; if (typeof f !== 'function') continue;
      Ctor.prototype[n] = function (...a) {
        const t = performance.now();
        const r = f.apply(this, a);
        const d = performance.now() - t;
        const g = window.__GL[n] || (window.__GL[n] = { n: 0, ms: 0 });
        g.n++; g.ms += d;
        return r;
      };
    }
  }
  window.__M = [];
  const mark = (n) => window.__M.push({ n, t: Math.round(performance.now()) });
  mark('initscript');
  const poll = setInterval(() => {
    if (!window.__h && window.__voidState) { window.__h = 1; mark('__voidState exists'); window.__GLAT = JSON.parse(JSON.stringify(window.__GL)); }
    if ((window.__matchState?.().t ?? 0) > 0.01) { mark('match live'); clearInterval(poll); }
  }, 100);
});
const t0 = Date.now();
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'commit', timeout: 300000 });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.01, null, { timeout: 600000 });
const wall = Date.now() - t0;
const r = await p.evaluate(() => ({ GL: window.__GLAT || window.__GL, M: window.__M }));
const hooks = (r.M.find((m) => m.n === '__voidState exists') || {}).t ?? 0;
const rows = Object.entries(r.GL).map(([name, v]) => ({ name, calls: v.n, ms: v.ms })).sort((a, b) => b.ms - a.ms);
const gl = rows.reduce((s, x) => s + x.ms, 0);
console.log(`\n═══ ${WORLD.toUpperCase()} — cold boot: what the freeze is made of ═══`);
console.log(`  wall to a running match clock: ${wall} ms; app hooks exist at ${hooks} ms`);
console.log(`  time inside WebGL entry points up to that point: ${Math.round(gl)} ms (${(gl / hooks * 100).toFixed(1)}% of it)`);
console.log(`  everything else (world build, geometry, JS): ${Math.round(hooks - gl)} ms (${((hooks - gl) / hooks * 100).toFixed(1)}%)`);
console.log(`  top GL costs:`);
for (const x of rows.slice(0, 8)) console.log(`     ${String(Math.round(x.ms)).padStart(7)} ms  ${x.name.padEnd(22)} ${x.calls} calls`);
await b.close();
